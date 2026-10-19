import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RuleType, PaymentChannel } from '../prisma/generated/prisma/client';

describe('Multi-Tenant Data Isolation & Security Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const TENANT_A_ID = 'tenant-apex-001';
  const TENANT_B_ID = 'tenant-alaba-002';

  const resetAndSeedDb = async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.reconciliationMatch.deleteMany({});
    await prisma.reconciliationRun.deleteMany({});
    await prisma.expectedPayment.deleteMany({});
    await prisma.receivedPayment.deleteMany({});
    await prisma.reconciliationRule.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});

    await prisma.tenant.createMany({
      data: [
        {
          id: TENANT_A_ID,
          name: 'Apex Superstores & Logistics Nigeria Ltd',
          slug: 'apex-superstores',
          cacNumber: 'RC-1849201',
          currency: 'NGN',
        },
        {
          id: TENANT_B_ID,
          name: 'Alaba Prime Wholesale Electronics Ltd',
          slug: 'alaba-prime',
          cacNumber: 'RC-948123',
          currency: 'NGN',
        },
      ],
    });

    const baseRules: Array<{
      id: string;
      name: string;
      description: string;
      priority: number;
      ruleType: RuleType;
      isActive: boolean;
      config: string;
    }> = [
      {
        id: 'EXACT_AMOUNT_AND_REF',
        name: 'Exact Amount & Reference Match',
        description: 'Matches when payment amount and reference match exactly.',
        priority: 10,
        ruleType: RuleType.EXACT_AMOUNT_AND_REF,
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
        name: 'Exact Amount & Narrative Reference Match',
        description: 'Matches when reference is in narrative.',
        priority: 8,
        ruleType: RuleType.EXACT_AMOUNT_AND_NARRATIVE_REF,
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
    ];

    await prisma.reconciliationRule.createMany({
      data: [
        ...baseRules.map((r) => ({ ...r, tenantId: TENANT_A_ID })),
        ...baseRules.map((r) => ({ ...r, tenantId: TENANT_B_ID })),
      ],
    });

    const now = new Date();

    // Tenant A Orders
    await prisma.expectedPayment.createMany({
      data: [
        {
          id: 'EXP-1001',
          tenantId: TENANT_A_ID,
          amount: 12500.0,
          reference: 'ORD-2026-0001',
          customerName: 'Olumide Awosika',
          status: 'PENDING',
          createdAt: now,
        },
        {
          id: 'EXP-1002',
          tenantId: TENANT_A_ID,
          amount: 45000.0,
          reference: 'ORD-2026-0002',
          customerName: 'Chioma Nze',
          status: 'PENDING',
          createdAt: now,
        },
      ],
    });

    // Tenant A Inflow
    await prisma.receivedPayment.create({
      data: {
        id: 'TX-900001',
        tenantId: TENANT_A_ID,
        amount: 12500.0,
        channel: 'BANK_TRANSFER',
        provider: 'GTBank',
        reference: 'ORD-2026-0001',
        senderName: 'OLUMIDE AWOSIKA',
        createdAt: now,
        status: 'UNMATCHED',
      },
    });

    // Tenant B Orders (Notice ORD-2026-0001 reference reuse across tenant!)
    await prisma.expectedPayment.createMany({
      data: [
        {
          id: 'EXP-B-1001',
          tenantId: TENANT_B_ID,
          amount: 650000.0,
          reference: 'ORD-2026-0001', // Identical reference, isolated by tenantId
          customerName: 'Alhaji Musa Danbaba',
          status: 'PENDING',
          createdAt: now,
        },
        {
          id: 'EXP-B-1002',
          tenantId: TENANT_B_ID,
          amount: 120000.0,
          reference: 'ORD-2026-B002',
          customerName: 'Kalu Obinna',
          status: 'PENDING',
          createdAt: now,
        },
      ],
    });

    // Tenant B Inflow
    await prisma.receivedPayment.create({
      data: {
        id: 'TX-B-900001',
        tenantId: TENANT_B_ID,
        amount: 650000.0,
        channel: 'BANK_TRANSFER',
        provider: 'FirstBank',
        reference: 'ORD-2026-0001',
        senderName: 'ALHAJI MUSA DANBABA',
        createdAt: now,
        status: 'UNMATCHED',
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    await resetAndSeedDb();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Read Isolation (Tenant Data Boundaries)', () => {
    it('Tenant A should only receive Tenant A expected payments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/expected')
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      res.body.forEach((payment: any) => {
        expect(payment.tenantId).toBe(TENANT_A_ID);
        expect(payment.tenantId).not.toBe(TENANT_B_ID);
      });
    });

    it('Tenant B should only receive Tenant B expected payments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/expected')
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      res.body.forEach((payment: any) => {
        expect(payment.tenantId).toBe(TENANT_B_ID);
        expect(payment.tenantId).not.toBe(TENANT_A_ID);
      });
    });

    it('Tenant A and Tenant B dashboards must have completely separate financial metrics', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      const resB = await request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      expect(resA.body.expected.totalAmount).toBe(57500); // 12,500 + 45,000
      expect(resB.body.expected.totalAmount).toBe(770000); // 650,000 + 120,000
      expect(resA.body.expected.totalAmount).not.toBe(resB.body.expected.totalAmount);
    });
  });

  describe('2. Write & Attack Prevention (ID-Guessing & Cross-Tenant Tampering)', () => {
    it('Tenant A should NOT be able to delete Tenant B payment by guessing its ID (Returns 404)', async () => {
      // Tenant B has EXP-B-1002
      await request(app.getHttpServer())
        .delete('/api/expected/EXP-B-1002')
        .set('x-tenant-id', TENANT_A_ID) // Attacker identity
        .expect(404);

      // Verify the record was NOT deleted from Tenant B
      const checkB = await prisma.expectedPayment.findUnique({
        where: { id: 'EXP-B-1002' },
      });
      expect(checkB).not.toBeNull();
      expect(checkB?.tenantId).toBe(TENANT_B_ID);
    });

    it('Tenant A should NOT be able to manual-match Tenant A invoice with Tenant B bank transaction', async () => {
      // Expected from Tenant A (EXP-1001), Inflow from Tenant B (TX-B-900001)
      await request(app.getHttpServer())
        .post('/api/matches/manual')
        .set('x-tenant-id', TENANT_A_ID)
        .send({
          expectedPaymentId: 'EXP-1001',
          receivedPaymentId: 'TX-B-900001', // Belongs to Tenant B!
          notes: 'Malicious cross-tenant link attempt',
        })
        .expect(404);
    });

    it('Reference reuse across tenants: Both tenants can create order reference ORD-MULTI independently', async () => {
      const ref = `ORD-MULTI-${Date.now()}`;

      // Tenant A creates invoice
      await request(app.getHttpServer())
        .post('/api/expected')
        .set('x-tenant-id', TENANT_A_ID)
        .send({
          reference: ref,
          amount: 50000,
          customerName: 'Tenant A Customer',
        })
        .expect(201);

      // Tenant B creates invoice with the EXACT SAME reference
      const resB = await request(app.getHttpServer())
        .post('/api/expected')
        .set('x-tenant-id', TENANT_B_ID)
        .send({
          reference: ref,
          amount: 88000,
          customerName: 'Tenant B Customer',
        })
        .expect(201);

      expect(resB.body.reference).toBe(ref);
      expect(resB.body.tenantId).toBe(TENANT_B_ID);
    });
  });

  describe('3. Reconciliation Engine Tenant Boundaries', () => {
    it('Running auto-reconciliation for Tenant B must only match Tenant B records', async () => {
      const countBeforeA = await prisma.expectedPayment.count({
        where: { tenantId: TENANT_A_ID, status: 'PENDING' },
      });

      const runRes = await request(app.getHttpServer())
        .post('/api/matches/auto')
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      expect(runRes.body.matchedCount).toBe(1);

      // Verify match created strictly belongs to Tenant B
      const matchesB = await prisma.reconciliationMatch.findMany({
        where: { tenantId: TENANT_B_ID },
      });
      expect(matchesB.length).toBe(1);
      expect(matchesB[0].expectedPaymentId).toBe('EXP-B-1001');
      expect(matchesB[0].receivedPaymentId).toBe('TX-B-900001');

      // Tenant A pending orders must NOT have been matched by Tenant B's run
      const countAfterA = await prisma.expectedPayment.count({
        where: { tenantId: TENANT_A_ID, status: 'PENDING' },
      });
      expect(countAfterA).toBe(countBeforeA);
    });
  });

  describe('4. Authentication & Public Endpoints Enforcement', () => {
    it('Public endpoint /api/health should be accessible without tenant or auth headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('lissafi-reconciliation-backend');
    });

    it('In strict production mode (DEMO_PILOT_MODE=false), unauthenticated requests must be rejected with 401', async () => {
      const originalMode = process.env.DEMO_PILOT_MODE;
      const originalEnv = process.env.NODE_ENV;
      process.env.DEMO_PILOT_MODE = 'false';
      process.env.NODE_ENV = 'production';

      try {
        const res = await request(app.getHttpServer())
          .get('/api/expected')
          .expect(401);

        expect(res.body.message).toContain('Authentication required');
      } finally {
        process.env.DEMO_PILOT_MODE = originalMode;
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('In strict production mode, valid X-API-Key should successfully authenticate the request', async () => {
      const originalMode = process.env.DEMO_PILOT_MODE;
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.RECONCILO_API_KEY;

      process.env.DEMO_PILOT_MODE = 'false';
      process.env.NODE_ENV = 'production';
      process.env.RECONCILO_API_KEY = 'test-secret-key-xyz';

      try {
        const res = await request(app.getHttpServer())
          .get('/api/expected')
          .set('x-api-key', 'test-secret-key-xyz')
          .set('x-tenant-id', TENANT_A_ID)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      } finally {
        process.env.DEMO_PILOT_MODE = originalMode;
        process.env.NODE_ENV = originalEnv;
        process.env.RECONCILO_API_KEY = originalKey;
      }
    });

    it('Self-serve pilot onboarding: POST /api/auth/request-pilot should provision a new tenant and rules', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/request-pilot')
        .send({
          fullName: 'Bolanle Adeleke',
          businessName: 'Lekki Organic Store',
          email: 'bolanle@lekkiorganic.ng',
          phone: '08099887766',
          volume: '₦50M – ₦250M / month',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.tenant.name).toBe('Lekki Organic Store');
      expect(res.body.user.email).toBe('bolanle@lekkiorganic.ng');

      // Verify rules were initialized for this tenant
      const rules = await prisma.reconciliationRule.findMany({
        where: { tenantId: res.body.tenant.id },
      });
      expect(rules.length).toBe(4);

      // Verify idempotent re-request returns existing workspace
      const repeatRes = await request(app.getHttpServer())
        .post('/api/auth/request-pilot')
        .send({
          fullName: 'Bolanle Adeleke',
          businessName: 'Lekki Organic Store',
          email: 'bolanle@lekkiorganic.ng',
        })
        .expect(201);

      expect(repeatRes.body.isExisting).toBe(true);
      expect(repeatRes.body.tenant.id).toBe(res.body.tenant.id);
    });
  });
});
