import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.tenant?.id;
    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant context could not be identified or authenticated',
      );
    }
    return tenantId;
  },
);
