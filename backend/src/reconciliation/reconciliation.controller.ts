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

  @Get("exceptions")
  async getExceptions(@CurrentTenant() tenantId: string) {
    return await this.reconciliationService.getExceptions(tenantId);
  }

  @Get("audit")
  async getAuditLogs(@CurrentTenant() tenantId: string) {
    return await this.reconciliationService.getAuditLogs(tenantId);
  }

  @Post("confirm-suggestion")
  async confirmSuggestion(
    @CurrentTenant() tenantId: string,
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("confirmedBy") confirmedBy?: string,
    @Body("notes") notes?: string,
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException("expectedPaymentId and receivedPaymentId are required");
    }
    return await this.reconciliationService.confirmSuggestion(
      tenantId,
      expectedPaymentId,
      receivedPaymentId,
      confirmedBy,
      notes,
    );
  }

  @Post("reject-suggestion")
  async rejectSuggestion(
    @CurrentTenant() tenantId: string,
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("rejectedBy") rejectedBy?: string,
    @Body("reason") reason?: string,
  ) {
    return await this.reconciliationService.rejectSuggestion(
      tenantId,
      expectedPaymentId,
      receivedPaymentId,
      rejectedBy,
      reason,
    );
  }
}
