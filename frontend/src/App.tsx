import { useState, useEffect } from "react";
import { PRODUCT_NAME, api } from "./api";
import type {
  ExpectedPayment,
  ReceivedPayment,
  ReconciliationMatch,
  ReconciliationRule,
  ExceptionQueueData,
  DashboardStats,
  AuditLogItem,
  IngestionResult,
} from "./api";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  CreditCard,
  ShieldAlert,
  BarChart3,
  Settings,
  Search,
  RefreshCw,
  Sparkles,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronRight,
  Clock,
  Building,
  X,
  UploadCloud,
  FileCheck,
  ChevronDown,
  Link2,
} from "lucide-react";


type NavTab =
  | "overview"
  | "reconciliation"
  | "expected"
  | "received"
  | "exceptions"
  | "reports"
  | "settings";

interface Toast {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Current Operator Attribution (Recorded on all changes)
  const [operatorName, setOperatorName] = useState("David Okoye");
  const [operatorRole] = useState("Finance Lead");
  const [selectedPeriod, setSelectedPeriod] = useState("October 2026");

  // Core Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expected, setExpected] = useState<ExpectedPayment[]>([]);
  const [received, setReceived] = useState<ReceivedPayment[]>([]);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionQueueData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [rules, setRules] = useState<ReconciliationRule[]>([]);

  // Search & Filters for Working Table
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspect Modal
  const [inspectMatch, setInspectMatch] = useState<ReconciliationMatch | null>(null);

  // Manual Match Modal
  const [manualMatchModal, setManualMatchModal] = useState<{
    isOpen: boolean;
    selectedExpectedId: string;
    selectedReceivedId: string;
    notes: string;
    actor: string;
  } | null>(null);

  // Add Expected Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrderRef, setNewOrderRef] = useState("");
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderPhone, setNewOrderPhone] = useState("");
  const [newOrderDesc, setNewOrderDesc] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // CSV Ingestion States
  const [ingestionType, setIngestionType] = useState<"expected" | "received">("received");
  const [csvContent, setCsvContent] = useState("");
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [uploading, setUploading] = useState(false);

  // Toast Helper
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initial Data Fetch
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        expRes,
        recRes,
        matchesRes,
        exceptionsRes,
        auditRes,
        rulesRes,
      ] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getExpectedPayments().catch(() => []),
        api.getReceivedPayments().catch(() => []),
        api.getMatches().catch(() => []),
        api.getExceptions().catch(() => null),
        api.getAuditLogs().catch(() => []),
        api.getRules().catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setExpected(expRes);
      setReceived(recRes);
      setMatches(matchesRes);
      if (exceptionsRes) setExceptions(exceptionsRes);
      setAuditLogs(auditRes);
      setRules(rulesRes);
    } catch (err: any) {
      addToast(err.message || "Could not load data from API", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Format Currency in NGN
  const formatNGN = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Trigger Controlled Reconciliation (Deterministic first)
  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const res = await api.runAutoReconciliation(false, `${operatorName} (${operatorRole})`);
      addToast(
        `Reconciliation run complete: ${res.matchedCount} exact matches verified. Uncertain matches queued for review.`,
        "success",
      );
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Reconciliation failed", "error");
    } finally {
      setReconciling(false);
    }
  };

  // Confirm Match Suggestion from Exception Queue
  const handleConfirmSuggestion = async (
    expectedId: string,
    receivedId: string,
    defaultNote?: string,
  ) => {
    const note = window.prompt(
      "Confirm candidate match. Add verification note (recorded in audit trail):",
      defaultNote || "Verified customer receipt against expected order",
    );
    if (note === null) return; // User cancelled

    try {
      await api.confirmSuggestion(
        expectedId,
        receivedId,
        `${operatorName} (${operatorRole})`,
        note,
      );
      addToast("Match confirmed and recorded in audit log.", "success");
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Failed to confirm match", "error");
    }
  };

  // Reject Match Suggestion (Prevents False Match)
  const handleRejectSuggestion = async (expectedId: string, receivedId: string) => {
    const reason = window.prompt(
      "Reject match suggestion to prevent false match. Reason for rejection:",
      "Payment belongs to another customer / invoice not found",
    );
    if (!reason) return;

    try {
      await api.rejectSuggestion(
        expectedId,
        receivedId,
        `${operatorName} (${operatorRole})`,
        reason,
      );
      addToast("Suggestion rejected. False match prevented and logged.", "warning");
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Failed to reject suggestion", "error");
    }
  };

  // Unmatch Transaction
  const handleUnmatch = async (matchId: string) => {
    const reason = window.prompt(
      "Provide rationale for unlinking this transaction (recorded for audit):",
      "Order canceled or false match identified on review",
    );
    if (!reason) return;

    try {
      await api.unmatch(matchId, `${operatorName} (${operatorRole})`, reason);
      addToast("Transaction unlinked. Records restored to pending.", "warning");
      setInspectMatch(null);
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Unmatch failed", "error");
    }
  };

  // Manual Match Link Handler
  const handleConfirmManualMatch = async () => {
    if (!manualMatchModal?.selectedExpectedId || !manualMatchModal?.selectedReceivedId) {
      addToast("Please select both an expected order and a received transaction", "error");
      return;
    }
    setActionLoading(true);
    try {
      await api.manualMatch(
        manualMatchModal.selectedExpectedId,
        manualMatchModal.selectedReceivedId,
        manualMatchModal.notes || "Manual reconciliation by operator",
        manualMatchModal.actor || `${operatorName} (${operatorRole})`,
      );
      addToast("Transaction manually reconciled & audit trail logged!", "success");
      setManualMatchModal(null);
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Failed to manually link transaction", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Expected Payment Form
  const handleAddExpectedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newOrderRef.trim()) errors.reference = "Reference / Order ID is required";
    if (!newOrderAmount || isNaN(Number(newOrderAmount)) || Number(newOrderAmount) <= 0) {
      errors.amount = "A valid positive amount is required";
    }
    if (!newOrderCustomer.trim()) errors.customerName = "Customer name is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await api.createExpectedPayment({
        reference: newOrderRef.trim(),
        amount: Number(newOrderAmount),
        customerName: newOrderCustomer.trim(),
        customerPhone: newOrderPhone.trim() || undefined,
        description: newOrderDesc.trim() || undefined,
      });

      addToast(`Expected payment ${newOrderRef} added successfully.`, "success");
      setShowAddModal(false);
      setNewOrderRef("");
      setNewOrderAmount("");
      setNewOrderCustomer("");
      setNewOrderPhone("");
      setNewOrderDesc("");
      setFormErrors({});
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Failed to create expected payment", "error");
    }
  };

  // Handle CSV Ingestion
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
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "CSV processing failed", "error");
    } finally {
      setUploading(false);
    }
  };

  // Preload Sample Templates
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

  // Total Counts & Review Badge
  const reviewCount =
    (exceptions?.suggestions.length || 0) +
    (exceptions?.ambiguous.length || 0) +
    (exceptions?.duplicates.length || 0);

  // Working Table Unified Transaction Rows
  // Combines matches, pending expected orders, and unmatched received payments
  const combinedRows = [
    // Matched items
    ...matches.map((m) => ({
      id: m.id,
      expectedRef: m.expectedPayment?.reference || "N/A",
      receivedRef: m.receivedPayment?.reference || "N/A",
      customer: m.expectedPayment?.customerName || m.receivedPayment?.senderName || "Unknown",
      expectedAmount: m.expectedPayment?.amount || 0,
      receivedAmount: m.receivedPayment?.amount || 0,
      channel: m.receivedPayment?.channel || "BANK_TRANSFER",
      provider: m.receivedPayment?.provider || "Bank",
      date: m.matchedAt,
      status: "MATCHED" as const,
      matchMethod: m.matchMethod,
      matchObj: m,
      expectedId: m.expectedPaymentId,
      receivedId: m.receivedPaymentId,
    })),
    // Unmatched expected orders
    ...expected
      .filter((e) => e.status === "PENDING")
      .map((e) => ({
        id: `exp-${e.id}`,
        expectedRef: e.reference,
        receivedRef: "—",
        customer: e.customerName,
        expectedAmount: e.amount,
        receivedAmount: 0,
        channel: "PENDING",
        provider: "Awaiting Payment",
        date: e.createdAt,
        status: "UNMATCHED" as const,
        matchMethod: null,
        matchObj: null,
        expectedId: e.id,
        receivedId: "",
      })),
    // Unmatched received inflows
    ...received
      .filter((r) => r.status === "UNMATCHED")
      .map((r) => ({
        id: `rec-${r.id}`,
        expectedRef: "—",
        receivedRef: r.reference,
        customer: r.senderName || "Unknown Sender",
        expectedAmount: 0,
        receivedAmount: r.amount,
        channel: r.channel,
        provider: r.provider,
        date: r.createdAt,
        status: "UNCLAIMED" as const,
        matchMethod: null,
        matchObj: null,
        expectedId: "",
        receivedId: r.id,
      })),
  ];

  // Filtered Working Rows
  const filteredRows = combinedRows.filter((row) => {
    if (channelFilter !== "ALL" && row.channel !== channelFilter) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "MATCHED" && row.status !== "MATCHED") return false;
      if (statusFilter === "UNMATCHED" && row.status !== "UNMATCHED") return false;
      if (statusFilter === "UNCLAIMED" && row.status !== "UNCLAIMED") return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.expectedRef.toLowerCase().includes(q) ||
      row.receivedRef.toLowerCase().includes(q) ||
      row.customer.toLowerCase().includes(q) ||
      row.provider.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-md border shadow-sm text-xs font-medium ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : toast.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />}
            {toast.type === "warning" && <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />}
            {toast.type === "error" && <XCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />}
            {toast.type === "info" && <HelpCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------------
          APP SHELL: SIDEBAR NAVIGATION
      ------------------------------------------------------------- */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
            L
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
            <span>Reconciliation</span>
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
            <span>Expected Payments</span>
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
            <span>Received Transactions</span>
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
              <ShieldAlert size={16} className={reviewCount > 0 ? "text-amber-400" : ""} />
              <span>Exceptions Queue</span>
            </div>
            {reviewCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
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
          {/* Workspace Switcher */}
          <div className="px-2.5 py-2 rounded bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building size={14} className="text-slate-400 shrink-0" />
              <div className="truncate">
                <div className="text-slate-200 font-medium truncate">Apex Superstores Ltd</div>
                <div className="text-[10px] text-slate-500 font-mono">RC-1849201</div>
              </div>
            </div>
            <ChevronDown size={12} className="text-slate-400 shrink-0" />
          </div>

          {/* User Profile */}
          <div className="px-2.5 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-300 shrink-0">
                DO
              </div>
              <div className="truncate">
                <div className="text-slate-200 font-medium truncate">{operatorName}</div>
                <div className="text-[10px] text-slate-500">{operatorRole}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          APP SHELL: MAIN VIEWPORT
      ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">
              {activeTab === "overview" && "Overview Dashboard"}
              {activeTab === "reconciliation" && "Payment Reconciliation"}
              {activeTab === "expected" && "Expected Payments Registry"}
              {activeTab === "received" && "Received Transactions"}
              {activeTab === "exceptions" && "Exceptions & Review Queue"}
              {activeTab === "reports" && "Reconciliation Reports & Audit"}
              {activeTab === "settings" && "Workspace Settings & Rules"}
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
              onClick={loadAllData}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
              title="Refresh live data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => {
                setActiveTab("received");
                setIngestionType("received");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <UploadCloud size={14} className="text-slate-500" />
              <span>Import statement</span>
            </button>

            <button
              onClick={handleRunReconciliation}
              disabled={reconciling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span>{reconciling ? "Verifying..." : "Run reconciliation"}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* =========================================================
              VIEW 1: OVERVIEW DASHBOARD
          ========================================================= */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Four Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Expected Payments Total */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Expected Payments</span>
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
                    {formatNGN(stats.expected.totalAmount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {stats.expected.totalCount} invoices / expected orders
                  </div>
                </div>

                {/* 2. Received Inflows Total */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Received Inflows</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
                    {formatNGN(stats.received.totalAmount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {stats.received.totalCount} bank & POS statement credits
                  </div>
                </div>

                {/* 3. Successfully Matched */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Successfully Matched</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-emerald-700 tracking-tight">
                    {formatNGN(stats.received.matchedAmount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <span className="font-semibold text-emerald-600">{stats.reconciliationRate}%</span>
                    <span>of expected revenue matched</span>
                  </div>
                </div>

                {/* 4. Unreconciled Variance */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Unreconciled Variance</span>
                    <AlertTriangle size={16} className="text-amber-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
                    {formatNGN(stats.expected.pendingAmount + stats.received.unmatchedAmount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {stats.expected.pendingCount} unpaid orders • {stats.received.unmatchedCount} unlinked credits
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Reconciliation Status Summary</h2>
                    <p className="text-xs text-slate-500">
                      Categorization across deterministic matches, pending orders, and exceptions
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("reconciliation")}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <span>View ledger</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-md">
                    <div className="text-xs font-medium text-emerald-800">Matched Transactions</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">{matches.length}</div>
                    <div className="text-[11px] text-emerald-600 font-mono mt-0.5">
                      {stats.trustMetrics.exactAutomaticCount} exact • {stats.trustMetrics.confirmedSuggestionsCount + stats.trustMetrics.manualMatchesCount} human verified
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="text-xs font-medium text-slate-700">Pending Orders (Unpaid)</div>
                    <div className="text-xl font-bold text-slate-800 mt-1">{stats.expected.pendingCount}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatNGN(stats.expected.pendingAmount)} outstanding
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-md">
                    <div className="text-xs font-medium text-amber-800">Exceptions Requiring Review</div>
                    <div className="text-xl font-bold text-amber-700 mt-1">{reviewCount}</div>
                    <div className="text-[11px] text-amber-600 mt-0.5">
                      {exceptions?.suggestions.length || 0} fuzzy suggestions • {exceptions?.ambiguous.length || 0} ambiguous
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-md">
                    <div className="text-xs font-medium text-rose-800">False Matches Prevented</div>
                    <div className="text-xl font-bold text-rose-700 mt-1">
                      {stats.trustMetrics.falseMatchesPrevented}
                    </div>
                    <div className="text-[11px] text-rose-600 mt-0.5">
                      Rejected by operator to prevent misattribution
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart & Recent Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expected vs Received Volume Chart */}
                <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Financial Volume by Channel
                      </h2>
                      <p className="text-xs text-slate-500">
                        Breakdown of actual reconciled bank inflows across payment rails
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full flex flex-col justify-end pt-4 pb-1">
                    {(!stats.channelBreakdown || stats.channelBreakdown.length === 0) ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No reconciled channel activity recorded yet
                      </div>
                    ) : (
                      <div className="h-full flex flex-col justify-between">
                        {/* Bars container */}
                        <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-44 px-2 pt-6">
                          {stats.channelBreakdown.map((item) => {
                            const maxVal = Math.max(...stats.channelBreakdown.map((b) => b.amount), 1);
                            const heightPct = Math.max(10, Math.round((item.amount / maxVal) * 100));
                            return (
                              <div
                                key={item.channel}
                                className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                              >
                                {/* Floating Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-11 z-30 pointer-events-none bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded shadow-lg whitespace-nowrap">
                                  <div className="font-semibold text-white">{item.channel}</div>
                                  <div className="text-slate-300 font-mono">
                                    {formatNGN(item.amount)} ({item.count} {item.count === 1 ? 'txn' : 'txns'})
                                  </div>
                                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                </div>

                                {/* Top Value Label */}
                                <span className="text-[10px] font-mono font-medium text-slate-500 mb-1.5 group-hover:text-slate-900 transition-colors">
                                  ₦{(item.amount / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })}k
                                </span>

                                {/* Bar Column */}
                                <div className="w-full max-w-[42px] bg-slate-100/80 rounded-t h-full flex flex-col justify-end overflow-hidden">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className="w-full bg-slate-800 group-hover:bg-indigo-600 transition-all duration-300 rounded-t"
                                  />
                                </div>

                                {/* Channel Label */}
                                <span className="text-[11px] font-medium text-slate-600 truncate mt-2 max-w-full text-center">
                                  {item.channel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Horizontal base rule */}
                        <div className="border-t border-slate-100 w-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Exceptions Summary Callout */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      <ShieldAlert size={16} />
                      <span>Review Queue</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      {reviewCount} Items Need Investigation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Fuzzy matches and ambiguous transactions are kept in the review queue. They are never automatically committed without operator confirmation.
                    </p>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Candidate Suggestions</span>
                        <span className="font-semibold text-slate-900">{exceptions?.suggestions.length || 0}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Ambiguous Multi-Matches</span>
                        <span className="font-semibold text-slate-900">{exceptions?.ambiguous.length || 0}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Blocked Ingestion Duplicates</span>
                        <span className="font-semibold text-slate-900">{exceptions?.duplicates.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("exceptions")}
                    className="w-full mt-6 py-2 px-3 text-xs font-medium text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors text-center"
                  >
                    Open Exceptions Queue →
                  </button>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Recent Reconciliation Matches</h3>
                  <button
                    onClick={() => setActiveTab("reconciliation")}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    View all ({matches.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Expected Order</th>
                        <th className="px-4 py-2.5">Bank Reference</th>
                        <th className="px-4 py-2.5">Customer / Sender</th>
                        <th className="px-4 py-2.5">Channel</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5">Match Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matches.slice(0, 5).map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {m.expectedPayment?.reference}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {m.receivedPayment?.reference}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {m.expectedPayment?.customerName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {m.receivedPayment?.provider} ({m.receivedPayment?.channel})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {formatNGN(m.receivedPayment?.amount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                m.matchMethod === "AUTOMATIC_EXACT"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {m.matchMethod === "AUTOMATIC_EXACT" ? "Exact Reference" : "Human Confirmed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {matches.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No transactions reconciled yet. Click "Run reconciliation" to start.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 2: RECONCILIATION WORKING TABLE
          ========================================================= */}
          {activeTab === "reconciliation" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* Working Controls Bar */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by order ref, bank ref, customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="MATCHED">Matched</option>
                    <option value="UNMATCHED">Pending Order</option>
                    <option value="UNCLAIMED">Unclaimed Inflow</option>
                  </select>

                  {/* Channel Filter */}
                  <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Channels</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="POS">POS Terminal</option>
                    <option value="WALLET">Wallet</option>
                  </select>

                  {/* Manual Match Button */}
                  <button
                    onClick={() =>
                      setManualMatchModal({
                        isOpen: true,
                        selectedExpectedId: "",
                        selectedReceivedId: "",
                        notes: "",
                        actor: `${operatorName} (${operatorRole})`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded transition-colors shadow-2xs"
                  >
                    <Link2 size={13} className="text-slate-500" />
                    Manual Match
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredRows.length} records
                </div>
              </div>

              {/* Transaction Working Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Expected Ref</th>
                        <th className="px-4 py-3">Bank Ref</th>
                        <th className="px-4 py-3">Customer / Payer</th>
                        <th className="px-4 py-3 text-right">Expected</th>
                        <th className="px-4 py-3 text-right">Received</th>
                        <th className="px-4 py-3">Channel / Bank</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.expectedRef}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{row.receivedRef}</td>
                          <td className="px-4 py-3 text-slate-800">{row.customer}</td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {row.expectedAmount > 0 ? formatNGN(row.expectedAmount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {row.receivedAmount > 0 ? formatNGN(row.receivedAmount) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {row.provider}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === "MATCHED" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Matched
                              </span>
                            )}
                            {row.status === "UNMATCHED" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                Pending Order
                              </span>
                            )}
                            {row.status === "UNCLAIMED" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Unclaimed Inflow
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.matchObj ? (
                              <button
                                onClick={() => setInspectMatch(row.matchObj)}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors"
                              >
                                Inspect
                              </button>
                            ) : row.status === "UNMATCHED" ? (
                              <button
                                onClick={() =>
                                  setManualMatchModal({
                                    isOpen: true,
                                    selectedExpectedId: row.expectedId,
                                    selectedReceivedId: "",
                                    notes: "",
                                    actor: `${operatorName} (${operatorRole})`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded transition-colors"
                              >
                                <Link2 size={11} />
                                Match to Inflow
                              </button>
                            ) : row.status === "UNCLAIMED" ? (
                              <button
                                onClick={() =>
                                  setManualMatchModal({
                                    isOpen: true,
                                    selectedExpectedId: "",
                                    selectedReceivedId: row.receivedId,
                                    notes: "",
                                    actor: `${operatorName} (${operatorRole})`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded transition-colors"
                              >
                                <Link2 size={11} />
                                Match to Order
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                            No records found matching current search and filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 3: EXPECTED PAYMENTS REGISTRY
          ========================================================= */}
          {activeTab === "expected" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Registered Expected Payments</h2>
                  <p className="text-xs text-slate-500">
                    Database of invoices, store orders, and expected inflows for reconciliation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("received");
                      setIngestionType("expected");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                  >
                    <UploadCloud size={14} /> Import Orders CSV
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Plus size={14} /> Add Expected Payment
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Created Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expected.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{exp.reference}</td>
                        <td className="px-4 py-3 text-slate-800">{exp.customerName}</td>
                        <td className="px-4 py-3 text-slate-500">{exp.customerPhone || exp.customerEmail || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatNGN(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(exp.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
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
          )}

          {/* =========================================================
              VIEW 4: RECEIVED TRANSACTIONS & CSV INGESTION
          ========================================================= */}
          {activeTab === "received" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* CSV Upload / Ingestion Panel */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Import Statement or Orders CSV</h2>
                    <p className="text-xs text-slate-500">
                      Standardize bank statement credits and order registries with automatic duplicate detection
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-200 text-xs">
                    <button
                      onClick={() => {
                        setIngestionType("received");
                        handleLoadSampleCsv("received");
                      }}
                      className={`px-3 py-1 rounded font-medium transition-colors ${
                        ingestionType === "received" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Bank Statements (Inflows)
                    </button>
                    <button
                      onClick={() => {
                        setIngestionType("expected");
                        handleLoadSampleCsv("expected");
                      }}
                      className={`px-3 py-1 rounded font-medium transition-colors ${
                        ingestionType === "expected" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Expected Orders
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={6}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="Paste CSV rows here or click 'Load Sample' to test..."
                    className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  />

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleLoadSampleCsv(ingestionType)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                    >
                      Load sample {ingestionType === "received" ? "bank statement" : "orders"} CSV
                    </button>

                    <button
                      onClick={handleProcessCsv}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      <FileCheck size={14} className="text-emerald-400" />
                      <span>{uploading ? "Normalizing..." : "Process & Import CSV"}</span>
                    </button>
                  </div>
                </div>

                {/* Ingestion Validation Results Banner */}
                {ingestionResult && (
                  <div className="mt-4 p-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>{ingestionResult.message}</span>
                    </div>
                    <div className="text-emerald-800 flex gap-4 pt-1 font-mono">
                      <span>Total Rows: {ingestionResult.details.totalRows}</span>
                      <span>Imported: {ingestionResult.details.importedCount}</span>
                      <span>Duplicates Prevented: {ingestionResult.details.duplicateCount}</span>
                      <span>Failed: {ingestionResult.details.errorCount}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ingested Bank Statements ({received.length})
                  </h3>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Reference / Session ID</th>
                      <th className="px-4 py-3">Bank / Provider</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Sender / Payer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Transaction Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {received.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{rec.reference}</td>
                        <td className="px-4 py-3 text-slate-800">{rec.provider}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {rec.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{rec.senderName || "Unknown"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatNGN(rec.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(rec.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
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
          )}

          {/* =========================================================
              VIEW 5: EXCEPTIONS QUEUE (THE DIFFERENTIATOR)
          ========================================================= */}
          {activeTab === "exceptions" && (
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
                      setManualMatchModal({
                        isOpen: true,
                        selectedExpectedId: "",
                        selectedReceivedId: "",
                        notes: "",
                        actor: `${operatorName} (${operatorRole})`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded transition-colors shadow-2xs"
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
                          onClick={() => handleRejectSuggestion(item.expectedPayment.id, item.receivedPayment.id)}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                        >
                          Reject Suggestion
                        </button>
                        <button
                          onClick={() => handleConfirmSuggestion(item.expectedPayment.id, item.receivedPayment.id, item.reason)}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs"
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
                            onClick={() => handleConfirmSuggestion(cand.expectedPayment.id, amb.receivedPayment.id, `Resolved ambiguous payment to ${cand.expectedPayment.customerName}`)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium"
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
          )}

          {/* =========================================================
              VIEW 6: CERTIFIED REPORTS & AUDIT TRAIL
          ========================================================= */}
          {activeTab === "reports" && stats && (
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
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium"
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
                      {formatNGN(stats.expected.totalAmount)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500">Total Bank Inflows</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {formatNGN(stats.received.totalAmount)}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <span className="text-emerald-800">Verified Matched Revenue</span>
                    <div className="text-lg font-bold text-emerald-700 mt-1">
                      {formatNGN(stats.received.matchedAmount)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500">Net Financial Variance</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {formatNGN(stats.received.totalAmount - stats.expected.totalAmount)}
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
          )}

          {/* =========================================================
              VIEW 7: SETTINGS & MATCHING RULES
          ========================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Workspace Profile */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Workspace & Organization Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Company Legal Name</label>
                    <input
                      type="text"
                      disabled
                      value="Apex Superstores & Logistics Nigeria Ltd"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">CAC Registration (RC)</label>
                    <input
                      type="text"
                      disabled
                      value="RC-1849201"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Operating Currency</label>
                    <input
                      type="text"
                      disabled
                      value="NGN (₦) - Nigerian Naira"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Active Operator</label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Matching Rules Configuration */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Reconciliation Rules Engine</h3>
                    <p className="text-xs text-slate-500">
                      Rules priority sequence executed during batch and auto-reconciliation
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{rule.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                            Priority {rule.priority}
                          </span>
                          {rule.priority >= 8 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Auto-Match
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Requires Confirmation
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{rule.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          MODAL: ADD EXPECTED PAYMENT
      ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Add Expected Payment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpectedPayment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Reference / Order ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-0044"
                  value={newOrderRef}
                  onChange={(e) => setNewOrderRef(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded outline-none ${
                    formErrors.reference ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                  }`}
                />
                {formErrors.reference && <div className="text-rose-600 text-[11px] mt-1">{formErrors.reference}</div>}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Amount in NGN (₦) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={newOrderAmount}
                  onChange={(e) => setNewOrderAmount(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded outline-none ${
                    formErrors.amount ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                  }`}
                />
                {formErrors.amount && <div className="text-rose-600 text-[11px] mt-1">{formErrors.amount}</div>}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Customer / Payer Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chukwuemeka Obi"
                  value={newOrderCustomer}
                  onChange={(e) => setNewOrderCustomer(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded outline-none ${
                    formErrors.customerName ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                  }`}
                />
                {formErrors.customerName && <div className="text-rose-600 text-[11px] mt-1">{formErrors.customerName}</div>}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 08034567890"
                  value={newOrderPhone}
                  onChange={(e) => setNewOrderPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description / Memo (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics wholesale purchase"
                  value={newOrderDesc}
                  onChange={(e) => setNewOrderDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
                >
                  Save Expected Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: INSPECT TRANSACTION RECORD
      ------------------------------------------------------------- */}
      {inspectMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reconciliation Inspection</h3>
                <span className="text-[11px] text-slate-500 font-mono">Match ID: {inspectMatch.id}</span>
              </div>
              <button onClick={() => setInspectMatch(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Expected Order</div>
                  <div className="font-bold text-slate-900 text-sm">{inspectMatch.expectedPayment?.reference}</div>
                  <div className="mt-1">Customer: {inspectMatch.expectedPayment?.customerName}</div>
                  <div>Amount: <strong>{formatNGN(inspectMatch.expectedPayment?.amount || 0)}</strong></div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Received Transaction</div>
                  <div className="font-bold text-slate-900 text-sm">{inspectMatch.receivedPayment?.reference}</div>
                  <div className="mt-1">Sender: {inspectMatch.receivedPayment?.senderName || "Unknown"}</div>
                  <div>Amount: <strong>{formatNGN(inspectMatch.receivedPayment?.amount || 0)}</strong></div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Match Method: {inspectMatch.matchMethod.replace("_", " ")}</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                  {inspectMatch.notes || "Reconciled with exact reference and matching amount."}
                </div>
                <div className="mt-1 text-[10px] text-emerald-600 font-mono">
                  Verified by: {inspectMatch.matchedBy} • Matched at {new Date(inspectMatch.matchedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleUnmatch(inspectMatch.id)}
                  className="px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-xs font-medium"
                >
                  Unmatch Transaction
                </button>
                <button
                  onClick={() => setInspectMatch(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: MANUAL TRANSACTION MATCH
      ------------------------------------------------------------- */}
      {manualMatchModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-900 text-white rounded-md">
                  <Link2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Manual Match & Reconciliation</h3>
                  <p className="text-[11px] text-slate-500">
                    Pair an unmatched order with an unclaimed bank inflow with full audit tracking.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualMatchModal(null)}
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
                      {expected.filter((e) => e.status === "PENDING").length} available
                    </span>
                  </div>

                  <select
                    value={manualMatchModal.selectedExpectedId}
                    onChange={(e) =>
                      setManualMatchModal({
                        ...manualMatchModal,
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
                  {manualMatchModal.selectedExpectedId && (() => {
                    const selExp = expected.find((e) => e.id === manualMatchModal.selectedExpectedId);
                    if (!selExp) return null;
                    return (
                      <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-md text-[11px] space-y-1 shadow-2xs">
                        <div className="font-semibold text-indigo-950 flex items-center justify-between">
                          <span>{selExp.reference}</span>
                          <span className="text-xs font-bold text-slate-900">{formatNGN(selExp.amount)}</span>
                        </div>
                        <div className="text-slate-600">Customer: <strong className="text-slate-800">{selExp.customerName}</strong></div>
                        {selExp.customerPhone && <div className="text-slate-500 font-mono">Phone: {selExp.customerPhone}</div>}
                        <div className="text-slate-400 text-[10px]">Created: {new Date(selExp.createdAt).toLocaleDateString()}</div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Select Unclaimed Received Inflow */}
                <div className="flex flex-col border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-600" />
                      2. Unclaimed Inflow
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {received.filter((r) => r.status === "UNMATCHED").length} available
                    </span>
                  </div>

                  <select
                    value={manualMatchModal.selectedReceivedId}
                    onChange={(e) =>
                      setManualMatchModal({
                        ...manualMatchModal,
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
                          {r.provider} • {r.senderName || r.reference} ({formatNGN(r.amount)})
                        </option>
                      ))}
                  </select>

                  {/* Inflow Preview Card */}
                  {manualMatchModal.selectedReceivedId && (() => {
                    const selRec = received.find((r) => r.id === manualMatchModal.selectedReceivedId);
                    if (!selRec) return null;
                    return (
                      <div className="mt-3 p-3 bg-white border border-emerald-100 rounded-md text-[11px] space-y-1 shadow-2xs">
                        <div className="font-semibold text-emerald-950 flex items-center justify-between">
                          <span>{selRec.provider} ({selRec.channel})</span>
                          <span className="text-xs font-bold text-slate-900">{formatNGN(selRec.amount)}</span>
                        </div>
                        <div className="text-slate-600">Sender: <strong className="text-slate-800">{selRec.senderName || "Unknown"}</strong></div>
                        <div className="text-slate-500 font-mono text-[10px] truncate">Ref: {selRec.reference}</div>
                        {selRec.narrative && <div className="text-slate-500 italic truncate text-[10px]">"{selRec.narrative}"</div>}
                        <div className="text-slate-400 text-[10px]">Received: {new Date(selRec.createdAt).toLocaleDateString()}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Match Comparison & Discrepancy Banner */}
              {manualMatchModal.selectedExpectedId && manualMatchModal.selectedReceivedId && (() => {
                const expItem = expected.find((e) => e.id === manualMatchModal.selectedExpectedId);
                const recItem = received.find((r) => r.id === manualMatchModal.selectedReceivedId);
                if (!expItem || !recItem) return null;
                const diff = recItem.amount - expItem.amount;
                const isExact = diff === 0;

                return (
                  <div
                    className={`p-3.5 rounded-lg border flex items-center justify-between ${
                      isExact
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                        : "bg-amber-50/80 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isExact ? (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-xs">
                          {isExact ? "Exact Amount Match" : "Amount Discrepancy Detected"}
                        </div>
                        <div className="text-[11px] opacity-90">
                          Expected: {formatNGN(expItem.amount)} • Received: {formatNGN(recItem.amount)}
                          {!isExact && ` • Difference: ${diff > 0 ? "+" : ""}${formatNGN(diff)}`}
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
                );
              })()}

              {/* Audit Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Approving Operator / Accountant
                  </label>
                  <input
                    type="text"
                    value={manualMatchModal.actor}
                    onChange={(e) =>
                      setManualMatchModal({
                        ...manualMatchModal,
                        actor: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reconciliation Reason / Audit Justification <span className="text-slate-400">(Required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Verified customer paid from husband's GTBank account; payment confirmed via phone"
                    value={manualMatchModal.notes}
                    onChange={(e) =>
                      setManualMatchModal({
                        ...manualMatchModal,
                        notes: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 outline-none focus:border-slate-400 focus:bg-white placeholder-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This justification is permanently stored in the audit trail for financial reporting.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setManualMatchModal(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !manualMatchModal.selectedExpectedId ||
                  !manualMatchModal.selectedReceivedId ||
                  actionLoading
                }
                onClick={handleConfirmManualMatch}
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
      )}
    </div>
  );
}
