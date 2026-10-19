import { useState, useEffect } from "react";
import { api } from "./api";
import type {
  ExpectedPayment,
  ReceivedPayment,
  ReconciliationMatch,
  ReconciliationRule,
  ExceptionQueueData,
  DashboardStats,
  AuditLogItem,
} from "./api";
import LandingPage from "./LandingPage";
import { Sidebar, type NavTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ToastContainer, type Toast } from "./components/ToastContainer";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { ReconciliationTab } from "./components/tabs/ReconciliationTab";
import { ExpectedTab } from "./components/tabs/ExpectedTab";
import { ReceivedTab } from "./components/tabs/ReceivedTab";
import { ExceptionsTab } from "./components/tabs/ExceptionsTab";
import { ReportsTab } from "./components/tabs/ReportsTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { AddExpectedModal } from "./components/modals/AddExpectedModal";
import { InspectMatchModal } from "./components/modals/InspectMatchModal";
import { ManualMatchModal, type ManualMatchModalData } from "./components/modals/ManualMatchModal";
import { PilotSetupModal, type PilotProfile } from "./components/modals/PilotSetupModal";

const initialExceptions: ExceptionQueueData = {
  suggestions: [],
  ambiguous: [],
  unmatchedExpected: [],
  unmatchedReceived: [],
  duplicates: [],
  rejectedPairsCount: 0,
};

const initialStats: DashboardStats = {
  expected: {
    totalCount: 0,
    totalAmount: 0,
    matchedCount: 0,
    matchedAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
  },
  received: {
    totalCount: 0,
    totalAmount: 0,
    matchedCount: 0,
    matchedAmount: 0,
    unmatchedCount: 0,
    unmatchedAmount: 0,
  },
  reconciliationRate: 0,
  trustMetrics: {
    totalMatchedCount: 0,
    exactAutomaticCount: 0,
    confirmedSuggestionsCount: 0,
    manualMatchesCount: 0,
    falseMatchesPrevented: 0,
    unmatchesCount: 0,
    duplicatesCount: 0,
  },
  channelBreakdown: [],
  providerBreakdown: [],
  recentMatches: [],
  recentAudit: [],
};

export default function App() {
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Dynamic Pilot & Operator Attribution (Persisted in localStorage across sessions)
  const [operatorName, setOperatorNameState] = useState(
    () => localStorage.getItem("lissafi_operator_name") || "David Okoye"
  );
  const [operatorRole, setOperatorRoleState] = useState(
    () => localStorage.getItem("lissafi_operator_role") || "Finance Lead"
  );
  const [companyName, setCompanyNameState] = useState(
    () => localStorage.getItem("lissafi_company_name") || "Apex Superstores & Logistics Nigeria Ltd"
  );
  const [rcNumber, setRcNumberState] = useState(
    () => localStorage.getItem("lissafi_rc_number") || "RC-1849201"
  );
  const [selectedPeriod, setSelectedPeriod] = useState("October 2026");

  // Pilot Modal
  const [showPilotModal, setShowPilotModal] = useState(false);

  const setOperatorName = (val: string) => {
    setOperatorNameState(val);
    localStorage.setItem("lissafi_operator_name", val);
  };

  const setOperatorRole = (val: string) => {
    setOperatorRoleState(val);
    localStorage.setItem("lissafi_operator_role", val);
  };

  const setCompanyName = (val: string) => {
    setCompanyNameState(val);
    localStorage.setItem("lissafi_company_name", val);
  };

  const setRcNumber = (val: string) => {
    setRcNumberState(val);
    localStorage.setItem("lissafi_rc_number", val);
  };

  const handleSavePilotProfile = async (profile: PilotProfile) => {
    setCompanyName(profile.companyName);
    setRcNumber(profile.rcNumber);
    setOperatorName(profile.operatorName);
    setOperatorRole(profile.operatorRole);
    if (profile.tenantId) {
      localStorage.setItem("lissafi_tenant_id", profile.tenantId);
    }
    addToast(`Switched workspace to ${profile.companyName}!`, "info");
    await loadAllData();
  };

  // Core Data States
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [expected, setExpected] = useState<ExpectedPayment[]>([]);
  const [received, setReceived] = useState<ReceivedPayment[]>([]);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionQueueData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [rules, setRules] = useState<ReconciliationRule[]>([]);

  // Modals state
  const [inspectMatch, setInspectMatch] = useState<ReconciliationMatch | null>(null);
  const [manualMatchModal, setManualMatchModal] = useState<ManualMatchModalData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [receivedInitialIngestionType, setReceivedInitialIngestionType] = useState<"expected" | "received">("received");

  // Toast Helper
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initial and Refresh Data Fetching
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        expectedRes,
        receivedRes,
        matchesRes,
        exceptionsRes,
        auditRes,
        rulesRes,
      ] = await Promise.all([
        api.getDashboardStats().catch(() => initialStats),
        api.getExpectedPayments().catch(() => []),
        api.getReceivedPayments().catch(() => []),
        api.getMatches().catch(() => []),
        api.getExceptions().catch(() => initialExceptions),
        api.getAuditLogs().catch(() => []),
        api.getRules().catch(() => []),
      ]);

      setStats({
        ...initialStats,
        ...statsRes,
        expected: { ...initialStats.expected, ...(statsRes?.expected || {}) },
        received: { ...initialStats.received, ...(statsRes?.received || {}) },
        trustMetrics: { ...initialStats.trustMetrics, ...(statsRes?.trustMetrics || {}) },
      });
      setExpected(expectedRes);
      setReceived(receivedRes);
      setMatches(matchesRes);
      setExceptions(exceptionsRes);
      setAuditLogs(auditRes);
      setRules(rulesRes);
    } catch (err: any) {
      addToast(err.message || "Failed to load reconciliation data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Trigger Automatic Reconciliation Engine
  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const result = await api.runAutoReconciliation(false, `${operatorName} (${operatorRole})`);
      const matchMsg = result.matchedCount === 1
        ? `1 new match found`
        : `${result.matchedCount} new matches found`;
      const remainingMsg = result.remainingUnmatched === 0
        ? `All records matched`
        : `${result.remainingUnmatched} unmatched record${result.remainingUnmatched === 1 ? '' : 's'} remaining`;
      addToast(
        `Reconciliation complete: ${matchMsg}. ${remainingMsg}.`,
        result.matchedCount > 0 ? "success" : "info",
      );
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Reconciliation failed", "error");
    } finally {
      setReconciling(false);
    }
  };

  // Confirm Match Suggestion
  const handleConfirmSuggestion = async (
    expectedId: string,
    receivedId: string,
    note?: string,
  ) => {
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
  const handleAddExpectedSubmit = async (data: {
    reference: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    description: string;
  }) => {
    try {
      await api.createExpectedPayment({
        reference: data.reference,
        amount: data.amount,
        customerName: data.customerName,
        customerPhone: data.customerPhone || undefined,
        description: data.description || undefined,
      });

      addToast(`Expected payment ${data.reference} added successfully.`, "success");
      await loadAllData();
    } catch (err: any) {
      addToast(err.message || "Failed to create expected payment", "error");
      throw err;
    }
  };

  // Total Counts & Review Badge
  const reviewCount =
    (exceptions?.suggestions.length || 0) +
    (exceptions?.ambiguous.length || 0) +
    (exceptions?.duplicates.length || 0);

  const handleLaunchApp = () => {
    // Re-sync latest provisioned profile from localStorage
    const storedCompany = localStorage.getItem("lissafi_company_name");
    const storedOperator = localStorage.getItem("lissafi_operator_name");
    const storedRole = localStorage.getItem("lissafi_operator_role");
    if (storedCompany) setCompanyNameState(storedCompany);
    if (storedOperator) setOperatorNameState(storedOperator);
    if (storedRole) setOperatorRoleState(storedRole);

    setViewMode("app");
    loadAllData();
  };

  if (viewMode === "landing") {
    return (
      <>
        <LandingPage onLaunchApp={handleLaunchApp} stats={stats} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 antialiased overflow-hidden">
      {/* Left Sidebar Shell */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reviewCount={reviewCount}
        operatorName={operatorName}
        operatorRole={operatorRole}
        companyName={companyName}
        rcNumber={rcNumber}
        onNavigateLanding={() => setViewMode("landing")}
        onOpenPilotSetup={() => setShowPilotModal(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          loading={loading}
          reconciling={reconciling}
          onRefresh={loadAllData}
          onOpenUpload={() => {
            setActiveTab("received");
            setReceivedInitialIngestionType("received");
          }}
          onRunReconciliation={handleRunReconciliation}
          onNavigateLanding={() => setViewMode("landing")}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === "overview" && (
            <OverviewTab
              stats={stats}
              matches={matches}
              exceptions={exceptions}
              reviewCount={reviewCount}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "reconciliation" && (
            <ReconciliationTab
              matches={matches}
              expected={expected}
              received={received}
              operatorName={operatorName}
              operatorRole={operatorRole}
              onInspect={(m) => setInspectMatch(m)}
              onOpenManualMatch={({ selectedExpectedId, selectedReceivedId }) =>
                setManualMatchModal({
                  isOpen: true,
                  selectedExpectedId,
                  selectedReceivedId,
                  notes: "",
                  actor: `${operatorName} (${operatorRole})`,
                })
              }
            />
          )}

          {activeTab === "expected" && (
            <ExpectedTab
              expected={expected}
              onOpenAddModal={() => setShowAddModal(true)}
              onNavigateImport={() => {
                setActiveTab("received");
                setReceivedInitialIngestionType("expected");
              }}
            />
          )}

          {activeTab === "received" && (
            <ReceivedTab
              received={received}
              operatorName={operatorName}
              operatorRole={operatorRole}
              initialIngestionType={receivedInitialIngestionType}
              onRefreshData={loadAllData}
              addToast={addToast}
            />
          )}

          {activeTab === "exceptions" && (
            <ExceptionsTab
              exceptions={exceptions}
              operatorName={operatorName}
              operatorRole={operatorRole}
              onConfirmSuggestion={handleConfirmSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
              onOpenManualMatch={({ selectedExpectedId, selectedReceivedId }) =>
                setManualMatchModal({
                  isOpen: true,
                  selectedExpectedId,
                  selectedReceivedId,
                  notes: "",
                  actor: `${operatorName} (${operatorRole})`,
                })
              }
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab stats={stats} auditLogs={auditLogs} />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              companyName={companyName}
              setCompanyName={setCompanyName}
              rcNumber={rcNumber}
              setRcNumber={setRcNumber}
              operatorName={operatorName}
              setOperatorName={setOperatorName}
              operatorRole={operatorRole}
              setOperatorRole={setOperatorRole}
              onOpenPilotSetup={() => setShowPilotModal(true)}
              rules={rules}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <InspectMatchModal
        inspectMatch={inspectMatch}
        onClose={() => setInspectMatch(null)}
        onUnmatch={handleUnmatch}
      />

      <ManualMatchModal
        data={manualMatchModal}
        expected={expected}
        received={received}
        actionLoading={actionLoading}
        onClose={() => setManualMatchModal(null)}
        onChange={setManualMatchModal}
        onConfirm={handleConfirmManualMatch}
      />

      <AddExpectedModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddExpectedSubmit}
      />

      <PilotSetupModal
        isOpen={showPilotModal}
        onClose={() => setShowPilotModal(false)}
        currentProfile={{
          companyName,
          rcNumber,
          operatorName,
          operatorRole,
          currency: "NGN (₦)",
        }}
        onSave={handleSavePilotProfile}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
