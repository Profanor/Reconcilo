import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, BadRequestException } from "@nestjs/common";
import { ReconciliationService } from "./reconciliation.service";

@Controller("matches")
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  async getMatches() {
    return await this.reconciliationService.getMatches();
  }

  @Post("auto")
  @HttpCode(HttpStatus.OK)
  async runAutoReconciliation() {
    const matchedCount = await this.reconciliationService.reconcileAllUnmatched();
    return {
      message: "Batch auto-reconciliation run completed.",
      matchedCount,
    };
  }

  @Post("manual")
  async manualMatch(
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("notes") notes?: string,
    @Body("matchedBy") matchedBy?: string
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException("expectedPaymentId and receivedPaymentId are required");
    }
    try {
      return await this.reconciliationService.manualMatch(
        expectedPaymentId,
        receivedPaymentId,
        notes,
        matchedBy
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Post("unmatch/:id")
  async unmatch(@Param("id") id: string) {
    try {
      return await this.reconciliationService.unmatch(id);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }
}
