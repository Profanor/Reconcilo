import { Module, Global } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [TenantGuard, AuthService],
  exports: [TenantGuard, AuthService],
})
export class AuthModule {}
