import {
  ExpectedPayment,
  ReceivedPayment,
} from '../../prisma/generated/prisma/client';

export interface MatchResult {
  isMatch: boolean;
  confidenceScore: number;
  matchedRules: string[];
  notes?: string;
}

export interface MatchingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  evaluate(
    expected: ExpectedPayment,
    received: ReceivedPayment,
    config?: any,
  ): MatchResult;
}
