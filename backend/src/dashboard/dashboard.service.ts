import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<any> {
    const expectedCounts = await this.prisma.expectedPayment.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
      _sum: { amount: true },
    });

    const receivedCounts = await this.prisma.receivedPayment.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
      _sum: { amount: true },
    });

    const channelBreakdown = await this.prisma.receivedPayment.groupBy({
      by: ["channel"],
      where: { tenantId, status: "MATCHED" },
      _sum: { amount: true },
      _count: { id: true },
    });

    const providerBreakdown = await this.prisma.receivedPayment.groupBy({
      by: ["provider"],
      where: { tenantId, status: "MATCHED" },
      _sum: { amount: true },
      _count: { id: true },
    });

    let totalExpectedCount = 0;
    let totalExpectedAmount = 0;
    let matchedExpectedCount = 0;
    let matchedExpectedAmount = 0;
    let pendingExpectedCount = 0;
    let pendingExpectedAmount = 0;

    for (const group of expectedCounts) {
      const count = group._count.id;
      const sum = group._sum.amount || 0;
      totalExpectedCount += count;
      totalExpectedAmount += sum;
      
      if (group.status === "MATCHED") {
        matchedExpectedCount = count;
        matchedExpectedAmount = sum;
      } else if (group.status === "PENDING") {
        pendingExpectedCount = count;
        pendingExpectedAmount = sum;
      }
    }

    let totalReceivedCount = 0;
    let totalReceivedAmount = 0;
    let matchedReceivedCount = 0;
    let matchedReceivedAmount = 0;
    let unmatchedReceivedCount = 0;
    let unmatchedReceivedAmount = 0;

    for (const group of receivedCounts) {
      const count = group._count.id;
      const sum = group._sum.amount || 0;
      totalReceivedCount += count;
      totalReceivedAmount += sum;

      if (group.status === "MATCHED") {
        matchedReceivedCount = count;
        matchedReceivedAmount = sum;
      } else if (group.status === "UNMATCHED") {
        unmatchedReceivedCount = count;
        unmatchedReceivedAmount = sum;
      }
    }

    const reconciliationRate = totalExpectedCount > 0 
      ? parseFloat(((matchedExpectedCount / totalExpectedCount) * 100).toFixed(1))
      : 0;

    const recentMatches = await this.prisma.reconciliationMatch.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { matchedAt: "desc" },
      include: {
        expectedPayment: {
          select: { reference: true, customerName: true },
        },
        receivedPayment: {
          select: { channel: true, provider: true, reference: true },
        },
      },
    });

    const matchesAll = await this.prisma.reconciliationMatch.findMany({
      where: { tenantId },
    });
    const exactAutomaticCount = matchesAll.filter(m => m.matchMethod === "AUTOMATIC_EXACT").length;
    const confirmedSuggestionsCount = matchesAll.filter(m => m.matchMethod === "CONFIRMED_SUGGESTION").length;
    const manualMatchesCount = matchesAll.filter(m => m.matchMethod === "MANUAL").length;

    let auditLogs: any[] = [];
    try {
      auditLogs = await this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (e) {}

    const falseMatchesPrevented = auditLogs.filter((l: any) => l.action === "REJECT_SUGGESTION").length;
    const unmatchesCount = auditLogs.filter((l: any) => l.action === "UNMATCH").length;
    const duplicatesCount = auditLogs.filter((l: any) => l.action === "DUPLICATE_FLAGGED").length;

    return {
      expected: {
        totalCount: totalExpectedCount,
        totalAmount: totalExpectedAmount,
        matchedCount: matchedExpectedCount,
        matchedAmount: matchedExpectedAmount,
        pendingCount: pendingExpectedCount,
        pendingAmount: pendingExpectedAmount,
      },
      received: {
        totalCount: totalReceivedCount,
        totalAmount: totalReceivedAmount,
        matchedCount: matchedReceivedCount,
        matchedAmount: matchedReceivedAmount,
        unmatchedCount: unmatchedReceivedCount,
        unmatchedAmount: unmatchedReceivedAmount,
      },
      reconciliationRate,
      trustMetrics: {
        totalMatchedCount: matchesAll.length,
        exactAutomaticCount,
        confirmedSuggestionsCount,
        manualMatchesCount,
        falseMatchesPrevented,
        unmatchesCount,
        duplicatesCount,
      },
      channelBreakdown: channelBreakdown.map(c => ({
        channel: c.channel,
        count: c._count.id,
        amount: c._sum.amount || 0,
      })),
      providerBreakdown: providerBreakdown.map(p => ({
        provider: p.provider,
        count: p._count.id,
        amount: p._sum.amount || 0,
      })),
      recentMatches,
      recentAudit: auditLogs.slice(0, 10),
    };
  }
}
