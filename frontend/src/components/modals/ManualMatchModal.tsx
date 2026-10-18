import React from "react";
import {
  type ExpectedPayment,
  type ReceivedPayment,
  formatNGN,
} from "../../api";
import {
  Link2,
  X,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export interface ManualMatchModalData {
  isOpen: boolean;
  selectedExpectedId: string;
  selectedReceivedId: string;
  notes: string;
  actor: string;
}

interface ManualMatchModalProps {
  data: ManualMatchModalData | null;
  expected: ExpectedPayment[];
  received: ReceivedPayment[];
  actionLoading: boolean;
  onClose: () => void;
  onChange: (data: ManualMatchModalData) => void;
  onConfirm: () => void;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  data,
  expected,
  received,
  actionLoading,
  onClose,
  onChange,
  onConfirm,
}) => {
  if (!data?.isOpen) return null;

  const selExp = expected.find((e) => e.id === data.selectedExpectedId);
  const selRec = received.find((r) => r.id === data.selectedReceivedId);

  let isExact = false;
  let diff = 0;
  if (selExp && selRec) {
    diff = selRec.amount - selExp.amount;
    isExact = diff === 0;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-900 text-white rounded-md">
              <Link2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Manual Match & Reconciliation
              </h3>
              <p className="text-[11px] text-slate-500">
                Pair an unmatched order with an unclaimed bank inflow with full
                audit tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Select Pending Expected Order */}
            <div className="flex flex-col border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  1. Pending Order
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {expected.filter((e) => e.status === "PENDING").length}{" "}
                  available
                </span>
              </div>

              <select
                value={data.selectedExpectedId}
                onChange={(e) =>
                  onChange({
                    ...data,
                    selectedExpectedId: e.target.value,
                  })
                }
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium cursor-pointer"
              >
                <option value="">-- Choose Expected Order --</option>
                {expected
                  .filter((e) => e.status === "PENDING")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.reference} • {e.customerName} ({formatNGN(e.amount)})
                    </option>
                  ))}
              </select>

              {/* Order Preview Card */}
              {selExp && (
                <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-md text-[11px] space-y-1 shadow-2xs">
                  <div className="font-semibold text-indigo-950 flex items-center justify-between">
                    <span>{selExp.reference}</span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatNGN(selExp.amount)}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Customer:{" "}
                    <strong className="text-slate-800">
                      {selExp.customerName}
                    </strong>
                  </div>
                  {selExp.customerPhone && (
                    <div className="text-slate-500 font-mono">
                      Phone: {selExp.customerPhone}
                    </div>
                  )}
                  <div className="text-slate-400 text-[10px]">
                    Created: {new Date(selExp.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Select Unclaimed Received Inflow */}
            <div className="flex flex-col border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-600" />
                  2. Unclaimed Inflow
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {received.filter((r) => r.status === "UNMATCHED").length}{" "}
                  available
                </span>
              </div>

              <select
                value={data.selectedReceivedId}
                onChange={(e) =>
                  onChange({
                    ...data,
                    selectedReceivedId: e.target.value,
                  })
                }
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium cursor-pointer"
              >
                <option value="">-- Choose Bank Inflow --</option>
                {received
                  .filter((r) => r.status === "UNMATCHED")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.provider} • {r.senderName || r.reference} (
                      {formatNGN(r.amount)})
                    </option>
                  ))}
              </select>

              {/* Inflow Preview Card */}
              {selRec && (
                <div className="mt-3 p-3 bg-white border border-emerald-100 rounded-md text-[11px] space-y-1 shadow-2xs">
                  <div className="font-semibold text-emerald-950 flex items-center justify-between">
                    <span>
                      {selRec.provider} ({selRec.channel})
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatNGN(selRec.amount)}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Sender:{" "}
                    <strong className="text-slate-800">
                      {selRec.senderName || "Unknown"}
                    </strong>
                  </div>
                  <div className="text-slate-500 font-mono text-[10px] truncate">
                    Ref: {selRec.reference}
                  </div>
                  {selRec.narrative && (
                    <div className="text-slate-500 italic truncate text-[10px]">
                      "{selRec.narrative}"
                    </div>
                  )}
                  <div className="text-slate-400 text-[10px]">
                    Received: {new Date(selRec.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Match Comparison & Discrepancy Banner */}
          {selExp && selRec && (
            <div
              className={`p-3.5 rounded-lg border flex items-center justify-between ${
                isExact
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isExact ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-600 shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    size={18}
                    className="text-amber-600 shrink-0"
                  />
                )}
                <div>
                  <div className="font-semibold text-xs">
                    {isExact
                      ? "Exact Amount Match"
                      : "Amount Discrepancy Detected"}
                  </div>
                  <div className="text-[11px] opacity-90">
                    Expected: {formatNGN(selExp.amount)} • Received:{" "}
                    {formatNGN(selRec.amount)}
                    {!isExact &&
                      ` • Difference: ${diff > 0 ? "+" : ""}${formatNGN(diff)}`}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  isExact
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {isExact ? "100% Balanced" : "Discrepancy Override"}
              </span>
            </div>
          )}

          {/* Audit Fields */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Approving Operator / Accountant
              </label>
              <input
                type="text"
                value={data.actor}
                onChange={(e) =>
                  onChange({
                    ...data,
                    actor: e.target.value,
                  })
                }
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Reconciliation Reason / Audit Justification{" "}
                <span className="text-slate-400">(Required)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Verified customer paid from husband's GTBank account; payment confirmed via phone"
                value={data.notes}
                onChange={(e) =>
                  onChange({
                    ...data,
                    notes: e.target.value,
                  })
                }
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 outline-none focus:border-slate-400 focus:bg-white placeholder-slate-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This justification is permanently stored in the audit trail for
                financial reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !data.selectedExpectedId ||
              !data.selectedReceivedId ||
              actionLoading
            }
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            {actionLoading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm & Reconcile Match
          </button>
        </div>
      </div>
    </div>
  );
};
