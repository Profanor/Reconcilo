import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExpectedPayment } from "../../prisma/generated/prisma/client";

@Injectable()
export class ExpectedPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, search?: string): Promise<ExpectedPayment[]> {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    return await this.prisma.expectedPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
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
      where: { reference },
    });

    if (existing) {
      throw new BadRequestException(`An expected payment with reference '${reference}' already exists.`);
    }

    const expId = id || `EXP-${Math.floor(100000 + Math.random() * 900000)}`;

    return await this.prisma.expectedPayment.create({
      data: {
        id: expId,
        amount,
        reference,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
        status: "PENDING",
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const payment = await this.prisma.expectedPayment.findUnique({
      where: { id },
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
}
