import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<any> {
    const expectedCounts = await this.prisma.expectedPayment.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    });

    const receivedCounts = await this.prisma.receivedPayment.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    });

    const channelBreakdown = await this.prisma.receivedPayment.groupBy({
      by: ["channel"],
      where: { status: "MATCHED" },
      _sum: { amount: true },
      _count: { id: true },
    });

    const providerBreakdown = await this.prisma.receivedPayment.groupBy({
      by: ["provider"],
      where: { status: "MATCHED" },
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

    const reconciliationRate =
      totalExpectedCount > 0
        ? parseFloat(
            ((matchedExpectedCount / totalExpectedCount) * 100).toFixed(1),
          )
        : 0;

    const matches = await this.prisma.reconciliationMatch.findMany({
      select: {
        id: true,
        matchMethod: true,
        confidenceScore: true,
        matchedAt: true,
      },
    });

    let exactAutomaticCount = 0;
    let confirmedSuggestionsCount = 0;
    let manualMatchesCount = 0;

    for (const m of matches) {
      if (m.matchMethod === "AUTOMATIC_EXACT") exactAutomaticCount++;
      else if (m.matchMethod === "CONFIRMED_SUGGESTION")
        confirmedSuggestionsCount++;
      else if (m.matchMethod === "MANUAL") manualMatchesCount++;
    }

    let falseMatchesPrevented = 0;
    let unmatchesCount = 0;
    let duplicatesCount = 0;
    let recentAudit: any[] = [];

    if (this.prisma.auditLog) {
      try {
        const auditLogs = await this.prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        falseMatchesPrevented = auditLogs.filter(
          (l) => l.action === "REJECT_SUGGESTION",
        ).length;
        unmatchesCount = auditLogs.filter((l) => l.action === "UNMATCH").length;
        duplicatesCount = auditLogs.filter(
          (l) => l.action === "DUPLICATE_FLAGGED",
        ).length;
        recentAudit = auditLogs.slice(0, 10);
      } catch (e) {
        // gracefully handle if audit table empty
      }
    }

    const recentMatches = await this.prisma.reconciliationMatch.findMany({
      take: 8,
      orderBy: { matchedAt: "desc" },
      include: {
        expectedPayment: {
          select: { reference: true, customerName: true, amount: true },
        },
        receivedPayment: {
          select: {
            channel: true,
            provider: true,
            reference: true,
            amount: true,
            senderName: true,
          },
        },
      },
    });

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
        totalMatchedCount: matches.length,
        exactAutomaticCount,
        confirmedSuggestionsCount,
        manualMatchesCount,
        falseMatchesPrevented,
        unmatchesCount,
        duplicatesCount,
      },
      channelBreakdown: channelBreakdown.map((c) => ({
        channel: c.channel,
        count: c._count.id,
        amount: c._sum.amount || 0,
      })),
      providerBreakdown: providerBreakdown.map((p) => ({
        provider: p.provider,
        count: p._count.id,
        amount: p._sum.amount || 0,
      })),
      recentMatches,
      recentAudit,
    };
  }
}
