import 'dotenv/config';
import { PrismaClient } from '../prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  console.log('Initializing Prisma Client for seed script...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Cleaning database...');
  await prisma.reconciliationMatch.deleteMany({});
  await prisma.expectedPayment.deleteMany({});
  await prisma.receivedPayment.deleteMany({});
  await prisma.reconciliationRule.deleteMany({});

  console.log('Seeding rules...');
  await prisma.reconciliationRule.createMany({
    data: [
      {
        id: 'EXACT_AMOUNT_AND_REF',
        name: 'Exact Amount & Reference Match',
        description:
          'Matches when the payment amount matches exactly and the transaction reference matches the order reference.',
        priority: 10,
        ruleType: 'EXACT_AMOUNT_AND_REF',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
        name: 'Exact Amount & Narrative Reference Match',
        description:
          'Matches when the payment amount matches exactly and the order reference is found within the bank narrative/memo.',
        priority: 8,
        ruleType: 'EXACT_AMOUNT_AND_NARRATIVE_REF',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS',
        name: 'Exact Amount & Contact Info Match',
        description:
          "Matches when the payment amount matches exactly and the customer's phone or email is found in the bank narrative.",
        priority: 7,
        ruleType: 'EXACT_AMOUNT_AND_CUSTOMER_DETAILS',
        isActive: true,
        config: JSON.stringify({ amountTolerance: 0 }),
      },
      {
        id: 'EXACT_AMOUNT_AND_FUZZY_NAME',
        name: 'Exact Amount & Fuzzy Name Match',
        description:
          "Matches when the amount matches, the payment occurred within a 72-hour window, and the sender's name fuzzy-matches the customer name.",
        priority: 6,
        ruleType: 'EXACT_AMOUNT_AND_FUZZY_NAME',
        isActive: true,
        config: JSON.stringify({
          amountTolerance: 0,
          timeWindowHours: 72,
          similarityThreshold: 0.75,
        }),
      },
    ],
  });

  console.log('Seeding Expected Payments (Orders/Invoices)...');
  const now = new Date();

  await prisma.expectedPayment.createMany({
    data: [
      {
        id: 'EXP-1001',
        amount: 12500.0,
        reference: 'ORD-2026-0001',
        customerName: 'Olumide Awosika',
        customerEmail: 'olumide@awosika.com',
        customerPhone: '08034567890',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        description: 'Standard Food Platter Order',
      },
      {
        id: 'EXP-1002',
        amount: 45000.0,
        reference: 'ORD-2026-0002',
        customerName: 'Chioma Nze',
        customerEmail: 'chioma.nze@yahoo.com',
        customerPhone: '08198765432',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        description: 'Aso-Ebi Fabrics Delivery',
      },
      {
        id: 'EXP-1003',
        amount: 8200.0,
        reference: 'ORD-2026-0003',
        customerName: 'Fatima Abubakar',
        customerEmail: 'fatima@abubakar.me',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48 hours ago
        description: 'Skin Care Essentials Kit',
      },
      {
        id: 'EXP-1004',
        amount: 150000.0,
        reference: 'ORD-2026-0004',
        customerName: 'Emeka Okafor',
        customerPhone: '07012345678',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        description: 'Inverter Battery Deposit',
      },
      {
        id: 'EXP-1005',
        amount: 25000.0,
        reference: 'ORD-2026-0005',
        customerName: 'Babajide Soyinka',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000), // 36 hours ago
        description: 'Weekly Grocery Restock',
      },
      {
        id: 'EXP-1006',
        amount: 5000.0,
        reference: 'ORD-2026-0006',
        customerName: 'Tariq Ibrahim',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
        description: 'Perfume Tester Oil',
      },
      {
        id: 'EXP-1007',
        amount: 32000.0,
        reference: 'ORD-2026-0007',
        customerName: 'Nkechi Egwu',
        customerPhone: '09088776655',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
        description: 'Hair Extension Bundle',
      },
      {
        id: 'EXP-1008',
        amount: 10000.0,
        reference: 'ORD-2026-0008',
        customerName: 'Kelechi Uzo',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        description: 'Lagos Logistics Dispatch Delivery',
      },
      {
        id: 'EXP-1009',
        amount: 10000.0,
        reference: 'ORD-2026-0009',
        customerName: 'Zainab Bello',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        description: 'Skincare Package Mini',
      },
    ],
  });

  console.log('Seeding Received Payments (Transactions)...');
  await prisma.receivedPayment.createMany({
    data: [
      {
        id: 'TX-900001',
        amount: 12500.0,
        channel: 'BANK_TRANSFER',
        provider: 'OPay',
        reference: 'ORD-2026-0001',
        senderName: 'OLUMIDE AWOSIKA',
        senderAccount: '903***5566',
        narrative: 'TRSF / ORD-2026-0001 / FOOD PLATTER',
        createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900002',
        amount: 45000.0,
        channel: 'BANK_TRANSFER',
        provider: 'GTBank',
        reference: 'GTB-TRSF-0019283',
        senderName: 'NZE CHIOMA CHINELO',
        senderAccount: '011***4928',
        narrative: 'TRSF FROM NZE CHIOMA CHINELO TO RECONCILO',
        createdAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
        status: 'UNMATCHED',
      },
      {
        id: 'TX-900003',
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

  console.log('Database seeded successfully!');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error('Seed script failed:', e);
  process.exit(1);
});
