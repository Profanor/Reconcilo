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

  public async reconcilePayment(
    receivedPaymentId: string,
  ): Promise<ReconciliationMatch | null> {
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

          this.logger.log(
            `Reconciled ${received.id} with ${bestMatch.expected.id}`,
          );
          return match;
        }
      }

      return null;
    });
  }

  public async reconcileAllUnmatched(): Promise<number> {
    const unmatchedPayments = await this.prisma.receivedPayment.findMany({
      where: { status: 'UNMATCHED' },
    });

    this.logger.log(
      `Attempting to reconcile ${unmatchedPayments.length} unmatched payments...`,
    );
    let matchCount = 0;

    for (const payment of unmatchedPayments) {
      try {
        const match = await this.reconcilePayment(payment.id);
        if (match) {
          matchCount++;
        }
      } catch (err) {
        this.logger.error(`Error reconciling payment ${payment.id}:`, err);
      }
    }

    return matchCount;
  }

  public async manualMatch(
    expectedPaymentId: string,
    receivedPaymentId: string,
    notes?: string,
    matchedBy?: string,
  ): Promise<ReconciliationMatch> {
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

      return match;
    });
  }

  public async unmatch(matchId: string) {
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
}
