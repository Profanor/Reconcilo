import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ExpectedPaymentsModule } from "./expected-payments/expected-payments.module";
import { ReceivedPaymentsModule } from "./received-payments/received-payments.module";
import { ReconciliationModule } from "./reconciliation/reconciliation.module";
import { RulesModule } from "./rules/rules.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    PrismaModule,
    ExpectedPaymentsModule,
    ReceivedPaymentsModule,
    ReconciliationModule,
    RulesModule,
    DashboardModule,
  ],
})
export class AppModule {}
