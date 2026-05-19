import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceivedPayment } from '../../prisma/generated/prisma/client';

@Injectable()
export class ReceivedPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, search?: string): Promise<ReceivedPayment[]> {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { narrative: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.receivedPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
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
      where: { reference },
    });

    if (existing) {
      throw new BadRequestException(
        `A received payment with reference '${reference}' already exists.`,
      );
    }

    const paymentId = id || `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    return await this.prisma.receivedPayment.create({
      data: {
        id: paymentId,
        amount,
        channel,
        provider,
        reference,
        narrative: narrative || null,
        senderName: senderName || null,
        senderAccount: senderAccount || null,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        status: 'UNMATCHED',
      },
    });
  }

  async importCsv(csvText: string): Promise<any> {
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

        const existing = await this.prisma.receivedPayment.findUnique({
          where: { reference },
        });

        if (existing) {
          skipCount++;
          continue;
        }

        const id = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

        await this.prisma.receivedPayment.create({
          data: {
            id,
            amount,
            channel,
            provider,
            reference,
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
