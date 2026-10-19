import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  RuleType,
  ExpectedPaymentStatus,
  ReceivedPaymentStatus,
  PaymentChannel,
  MatchMethod,
  AuditAction,
} from '../prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  console.log('Initializing Prisma Client for multi-tenant seed script...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Cleaning existing database tables...');
  await prisma.auditLog.deleteMany({});
  await prisma.reconciliationMatch.deleteMany({});
  await prisma.reconciliationRun.deleteMany({});
  await prisma.expectedPayment.deleteMany({});
  await prisma.receivedPayment.deleteMany({});
  await prisma.reconciliationRule.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Creating Tenants...');
  const tenantApex = await prisma.tenant.create({
    data: {
      id: 'tenant-apex-001',
      name: 'Apex Superstores & Logistics Nigeria Ltd',
      slug: 'apex-superstores',
      cacNumber: 'RC-1849201',
      currency: 'NGN',
    },
  });

  const tenantAlaba = await prisma.tenant.create({
    data: {
      id: 'tenant-alaba-002',
      name: 'Alaba Prime Wholesale Electronics Ltd',
      slug: 'alaba-prime',
      cacNumber: 'RC-948123',
      currency: 'NGN',
    },
  });

  console.log('Creating Users...');
  await prisma.user.createMany({
    data: [
      {
        id: 'usr-apex-01',
        tenantId: tenantApex.id,
        name: 'David Okoye',
        email: 'david@apex.ng',
        role: 'FINANCE_LEAD',
      },
      {
        id: 'usr-alaba-01',
        tenantId: tenantAlaba.id,
        name: 'Chidi Anozie',
        email: 'chidi@alabaprime.com',
        role: UserRole.FINANCE_LEAD,
      },
    ],
  });

  console.log('Seeding Rules for both tenants...');
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
      description:
        'Matches when the payment amount matches exactly and the transaction reference matches the order reference.',
      priority: 10,
      ruleType: RuleType.EXACT_AMOUNT_AND_REF,
      isActive: true,
      config: JSON.stringify({ amountTolerance: 0 }),
    },
    {
      id: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
      name: 'Exact Amount & Narrative Reference Match',
      description:
        'Matches when the payment amount matches exactly and the order reference is found within the bank narrative/memo.',
      priority: 8,
      ruleType: RuleType.EXACT_AMOUNT_AND_NARRATIVE_REF,
      isActive: true,
      config: JSON.stringify({ amountTolerance: 0 }),
    },
    {
      id: 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS',
      name: 'Exact Amount & Contact Info Match',
      description:
        "Matches when the payment amount matches exactly and the customer's phone or email is found in the bank narrative.",
      priority: 7,
      ruleType: RuleType.EXACT_AMOUNT_AND_CUSTOMER_DETAILS,
      isActive: true,
      config: JSON.stringify({ amountTolerance: 0 }),
    },
    {
      id: 'EXACT_AMOUNT_AND_FUZZY_NAME',
      name: 'Exact Amount & Fuzzy Name Match',
      description:
        "Matches when the amount matches, the payment occurred within a 72-hour window, and the sender's name fuzzy-matches the customer name.",
      priority: 6,
      ruleType: RuleType.EXACT_AMOUNT_AND_FUZZY_NAME,
      isActive: true,
      config: JSON.stringify({
        amountTolerance: 0,
        timeWindowHours: 72,
        similarityThreshold: 0.75,
      }),
    },
  ];

  await prisma.reconciliationRule.createMany({
    data: [
      ...baseRules.map((r) => ({ ...r, tenantId: tenantApex.id })),
      ...baseRules.map((r) => ({ ...r, tenantId: tenantAlaba.id })),
    ],
  });

  const now = new Date();

  console.log('Seeding Expected Payments (Tenant A: Apex Superstores)...');
  await prisma.expectedPayment.createMany({
    data: [
      {
        id: 'EXP-1001',
        tenantId: tenantApex.id,
        amount: 12500.0,
        reference: 'ORD-2026-0001',
        customerName: 'Olumide Awosika',
        customerEmail: 'olumide@awosika.com',
        customerPhone: '08034567890',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        description: 'Standard Food Platter Order',
      },
      {
        id: 'EXP-1002',
        tenantId: tenantApex.id,
        amount: 45000.0,
        reference: 'ORD-2026-0002',
        customerName: 'Chioma Nze',
        customerEmail: 'chioma.nze@yahoo.com',
        customerPhone: '08198765432',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        description: 'Aso-Ebi Fabrics Delivery',
      },
      {
        id: 'EXP-1003',
        tenantId: tenantApex.id,
        amount: 8200.0,
        reference: 'ORD-2026-0003',
        customerName: 'Fatima Abubakar',
        customerEmail: 'fatima.abubakar@gmail.com',
        customerPhone: '09011223344',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        description: 'Groceries and Toiletries',
      },
      {
        id: 'EXP-1004',
        tenantId: tenantApex.id,
        amount: 150000.0,
        reference: 'ORD-2026-0004',
        customerName: 'Emeka Okafor',
        customerEmail: 'e.okafor@techhub.ng',
        customerPhone: '07055443322',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        description: 'Generator Servicing & Inverter Batteries',
      },
      {
        id: 'EXP-1005',
        tenantId: tenantApex.id,
        amount: 25000.0,
        reference: 'ORD-2026-0005',
        customerName: 'Babajide Soyinka',
        customerEmail: 'bsoyinka@lawfirm.com',
        customerPhone: '08022334455',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
        description: 'Legal Practice Supplies',
      },
      {
        id: 'EXP-1006',
        tenantId: tenantApex.id,
        amount: 5500.0,
        reference: 'ORD-2026-0006',
        customerName: 'Tariq Ibrahim',
        customerEmail: 'tariq.ib@abuja.gov.ng',
        customerPhone: '08133445566',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        description: 'Stationery & Printing Paper Pack',
      },
      {
        id: 'EXP-1007',
        tenantId: tenantApex.id,
        amount: 18500.0,
        reference: 'ORD-2026-0007',
        customerName: 'Chukwuma Dike',
        customerEmail: 'chukwuma.dike@logistics.ng',
        customerPhone: '09077889900',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        description: 'Courier Express Shipping Deposit',
      },
      {
        id: 'EXP-1008',
        tenantId: tenantApex.id,
        amount: 10000.0,
        reference: 'ORD-2026-0008',
        customerName: 'Kelechi Uzo',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        description: 'Lagos Logistics Dispatch Delivery',
      },
      {
        id: 'EXP-1009',
        tenantId: tenantApex.id,
        amount: 10000.0,
        reference: 'ORD-2026-0009',
        customerName: 'Zainab Bello',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        description: 'Skincare Package Mini',
      },
    ],
  });

  console.log('Seeding Received Inflows (Tenant A: Apex Superstores)...');
  await prisma.receivedPayment.createMany({
    data: [
      {
        id: 'TX-900001',
        tenantId: tenantApex.id,
        amount: 12500.0,
        channel: 'BANK_TRANSFER',
        provider: 'GTBank',
        reference: 'ORD-2026-0001',
        senderName: 'OLUMIDE AWOSIKA',
        senderAccount: '012***4819',
        narrative: 'TRANSFER FROM OLUMIDE AWOSIKA TO APEX',
        createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900002',
        tenantId: tenantApex.id,
        amount: 45000.0,
        channel: 'BANK_TRANSFER',
        provider: 'ZenithBank',
        reference: 'ZEN-SESSION-8849102831',
        senderName: 'CHIOMA NZE',
        senderAccount: '208***3910',
        narrative: 'PAYMENT FOR ORD-2026-0002 VIA MOBILE APP',
        createdAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900003',
        tenantId: tenantApex.id,
        amount: 8200.0,
        channel: 'POS',
        provider: 'Moniepoint',
        reference: 'MP-POS-8890218',
        senderName: 'FATIMA ABUBAKAR',
        senderAccount: '5061********9028',
        narrative: 'MONIEPOINT POS TERMINAL RECONCILO RETAIL',
        createdAt: new Date(now.getTime() - 40 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900004',
        tenantId: tenantApex.id,
        amount: 150000.0,
        channel: 'BANK_TRANSFER',
        provider: 'AccessBank',
        reference: 'ACC-SESSION-90823192083',
        senderName: 'EMEKA OKAFOR',
        senderAccount: '070***2918',
        narrative: 'transfer for ORD-2026-0004',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900005',
        tenantId: tenantApex.id,
        amount: 25000.0,
        channel: 'BANK_TRANSFER',
        provider: 'ZenithBank',
        reference: 'ZEN-SESSION-992288',
        senderName: 'BABAJIDE J. SOYINKA',
        senderAccount: '101***9921',
        narrative: 'WEEKLY RESTOCK PAYMENT BABAJIDE',
        createdAt: new Date(now.getTime() - 34 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900006',
        tenantId: tenantApex.id,
        amount: 5500.0,
        channel: 'BANK_TRANSFER',
        provider: 'OPay',
        reference: 'OPY-SESSION-4829102',
        senderName: 'TARIQ IBRAHIM',
        senderAccount: '902***1928',
        narrative: 'TRSF FOR ORD-2026-0006',
        createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900007',
        tenantId: tenantApex.id,
        amount: 18500.0,
        channel: 'BANK_TRANSFER',
        provider: 'KudaBank',
        reference: 'KUD-SESSION-001292',
        senderName: 'CHUKWUMA DIKE',
        senderAccount: '201***8822',
        narrative: 'Transfer for hair goods',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900008',
        tenantId: tenantApex.id,
        amount: 10000.0,
        channel: 'POS',
        provider: 'Moniepoint',
        reference: 'MP-POS-9928172',
        senderName: 'WALK-IN CUSTOMER',
        senderAccount: '5061********1209',
        narrative: 'MONIEPOINT POS TERMINAL RECONCILO PAYMENT 10000',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
    ],
  });

  console.log('Seeding initial AuditLog entries...');
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenantApex.id,
        action: 'DUPLICATE_FLAGGED',
        user: 'adaobi.accountant@reconcilo.ng',
        reason: '1 duplicate reference "ORD-2026-0001" flagged and blocked during Shopify CSV import',
        details: JSON.stringify([
          {
            reference: 'ORD-2026-0001',
            reason: 'Duplicate reference detected; original already pending',
          },
        ]),
        createdAt: new Date(now.getTime() - 15 * 60 * 60 * 1000),
      },
      {
        tenantId: tenantApex.id,
        action: 'REJECT_SUGGESTION',
        targetId: 'EXP-1006:TX-900006',
        user: 'adaobi.accountant@reconcilo.ng',
        reason: 'Rejected false match suggestion: payment amount was ₦5,500 but order was ₦5,000 (discrepancy)',
        details: JSON.stringify({
          expectedPaymentId: 'EXP-1006',
          receivedPaymentId: 'TX-900006',
        }),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Seeding Tenant B (Alaba Prime Wholesale) with independent records...');
  // Demonstrates reference reuse across tenants: 'ORD-2026-0001' exists in Tenant A AND Tenant B!
  await prisma.expectedPayment.createMany({
    data: [
      {
        id: 'EXP-B-1001',
        tenantId: tenantAlaba.id,
        amount: 650000.0,
        reference: 'ORD-2026-0001', // Identical reference, isolated by tenantId!
        customerName: 'Alhaji Musa Danbaba',
        customerEmail: 'musa.danbaba@kanotrade.com',
        customerPhone: '08022119988',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        description: 'Wholesale 55-inch Inverter Smart TVs (5 Units)',
      },
      {
        id: 'EXP-B-1002',
        tenantId: tenantAlaba.id,
        amount: 120000.0,
        reference: 'ORD-2026-B002',
        customerName: 'Kalu Obinna',
        customerEmail: 'kalu.obinna@lagoselec.com',
        customerPhone: '08133994411',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        description: 'Copper Sound Cables & Speakers',
      },
    ],
  });

  await prisma.receivedPayment.createMany({
    data: [
      {
        id: 'TX-B-900001',
        tenantId: tenantAlaba.id,
        amount: 650000.0,
        channel: 'BANK_TRANSFER',
        provider: 'FirstBank',
        reference: 'ORD-2026-0001',
        senderName: 'ALHAJI MUSA DANBABA',
        senderAccount: '302***9911',
        narrative: 'FIRSTBANK TRSF / ORD-2026-0001 / ALHAJI MUSA',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-B-900002',
        tenantId: tenantAlaba.id,
        amount: 120000.0,
        channel: 'BANK_TRANSFER',
        provider: 'UBA',
        reference: 'UBA-SESS-99881122',
        senderName: 'KALU OBINNA',
        senderAccount: '209***1829',
        narrative: 'TRANSFER PAYMENT SOUND CABLES',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
    ],
  });

  console.log('Multi-tenant database seeded successfully!');
  console.log(`Tenant A: ${tenantApex.name} (ID: ${tenantApex.id}, Slug: ${tenantApex.slug})`);
  console.log(`Tenant B: ${tenantAlaba.name} (ID: ${tenantAlaba.id}, Slug: ${tenantAlaba.slug})`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error('Multi-tenant seed script failed:', e);
  process.exit(1);
});
