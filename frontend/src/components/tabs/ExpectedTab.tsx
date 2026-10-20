import React from "react";
import type { ExpectedPayment } from "../../api";
import { formatNGN } from "../../api";
import { UploadCloud, Plus } from "lucide-react";

interface ExpectedTabProps {
  expected: ExpectedPayment[];
  onOpenAddModal: () => void;
  onNavigateImport: () => void;
}

export const ExpectedTab: React.FC<ExpectedTabProps> = ({
  expected,
  onOpenAddModal,
  onNavigateImport,
}) => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header bar — stacks on mobile */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Registered Expected Payments</h2>
          <p className="text-xs text-slate-500">
            Database of invoices, store orders, and expected inflows for reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNavigateImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
          >
            <UploadCloud size={14} />
            <span className="hidden sm:inline">Import Orders CSV</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Expected Payment</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Table with scroll container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" style={{ minWidth: "560px" }}>
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Order Ref</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expected.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{exp.reference}</td>
                  <td className="px-4 py-3 text-slate-800 max-w-[140px] truncate">{exp.customerName}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{exp.customerPhone || exp.customerEmail || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatNGN(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(exp.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        exp.status === "MATCHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
              {expected.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No expected payments recorded. Click "Add Expected Payment" to register orders.
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
