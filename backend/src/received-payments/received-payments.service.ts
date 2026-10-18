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

  async importCsv(
    csvText: string,
    actor: string = 'AUTHORIZED_USER',
  ): Promise<any> {
    const { normalizeReceivedPaymentsCsv } = await import(
      '../engine/normalizer'
    );
    const parsed = normalizeReceivedPaymentsCsv(csvText);

    if (!parsed.success && parsed.validRecords.length === 0) {
      throw new BadRequestException(
        parsed.errors.length > 0
          ? parsed.errors[0].reason
          : 'Invalid or empty bank statement CSV content',
      );
    }

    const duplicates = [...parsed.duplicates];
    const errors = [...parsed.errors];
    let importedCount = 0;

    for (const record of parsed.validRecords) {
      const existing = await this.prisma.receivedPayment.findUnique({
        where: { reference: record.reference },
      });

      if (existing) {
        duplicates.push({
          rowNumber: 0,
          reference: record.reference,
          reason: `Transaction reference/session ID "${record.reference}" already recorded in database`,
        });
        continue;
      }

      const id = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

      try {
        await this.prisma.receivedPayment.create({
          data: {
            id,
            amount: record.amount,
            channel: record.channel,
            provider: record.provider,
            reference: record.reference,
            narrative: record.narrative || null,
            senderName: record.senderName || null,
            senderAccount: record.senderAccount || null,
            createdAt: record.createdAt,
            status: 'UNMATCHED',
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push({
          rowNumber: 0,
          raw: record.reference,
          reason: `Database error: ${err.message}`,
        });
      }
    }

    if (duplicates.length > 0) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'DUPLICATE_FLAGGED',
            user: actor,
            reason: `${duplicates.length} duplicate received bank transactions detected during upload`,
            details: JSON.stringify(duplicates),
          },
        });
      } catch (e) {
        // Log gracefully
      }
    }

    return {
      message: `Bank statement processed: ${importedCount} imported, ${duplicates.length} duplicate transactions flagged, ${errors.length} failed rows.`,
      details: {
        totalRows: parsed.totalRows,
        importedCount,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        duplicates,
        errors,
      },
    };
  }
}

