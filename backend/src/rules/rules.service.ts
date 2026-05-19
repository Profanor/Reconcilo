import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReconciliationRule } from '../../prisma/generated/prisma/client';

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<ReconciliationRule[]> {
    return await this.prisma.reconciliationRule.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async update(
    id: string,
    data: {
      isActive?: boolean;
      priority?: number;
      config?: any;
    },
  ): Promise<ReconciliationRule> {
    const rule = await this.prisma.reconciliationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(
        `Reconciliation rule with ID ${id} not found`,
      );
    }

    const updateData: any = {};

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }

    if (data.priority !== undefined) {
      updateData.priority = parseInt(data.priority as any, 10);
    }

    if (data.config !== undefined) {
      try {
        const parsed =
          typeof data.config === 'string'
            ? JSON.parse(data.config)
            : data.config;
        updateData.config = JSON.stringify(parsed);
      } catch (e) {
        throw new BadRequestException(
          'Invalid JSON configuration in config field',
        );
      }
    }

    return await this.prisma.reconciliationRule.update({
      where: { id },
      data: updateData,
    });
  }
}
