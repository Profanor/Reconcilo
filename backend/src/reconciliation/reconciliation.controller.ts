import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, BadRequestException } from "@nestjs/common";
import { ReconciliationService } from "./reconciliation.service";
import { CurrentTenant } from "../auth/tenant.decorator";

@Controller("matches")
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  async getMatches(@CurrentTenant() tenantId: string) {
    return await this.reconciliationService.getMatches(tenantId);
  }

  @Post("auto")
  @HttpCode(HttpStatus.OK)
  async runAutoReconciliation(
    @CurrentTenant() tenantId: string,
    @Body("actor") actor?: string,
  ) {
    const { matchedCount, remainingUnmatched } = await this.reconciliationService.reconcileAllUnmatched(tenantId, actor);
    return {
      message: "Batch auto-reconciliation run completed.",
      matchedCount,
      remainingUnmatched,
    };
  }

  @Post("manual")
  async manualMatch(
    @CurrentTenant() tenantId: string,
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("notes") notes?: string,
    @Body("matchedBy") matchedBy?: string,
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException("expectedPaymentId and receivedPaymentId are required");
    }
    return await this.reconciliationService.manualMatch(
      tenantId,
      expectedPaymentId,
      receivedPaymentId,
      notes,
      matchedBy,
    );
  }

  @Post("unmatch/:id")
  async unmatch(
    @CurrentTenant() tenantId: string,
    @Param("id") id: string,
    @Body("actor") actor?: string,
    @Body("reason") reason?: string,
  ) {
    return await this.reconciliationService.unmatch(tenantId, id, actor, reason);
  }
}
