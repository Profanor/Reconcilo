import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantGuard } from './auth/tenant.guard';
import { ExpectedPaymentsModule } from './expected-payments/expected-payments.module';
import { ReceivedPaymentsModule } from './received-payments/received-payments.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RulesModule } from './rules/rules.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExpectedPaymentsModule,
    ReceivedPaymentsModule,
    ReconciliationModule,
    RulesModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
