import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReconciliationMatch,
  ExpectedPayment,
  ReceivedPayment,
} from '../../prisma/generated/prisma/client';
import { MatchingRule, MatchResult } from '../engine/types';
import {
  ExactAmountAndRefRule,
  ExactAmountAndNarrativeRefRule,
  ExactAmountAndCustomerDetailsRule,
  ExactAmountAndFuzzyNameRule,
  ExactAmountOnlyRule,
} from '../engine/rules';

export interface MatchSuggestion {
  expectedPayment: ExpectedPayment;
  receivedPayment: ReceivedPayment;
  confidenceScore: number;
  matchedRules: string[];
  reason: string;
}

export interface AmbiguousMatchGroup {
  receivedPayment: ReceivedPayment;
  candidateOrders: Array<{
    expectedPayment: ExpectedPayment;
    confidenceScore: number;
    reason: string;
  }>;
  reason: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private defaultRules: MatchingRule[] = [];

  constructor(private prisma: PrismaService) {
    this.defaultRules.push(new ExactAmountAndRefRule());
    this.defaultRules.push(new ExactAmountAndNarrativeRefRule());
    this.defaultRules.push(new ExactAmountAndCustomerDetailsRule());
    this.defaultRules.push(new ExactAmountAndFuzzyNameRule());
    this.defaultRules.push(new ExactAmountOnlyRule());
  }

  private async getEnabledRules(): Promise<
    Array<{ rule: MatchingRule; config: any }>
  > {
    const dbRules = await this.prisma.reconciliationRule.findMany();
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

  /**
   * Evaluates and reconciles a single received payment.
   * If allowFuzzyAuto is false, only deterministic matches (confidence >= 0.95) are auto-committed.
   */
  public async reconcilePayment(
    receivedPaymentId: string,
    options?: { allowFuzzyAuto?: boolean; actor?: string },
  ): Promise<ReconciliationMatch | null> {
    const allowFuzzy = options?.allowFuzzyAuto !== undefined ? options.allowFuzzyAuto : true;
    const actor = options?.actor || 'SYSTEM';

    return await this.prisma.$transaction(async (tx: any) => {
      const received = await tx.receivedPayment.findUnique({
        where: { id: receivedPaymentId },
      });

      if (!received) {
        throw new Error(
          `Received payment with ID ${receivedPaymentId} not found.`,
        );
      }

      if (received.status === 'MATCHED') {
        this.logger.log(
          `Received payment ${receivedPaymentId} is already reconciled.`,
        );
        return null;
      }

      const expectedPayments = await tx.expectedPayment.findMany({
        where: { status: 'PENDING' },
      });

      if (expectedPayments.length === 0) {
        this.logger.log('No pending expected payments found.');
        return null;
      }

      const activeRules = await this.getEnabledRules();

      for (const { rule, config } of activeRules) {
        if (rule.id === 'EXACT_AMOUNT_ONLY') {
          // Amount-only without reference or verified name is never auto-committed
          continue;
        }

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
          // If we do not allow fuzzy auto, and the match is fuzzy or uncertain (< 0.95), do not auto-commit
          const bestMatch = potentialMatches[0];
          const isExact =
            bestMatch.result.confidenceScore >= 0.95 &&
            (bestMatch.result.matchedRules.includes('EXACT_AMOUNT_AND_REF') ||
              bestMatch.result.matchedRules.includes('EXACT_AMOUNT_AND_NARRATIVE_REF'));

          if (!allowFuzzy && !isExact) {
            // Leave for exception queue
            return null;
          }

          potentialMatches.sort((a, b) => {
            if (b.result.confidenceScore !== a.result.confidenceScore) {
              return b.result.confidenceScore - a.result.confidenceScore;
            }
            return (
              a.expected.createdAt.getTime() - b.expected.createdAt.getTime()
            );
          });

          const chosenMatch = potentialMatches[0];

          const match = await tx.reconciliationMatch.create({
            data: {
              expectedPaymentId: chosenMatch.expected.id,
              receivedPaymentId: received.id,
              matchMethod: isExact ? 'AUTOMATIC_EXACT' : 'AUTOMATIC_FUZZY',
              confidenceScore: chosenMatch.result.confidenceScore,
              matchedRules: JSON.stringify(chosenMatch.result.matchedRules),
              notes: chosenMatch.result.notes,
              matchedBy: actor,
            },
          });

          await tx.expectedPayment.update({
            where: { id: chosenMatch.expected.id },
            data: { status: 'MATCHED' },
          });

          await tx.receivedPayment.update({
            where: { id: received.id },
            data: { status: 'MATCHED' },
          });

          this.logger.log(
            `Reconciled ${received.id} with ${chosenMatch.expected.id}`,
          );
          return match;
        }
      }

      return null;
    });
  }

  /**
   * Reconciles all unmatched payments using controlled rules.
   * By default, only deterministic high-confidence exact matches are auto-committed.
   * Fuzzy / uncertain matches are left for human confirmation in the exception queue.
   */
  public async reconcileAllUnmatched(options?: {
    allowFuzzyAuto?: boolean;
    actor?: string;
  }): Promise<{ matchedCount: number; remainingUnmatched: number }> {
    const allowFuzzy = options?.allowFuzzyAuto ?? false; // Controlled rules: safe deterministic by default
    const actor = options?.actor || 'SYSTEM (Exact Batch)';

    const unmatchedPayments = await this.prisma.receivedPayment.findMany({
      where: { status: 'UNMATCHED' },
    });

    this.logger.log(
      `Running auto-reconciliation on ${unmatchedPayments.length} unmatched payments (allowFuzzyAuto=${allowFuzzy})...`,
    );

    let matchedCount = 0;

    for (const payment of unmatchedPayments) {
      try {
        const match = await this.reconcilePayment(payment.id, {
          allowFuzzyAuto: allowFuzzy,
          actor,
        });
        if (match) {
          matchedCount++;
        }
      } catch (err) {
        this.logger.error(`Error reconciling payment ${payment.id}:`, err);
      }
    }

    const remainingUnmatched = await this.prisma.receivedPayment.count({
      where: { status: 'UNMATCHED' },
    });

    return { matchedCount, remainingUnmatched };
  }

  /**
   * Scans for exceptions, uncertain suggestions, and ambiguous multi-matches
   * that require human review and confirmation.
   */
  public async getExceptionQueue(): Promise<{
    suggestions: MatchSuggestion[];
    ambiguous: AmbiguousMatchGroup[];
    unmatchedExpected: ExpectedPayment[];
    unmatchedReceived: ReceivedPayment[];
    duplicates: any[];
    rejectedPairsCount: number;
  }> {
    const pendingExpected = await this.prisma.expectedPayment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    const unmatchedReceived = await this.prisma.receivedPayment.findMany({
      where: { status: 'UNMATCHED' },
      orderBy: { createdAt: 'desc' },
    });

    // Check rejected pairs from AuditLog
    let rejectedPairKeys = new Set<string>();
    let duplicateLogs: any[] = [];
    if (this.prisma.auditLog) {
      try {
        const auditLogs = await this.prisma.auditLog.findMany({
          where: {
            action: { in: ['REJECT_SUGGESTION', 'DUPLICATE_FLAGGED'] },
          },
        });
        for (const log of auditLogs) {
          if (log.action === 'REJECT_SUGGESTION' && log.targetId) {
            rejectedPairKeys.add(log.targetId);
          } else if (log.action === 'DUPLICATE_FLAGGED') {
            try {
              const details = JSON.parse(log.details || '[]');
              duplicateLogs.push(...(Array.isArray(details) ? details : [details]));
            } catch (e) {
              duplicateLogs.push({ reason: log.reason, createdAt: log.createdAt });
            }
          }
        }
      } catch (e) {
        this.logger.warn('Could not read audit logs for exception queue:', e);
      }
    }

    const activeRules = await this.getEnabledRules();
    const suggestions: MatchSuggestion[] = [];
    const ambiguous: AmbiguousMatchGroup[] = [];

    const matchedExpectedIds = new Set<string>();
    const matchedReceivedIds = new Set<string>();

    for (const received of unmatchedReceived) {
      const candidates: Array<{
        expected: ExpectedPayment;
        result: MatchResult;
      }> = [];

      for (const expected of pendingExpected) {
        const pairKey = `${expected.id}:${received.id}`;
        if (rejectedPairKeys.has(pairKey)) continue;

        for (const { rule, config } of activeRules) {
          const result = rule.evaluate(expected, received, config);
          if (result.isMatch) {
            candidates.push({ expected, result });
            break; // Stop evaluating lower-priority rules for this pair
          }
        }
      }

      if (candidates.length > 1) {
        // Ambiguous match: multiple pending orders match this payment
        ambiguous.push({
          receivedPayment: received,
          candidateOrders: candidates.map((c) => ({
            expectedPayment: c.expected,
            confidenceScore: c.result.confidenceScore,
            reason: c.result.notes || 'Amount and details match multiple orders',
          })),
          reason: `Ambiguous match: Found ${candidates.length} pending orders with matching amount (₦${received.amount.toLocaleString()}). Confirmation required to avoid false match.`,
        });
        matchedReceivedIds.add(received.id);
        candidates.forEach((c) => matchedExpectedIds.add(c.expected.id));
      } else if (candidates.length === 1) {
        const single = candidates[0];
        suggestions.push({
          expectedPayment: single.expected,
          receivedPayment: received,
          confidenceScore: single.result.confidenceScore,
          matchedRules: single.result.matchedRules,
          reason: single.result.notes || 'Controlled rule candidate match',
        });
        matchedReceivedIds.add(received.id);
        matchedExpectedIds.add(single.expected.id);
      }
    }

    // Unmatched records with zero candidate matches
    const pureUnmatchedExpected = pendingExpected.filter(
      (e) => !matchedExpectedIds.has(e.id),
    );
    const pureUnmatchedReceived = unmatchedReceived.filter(
      (r) => !matchedReceivedIds.has(r.id),
    );

    return {
      suggestions: suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore),
      ambiguous,
      unmatchedExpected: pureUnmatchedExpected,
      unmatchedReceived: pureUnmatchedReceived,
      duplicates: duplicateLogs,
      rejectedPairsCount: rejectedPairKeys.size,
    };
  }

  /**
   * Authorizes and confirms a suggested match from the exception queue.
   */
  public async confirmSuggestion(
    expectedPaymentId: string,
    receivedPaymentId: string,
    confirmedBy: string = 'AUTHORIZED_USER',
    notes?: string,
  ): Promise<ReconciliationMatch> {
    return await this.prisma.$transaction(async (tx: any) => {
      const expected = await tx.expectedPayment.findUnique({
        where: { id: expectedPaymentId },
      });
      const received = await tx.receivedPayment.findUnique({
        where: { id: receivedPaymentId },
      });

      if (!expected || !received) {
        throw new Error('Expected payment or received payment record not found.');
      }

      if (expected.status === 'MATCHED') {
        throw new Error(`Expected payment ${expectedPaymentId} is already matched.`);
      }

      if (received.status === 'MATCHED') {
        throw new Error(`Received payment ${receivedPaymentId} is already matched.`);
      }

      const match = await tx.reconciliationMatch.create({
        data: {
          expectedPaymentId,
          receivedPaymentId,
          matchMethod: 'CONFIRMED_SUGGESTION',
          confidenceScore: 0.9,
          matchedRules: JSON.stringify(['HUMAN_CONFIRMED_SUGGESTION']),
          notes: notes || 'Suggestion reviewed and confirmed by authorized user',
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

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            action: 'CONFIRM_SUGGESTION',
            targetId: `${expectedPaymentId}:${receivedPaymentId}`,
            user: confirmedBy,
            reason: notes || 'Confirmed candidate suggestion in exception queue',
            details: JSON.stringify({
              orderRef: expected.reference,
              transRef: received.reference,
              amount: received.amount,
            }),
          },
        });
      }

      return match;
    });
  }

  /**
   * Rejects an uncertain suggestion to prevent a false match.
   */
  public async rejectSuggestion(
    expectedPaymentId: string,
    receivedPaymentId: string,
    rejectedBy: string = 'AUTHORIZED_USER',
    reason: string = 'Rejected: candidate does not match actual transaction',
  ): Promise<{ success: boolean; message: string }> {
    const pairKey = `${expectedPaymentId}:${receivedPaymentId}`;

    if (this.prisma.auditLog) {
      await this.prisma.auditLog.create({
        data: {
          action: 'REJECT_SUGGESTION',
          targetId: pairKey,
          user: rejectedBy,
          reason,
          details: JSON.stringify({
            expectedPaymentId,
            receivedPaymentId,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    return {
      success: true,
      message: `Suggestion rejected and logged. False match prevented for ${pairKey}.`,
    };
  }

  /**
   * Resolves an exception via manual matching, recording authorized user and reason.
   */
  public async manualMatch(
    expectedPaymentId: string,
    receivedPaymentId: string,
    notes?: string,
    matchedBy?: string,
  ): Promise<ReconciliationMatch> {
    const user = matchedBy || 'AUTHORIZED_USER';
    const reasonNotes = notes || 'Manually reconciled by user';

    return await this.prisma.$transaction(async (tx: any) => {
      const expected = await tx.expectedPayment.findUnique({
        where: { id: expectedPaymentId },
      });
      const received = await tx.receivedPayment.findUnique({
        where: { id: receivedPaymentId },
      });

      if (!expected || !received) {
        throw new Error(
          'Expected payment or received payment record not found.',
        );
      }

      if (expected.status === 'MATCHED') {
        throw new Error(
          `Expected payment ${expectedPaymentId} is already matched.`,
        );
      }

      if (received.status === 'MATCHED') {
        throw new Error(
          `Received payment ${receivedPaymentId} is already matched.`,
        );
      }

      const match = await tx.reconciliationMatch.create({
        data: {
          expectedPaymentId,
          receivedPaymentId,
          matchMethod: 'MANUAL',
          confidenceScore: 1.0,
          matchedRules: JSON.stringify(['MANUAL_OVERRIDE']),
          notes: reasonNotes,
          matchedBy: user,
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

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            action: 'MANUAL_MATCH',
            targetId: `${expectedPaymentId}:${receivedPaymentId}`,
            user,
            reason: reasonNotes,
            details: JSON.stringify({
              orderRef: expected.reference,
              transRef: received.reference,
              orderAmount: expected.amount,
              receivedAmount: received.amount,
            }),
          },
        });
      }

      return match;
    });
  }

  /**
   * Unmatches a reconciled transaction and records who unlinked it and why.
   */
  public async unmatch(
    matchId: string,
    unmatchBy: string = 'AUTHORIZED_USER',
    reason: string = 'User unlinked transaction',
  ) {
    return await this.prisma.$transaction(async (tx: any) => {
      const match = await tx.reconciliationMatch.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error(`Reconciliation match with ID ${matchId} not found.`);
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

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            action: 'UNMATCH',
            targetId: matchId,
            user: unmatchBy,
            reason: reason,
            details: JSON.stringify({
              expectedPaymentId: match.expectedPaymentId,
              receivedPaymentId: match.receivedPaymentId,
              originalMethod: match.matchMethod,
            }),
          },
        });
      }

      return {
        success: true,
        unmatchedExpectedId: match.expectedPaymentId,
        unmatchedReceivedId: match.receivedPaymentId,
      };
    });
  }

  public async getMatches(): Promise<ReconciliationMatch[]> {
    return await this.prisma.reconciliationMatch.findMany({
      include: {
        expectedPayment: true,
        receivedPayment: true,
      },
      orderBy: { matchedAt: 'desc' },
    });
  }

  public async getAuditLogs(): Promise<any[]> {
    if (!this.prisma.auditLog) return [];
    return await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Generates a complete accountant & business owner reconciliation report
   */
  public async generateReport(): Promise<any> {
    const matches = await this.prisma.reconciliationMatch.findMany({
      include: {
        expectedPayment: true,
        receivedPayment: true,
      },
      orderBy: { matchedAt: 'desc' },
    });

    const expectedAll = await this.prisma.expectedPayment.findMany();
    const receivedAll = await this.prisma.receivedPayment.findMany();

    let totalExpectedAmount = 0;
    let matchedExpectedAmount = 0;
    let pendingExpectedAmount = 0;

    for (const exp of expectedAll) {
      totalExpectedAmount += exp.amount;
      if (exp.status === 'MATCHED') matchedExpectedAmount += exp.amount;
      else if (exp.status === 'PENDING') pendingExpectedAmount += exp.amount;
    }

    let totalReceivedAmount = 0;
    let matchedReceivedAmount = 0;
    let unmatchedReceivedAmount = 0;

    for (const rec of receivedAll) {
      totalReceivedAmount += rec.amount;
      if (rec.status === 'MATCHED') matchedReceivedAmount += rec.amount;
      else if (rec.status === 'UNMATCHED') unmatchedReceivedAmount += rec.amount;
    }

    let auditLogs: any[] = [];
    if (this.prisma.auditLog) {
      auditLogs = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const falseMatchesPrevented = auditLogs.filter((l) => l.action === 'REJECT_SUGGESTION').length;
    const unmatchesCount = auditLogs.filter((l) => l.action === 'UNMATCH').length;
    const duplicatesCount = auditLogs.filter((l) => l.action === 'DUPLICATE_FLAGGED').length;
    const manualMatchesCount = matches.filter((m) => m.matchMethod === 'MANUAL').length;
    const confirmedSuggestionsCount = matches.filter((m) => m.matchMethod === 'CONFIRMED_SUGGESTION').length;
    const exactAutomaticCount = matches.filter((m) => m.matchMethod === 'AUTOMATIC_EXACT').length;

    const reconciliationRate =
      expectedAll.length > 0
        ? parseFloat(((matches.length / expectedAll.length) * 100).toFixed(1))
        : 0;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalExpectedCount: expectedAll.length,
        totalExpectedAmount,
        matchedExpectedAmount,
        pendingExpectedAmount,
        totalReceivedCount: receivedAll.length,
        totalReceivedAmount,
        matchedReceivedAmount,
        unmatchedReceivedAmount,
        varianceAmount: totalReceivedAmount - totalExpectedAmount,
        reconciliationRate,
      },
      trustMetrics: {
        totalMatchedCount: matches.length,
        exactAutomaticCount,
        confirmedSuggestionsCount,
        manualMatchesCount,
        falseMatchesPrevented,
        unmatchesCount,
        duplicatesCount,
      },
      matches: matches.map((m) => ({
        id: m.id,
        orderReference: m.expectedPayment?.reference,
        bankReference: m.receivedPayment?.reference,
        amount: m.receivedPayment?.amount || m.expectedPayment?.amount,
        customerName: m.expectedPayment?.customerName,
        senderName: m.receivedPayment?.senderName || 'N/A',
        channel: m.receivedPayment?.channel || 'BANK_TRANSFER',
        provider: m.receivedPayment?.provider || 'Bank',
        matchMethod: m.matchMethod,
        confidenceScore: m.confidenceScore,
        matchedBy: m.matchedBy,
        matchedAt: m.matchedAt,
        notes: m.notes,
      })),
      unmatchedExpected: expectedAll
        .filter((e) => e.status === 'PENDING')
        .map((e) => ({
          reference: e.reference,
          customerName: e.customerName,
          amount: e.amount,
          createdAt: e.createdAt,
          dueDate: e.dueDate,
        })),
      unmatchedReceived: receivedAll
        .filter((r) => r.status === 'UNMATCHED')
        .map((r) => ({
          reference: r.reference,
          amount: r.amount,
          senderName: r.senderName || 'Unknown',
          provider: r.provider,
          channel: r.channel,
          createdAt: r.createdAt,
          narrative: r.narrative,
        })),
      auditTrail: auditLogs.slice(0, 50),
    };
  }

  /**
   * Generates a CSV download for accountants
   */
  public async generateReportCsv(): Promise<string> {
    const report = await this.generateReport();
    const rows: string[] = [];

    // Header
    rows.push('RECONCILO FINANCIAL RECONCILIATION REPORT');
    rows.push(`Generated At,${report.generatedAt}`);
    rows.push(`Reconciliation Rate,${report.summary.reconciliationRate}%`);
    rows.push(`Total Expected Orders,${report.summary.totalExpectedCount},Total Value (NGN),${report.summary.totalExpectedAmount}`);
    rows.push(`Total Received Inflows,${report.summary.totalReceivedCount},Total Value (NGN),${report.summary.totalReceivedAmount}`);
    rows.push(`Net Financial Variance (NGN),${report.summary.varianceAmount}`);
    rows.push(`Exact Auto Matches,${report.trustMetrics.exactAutomaticCount},Confirmed Suggestions,${report.trustMetrics.confirmedSuggestionsCount},Manual Matches,${report.trustMetrics.manualMatchesCount}`);
    rows.push(`False Matches Prevented,${report.trustMetrics.falseMatchesPrevented},Unmatches Logged,${report.trustMetrics.unmatchesCount},Duplicates Flagged,${report.trustMetrics.duplicatesCount}`);
    rows.push('');
    rows.push('MATCHED TRANSACTIONS');
    rows.push('Order Reference,Bank Reference,Amount (NGN),Customer Name,Sender Name,Channel,Provider,Match Method,Confidence,Matched By,Matched At,Notes');

    for (const m of report.matches) {
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      rows.push([
        escape(m.orderReference),
        escape(m.bankReference),
        m.amount,
        escape(m.customerName),
        escape(m.senderName),
        escape(m.channel),
        escape(m.provider),
        escape(m.matchMethod),
        m.confidenceScore,
        escape(m.matchedBy),
        escape(m.matchedAt),
        escape(m.notes),
      ].join(','));
    }

    rows.push('');
    rows.push('OUTSTANDING UNMATCHED ORDERS (RECEIVABLES)');
    rows.push('Order Reference,Customer Name,Amount (NGN),Order Date,Due Date');
    for (const u of report.unmatchedExpected) {
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      rows.push([
        escape(u.reference),
        escape(u.customerName),
        u.amount,
        escape(u.createdAt),
        escape(u.dueDate),
      ].join(','));
    }

    rows.push('');
    rows.push('UNCLAIMED BANK INFLOWS');
    rows.push('Bank Reference,Amount (NGN),Sender Name,Provider,Channel,Date,Narration');
    for (const r of report.unmatchedReceived) {
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      rows.push([
        escape(r.reference),
        r.amount,
        escape(r.senderName),
        escape(r.provider),
        escape(r.channel),
        escape(r.createdAt),
        escape(r.narrative),
      ].join(','));
    }

    return rows.join('\r\n');
  }
}
