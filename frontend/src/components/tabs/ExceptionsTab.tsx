import React from "react";
import type { ExceptionQueueData } from "../../api";
import { formatNGN } from "../../api";
import { ShieldAlert, Link2, HelpCircle, AlertTriangle } from "lucide-react";

interface ExceptionsTabProps {
  exceptions: ExceptionQueueData | null;
  operatorName: string;
  operatorRole: string;
  onConfirmSuggestion: (expectedId: string, receivedId: string, note?: string) => Promise<void>;
  onRejectSuggestion: (expectedId: string, receivedId: string) => Promise<void>;
  onOpenManualMatch: (data: { selectedExpectedId: string; selectedReceivedId: string }) => void;
}

export const ExceptionsTab: React.FC<ExceptionsTabProps> = ({
  exceptions,
  operatorName,
  onConfirmSuggestion,
  onRejectSuggestion,
  onOpenManualMatch,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <strong>Engineering Rule for Trustworthy Results:</strong> Fuzzy matching never means automatic certainty. Similar names or matching amounts across multiple orders are kept here for confirmation. A false match is more damaging than an unmatched record.
        </div>
      </div>

      {/* Section 1: Candidate Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>Candidate Match Suggestions</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              {exceptions?.suggestions.length || 0}
            </span>
          </h3>
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
            Manual Match Link
          </button>
        </div>

        {exceptions?.suggestions.map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Suggestion #{idx + 1}</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  {(item.confidenceScore * 100).toFixed(0)}% Confidence
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Rule: {item.matchedRules.join(", ")}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {formatNGN(item.expectedPayment.amount)}
              </div>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Expected Order Record
                </div>
                <div className="font-semibold text-slate-900 text-sm">
                  {item.expectedPayment.reference}
                </div>
                <div className="mt-1 text-slate-700">Customer: <strong>{item.expectedPayment.customerName}</strong></div>
                <div className="text-slate-500">Contact: {item.expectedPayment.customerPhone || "N/A"}</div>
                <div className="text-slate-500 text-[11px] mt-1">
                  Date: {new Date(item.expectedPayment.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Bank Inflow Statement
                </div>
                <div className="font-semibold text-slate-900 text-sm">
                  {item.receivedPayment.reference}
                </div>
                <div className="mt-1 text-slate-700">Sender: <strong>{item.receivedPayment.senderName || "Unknown"}</strong></div>
                <div className="text-slate-500">Bank: {item.receivedPayment.provider} ({item.receivedPayment.channel})</div>
                <div className="text-slate-500 text-[11px] mt-1">
                  Narration: "{item.receivedPayment.narrative || "N/A"}"
                </div>
              </div>
            </div>

            {/* Similarity Reason Callout */}
            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded text-xs text-blue-900 flex items-center gap-2">
              <HelpCircle size={15} className="text-blue-600 shrink-0" />
              <span>{item.reason}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Authorizing Operator: <strong>{operatorName}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRejectSuggestion(item.expectedPayment.id, item.receivedPayment.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                >
                  Reject Suggestion
                </button>
                <button
                  onClick={() => onConfirmSuggestion(item.expectedPayment.id, item.receivedPayment.id, item.reason)}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs cursor-pointer"
                >
                  Confirm Match
                </button>
              </div>
            </div>
          </div>
        ))}

        {(!exceptions || exceptions.suggestions.length === 0) && (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
            No pending candidate suggestions in review queue.
          </div>
        )}
      </div>

      {/* Section 2: Ambiguous Multi-Matches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>Ambiguous Multi-Matches (Conflicting Candidates)</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              {exceptions?.ambiguous.length || 0}
            </span>
          </h3>
        </div>

        {exceptions?.ambiguous.map((amb, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg border border-amber-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-900">
                Ambiguous Case #{idx + 1}
              </div>
              <div className="text-sm font-bold text-slate-900">
                Amount: {formatNGN(amb.receivedPayment.amount)}
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 rounded text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>{amb.reason}</span>
            </div>

            <div className="text-xs space-y-1">
              <div className="text-slate-500 font-medium">Bank Transaction:</div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800">
                {amb.receivedPayment.reference} • {amb.receivedPayment.provider} • Sender: {amb.receivedPayment.senderName || "Unknown"} • Memo: "{amb.receivedPayment.narrative}"
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                Select the correct order to reconcile:
              </div>
              {amb.candidateOrders.map((cand) => (
                <div
                  key={cand.expectedPayment.id}
                  className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white hover:border-slate-300 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{cand.expectedPayment.reference} — {cand.expectedPayment.customerName}</div>
                    <div className="text-slate-500 text-[11px]">
                      {cand.expectedPayment.description || "Order"} • Created {new Date(cand.expectedPayment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => onConfirmSuggestion(cand.expectedPayment.id, amb.receivedPayment.id, `Resolved ambiguous payment to ${cand.expectedPayment.customerName}`)}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Link to this order
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {(!exceptions || exceptions.ambiguous.length === 0) && (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
            No ambiguous multi-match conflicts detected.
          </div>
        )}
      </div>
    </div>
  );
};
