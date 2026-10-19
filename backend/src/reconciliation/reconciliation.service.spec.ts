import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prismaMock: any;

  beforeEach(async () => {
    // Mock rules in DB
    const dbRules = [
      {
        id: 'EXACT_AMOUNT_AND_REF',
        name: 'Exact Amount & Reference Match',
        description: '',
        priority: 10,
        ruleType: 'EXACT_AMOUNT_AND_REF',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
        name: 'Exact Amount & Narrative Reference Match',
        description: '',
        priority: 8,
        ruleType: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS',
        name: 'Exact Amount & Contact Info Match',
        description: '',
        priority: 7,
        ruleType: 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_FUZZY_NAME',
        name: 'Exact Amount & Fuzzy Name Match',
        description: '',
        priority: 6,
        ruleType: 'EXACT_AMOUNT_AND_FUZZY_NAME',
        isActive: true,
        config: JSON.stringify({
          amountTolerance: 0,
          timeWindowHours: 72,
          similarityThreshold: 0.75,
        }),
      },
    ];

    prismaMock = {
      reconciliationRule: {
        findMany: jest.fn().mockResolvedValue(dbRules),
      },
      receivedPayment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      expectedPayment: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      reconciliationMatch: {
        create: jest.fn(),
      },
      // Mock transactional boundary
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcilePayment', () => {
    it('should match on exact reference and amount', async () => {
      const receivedPayment = {
        id: 'TX-9911',
        amount: 25000.0,
        channel: 'BANK_TRANSFER',
        provider: 'OPay',
        reference: 'ORD-123',
        senderName: 'Olumide Awosika',
        createdAt: new Date(),
        status: 'UNMATCHED',
      };

      const pendingExpected = [
        {
          id: 'EXP-101',
          amount: 25000.0,
          reference: 'ORD-123',
          customerName: 'Olumide Awosika',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      prismaMock.receivedPayment.findFirst.mockResolvedValue(receivedPayment);
      prismaMock.expectedPayment.findMany.mockResolvedValue(pendingExpected);
      prismaMock.reconciliationMatch.create.mockImplementation((args: any) => ({
        id: 'MATCH-UUID',
        ...args.data,
      }));

      const match = await service.reconcilePayment('tenant-apex-001', 'TX-9911');

      expect(match).not.toBeNull();
      expect(match?.expectedPaymentId).toBe('EXP-101');
      expect(match?.receivedPaymentId).toBe('TX-9911');
      expect(match?.confidenceScore).toBe(1.0);
      expect(prismaMock.expectedPayment.update).toHaveBeenCalledWith({
        where: { id: 'EXP-101' },
        data: { status: 'MATCHED' },
      });
      expect(prismaMock.receivedPayment.update).toHaveBeenCalledWith({
        where: { id: 'TX-9911' },
        data: { status: 'MATCHED' },
      });
    });

    it('should match when reference is inside the narrative text', async () => {
      const receivedPayment = {
        id: 'TX-9912',
        amount: 12000.0,
        channel: 'BANK_TRANSFER',
        provider: 'GTBank',
        reference: 'GTB-REF-1',
        narrative: 'TRSF FOR ORD-5544 PAYMENTS',
        senderName: 'Bolanle Cole',
        createdAt: new Date(),
        status: 'UNMATCHED',
      };

      const pendingExpected = [
        {
          id: 'EXP-102',
          amount: 12000.0,
          reference: 'ORD-5544',
          customerName: 'Bolanle Cole',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      prismaMock.receivedPayment.findFirst.mockResolvedValue(receivedPayment);
      prismaMock.expectedPayment.findMany.mockResolvedValue(pendingExpected);
      prismaMock.reconciliationMatch.create.mockImplementation((args: any) => ({
        id: 'MATCH-UUID-2',
        ...args.data,
      }));

      const match = await service.reconcilePayment('tenant-apex-001', 'TX-9912');

      expect(match).not.toBeNull();
      expect(match?.expectedPaymentId).toBe('EXP-102');
      expect(match?.confidenceScore).toBe(0.95);
      expect(JSON.parse(match?.matchedRules || '[]')).toContain(
        'EXACT_AMOUNT_AND_NARRATIVE_REF',
      );
    });

    it('should fuzzy-match customer name within the 72-hour window', async () => {
      const expectedTime = new Date();
      const receivedTime = new Date(
        expectedTime.getTime() + 5 * 60 * 60 * 1000,
      ); // +5 hours

      const receivedPayment = {
        id: 'TX-9913',
        amount: 30000.0,
        channel: 'BANK_TRANSFER',
        provider: 'AccessBank',
        reference: 'ACC-REF-2',
        senderName: 'DAVID CHINEDU OKOY',
        createdAt: receivedTime,
        status: 'UNMATCHED',
      };

      const pendingExpected = [
        {
          id: 'EXP-103',
          amount: 30000.0,
          reference: 'ORD-902',
          customerName: 'David Chinedu Okoye',
          status: 'PENDING',
          createdAt: expectedTime,
        },
      ];

      prismaMock.receivedPayment.findFirst.mockResolvedValue(receivedPayment);
      prismaMock.expectedPayment.findMany.mockResolvedValue(pendingExpected);
      prismaMock.reconciliationMatch.create.mockImplementation((args: any) => ({
        id: 'MATCH-UUID-3',
        ...args.data,
      }));

      const match = await service.reconcilePayment('tenant-apex-001', 'TX-9913');

      expect(match).not.toBeNull();
      expect(match?.expectedPaymentId).toBe('EXP-103');
      expect(match?.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(JSON.parse(match?.matchedRules || '[]')).toContain(
        'EXACT_AMOUNT_AND_FUZZY_NAME',
      );
    });

    it('should reject fuzzy-matching if payment date exceeds 72 hours', async () => {
      const expectedTime = new Date();
      const receivedTime = new Date(
        expectedTime.getTime() + 80 * 60 * 60 * 1000,
      ); // +80 hours (window is 72h)

      const receivedPayment = {
        id: 'TX-9914',
        amount: 30000.0,
        channel: 'BANK_TRANSFER',
        provider: 'AccessBank',
        reference: 'ACC-REF-3',
        senderName: 'DAVID OKOYE',
        createdAt: receivedTime,
        status: 'UNMATCHED',
      };

      const pendingExpected = [
        {
          id: 'EXP-104',
          amount: 30000.0,
          reference: 'ORD-903',
          customerName: 'David Chinedu Okoye',
          status: 'PENDING',
          createdAt: expectedTime,
        },
      ];

      prismaMock.receivedPayment.findFirst.mockResolvedValue(receivedPayment);
      prismaMock.expectedPayment.findMany.mockResolvedValue(pendingExpected);

      const match = await service.reconcilePayment('tenant-apex-001', 'TX-9914');

      expect(match).toBeNull();
    });
  });
});
