import React from "react";
import type { DashboardStats, AuditLogItem } from "../../api";
import { formatNGN, api } from "../../api";
import { Download } from "lucide-react";

interface ReportsTabProps {
  stats: DashboardStats;
  auditLogs: AuditLogItem[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ stats, auditLogs }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Certified Financial Reconciliation Report
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Verified for business owners, accountants, and external audits • Certified as of {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.getReportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
          >
            <Download size={14} className="text-emerald-400" />
            <span>Download Accountant CSV</span>
          </a>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer"
          >
            Print Summary
          </button>
        </div>
      </div>

      {/* Financial Summary Sheet */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Executive Balance & Net Variance
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Total Registered Orders</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatNGN(stats.expected?.totalAmount ?? 0)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Total Bank Inflows</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatNGN(stats.received?.totalAmount ?? 0)}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
            <span className="text-emerald-800">Verified Matched Revenue</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              {formatNGN(stats.received?.matchedAmount ?? 0)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Net Financial Variance</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatNGN((stats.received?.totalAmount ?? 0) - (stats.expected?.totalAmount ?? 0))}
            </div>
          </div>
        </div>

        {/* Audit Action Log Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Action Audit Trail (Who Changed What & Why)
          </h3>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Authorized Operator</th>
                  <th className="px-4 py-2.5">Reason / Rationale</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.action === "MANUAL_MATCH"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : log.action === "CONFIRM_SUGGESTION"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.action === "REJECT_SUGGESTION"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{log.targetId || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-800">{log.user}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.reason || "N/A"}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No manual audit actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
