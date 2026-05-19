import {
  ExpectedPayment,
  ReceivedPayment,
} from '../../prisma/generated/prisma/client';
import { MatchingRule, MatchResult } from './types';

export function amountsMatch(
  amt1: number,
  amt2: number,
  tolerance: number = 0,
): boolean {
  return Math.abs(amt1 - amt2) <= tolerance;
}

export function cleanText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function cleanNameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function calculateNameOverlap(
  expected: string,
  received: string,
): number {
  const expectedTokens = cleanNameTokens(expected);
  const receivedTokens = cleanNameTokens(received);

  if (expectedTokens.length === 0 || receivedTokens.length === 0) {
    return 0;
  }

  let matchedTokens = 0;
  for (const token of expectedTokens) {
    if (receivedTokens.includes(token)) {
      matchedTokens += 1.0;
    } else {
      const hasCloseMatch = receivedTokens.some(
        (rToken) => rToken.includes(token) || token.includes(rToken),
      );
      if (hasCloseMatch) {
        matchedTokens += 0.7;
      }
    }
  }

  return matchedTokens / expectedTokens.length;
}

export class ExactAmountAndRefRule implements MatchingRule {
  id = 'EXACT_AMOUNT_AND_REF';
  name = 'Exact Amount & Reference Match';
  description =
    'Matches when the payment amount matches exactly and the transaction reference matches the order reference.';
  priority = 10;

  evaluate(
    expected: ExpectedPayment,
    received: ReceivedPayment,
    config: any = {},
  ): MatchResult {
    const tolerance = config.amountTolerance || 0;
    const isAmountMatch = amountsMatch(
      expected.amount,
      received.amount,
      tolerance,
    );

    const cleanExpectedRef = expected.reference.trim().toLowerCase();
    const cleanReceivedRef = received.reference.trim().toLowerCase();

    const isRefMatch = cleanExpectedRef === cleanReceivedRef;

    if (isAmountMatch && isRefMatch) {
      return {
        isMatch: true,
        confidenceScore: 1.0,
        matchedRules: [this.id],
        notes: `Matched exactly on amount (${expected.amount}) and reference (${expected.reference}).`,
      };
    }

    return { isMatch: false, confidenceScore: 0, matchedRules: [] };
  }
}

export class ExactAmountAndNarrativeRefRule implements MatchingRule {
  id = 'EXACT_AMOUNT_AND_NARRATIVE_REF';
  name = 'Exact Amount & Narrative Reference Match';
  description =
    'Matches when the payment amount matches exactly and the order reference is contained within the payment narration/memo.';
  priority = 8;

  evaluate(
    expected: ExpectedPayment,
    received: ReceivedPayment,
    config: any = {},
  ): MatchResult {
    const tolerance = config.amountTolerance || 0;
    const isAmountMatch = amountsMatch(
      expected.amount,
      received.amount,
      tolerance,
    );

    if (!isAmountMatch || !received.narrative) {
      return { isMatch: false, confidenceScore: 0, matchedRules: [] };
    }

    const cleanExpectedRef = cleanText(expected.reference);
    const cleanNarrative = cleanText(received.narrative);

    const isRefFound =
      cleanNarrative.includes(cleanExpectedRef) && cleanExpectedRef.length >= 3;

    if (isRefFound) {
      return {
        isMatch: true,
        confidenceScore: 0.95,
        matchedRules: [this.id],
        notes: `Matched on amount (${expected.amount}). Order reference '${expected.reference}' was found in the narrative: '${received.narrative}'.`,
      };
    }

    return { isMatch: false, confidenceScore: 0, matchedRules: [] };
  }
}

export class ExactAmountAndCustomerDetailsRule implements MatchingRule {
  id = 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS';
  name = 'Exact Amount & Contact Info Match';
  description =
    "Matches when the payment amount matches exactly and the customer's phone number or email is found in the payment narration.";
  priority = 7;

  evaluate(
    expected: ExpectedPayment,
    received: ReceivedPayment,
    config: any = {},
  ): MatchResult {
    const tolerance = config.amountTolerance || 0;
    const isAmountMatch = amountsMatch(
      expected.amount,
      received.amount,
      tolerance,
    );

    if (!isAmountMatch || !received.narrative) {
      return { isMatch: false, confidenceScore: 0, matchedRules: [] };
    }

    const cleanNarrative = cleanText(received.narrative);
    let matchedDetail: string | null = null;

    if (expected.customerPhone) {
      const cleanPhone = cleanText(expected.customerPhone);
      if (cleanPhone.length >= 7 && cleanNarrative.includes(cleanPhone)) {
        matchedDetail = `phone '${expected.customerPhone}'`;
      }
    }

    if (!matchedDetail && expected.customerEmail) {
      const cleanEmail = cleanText(expected.customerEmail);
      if (cleanEmail.length >= 5 && cleanNarrative.includes(cleanEmail)) {
        matchedDetail = `email '${expected.customerEmail}'`;
      }
    }

    if (matchedDetail) {
      return {
        isMatch: true,
        confidenceScore: 0.9,
        matchedRules: [this.id],
        notes: `Matched on amount (${expected.amount}). Customer ${matchedDetail} was found in the narrative: '${received.narrative}'.`,
      };
    }

    return { isMatch: false, confidenceScore: 0, matchedRules: [] };
  }
}

export class ExactAmountAndFuzzyNameRule implements MatchingRule {
  id = 'EXACT_AMOUNT_AND_FUZZY_NAME';
  name = 'Exact Amount & Fuzzy Name Match';
  description =
    "Matches when the amount matches, the transaction date falls within a configured time window (default 72 hours), and the sender's name fuzzy-matches the expected customer name.";
  priority = 6;

  evaluate(
    expected: ExpectedPayment,
    received: ReceivedPayment,
    config: any = {},
  ): MatchResult {
    const tolerance = config.amountTolerance || 0;
    const isAmountMatch = amountsMatch(
      expected.amount,
      received.amount,
      tolerance,
    );

    if (!isAmountMatch || !received.senderName) {
      return { isMatch: false, confidenceScore: 0, matchedRules: [] };
    }

    const timeWindowHrs = config.timeWindowHours || 72;
    const timeWindowMs = timeWindowHrs * 60 * 60 * 1000;

    const expectedTime = new Date(expected.createdAt).getTime();
    const receivedTime = new Date(received.createdAt).getTime();

    const timeDiff = receivedTime - expectedTime;
    const isWithinWindow =
      timeDiff >= -2 * 60 * 60 * 1000 && timeDiff <= timeWindowMs;

    if (!isWithinWindow) {
      return { isMatch: false, confidenceScore: 0, matchedRules: [] };
    }

    const similarityThreshold = config.similarityThreshold || 0.75;
    const similarity = calculateNameOverlap(
      expected.customerName,
      received.senderName,
    );

    if (similarity >= similarityThreshold) {
      const confidence =
        0.7 +
        (similarity - similarityThreshold) * (0.2 / (1 - similarityThreshold));

      return {
        isMatch: true,
        confidenceScore: parseFloat(confidence.toFixed(2)),
        matchedRules: [this.id],
        notes: `Matched on amount (${expected.amount}) and fuzzy name similarity of ${(similarity * 100).toFixed(0)}% ('${expected.customerName}' vs '${received.senderName}') within ${timeWindowHrs}h window.`,
      };
    }

    return { isMatch: false, confidenceScore: 0, matchedRules: [] };
  }
}
