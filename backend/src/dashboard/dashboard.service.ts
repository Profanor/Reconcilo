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

    const reconciliationRate = totalExpectedCount > 0 
      ? parseFloat(((matchedExpectedCount / totalExpectedCount) * 100).toFixed(1))
      : 0;

    const recentMatches = await this.prisma.reconciliationMatch.findMany({
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
    };
  }
}
