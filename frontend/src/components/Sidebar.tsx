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
  X,
  LogOut,
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
  onSignOut: () => void;
  /** Mobile: whether the drawer is open */
  mobileOpen?: boolean;
  /** Mobile: close the drawer */
  onMobileClose?: () => void;
}

const NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { id: "reconciliation", label: "Reconciliation Ledger", icon: <ArrowLeftRight size={16} /> },
  { id: "expected", label: "Expected Registry", icon: <FileText size={16} /> },
  { id: "received", label: "Received Inflows", icon: <CreditCard size={16} /> },
  { id: "exceptions", label: "Exceptions Queue", icon: <ShieldAlert size={16} /> },
  { id: "reports", label: "Reports & Audit", icon: <BarChart3 size={16} /> },
  { id: "settings", label: "Settings & Rules", icon: <Settings size={16} /> },
];

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
  onSignOut,
  mobileOpen = false,
  onMobileClose,
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || "OP";
  };

  const handleTabSelect = (tab: NavTab) => {
    setActiveTab(tab);
    onMobileClose?.();
  };

  const sidebarContent = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800/80 shrink-0">
        <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
          ⚡
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-semibold text-white tracking-tight">{PRODUCT_NAME}</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
            Financial Truth Layer
          </span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleTabSelect(id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === id
                ? "bg-slate-800 text-white font-semibold shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <span>{label}</span>
            </div>
            {id === "exceptions" && reviewCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {reviewCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
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

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer group"
        >
          <LogOut size={13} className="shrink-0" />
          <span>Sign Out</span>
        </button>

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

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex h-screen">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

/** Bottom navigation bar — rendered in App.tsx on mobile only */
export const MobileBottomNav: React.FC<{
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  reviewCount: number;
}> = ({ activeTab, setActiveTab, reviewCount }) => {
  const items: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={20} /> },
    { id: "reconciliation", label: "Ledger", icon: <ArrowLeftRight size={20} /> },
    { id: "exceptions", label: "Exceptions", icon: <ShieldAlert size={20} /> },
    { id: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-stretch safe-area-inset-bottom">
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative ${
            activeTab === id
              ? "text-slate-900"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          {activeTab === id && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-slate-900" />
          )}
          <span className="relative">
            {icon}
            {id === "exceptions" && reviewCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {reviewCount > 9 ? "9+" : reviewCount}
              </span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};
