import React from "react";
import type { NavTab } from "./Sidebar";
import { Clock, RefreshCw, Sparkles, UploadCloud, Menu } from "lucide-react";

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
  /** Mobile: open the sidebar drawer */
  onOpenMobileMenu: () => void;
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
  onOpenMobileMenu,
}) => {
  const titles: Record<NavTab, string> = {
    overview: "Overview",
    reconciliation: "Reconciliation",
    expected: "Expected Payments",
    received: "Received Transactions",
    exceptions: "Exceptions Queue",
    reports: "Reports & Audit",
    settings: "Settings & Rules",
  };

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-3 md:px-8 flex items-center justify-between shrink-0 gap-2">
      {/* Left: hamburger (mobile) + title + period */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-sm md:text-base font-semibold text-slate-900 tracking-tight truncate">
          {titles[activeTab]}
        </h1>

        {/* Period selector — hidden on smallest screens */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded border border-slate-200 shrink-0">
          <Clock size={13} className="text-slate-500" />
          <span className="hidden md:inline">Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
          >
            <option value="October 2026">Oct 2026</option>
            <option value="September 2026">Sep 2026</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
        {/* Website link — desktop only */}
        <button
          onClick={onNavigateLanding}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-2xs"
        >
          <span>← Website</span>
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          title="Refresh live data"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>

        {/* Import CSV — icon-only on mobile */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <UploadCloud size={14} className="text-slate-500 shrink-0" />
          <span className="hidden sm:inline">Import CSV</span>
        </button>

        {/* Run Reconciliation — label abbreviated on mobile */}
        <button
          onClick={onRunReconciliation}
          disabled={reconciling}
          className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
        >
          <Sparkles
            size={14}
            className={reconciling ? "animate-spin text-amber-400" : "text-amber-400"}
          />
          <span className="hidden sm:inline">{reconciling ? "Reconciling..." : "Run reconciliation"}</span>
          <span className="sm:hidden">{reconciling ? "..." : "Run"}</span>
        </button>
      </div>
    </header>
  );
};
