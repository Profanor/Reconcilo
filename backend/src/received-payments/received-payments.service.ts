import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceivedPayment, PaymentChannel } from '../../prisma/generated/prisma/client';

export function parsePaymentChannel(channel: string): PaymentChannel {
  const normalized = (channel || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'TRANSFER' || normalized === 'BANK' || normalized === 'BANK_TRANSFER') {
    return PaymentChannel.BANK_TRANSFER;
  }
  if (normalized === 'POS' || normalized === 'TERMINAL') {
    return PaymentChannel.POS;
  }
  if (normalized === 'WALLET' || normalized === 'FINTECH') {
    return PaymentChannel.WALLET;
  }
  if (normalized === 'CASH') {
    return PaymentChannel.CASH;
  }
  return PaymentChannel.BANK_TRANSFER;
}

@Injectable()
export class ReceivedPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string, search?: string): Promise<ReceivedPayment[]> {
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.AND = [
        { tenantId },
        {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
            { senderName: { contains: search, mode: 'insensitive' } },
            { narrative: { contains: search, mode: 'insensitive' } },
            { provider: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return await this.prisma.receivedPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: {
    id?: string;
    amount: number;
    channel: string;
    provider: string;
    reference: string;
    narrative?: string;
    senderName?: string;
    senderAccount?: string;
    createdAt?: string;
  }): Promise<ReceivedPayment> {
    const {
      id,
      amount,
      channel,
      provider,
      reference,
      narrative,
      senderName,
      senderAccount,
      createdAt,
    } = data;

    if (!amount || !channel || !provider || !reference) {
      throw new BadRequestException(
        'Missing required fields: amount, channel, provider, reference',
      );
    }

    const existing = await this.prisma.receivedPayment.findUnique({
      where: {
        tenantId_reference: {
          tenantId,
          reference: reference.trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A received payment with reference '${reference}' already exists in your workspace.`,
      );
    }

    const paymentId = id || `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    return await this.prisma.receivedPayment.create({
      data: {
        id: paymentId,
        tenantId,
        amount,
        channel: parsePaymentChannel(channel),
        provider,
        reference: reference.trim(),
        narrative: narrative?.trim() || null,
        senderName: senderName?.trim() || null,
        senderAccount: senderAccount?.trim() || null,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        status: 'UNMATCHED',
      },
    });
  }

  async importCsv(tenantId: string, csvText: string): Promise<any> {
    if (!csvText) {
      throw new BadRequestException('Missing CSV content (csvText)');
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length <= 1) {
      throw new BadRequestException('CSV has no data rows');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const required = ['amount', 'channel', 'provider', 'reference'];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      throw new BadRequestException(
        `CSV missing required columns: ${missing.join(', ')}`,
      );
    }

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]
        .split(',')
        .map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
      if (row.length < headers.length) continue;

      const rowObj: any = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index];
      });

      try {
        const amount = parseFloat(rowObj.amount);
        const {
          channel,
          provider,
          reference,
          narrative,
          sendername,
          senderaccount,
          createdat,
        } = rowObj;

        if (isNaN(amount) || !channel || !provider || !reference) {
          errors.push(`Row ${i + 1}: Invalid data`);
          continue;
        }

        const trimmedRef = reference.trim();
        const existing = await this.prisma.receivedPayment.findUnique({
          where: {
            tenantId_reference: {
              tenantId,
              reference: trimmedRef,
            },
          },
        });

        if (existing) {
          skipCount++;
          continue;
        }

        const id = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

        await this.prisma.receivedPayment.create({
          data: {
            id,
            tenantId,
            amount,
            channel: parsePaymentChannel(channel),
            provider,
            reference: trimmedRef,
            narrative: narrative || null,
            senderName: sendername || null,
            senderAccount: senderaccount || null,
            createdAt: createdat ? new Date(createdat) : new Date(),
            status: 'UNMATCHED',
          },
        });

        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      message: `CSV ingestion completed: ${successCount} imported, ${skipCount} skipped, ${errors.length} errors.`,
      details: {
        successCount,
        skipCount,
        errorCount: errors.length,
        errors,
      },
    };
  }
}
