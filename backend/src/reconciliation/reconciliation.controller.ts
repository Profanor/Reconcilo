import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { ReconciliationService } from "./reconciliation.service";
import type { Response } from "express";

@Controller("matches")
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  async getMatches() {
    return await this.reconciliationService.getMatches();
  }

  @Post("auto")
  @HttpCode(HttpStatus.OK)
  async runAutoReconciliation(
    @Body("allowFuzzyAuto") allowFuzzyAuto?: boolean,
    @Body("actor") actor?: string,
  ) {
    const result = await this.reconciliationService.reconcileAllUnmatched({
      allowFuzzyAuto: allowFuzzyAuto ?? false,
      actor,
    });
    return {
      message: `Reconciliation run finished: ${result.matchedCount} exact matches confirmed.`,
      matchedCount: result.matchedCount,
      remainingUnmatched: result.remainingUnmatched,
    };
  }

  @Get("exceptions")
  async getExceptionQueue() {
    return await this.reconciliationService.getExceptionQueue();
  }

  @Post("confirm-suggestion")
  async confirmSuggestion(
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("confirmedBy") confirmedBy?: string,
    @Body("notes") notes?: string,
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException(
        "expectedPaymentId and receivedPaymentId are required",
      );
    }
    try {
      return await this.reconciliationService.confirmSuggestion(
        expectedPaymentId,
        receivedPaymentId,
        confirmedBy,
        notes,
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Post("reject-suggestion")
  async rejectSuggestion(
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("rejectedBy") rejectedBy?: string,
    @Body("reason") reason?: string,
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException(
        "expectedPaymentId and receivedPaymentId are required",
      );
    }
    try {
      return await this.reconciliationService.rejectSuggestion(
        expectedPaymentId,
        receivedPaymentId,
        rejectedBy,
        reason,
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Post("manual")
  async manualMatch(
    @Body("expectedPaymentId") expectedPaymentId: string,
    @Body("receivedPaymentId") receivedPaymentId: string,
    @Body("notes") notes?: string,
    @Body("matchedBy") matchedBy?: string,
  ) {
    if (!expectedPaymentId || !receivedPaymentId) {
      throw new BadRequestException(
        "expectedPaymentId and receivedPaymentId are required",
      );
    }
    try {
      return await this.reconciliationService.manualMatch(
        expectedPaymentId,
        receivedPaymentId,
        notes,
        matchedBy,
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Post("unmatch/:id")
  async unmatch(
    @Param("id") id: string,
    @Body("unmatchBy") unmatchBy?: string,
    @Body("reason") reason?: string,
  ) {
    try {
      return await this.reconciliationService.unmatch(id, unmatchBy, reason);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Get("audit")
  async getAuditLogs() {
    return await this.reconciliationService.getAuditLogs();
  }

  @Get("report")
  async getReport() {
    return await this.reconciliationService.generateReport();
  }

  @Get("report/csv")
  async getReportCsv(@Res() res: Response) {
    const csvData = await this.reconciliationService.generateReportCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reconciliation-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csvData);
  }
}
