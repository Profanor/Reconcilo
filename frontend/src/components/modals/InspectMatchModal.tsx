import React from "react";
import { type ReconciliationMatch, formatNGN } from "../../api";
import { X, CheckCircle2 } from "lucide-react";

interface InspectMatchModalProps {
  inspectMatch: ReconciliationMatch | null;
  onClose: () => void;
  onUnmatch: (matchId: string) => void;
}

export const InspectMatchModal: React.FC<InspectMatchModalProps> = ({
  inspectMatch,
  onClose,
  onUnmatch,
}) => {
  if (!inspectMatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Reconciliation Inspection
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Match ID: {inspectMatch.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                Expected Order
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {inspectMatch.expectedPayment?.reference}
              </div>
              <div className="mt-1">
                Customer: {inspectMatch.expectedPayment?.customerName}
              </div>
              <div>
                Amount:{" "}
                <strong>
                  {formatNGN(inspectMatch.expectedPayment?.amount || 0)}
                </strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                Received Transaction
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {inspectMatch.receivedPayment?.reference}
              </div>
              <div className="mt-1">
                Sender: {inspectMatch.receivedPayment?.senderName || "Unknown"}
              </div>
              <div>
                Amount:{" "}
                <strong>
                  {formatNGN(inspectMatch.receivedPayment?.amount || 0)}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>
                Match Method: {inspectMatch.matchMethod.replace("_", " ")}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
              {inspectMatch.notes ||
                "Reconciled with exact reference and matching amount."}
            </div>
            <div className="mt-1 text-[10px] text-emerald-600 font-mono">
              Verified by: {inspectMatch.matchedBy} • Matched at{" "}
              {new Date(inspectMatch.matchedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => onUnmatch(inspectMatch.id)}
              className="px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-xs font-medium"
            >
              Unmatch Transaction
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
