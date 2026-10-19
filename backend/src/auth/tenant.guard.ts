import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Bypass check for @Public() decorated endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const path = request.url || '';

    if (isPublic || path.includes('/health') || path.includes('/docs')) {
      return true;
    }

    // 2. Check for X-API-Key header (for external service integrations / webhooks)
    const apiKey = request.headers['x-api-key'] as string;
    const configuredApiKey =
      process.env.RECONCILO_API_KEY || process.env.API_KEY_SECRET;

    let isAuthenticated = false;
    let tokenTenantId: string | undefined;

    if (apiKey && configuredApiKey && apiKey === configuredApiKey) {
      isAuthenticated = true;
    }

    // 3. Check for Bearer JWT token in Authorization header
    const authHeader = request.headers['authorization'] as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        let decoded: any = null;

        if (token.startsWith('pilot_')) {
          // Pilot token format: pilot_<base64(json)>
          const b64 = token.substring(6); // strip "pilot_"
          decoded = JSON.parse(Buffer.from(b64, 'base64').toString());
        } else {
          // Standard JWT format: header.payload.signature
          const payloadStr = Buffer.from(
            token.split('.')[1] || '',
            'base64',
          ).toString();
          decoded = JSON.parse(payloadStr);
        }

        if (decoded?.tenantId) {
          tokenTenantId = decoded.tenantId;
          isAuthenticated = true;
          request.user = decoded;
        }
      } catch {
        // Invalid token format
      }
    }

    // 4. Resolve Tenant Context
    const headerTenantId = request.headers['x-tenant-id'] as string;
    const headerTenantSlug = request.headers['x-tenant-slug'] as string;
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

    // 5. Demo / Pilot Mode Handling
    // DEMO_PILOT_MODE allows prospective client presentations without a login wall
    const isDemoMode =
      process.env.DEMO_PILOT_MODE === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!tenant && isDemoMode) {
      // Fallback to default demo tenant for pilot exploration
      tenant = await this.prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (tenant) {
        request.isDemo = true;
      }
    }

    // 6. Enforce Authentication in Strict Production Mode
    if (!isDemoMode && !isAuthenticated) {
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid Bearer JWT token or X-API-Key header.',
      );
    }

    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant context could not be resolved. Please provide a valid X-Tenant-Id or authentication credentials.',
      );
    }

    request.tenant = tenant;
    request.tenantId = tenant.id;

    return true;
  }
}
