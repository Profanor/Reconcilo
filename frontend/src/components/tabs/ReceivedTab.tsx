import React, { useState } from "react";
import type { ReceivedPayment, IngestionResult } from "../../api";
import { formatNGN, api } from "../../api";
import { CheckCircle2, FileCheck } from "lucide-react";

interface ReceivedTabProps {
  received: ReceivedPayment[];
  operatorName: string;
  operatorRole: string;
  initialIngestionType?: "expected" | "received";
  onRefreshData: () => Promise<void>;
  addToast: (message: string, type?: "success" | "warning" | "error" | "info") => void;
}

export const ReceivedTab: React.FC<ReceivedTabProps> = ({
  received,
  operatorName,
  operatorRole,
  initialIngestionType = "received",
  onRefreshData,
  addToast,
}) => {
  const [ingestionType, setIngestionType] = useState<"expected" | "received">(initialIngestionType);
  const [csvContent, setCsvContent] = useState("");
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleLoadSampleCsv = (type: "expected" | "received") => {
    if (type === "expected") {
      setCsvContent(
        "Order ID,Amount,Customer Name,Phone,Date,Description\n" +
          "ORD-2026-0020,38000,Folashade Bakare,08034512988,2026-10-18,Wholesale Rice Bag\n" +
          "ORD-2026-0021,14500,Ibrahim Danjuma,08123488771,2026-10-18,Delivery Fee & Groceries\n" +
          "ORD-2026-0022,9200,Chidinma Okoro,09022334455,2026-10-18,Pharmacy Prescriptions",
      );
    } else {
      setCsvContent(
        "Transaction Date,Narration,Credit,Debit,Reference,Bank,Channel\n" +
          "2026-10-18 10:15,TRSF / ORD-2026-0020 / FOLASHADE,38000,,OPY-TRSF-889102,OPay,BANK_TRANSFER\n" +
          "2026-10-18 11:30,POS PAYMENT TERMINAL 4492,14500,,MP-POS-998811,Moniepoint,POS\n" +
          "2026-10-18 13:45,ATM WITHDRAWAL,,5000,ATM-44812,AccessBank,BANK_TRANSFER",
      );
    }
  };

  const handleProcessCsv = async () => {
    if (!csvContent.trim()) {
      addToast("Please paste or upload CSV content before importing.", "warning");
      return;
    }

    setUploading(true);
    setIngestionResult(null);
    try {
      let result: IngestionResult;
      if (ingestionType === "expected") {
        result = await api.importExpectedCsv(csvContent, `${operatorName} (${operatorRole})`);
      } else {
        result = await api.importReceivedCsv(csvContent, `${operatorName} (${operatorRole})`);
      }

      setIngestionResult(result);
      addToast(result.message, "success");
      await onRefreshData();
    } catch (err: any) {
      addToast(err.message || "CSV processing failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* CSV Upload Panel */}
      <div className="bg-white p-4 md:p-5 rounded-lg border border-slate-200 shadow-2xs">
        {/* Panel header — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Import Statement or Orders CSV</h2>
            <p className="text-xs text-slate-500">
              Standardize bank statement credits and order registries with automatic duplicate detection
            </p>
          </div>
          {/* Type toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200 text-xs shrink-0 self-start">
            <button
              onClick={() => { setIngestionType("received"); handleLoadSampleCsv("received"); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                ingestionType === "received" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              Bank Statements
            </button>
            <button
              onClick={() => { setIngestionType("expected"); handleLoadSampleCsv("expected"); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                ingestionType === "expected" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            rows={6}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste CSV rows here or click 'Load Sample' to test..."
            className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none"
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => handleLoadSampleCsv(ingestionType)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              Load sample {ingestionType === "received" ? "bank statement" : "orders"} CSV
            </button>

            <button
              onClick={handleProcessCsv}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <FileCheck size={14} className="text-emerald-400" />
              <span>{uploading ? "Normalizing..." : "Process & Import CSV"}</span>
            </button>
          </div>
        </div>

        {ingestionResult && (
          <div className="mt-4 p-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{ingestionResult.message}</span>
            </div>
            <div className="text-emerald-800 flex flex-wrap gap-x-4 gap-y-1 pt-1 font-mono">
              <span>Total: {ingestionResult.details.totalRows}</span>
              <span>Imported: {ingestionResult.details.importedCount}</span>
              <span>Dupes prevented: {ingestionResult.details.duplicateCount}</span>
              <span>Failed: {ingestionResult.details.errorCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Ingested Bank Statements ({received.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" style={{ minWidth: "620px" }}>
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Bank / Provider</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Sender</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {received.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">{rec.reference}</td>
                  <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{rec.provider}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {rec.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[120px] truncate">{rec.senderName || "Unknown"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatNGN(rec.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(rec.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        rec.status === "MATCHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
              {received.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No received payments ingested yet.
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
