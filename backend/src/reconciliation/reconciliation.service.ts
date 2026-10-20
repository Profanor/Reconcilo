import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReconciliationMatch,
  ExpectedPayment,
} from '../../prisma/generated/prisma/client';
import { MatchingRule, MatchResult } from '../engine/types';
import {
  ExactAmountAndRefRule,
  ExactAmountAndNarrativeRefRule,
  ExactAmountAndCustomerDetailsRule,
  ExactAmountAndFuzzyNameRule,
} from '../engine/rules';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private defaultRules: MatchingRule[] = [];

  constructor(private prisma: PrismaService) {
    this.defaultRules.push(new ExactAmountAndRefRule());
    this.defaultRules.push(new ExactAmountAndNarrativeRefRule());
    this.defaultRules.push(new ExactAmountAndCustomerDetailsRule());
    this.defaultRules.push(new ExactAmountAndFuzzyNameRule());
  }

  private async getEnabledRules(tenantId: string): Promise<
    Array<{ rule: MatchingRule; config: any }>
  > {
    const dbRules = await this.prisma.reconciliationRule.findMany({
      where: { tenantId },
    });
    const enabledRules: Array<{ rule: MatchingRule; config: any }> = [];

    for (const ruleInstance of this.defaultRules) {
      const dbRule = dbRules.find((r) => r.id === ruleInstance.id);
      const isActive = dbRule ? dbRule.isActive : true;
      const priority = dbRule ? dbRule.priority : ruleInstance.priority;

      let config = {};
      if (dbRule && dbRule.config) {
        try {
          config = JSON.parse(dbRule.config);
        } catch (e) {
          this.logger.error(
            `Failed to parse config for rule ${ruleInstance.id}`,
            e,
          );
        }
      }

      if (isActive) {
        const ruleWithPriority = {
          ...ruleInstance,
          priority,
          evaluate: ruleInstance.evaluate.bind(ruleInstance),
        };
        enabledRules.push({ rule: ruleWithPriority, config });
      }
    }

    return enabledRules.sort((a, b) => b.rule.priority - a.rule.priority);
  }

  public async reconcilePayment(
    tenantId: string,
    receivedPaymentId: string,
  ): Promise<ReconciliationMatch | null> {
    return await this.prisma.$transaction(async (tx: any) => {
      const received = await tx.receivedPayment.findFirst({
        where: { id: receivedPaymentId, tenantId },
      });

      if (!received) {
        throw new NotFoundException(
          `Received payment with ID ${receivedPaymentId} not found in workspace.`,
        );
      }

      if (received.status === 'MATCHED') {
        return null;
      }

      // CRITICAL: Scope expected payments search strictly to the same tenant!
      const expectedPayments = await tx.expectedPayment.findMany({
        where: { tenantId, status: 'PENDING' },
      });

      if (expectedPayments.length === 0) {
        return null;
      }

      const activeRules = await this.getEnabledRules(tenantId);

      for (const { rule, config } of activeRules) {
        const potentialMatches: Array<{
          expected: ExpectedPayment;
          result: MatchResult;
        }> = [];

        for (const expected of expectedPayments) {
          const result = rule.evaluate(expected, received, config);
          if (result.isMatch) {
            potentialMatches.push({ expected, result });
          }
        }

        if (potentialMatches.length > 0) {
          potentialMatches.sort((a, b) => {
            if (b.result.confidenceScore !== a.result.confidenceScore) {
              return b.result.confidenceScore - a.result.confidenceScore;
            }
            return (
              a.expected.createdAt.getTime() - b.expected.createdAt.getTime()
            );
          });

          const bestMatch = potentialMatches[0];

          const match = await tx.reconciliationMatch.create({
            data: {
              tenantId,
              expectedPaymentId: bestMatch.expected.id,
              receivedPaymentId: received.id,
              matchMethod:
                bestMatch.result.matchedRules.includes(
                  'EXACT_AMOUNT_AND_REF',
                ) ||
                bestMatch.result.matchedRules.includes(
                  'EXACT_AMOUNT_AND_NARRATIVE_REF',
                )
                  ? 'AUTOMATIC_EXACT'
                  : 'AUTOMATIC_FUZZY',
              confidenceScore: bestMatch.result.confidenceScore,
              matchedRules: JSON.stringify(bestMatch.result.matchedRules),
              notes: bestMatch.result.notes,
              matchedBy: 'SYSTEM',
            },
          });

          await tx.expectedPayment.update({
            where: { id: bestMatch.expected.id },
            data: { status: 'MATCHED' },
          });

          await tx.receivedPayment.update({
            where: { id: received.id },
            data: { status: 'MATCHED' },
          });

          return match;
        }
      }

      return null;
    });
  }

  public async reconcileAllUnmatched(
    tenantId: string,
    actor = 'SYSTEM',
  ): Promise<{ matchedCount: number; remainingUnmatched: number }> {
    const unmatchedPayments = await this.prisma.receivedPayment.findMany({
      where: { tenantId, status: 'UNMATCHED' },
    });

    let matchCount = 0;

    for (const payment of unmatchedPayments) {
      try {
        const match = await this.reconcilePayment(tenantId, payment.id);
        if (match) {
          matchCount++;
        }
      } catch (err) {
        this.logger.error(`Error reconciling payment ${payment.id}:`, err);
      }
    }

    // Record the reconciliation run for audit & history
    await this.prisma.reconciliationRun.create({
      data: {
        tenantId,
        matchedCount: matchCount,
        actor,
      },
    });

    // Count remaining unmatched received payments after the run
    const remainingUnmatched = await this.prisma.receivedPayment.count({
      where: { tenantId, status: 'UNMATCHED' },
    });

    return { matchedCount: matchCount, remainingUnmatched };
  }

  public async manualMatch(
    tenantId: string,
    expectedPaymentId: string,
    receivedPaymentId: string,
    notes?: string,
    matchedBy?: string,
  ): Promise<ReconciliationMatch> {
    return await this.prisma.$transaction(async (tx: any) => {
      // CRITICAL: Verify BOTH payments belong to the calling tenant!
      const expected = await tx.expectedPayment.findFirst({
        where: { id: expectedPaymentId, tenantId },
      });
      const received = await tx.receivedPayment.findFirst({
        where: { id: receivedPaymentId, tenantId },
      });

      if (!expected || !received) {
        throw new NotFoundException(
          'Expected payment or received payment record not found in workspace.',
        );
      }

      if (expected.status === 'MATCHED') {
        throw new BadRequestException(
          `Expected payment ${expectedPaymentId} is already matched.`,
        );
      }

      if (received.status === 'MATCHED') {
        throw new BadRequestException(
          `Received payment ${receivedPaymentId} is already matched.`,
        );
      }

      const match = await tx.reconciliationMatch.create({
        data: {
          tenantId,
          expectedPaymentId,
          receivedPaymentId,
          matchMethod: 'MANUAL',
          confidenceScore: 1.0,
          matchedRules: JSON.stringify(['MANUAL_OVERRIDE']),
          notes: notes || 'Manually reconciled by user',
          matchedBy: matchedBy || 'USER',
        },
      });

      await tx.expectedPayment.update({
        where: { id: expectedPaymentId },
        data: { status: 'MATCHED' },
      });

      await tx.receivedPayment.update({
        where: { id: receivedPaymentId },
        data: { status: 'MATCHED' },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'MANUAL_MATCH',
          targetId: match.id,
          user: matchedBy || 'USER',
          reason: notes || 'Manual match link by operator',
        },
      });

      return match;
    });
  }

  public async unmatch(tenantId: string, matchId: string, actor = 'OPERATOR', reason?: string) {
    return await this.prisma.$transaction(async (tx: any) => {
      const match = await tx.reconciliationMatch.findFirst({
        where: { id: matchId, tenantId },
      });

      if (!match) {
        throw new NotFoundException(`Reconciliation match with ID ${matchId} not found in workspace.`);
      }

      await tx.reconciliationMatch.delete({
        where: { id: matchId },
      });

      await tx.expectedPayment.update({
        where: { id: match.expectedPaymentId },
        data: { status: 'PENDING' },
      });

      await tx.receivedPayment.update({
        where: { id: match.receivedPaymentId },
        data: { status: 'UNMATCHED' },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'UNMATCH',
          targetId: matchId,
          user: actor,
          reason: reason || 'Transaction unlinked by operator',
        },
      });

      return {
        success: true,
        unmatchedExpectedId: match.expectedPaymentId,
        unmatchedReceivedId: match.receivedPaymentId,
      };
    });
  }

  public async getMatches(tenantId: string): Promise<ReconciliationMatch[]> {
    return await this.prisma.reconciliationMatch.findMany({
      where: { tenantId },
      include: {
        expectedPayment: true,
        receivedPayment: true,
      },
      orderBy: { matchedAt: 'desc' },
    });
  }

  public async getAuditLogs(tenantId: string) {
    return await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  public async getExceptions(tenantId: string) {
    const unmatchedExpected = await this.prisma.expectedPayment.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    const unmatchedReceived = await this.prisma.receivedPayment.findMany({
      where: { tenantId, status: 'UNMATCHED' },
      orderBy: { createdAt: 'desc' },
    });

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const rejectedPairsCount = auditLogs.filter(
      (l: any) => l.action === 'REJECT_SUGGESTION',
    ).length;

    const duplicates = auditLogs
      .filter((l: any) => l.action === 'DUPLICATE_FLAGGED')
      .map((l: any) => ({
        reference: l.targetId || undefined,
        reason: l.reason || undefined,
        createdAt: l.createdAt.toISOString(),
      }));

    const suggestions: any[] = [];
    const ambiguousMap = new Map<string, any[]>();

    const activeRules = await this.getEnabledRules(tenantId);

    for (const received of unmatchedReceived) {
      const candidates: any[] = [];

      for (const expected of unmatchedExpected) {
        for (const { rule, config } of activeRules) {
          const res = rule.evaluate(expected, received, config);
          if (res.isMatch) {
            candidates.push({
              expectedPayment: expected,
              receivedPayment: received,
              confidenceScore: res.confidenceScore,
              matchedRules: res.matchedRules,
              reason: res.notes,
            });
            break;
          }
        }
      }

      if (candidates.length === 1) {
        suggestions.push(candidates[0]);
      } else if (candidates.length > 1) {
        ambiguousMap.set(received.id, candidates);
      }
    }

    const ambiguous = Array.from(ambiguousMap.entries()).map(
      ([receivedId, candList]) => ({
        receivedPayment: unmatchedReceived.find((r) => r.id === receivedId)!,
        candidateOrders: candList.map((c) => ({
          expectedPayment: c.expectedPayment,
          confidenceScore: c.confidenceScore,
          reason: c.reason,
        })),
        reason: 'Multiple expected payments match amount or reference criteria',
      }),
    );

    return {
      suggestions,
      ambiguous,
      unmatchedExpected,
      unmatchedReceived,
      duplicates,
      rejectedPairsCount,
    };
  }

  public async confirmSuggestion(
    tenantId: string,
    expectedPaymentId: string,
    receivedPaymentId: string,
    confirmedBy = 'FINANCE_OPERATOR',
    notes?: string,
  ) {
    return await this.prisma.$transaction(async (tx: any) => {
      const expected = await tx.expectedPayment.findFirst({
        where: { id: expectedPaymentId, tenantId },
      });
      const received = await tx.receivedPayment.findFirst({
        where: { id: receivedPaymentId, tenantId },
      });

      if (!expected || !received) {
        throw new NotFoundException('Expected or received payment not found.');
      }

      const match = await tx.reconciliationMatch.create({
        data: {
          tenantId,
          expectedPaymentId,
          receivedPaymentId,
          matchMethod: 'CONFIRMED_SUGGESTION',
          confidenceScore: 0.95,
          matchedRules: JSON.stringify(['CONFIRMED_SUGGESTION']),
          notes: notes || 'Suggestion confirmed by operator',
          matchedBy: confirmedBy,
        },
      });

      await tx.expectedPayment.update({
        where: { id: expectedPaymentId },
        data: { status: 'MATCHED' },
      });

      await tx.receivedPayment.update({
        where: { id: receivedPaymentId },
        data: { status: 'MATCHED' },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'CONFIRM_SUGGESTION',
          targetId: match.id,
          user: confirmedBy,
          reason: notes || 'Operator confirmed fuzzy candidate suggestion',
        },
      });

      return match;
    });
  }

  public async rejectSuggestion(
    tenantId: string,
    expectedPaymentId: string,
    receivedPaymentId: string,
    rejectedBy = 'FINANCE_OPERATOR',
    reason = 'Candidate does not match actual transaction',
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'REJECT_SUGGESTION',
        targetId: `${expectedPaymentId}:${receivedPaymentId}`,
        user: rejectedBy,
        reason,
      },
    });

    return {
      success: true,
      message: 'Suggestion rejected and recorded in audit log',
    };
  }

  public async exportReportCsv(tenantId: string): Promise<string> {
    const matches = await this.prisma.reconciliationMatch.findMany({
      where: { tenantId },
      include: {
        expectedPayment: true,
        receivedPayment: true,
      },
      orderBy: { matchedAt: 'desc' },
    });

    const headers = [
      'Match ID',
      'Matched At',
      'Match Method',
      'Confidence Score',
      'Expected Reference',
      'Customer Name',
      'Expected Amount',
      'Received Reference',
      'Sender Name',
      'Channel',
      'Provider',
      'Received Amount',
      'Matched By',
      'Notes',
    ];

    const rows = matches.map((m) => [
      m.id,
      m.matchedAt.toISOString(),
      m.matchMethod,
      `${Math.round(m.confidenceScore * 100)}%`,
      m.expectedPayment.reference,
      m.expectedPayment.customerName,
      m.expectedPayment.amount.toString(),
      m.receivedPayment.reference,
      m.receivedPayment.senderName || '',
      m.receivedPayment.channel,
      m.receivedPayment.provider,
      m.receivedPayment.amount.toString(),
      m.matchedBy || '',
      m.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csvContent;
  }
}
