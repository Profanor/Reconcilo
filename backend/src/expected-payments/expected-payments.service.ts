import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExpectedPayment } from "../../prisma/generated/prisma/client";

@Injectable()
export class ExpectedPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string, search?: string): Promise<ExpectedPayment[]> {
    const where: any = { tenantId };
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.AND = [
        { tenantId },
        {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search, mode: "insensitive" } },
            { customerEmail: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    return await this.prisma.expectedPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, data: {
    id?: string;
    amount: number;
    reference: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    dueDate?: string;
    description?: string;
  }): Promise<ExpectedPayment> {
    const { id, amount, reference, customerName, customerPhone, customerEmail, dueDate, description } = data;

    if (!amount || !reference || !customerName) {
      throw new BadRequestException("Missing required fields: amount, reference, customerName");
    }

    const existing = await this.prisma.expectedPayment.findUnique({
      where: {
        tenantId_reference: {
          tenantId,
          reference: reference.trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`An expected payment with reference '${reference}' already exists in your workspace.`);
    }

    const expId = id || `EXP-${Math.floor(100000 + Math.random() * 900000)}`;

    return await this.prisma.expectedPayment.create({
      data: {
        id: expId,
        tenantId,
        amount,
        reference: reference.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description?.trim() || null,
        status: "PENDING",
      },
    });
  }

  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    const payment = await this.prisma.expectedPayment.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new NotFoundException(`Expected payment with ID ${id} not found.`);
    }

    if (payment.status === "MATCHED") {
      throw new BadRequestException("Cannot delete a matched expected payment. Unmatch it first.");
    }

    await this.prisma.expectedPayment.delete({
      where: { id },
    });

    return { message: "Expected payment deleted successfully" };
  }

  async importCsv(
    tenantId: string,
    csvText: string,
    actor: string = "AUTHORIZED_USER",
  ): Promise<any> {
    const { normalizeExpectedPaymentsCsv } = await import(
      "../engine/normalizer"
    );
    const parsed = normalizeExpectedPaymentsCsv(csvText);

    if (!parsed.success && parsed.validRecords.length === 0) {
      throw new BadRequestException(
        parsed.errors.length > 0
          ? parsed.errors[0].reason
          : "Invalid or empty CSV content",
      );
    }

    const duplicates = [...parsed.duplicates];
    const errors = [...parsed.errors];
    let importedCount = 0;

    for (const record of parsed.validRecords) {
      const existing = await this.prisma.expectedPayment.findUnique({
        where: {
          tenantId_reference: {
            tenantId,
            reference: record.reference,
          },
        },
      });

      if (existing) {
        duplicates.push({
          rowNumber: 0,
          reference: record.reference,
          reason: `Reference "${record.reference}" already exists in Expected Payments database`,
        });
        continue;
      }

      const expId = `EXP-${Math.floor(100000 + Math.random() * 900000)}`;

      try {
        await this.prisma.expectedPayment.create({
          data: {
            id: expId,
            tenantId,
            amount: record.amount,
            reference: record.reference,
            customerName: record.customerName,
            customerPhone: record.customerPhone || null,
            customerEmail: record.customerEmail || null,
            dueDate: record.dueDate || null,
            description: record.description || null,
            createdAt: record.createdAt || new Date(),
            status: "PENDING",
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push({
          rowNumber: 0,
          raw: record.reference,
          reason: `Failed to insert record: ${err.message}`,
        });
      }
    }

    if (duplicates.length > 0) {
      try {
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            action: "DUPLICATE_FLAGGED",
            user: actor,
            reason: `${duplicates.length} duplicate expected payment records flagged during CSV upload`,
            details: JSON.stringify(duplicates),
          },
        });
      } catch (e) {
        // Log gracefully
      }
    }

    return {
      message: `Expected payments processed: ${importedCount} imported, ${duplicates.length} duplicates detected, ${errors.length} failed rows.`,
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

