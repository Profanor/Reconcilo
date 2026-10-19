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

  async findAll(tenantId: string): Promise<ReconciliationRule[]> {
    return await this.prisma.reconciliationRule.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      isActive?: boolean;
      priority?: number;
      config?: any;
    },
  ): Promise<ReconciliationRule> {
    const rule = await this.prisma.reconciliationRule.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(
        `Reconciliation rule with ID ${id} not found in workspace`,
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
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });
  }
}
