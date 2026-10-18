import React, { useState } from "react";
import type { ExpectedPayment, ReceivedPayment, ReconciliationMatch } from "../../api";
import { formatNGN } from "../../api";
import { Search, Link2 } from "lucide-react";

interface ReconciliationTabProps {
  matches: ReconciliationMatch[];
  expected: ExpectedPayment[];
  received: ReceivedPayment[];
  operatorName: string;
  operatorRole: string;
  onInspect: (match: ReconciliationMatch) => void;
  onOpenManualMatch: (data: { selectedExpectedId: string; selectedReceivedId: string }) => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  matches,
  expected,
  received,
  onInspect,
  onOpenManualMatch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Working Table Unified Transaction Rows
  // Combines matches, pending expected orders, and unmatched received payments
  const combinedRows = [
    // Matched items
    ...matches.map((m) => ({
      id: m.id,
      expectedRef: m.expectedPayment?.reference || "N/A",
      receivedRef: m.receivedPayment?.reference || "N/A",
      customer: m.expectedPayment?.customerName || m.receivedPayment?.senderName || "Unknown",
      expectedAmount: m.expectedPayment?.amount || 0,
      receivedAmount: m.receivedPayment?.amount || 0,
      channel: m.receivedPayment?.channel || "BANK_TRANSFER",
      provider: m.receivedPayment?.provider || "Bank",
      date: m.matchedAt,
      status: "MATCHED" as const,
      matchMethod: m.matchMethod,
      matchObj: m,
      expectedId: m.expectedPaymentId,
      receivedId: m.receivedPaymentId,
    })),
    // Unmatched expected orders
    ...expected
      .filter((e) => e.status === "PENDING")
      .map((e) => ({
        id: `exp-${e.id}`,
        expectedRef: e.reference,
        receivedRef: "—",
        customer: e.customerName,
        expectedAmount: e.amount,
        receivedAmount: 0,
        channel: "PENDING",
        provider: "Awaiting Payment",
        date: e.createdAt,
        status: "UNMATCHED" as const,
        matchMethod: null,
        matchObj: null,
        expectedId: e.id,
        receivedId: "",
      })),
    // Unmatched received inflows
    ...received
      .filter((r) => r.status === "UNMATCHED")
      .map((r) => ({
        id: `rec-${r.id}`,
        expectedRef: "—",
        receivedRef: r.reference,
        customer: r.senderName || "Unknown Sender",
        expectedAmount: 0,
        receivedAmount: r.amount,
        channel: r.channel,
        provider: r.provider,
        date: r.createdAt,
        status: "UNCLAIMED" as const,
        matchMethod: null,
        matchObj: null,
        expectedId: "",
        receivedId: r.id,
      })),
  ];

  // Filtered Working Rows
  const filteredRows = combinedRows.filter((row) => {
    if (channelFilter !== "ALL" && row.channel !== channelFilter) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "MATCHED" && row.status !== "MATCHED") return false;
      if (statusFilter === "UNMATCHED" && row.status !== "UNMATCHED") return false;
      if (statusFilter === "UNCLAIMED" && row.status !== "UNCLAIMED") return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.expectedRef.toLowerCase().includes(q) ||
      row.receivedRef.toLowerCase().includes(q) ||
      row.customer.toLowerCase().includes(q) ||
      row.provider.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Working Controls Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ref, bank ref, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="UNMATCHED">Pending Order</option>
            <option value="UNCLAIMED">Unclaimed Inflow</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Channels</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="POS">POS Terminal</option>
            <option value="WALLET">Wallet</option>
          </select>

          {/* Manual Match Button */}
          <button
            onClick={() =>
              onOpenManualMatch({
                selectedExpectedId: "",
                selectedReceivedId: "",
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded transition-colors shadow-2xs cursor-pointer"
          >
            <Link2 size={13} className="text-slate-500" />
            Manual Match
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredRows.length} records
        </div>
      </div>

      {/* Transaction Working Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Expected Ref</th>
                <th className="px-4 py-3">Bank Ref</th>
                <th className="px-4 py-3">Customer / Payer</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3">Channel / Bank</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.expectedRef}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{row.receivedRef}</td>
                  <td className="px-4 py-3 text-slate-800">{row.customer}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.expectedAmount > 0 ? formatNGN(row.expectedAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.receivedAmount > 0 ? formatNGN(row.receivedAmount) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {row.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "MATCHED" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Matched
                      </span>
                    )}
                    {row.status === "UNMATCHED" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        Pending Order
                      </span>
                    )}
                    {row.status === "UNCLAIMED" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Unclaimed Inflow
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.matchObj ? (
                      <button
                        onClick={() => onInspect(row.matchObj)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    ) : row.status === "UNMATCHED" ? (
                      <button
                        onClick={() =>
                          onOpenManualMatch({
                            selectedExpectedId: row.expectedId,
                            selectedReceivedId: "",
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                      >
                        <Link2 size={11} />
                        Match to Inflow
                      </button>
                    ) : row.status === "UNCLAIMED" ? (
                      <button
                        onClick={() =>
                          onOpenManualMatch({
                            selectedExpectedId: "",
                            selectedReceivedId: row.receivedId,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                      >
                        <Link2 size={11} />
                        Match to Order
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No records found matching current search and filters.
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
