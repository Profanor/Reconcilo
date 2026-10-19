import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Bypass tenant validation for health check and docs
    const path = request.url || '';
    if (path.includes('/health') || path.includes('/docs')) {
      return true;
    }

    // 1. Check for explicit header (x-tenant-id or x-tenant-slug)
    const headerTenantId = request.headers['x-tenant-id'] as string;
    const headerTenantSlug = request.headers['x-tenant-slug'] as string;

    // 2. Check for Authorization header if JWT or API key is passed
    const authHeader = request.headers['authorization'] as string;
    let tokenTenantId: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In production, parse/verify JWT payload
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString());
        if (decoded?.tenantId) {
          tokenTenantId = decoded.tenantId;
        }
      } catch {
        // Fallback or ignore if not base64 jwt
      }
    }

    const candidateId = tokenTenantId || headerTenantId;

    let tenant = null;

    if (candidateId) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: candidateId },
      });
    } else if (headerTenantSlug) {
      tenant = await this.prisma.tenant.findUnique({
        where: { slug: headerTenantSlug },
      });
    }

    // Fallback: If no tenant specified, retrieve the primary default tenant for pilot/demo mode
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant context could not be resolved. Please ensure a tenant exists or provide a valid X-Tenant-Id header.',
      );
    }

    request.tenant = tenant;
    request.tenantId = tenant.id;

    return true;
  }
}
