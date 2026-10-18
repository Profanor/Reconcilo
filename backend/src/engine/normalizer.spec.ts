import {
  cleanCurrencyAmount,
  parseTransactionDate,
  normalizeExpectedPaymentsCsv,
  normalizeReceivedPaymentsCsv,
} from './normalizer';

describe('Normalizer Unit Tests', () => {
  describe('cleanCurrencyAmount', () => {
    it('should clean naira symbols, commas, and dollar signs', () => {
      expect(cleanCurrencyAmount('₦25,000.50')).toBe(25000.5);
      expect(cleanCurrencyAmount(' 100,000 ')).toBe(100000);
      expect(cleanCurrencyAmount('$450.00')).toBe(450);
      expect(cleanCurrencyAmount('NGN 12,345.67')).toBe(12345.67);
    });

    it('should reject invalid or non-positive values', () => {
      expect(cleanCurrencyAmount('-500')).toBeNull();
      expect(cleanCurrencyAmount('invalid_amount')).toBeNull();
      expect(cleanCurrencyAmount(null)).toBeNull();
    });
  });

  describe('normalizeExpectedPaymentsCsv', () => {
    it('should normalize expected orders CSV with alias headers and catch in-file duplicates', () => {
      const csv = `Order ID,Amount,Customer Name,Phone,Date
ORD-001,₦15,000,Bisi Alimi,08012345678,2026-10-10
ORD-002,25000,Chuka Obi,08123456789,2026-10-11
ORD-001,15000,Bisi Duplicate,08012345678,2026-10-10`;

      const result = normalizeExpectedPaymentsCsv(csv);
      expect(result.success).toBe(true);
      expect(result.validRecords).toHaveLength(2);
      expect(result.validRecords[0].reference).toBe('ORD-001');
      expect(result.validRecords[0].amount).toBe(15000);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].reference).toBe('ORD-001');
    });
  });

  describe('normalizeReceivedPaymentsCsv', () => {
    it('should normalize bank statements, ignore debits, and flag duplicate transactions', () => {
      const bankCsv = `Transaction Date,Narration,Credit,Debit,Reference,Bank
2026-10-10 14:30,TRSF FROM OBI CHUKA,25000,,SESSION-998811,Moniepoint
2026-10-10 15:00,ATM WITHDRAWAL,,5000,ATM-112233,Access
2026-10-10 16:00,POS PAYMENT FOR BISI,15000,,SESSION-998811,OPay`;

      const result = normalizeReceivedPaymentsCsv(bankCsv);
      expect(result.success).toBe(true);
      expect(result.validRecords).toHaveLength(1); // 1 valid credit, 1 debit skipped, 1 duplicate ref
      expect(result.validRecords[0].reference).toBe('SESSION-998811');
      expect(result.validRecords[0].amount).toBe(25000);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].reference).toBe('SESSION-998811');
    });
  });
});
