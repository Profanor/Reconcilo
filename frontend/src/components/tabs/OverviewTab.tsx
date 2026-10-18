import React from "react";
import type { DashboardStats, ReconciliationMatch, ExceptionQueueData } from "../../api";
import { formatNGN } from "../../api";
import type { NavTab } from "../Sidebar";
import {
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

interface OverviewTabProps {
  stats: DashboardStats;
  matches: ReconciliationMatch[];
  exceptions: ExceptionQueueData | null;
  reviewCount: number;
  setActiveTab: (tab: NavTab) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  matches,
  exceptions,
  reviewCount,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Four Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Expected Payments Total */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Expected Payments</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {formatNGN(stats.expected?.totalAmount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.expected?.totalCount ?? 0} invoices / expected orders
          </div>
        </div>

        {/* 2. Received Inflows Total */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Received Inflows</span>
            <CreditCard size={16} className="text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {formatNGN(stats.received?.totalAmount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.received?.totalCount ?? 0} bank & POS statement credits
          </div>
        </div>

        {/* 3. Successfully Matched */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Successfully Matched</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 tracking-tight">
            {formatNGN(stats.received?.matchedAmount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">{stats.reconciliationRate ?? 0}%</span>
            <span>of expected revenue matched</span>
          </div>
        </div>

        {/* 4. Unreconciled Variance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Unreconciled Variance</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {formatNGN((stats.expected?.pendingAmount ?? 0) + (stats.received?.unmatchedAmount ?? 0))}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.expected?.pendingCount ?? 0} unpaid orders • {stats.received?.unmatchedCount ?? 0} unlinked credits
          </div>
        </div>
      </div>

      {/* Status Breakdown Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Reconciliation Status Summary</h2>
            <p className="text-xs text-slate-500">
              Categorization across deterministic matches, pending orders, and exceptions
            </p>
          </div>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>View ledger</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-md">
            <div className="text-xs font-medium text-emerald-800">Matched Transactions</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{matches.length}</div>
            <div className="text-[11px] text-emerald-600 font-mono mt-0.5">
              {stats.trustMetrics?.exactAutomaticCount ?? 0} exact • {(stats.trustMetrics?.confirmedSuggestionsCount ?? 0) + (stats.trustMetrics?.manualMatchesCount ?? 0)} human verified
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs font-medium text-slate-700">Pending Orders (Unpaid)</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{stats.expected?.pendingCount ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {formatNGN(stats.expected?.pendingAmount ?? 0)} outstanding
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-md">
            <div className="text-xs font-medium text-amber-800">Exceptions Requiring Review</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{reviewCount}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">
              {exceptions?.suggestions.length || 0} fuzzy suggestions • {exceptions?.ambiguous.length || 0} ambiguous
            </div>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-md">
            <div className="text-xs font-medium text-rose-800">False Matches Prevented</div>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {stats.trustMetrics?.falseMatchesPrevented ?? 0}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              Rejected by operator to prevent misattribution
            </div>
          </div>
        </div>
      </div>

      {/* Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expected vs Received Volume Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Financial Volume by Channel
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of actual reconciled bank inflows across payment rails
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex flex-col justify-end pt-4 pb-1">
            {(!stats.channelBreakdown || stats.channelBreakdown.length === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No reconciled channel activity recorded yet
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                {/* Bars container */}
                <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-44 px-2 pt-6">
                  {stats.channelBreakdown.map((item) => {
                    const maxVal = Math.max(...stats.channelBreakdown.map((b) => b.amount), 1);
                    const heightPct = Math.max(10, Math.round((item.amount / maxVal) * 100));
                    return (
                      <div
                        key={item.channel}
                        className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                      >
                        {/* Floating Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-11 z-30 pointer-events-none bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded shadow-lg whitespace-nowrap">
                          <div className="font-semibold text-white">{item.channel}</div>
                          <div className="text-slate-300 font-mono">
                            {formatNGN(item.amount)} ({item.count} {item.count === 1 ? 'txn' : 'txns'})
                          </div>
                          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>

                        {/* Top Value Label */}
                        <span className="text-[10px] font-mono font-medium text-slate-500 mb-1.5 group-hover:text-slate-900 transition-colors">
                          ₦{(item.amount / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })}k
                        </span>

                        {/* Bar Column */}
                        <div className="w-full max-w-[42px] bg-slate-100/80 rounded-t h-full flex flex-col justify-end overflow-hidden">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-slate-800 group-hover:bg-indigo-600 transition-all duration-300 rounded-t"
                          />
                        </div>

                        {/* Channel Label */}
                        <span className="text-[11px] font-medium text-slate-600 truncate mt-2 max-w-full text-center">
                          {item.channel}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Horizontal base rule */}
                <div className="border-t border-slate-100 w-full" />
              </div>
            )}
          </div>
        </div>

        {/* Exceptions Summary Callout */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <ShieldAlert size={16} />
              <span>Review Queue</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2">
              {reviewCount} Items Need Investigation
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fuzzy matches and ambiguous transactions are kept in the review queue. They are never automatically committed without operator confirmation.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Candidate Suggestions</span>
                <span className="font-semibold text-slate-900">{exceptions?.suggestions.length || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Ambiguous Multi-Matches</span>
                <span className="font-semibold text-slate-900">{exceptions?.ambiguous.length || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Blocked Ingestion Duplicates</span>
                <span className="font-semibold text-slate-900">{exceptions?.duplicates.length || 0}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("exceptions")}
            className="w-full mt-6 py-2 px-3 text-xs font-medium text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors text-center cursor-pointer"
          >
            Open Exceptions Queue →
          </button>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Recent Reconciliation Matches</h3>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
          >
            View all ({matches.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Expected Order</th>
                <th className="px-4 py-2.5">Bank Reference</th>
                <th className="px-4 py-2.5">Customer / Sender</th>
                <th className="px-4 py-2.5">Channel</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Match Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matches.slice(0, 5).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {m.expectedPayment?.reference}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {m.receivedPayment?.reference}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {m.expectedPayment?.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {m.receivedPayment?.provider} ({m.receivedPayment?.channel})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {formatNGN(m.receivedPayment?.amount || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.matchMethod === "AUTOMATIC_EXACT"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {m.matchMethod === "AUTOMATIC_EXACT" ? "Exact Reference" : "Human Confirmed"}
                    </span>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No transactions reconciled yet. Click "Run reconciliation" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
