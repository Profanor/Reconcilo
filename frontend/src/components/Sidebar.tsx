import React from "react";
import { PRODUCT_NAME } from "../api";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  CreditCard,
  ShieldAlert,
  BarChart3,
  Settings,
  Building,
  Globe,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "reconciliation"
  | "expected"
  | "received"
  | "exceptions"
  | "reports"
  | "settings";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  reviewCount: number;
  operatorName: string;
  operatorRole: string;
  companyName: string;
  rcNumber: string;
  onNavigateLanding: () => void;
  onOpenPilotSetup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  reviewCount,
  operatorName,
  operatorRole,
  companyName,
  rcNumber,
  onNavigateLanding,
  onOpenPilotSetup,
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || "OP";
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
          ⚡
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white tracking-tight">{PRODUCT_NAME}</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
            Financial Truth Layer
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <LayoutDashboard size={16} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "reconciliation"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <ArrowLeftRight size={16} />
          <span>Reconciliation Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("expected")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "expected"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileText size={16} />
          <span>Expected Registry</span>
        </button>

        <button
          onClick={() => setActiveTab("received")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "received"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <CreditCard size={16} />
          <span>Received Inflows</span>
        </button>

        <button
          onClick={() => setActiveTab("exceptions")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "exceptions"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={16} />
            <span>Exceptions Queue</span>
          </div>
          {reviewCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {reviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "reports"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <BarChart3 size={16} />
          <span>Reports & Audit</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-slate-800 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Settings size={16} />
          <span>Settings & Rules</span>
        </button>
      </nav>

      {/* Sidebar Footer: Workspace & Profile */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        {/* Back to Marketing Site */}
        <button
          onClick={onNavigateLanding}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-slate-400" />
            <span>Marketing Website</span>
          </div>
          <ArrowRight size={11} className="text-slate-500" />
        </button>

        {/* Workspace Switcher with Demo Configuration Trigger */}
        <button
          onClick={onOpenPilotSetup}
          title="Click to customize demo company and operator"
          className="w-full px-2.5 py-2 rounded bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 flex items-center justify-between text-xs text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building size={14} className="text-slate-400 group-hover:text-emerald-400 shrink-0 transition-colors" />
            <div className="truncate">
              <div className="text-slate-200 font-medium truncate">{companyName}</div>
              <div className="text-[10px] text-slate-500 font-mono">{rcNumber}</div>
            </div>
          </div>
          <SlidersHorizontal size={12} className="text-slate-400 group-hover:text-white shrink-0 ml-1 transition-colors" />
        </button>

        {/* User Profile */}
        <div
          onClick={onOpenPilotSetup}
          title="Click to change operator profile"
          className="px-2.5 py-1.5 flex items-center justify-between text-xs rounded hover:bg-slate-800/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-semibold text-slate-200 shrink-0">
              {getInitials(operatorName)}
            </div>
            <div className="truncate">
              <div className="text-slate-200 font-medium truncate">{operatorName}</div>
              <div className="text-[10px] text-slate-400">{operatorRole}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
