import React from "react";
import type { NavTab } from "./Sidebar";
import { Clock, RefreshCw, Sparkles, UploadCloud } from "lucide-react";

interface HeaderProps {
  activeTab: NavTab;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  loading: boolean;
  reconciling: boolean;
  onRefresh: () => void;
  onOpenUpload: () => void;
  onRunReconciliation: () => void;
  onNavigateLanding: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedPeriod,
  setSelectedPeriod,
  loading,
  reconciling,
  onRefresh,
  onOpenUpload,
  onRunReconciliation,
  onNavigateLanding,
}) => {
  const titles: Record<NavTab, string> = {
    overview: "Overview Dashboard",
    reconciliation: "Payment Reconciliation",
    expected: "Expected Payments Registry",
    received: "Received Transactions",
    exceptions: "Exceptions & Review Queue",
    reports: "Reconciliation Reports & Audit",
    settings: "Workspace Settings & Rules",
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">
          {titles[activeTab]}
        </h1>

        <div className="h-4 w-px bg-slate-200" />

        {/* Reconciliation Period Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
          <Clock size={13} className="text-slate-500" />
          <span>Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
          >
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onNavigateLanding}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-2xs"
        >
          <span>← Website</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          title="Refresh live data"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <UploadCloud size={14} className="text-slate-500" />
          <span>Import CSV</span>
        </button>

        <button
          onClick={onRunReconciliation}
          disabled={reconciling}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
        >
          <Sparkles
            size={14}
            className={
              reconciling ? "animate-spin text-amber-400" : "text-amber-400"
            }
          />
          <span>{reconciling ? "Reconciling..." : "Run reconciliation"}</span>
        </button>
      </div>
    </header>
  );
};
