import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserRole,
  RuleType,
  AuditAction,
} from '../../prisma/generated/prisma/client';

export interface RequestPilotDto {
  fullName: string;
  businessName: string;
  email: string;
  phone?: string;
  volume?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async requestPilotWorkspace(dto: RequestPilotDto) {
    const { fullName, businessName, email, phone, volume } = dto;

    if (!fullName || !businessName || !email) {
      throw new BadRequestException(
        'Full name, business name, and email are required.',
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedBusiness = businessName.trim();
    const trimmedName = fullName.trim();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
      include: { tenant: true },
    });

    if (existingUser) {
      // User already has a workspace, return existing context
      const token = `pilot_${Buffer.from(
        JSON.stringify({
          tenantId: existingUser.tenant.id,
          email: existingUser.email,
        }),
      ).toString('base64')}`;

      return {
        success: true,
        isExisting: true,
        message: 'Welcome back! Your existing business workspace was retrieved.',
        tenant: {
          id: existingUser.tenant.id,
          name: existingUser.tenant.name,
          slug: existingUser.tenant.slug,
        },
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
        token,
      };
    }

    // Generate unique slug
    const baseSlug = trimmedBusiness
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const slug = `${baseSlug || 'business'}-${randomSuffix}`;

    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: trimmedBusiness,
          slug,
          currency: 'NGN',
        },
      });

      // 2. Create User as FINANCE_LEAD
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: trimmedEmail,
          name: trimmedName,
          role: UserRole.FINANCE_LEAD,
        },
      });

      // 3. Provision Default Rules for new Tenant
      const baseRules = [
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

      await tx.reconciliationRule.createMany({
        data: baseRules.map((r) => ({ ...r, tenantId: tenant.id })),
      });

      // 4. Log Provisioning in AuditLog
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: AuditAction.WORKSPACE_PROVISIONED,
          user: trimmedEmail,
          reason: `Self-serve pilot workspace provisioned for ${trimmedBusiness}`,
          details: JSON.stringify({
            fullName: trimmedName,
            phone: phone || null,
            estimatedVolume: volume || null,
          }),
        },
      });

      const token = `pilot_${Buffer.from(
        JSON.stringify({ tenantId: tenant.id, email: user.email }),
      ).toString('base64')}`;

      return {
        success: true,
        isExisting: false,
        message: `Workspace successfully provisioned for ${trimmedBusiness}`,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      };
    });
  }
}
