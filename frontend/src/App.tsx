import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  History,
  UploadCloud,
  Sliders,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileText,
  Banknote,
  Activity,
  Link as LinkIcon,
  X,
  Sparkles,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const API_BASE = "http://localhost:4000/api";

// Interfaces
interface ExpectedPayment {
  id: string;
  amount: number;
  reference: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: "PENDING" | "MATCHED" | "PARTIAL" | "EXPIRED";
  createdAt: string;
  dueDate?: string;
  description?: string;
}

interface ReceivedPayment {
  id: string;
  amount: number;
  channel: string;
  provider: string;
  reference: string;
  narrative?: string;
  senderName?: string;
  senderAccount?: string;
  status: "UNMATCHED" | "MATCHED" | "IGNORED";
  createdAt: string;
  ingestedAt: string;
}

interface ReconciliationMatch {
  id: string;
  expectedPaymentId: string;
  receivedPaymentId: string;
  matchMethod: "AUTOMATIC_EXACT" | "AUTOMATIC_FUZZY" | "MANUAL";
  confidenceScore: number;
  matchedRules: string; // stringified JSON array
  matchedAt: string;
  matchedBy: string;
  notes?: string;
  expectedPayment?: ExpectedPayment;
  receivedPayment?: ReceivedPayment;
}

interface ReconciliationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  ruleType: string;
  config: string; // stringified JSON
}

interface DashboardStats {
  expected: {
    totalCount: number;
    totalAmount: number;
    matchedCount: number;
    matchedAmount: number;
    pendingCount: number;
    pendingAmount: number;
  };
  received: {
    totalCount: number;
    totalAmount: number;
    matchedCount: number;
    matchedAmount: number;
    unmatchedCount: number;
    unmatchedAmount: number;
  };
  reconciliationRate: number;
  channelBreakdown: Array<{ channel: string; count: number; amount: number }>;
  providerBreakdown: Array<{ provider: string; count: number; amount: number }>;
  recentMatches: Array<{
    id: string;
    matchedAt: string;
    matchMethod: string;
    expectedPayment: { reference: string; customerName: string };
    receivedPayment: { channel: string; provider: string; reference: string };
  }>;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "danger" | "warning";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "ledger" | "history" | "ingestion" | "rules"
  >("dashboard");
  const [loading, setLoading] = useState(true);
  const [runningAuto, setRunningAuto] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Data states
  const [expected, setExpected] = useState<ExpectedPayment[]>([]);
  const [received, setReceived] = useState<ReceivedPayment[]>([]);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [rules, setRules] = useState<ReconciliationRule[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Search/Filters states
  const [expSearch, setExpSearch] = useState("");
  const [expFilter, setExpFilter] = useState<"ALL" | "PENDING" | "MATCHED">(
    "ALL",
  );
  const [recSearch, setRecSearch] = useState("");
  const [recFilter, setRecFilter] = useState<"ALL" | "UNMATCHED" | "MATCHED">(
    "ALL",
  );

  // Manual Matching Selection
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");

  // Ingestion CSV Input
  const [csvText, setCsvText] = useState(
    "amount,channel,provider,reference,narrative,sendername,senderaccount,createdat\n" +
      "32000.00,BANK_TRANSFER,ZenithBank,ZEN-TRSF-881928,Transfer from Nkechi Egwu hair extension,Nkechi Egwu,102***8812,2026-05-19T14:00:00Z\n" +
      "5000.00,BANK_TRANSFER,OPay,OPY-SESSION-4829102,Transfer from Tariq Ibrahim,TARIQ IBRAHIM,902***1928,2026-05-19T12:00:00Z\n" +
      "8500.00,POS,Moniepoint,MP-POS-998822,Retails POS payment,FATIMA ABUBAKAR,5061********9028,2026-05-19T11:30:00Z",
  );

  // Helper: Show toast
  const addToast = (
    message: string,
    type: "success" | "danger" | "warning" = "success",
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, expRes, recRes, matchesRes, rulesRes] =
        await Promise.all([
          fetch(`${API_BASE}/dashboard/stats`).then((r) => r.json()),
          fetch(`${API_BASE}/expected`).then((r) => r.json()),
          fetch(`${API_BASE}/received`).then((r) => r.json()),
          fetch(`${API_BASE}/matches`).then((r) => r.json()),
          fetch(`${API_BASE}/rules`).then((r) => r.json()),
        ]);

      setStats(statsRes);
      setExpected(expRes);
      setReceived(recRes);
      setMatches(matchesRes);
      setRules(rulesRes);
    } catch (error) {
      console.error(error);
      addToast("Failed to connect to backend engine API", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run auto-matching batch
  const handleRunAuto = async () => {
    setRunningAuto(true);
    try {
      const res = await fetch(`${API_BASE}/matches/auto`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(
          `Auto-reconciliation run finished! Matched ${data.matchedCount} records.`,
          "success",
        );
        loadData();
      } else {
        addToast(data.error || "Batch execution failed", "danger");
      }
    } catch (e) {
      addToast("Failed to dispatch background batch request", "danger");
    } finally {
      setRunningAuto(false);
    }
  };

  // Run manual matching
  const handleManualMatch = async () => {
    if (!selectedExpId || !selectedRecId) return;
    try {
      const res = await fetch(`${API_BASE}/matches/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedPaymentId: selectedExpId,
          receivedPaymentId: selectedRecId,
          notes: manualNotes || "Manually reconciliation match link",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Manual match recorded successfully!", "success");
        setSelectedExpId(null);
        setSelectedRecId(null);
        setManualNotes("");
        loadData();
      } else {
        addToast(data.error || "Manual match failed", "danger");
      }
    } catch (e) {
      addToast("Connection error while submitting manual link", "danger");
    }
  };

  // Unmatch a record
  const handleUnmatch = async (matchId: string) => {
    try {
      const res = await fetch(`${API_BASE}/matches/unmatch/${matchId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Match successfully revoked.", "success");
        loadData();
      } else {
        addToast(data.error || "Failed to unmatch", "danger");
      }
    } catch (e) {
      addToast("Error communicating unmatch command", "danger");
    }
  };

  // Ingest CSV bank statement
  const handleIngestCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/received/csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(
          data.message || "CSV statement ingested successfully!",
          "success",
        );
        setActiveTab("ledger");
        loadData();
      } else {
        addToast(data.error || "CSV parser error", "danger");
      }
    } catch (e) {
      addToast("Error sending CSV payload to ingest server", "danger");
    }
  };

  // Update reconciliation rule config
  const handleSaveRule = async (
    ruleId: string,
    isActive: boolean,
    priority: number,
    configObj: any,
  ) => {
    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, priority, config: configObj }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Rule '${data.name}' settings saved successfully!`, "success");
        loadData();
      } else {
        addToast(data.error || "Failed to save rule settings", "danger");
      }
    } catch (e) {
      addToast("Network error saving rule configurations", "danger");
    }
  };

  // Helper formatting values
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Search filtering logic
  const filteredExpected = expected.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.reference.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.customerName.toLowerCase().includes(expSearch.toLowerCase());
    const matchesFilter = expFilter === "ALL" || e.status === expFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredReceived = received.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(recSearch.toLowerCase()) ||
      r.reference.toLowerCase().includes(recSearch.toLowerCase()) ||
      (r.senderName &&
        r.senderName.toLowerCase().includes(recSearch.toLowerCase())) ||
      (r.narrative &&
        r.narrative.toLowerCase().includes(recSearch.toLowerCase()));
    const matchesFilter = recFilter === "ALL" || r.status === recFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="app-container">
      {/* Toast Alert System */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" && (
              <CheckCircle2 size={16} className="text-success" />
            )}
            {t.type === "danger" && <X size={16} className="text-danger" />}
            {t.type === "warning" && (
              <AlertCircle size={16} className="text-warning" />
            )}
            <span>{t.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((p) => p.id !== t.id))
              }
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                marginLeft: "0.5rem",
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">RECONCILO</span>
        </div>

        <nav>
          <ul className="nav-list">
            <li
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </li>
            <li
              className={`nav-item ${activeTab === "ledger" ? "active" : ""}`}
              onClick={() => setActiveTab("ledger")}
            >
              <ArrowLeftRight />
              <span>Transaction Ledger</span>
            </li>
            <li
              className={`nav-item ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History />
              <span>Reconciled History</span>
            </li>
            <li
              className={`nav-item ${activeTab === "ingestion" ? "active" : ""}`}
              onClick={() => setActiveTab("ingestion")}
            >
              <UploadCloud />
              <span>Ingestion Portal</span>
            </li>
            <li
              className={`nav-item ${activeTab === "rules" ? "active" : ""}`}
              onClick={() => setActiveTab("rules")}
            >
              <Sliders />
              <span>Matching Rules</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            <span>Engine Status: Connected</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ width: "100%", fontSize: "0.8rem", padding: "0.5rem" }}
          >
            <RefreshCw
              size={12}
              className={loading ? "spin-animation" : ""}
              style={{ marginRight: "4px" }}
            />
            Reload Cache
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Page Header */}
        <header className="page-header">
          <div>
            <h1 className="page-title">
              {activeTab === "dashboard" && "Performance Dashboard"}
              {activeTab === "ledger" && "Transaction Matching Desk"}
              {activeTab === "history" && "Reconciliation Audit Ledger"}
              {activeTab === "ingestion" && "Bank Statement Ingestion Portal"}
              {activeTab === "rules" && "Rule Config & Strategy Manager"}
            </h1>
            <p className="page-subtitle">
              {activeTab === "dashboard" &&
                "High-level overview of reconciliation matches, channel, and provider breakdowns."}
              {activeTab === "ledger" &&
                "Select an expected invoice and bank deposit transaction to reconcile manually."}
              {activeTab === "history" &&
                "Audit matched transactions, inspect logic paths, and undo matching connections."}
              {activeTab === "ingestion" &&
                "Ingest settlement files or paste raw bank narrative logs to trigger matches."}
              {activeTab === "rules" &&
                "Configure engine weights, window timings, and thresholds for match calculations."}
            </p>
          </div>

          {activeTab === "dashboard" && (
            <button
              className="btn btn-primary"
              onClick={handleRunAuto}
              disabled={runningAuto}
            >
              <Sparkles size={16} />
              {runningAuto
                ? "Reconciling Engine Running..."
                : "Execute Auto-Matching Run"}
            </button>
          )}
        </header>

        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "40vh",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <RefreshCw
              size={40}
              className="spin-animation"
              style={{ color: "var(--primary)" }}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Fetching engine metrics...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. DASHBOARD TAB */}
            {activeTab === "dashboard" && stats && (
              <div>
                {/* KPI metrics cards */}
                <div className="kpi-grid">
                  <div className="panel kpi-card kpi-primary">
                    <span className="kpi-title">Matching Success Rate</span>
                    <span className="kpi-value">
                      {stats.reconciliationRate}%
                    </span>
                    <span className="kpi-subtext">
                      Percentage of invoice orders reconciled
                    </span>
                  </div>
                  <div className="panel kpi-card kpi-success">
                    <span className="kpi-title">Reconciled Amount</span>
                    <span className="kpi-value">
                      {formatCurrency(stats.expected.matchedAmount)}
                    </span>
                    <span className="kpi-subtext">
                      Matched expected volume (count:{" "}
                      {stats.expected.matchedCount})
                    </span>
                  </div>
                  <div className="panel kpi-card kpi-warning">
                    <span className="kpi-title">Pending Orders</span>
                    <span className="kpi-value">
                      {formatCurrency(stats.expected.pendingAmount)}
                    </span>
                    <span className="kpi-subtext">
                      Unmatched expected volume (count:{" "}
                      {stats.expected.pendingCount})
                    </span>
                  </div>
                  <div className="panel kpi-card kpi-danger">
                    <span className="kpi-title">Unreconciled Bank Inflow</span>
                    <span className="kpi-value">
                      {formatCurrency(stats.received.unmatchedAmount)}
                    </span>
                    <span className="kpi-subtext">
                      Deposits waiting for matching (count:{" "}
                      {stats.received.unmatchedCount})
                    </span>
                  </div>
                </div>

                {/* Analytical Charts */}
                <div className="chart-grid">
                  <div className="panel">
                    <div className="chart-header">
                      <span className="chart-title">
                        Matched Amounts by Bank / Processor Provider
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "260px" }}>
                      {stats.providerBreakdown.length > 0 ? (
                        <ResponsiveContainer>
                          <BarChart
                            data={stats.providerBreakdown}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <XAxis
                              dataKey="provider"
                              stroke="#6b7280"
                              fontSize={11}
                              tickLine={false}
                            />
                            <YAxis
                              stroke="#6b7280"
                              fontSize={11}
                              tickLine={false}
                              tickFormatter={(v) =>
                                `₦${v >= 1000 ? v / 1000 + "k" : v}`
                              }
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatCurrency(Number(value)),
                                "Matched Volume",
                              ]}
                              contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                              }}
                              labelStyle={{ color: "#9ca3af" }}
                            />
                            <Bar
                              dataKey="amount"
                              fill="url(#colorPrim)"
                              radius={[4, 4, 0, 0]}
                            >
                              <defs>
                                <linearGradient
                                  id="colorPrim"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0.1}
                                  />
                                </linearGradient>
                              </defs>
                              {stats.providerBreakdown.map((entry, index) => {
                                const colors = [
                                  "#6366f1",
                                  "#10b981",
                                  "#3b82f6",
                                  "#f59e0b",
                                  "#ec4899",
                                  "#8b5cf6",
                                ];
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                          }}
                        >
                          No matched transaction volume recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="chart-header">
                      <span className="chart-title">Channel Distribution</span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "260px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      {stats.channelBreakdown.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                          }}
                        >
                          {stats.channelBreakdown.map((c) => {
                            const maxVal = Math.max(
                              ...stats.channelBreakdown.map((ch) => ch.amount),
                            );
                            const percent =
                              maxVal > 0 ? (c.amount / maxVal) * 100 : 0;
                            return (
                              <div
                                key={c.channel}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "between",
                                    fontSize: "0.8rem",
                                    color: "var(--text-secondary)",
                                    width: "100%",
                                  }}
                                >
                                  <span>{c.channel.replace("_", " ")}</span>
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      fontWeight: "700",
                                      color: "#fff",
                                    }}
                                  >
                                    {formatCurrency(c.amount)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    background: "rgba(255,255,255,0.05)",
                                    height: "8px",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      background:
                                        "linear-gradient(95deg, var(--primary), var(--success))",
                                      width: `${percent}%`,
                                      height: "100%",
                                      borderRadius: "4px",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                            textAlign: "center",
                          }}
                        >
                          No matched channels found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent matches feed list */}
                <div className="panel">
                  <div className="chart-header">
                    <span className="chart-title">
                      Live Reconciliation Audit Feed
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.75rem",
                        color: "var(--success)",
                      }}
                    >
                      <Activity size={12} />
                      Real-time updates
                    </span>
                  </div>
                  <div className="feed-list">
                    {stats.recentMatches.length > 0 ? (
                      stats.recentMatches.map((m) => (
                        <div
                          key={m.id}
                          className={`feed-item ${m.matchMethod.toLowerCase().replace("_", "-")}`}
                        >
                          <div className="feed-text">
                            <span className="feed-title">
                              {m.expectedPayment.customerName} reconciled
                            </span>
                            <span className="feed-sub">
                              Matched Order{" "}
                              <code className="item-ref">
                                {m.expectedPayment.reference}
                              </code>{" "}
                              via {m.receivedPayment.provider}{" "}
                              {m.receivedPayment.channel.replace("_", " ")}{" "}
                              <code>({m.receivedPayment.reference})</code>
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span
                              className="rule-badge"
                              style={{
                                fontSize: "0.65rem",
                                display: "inline-block",
                                marginBottom: "0.2rem",
                              }}
                            >
                              {m.matchMethod.replace("AUTOMATIC_", "AUTO ")}
                            </span>
                            <div className="feed-time">
                              {formatDate(m.matchedAt)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                          padding: "1.5rem 0",
                          textAlign: "center",
                        }}
                      >
                        No matches recorded yet. Ingest statements and execute
                        matching runs above!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. TRANSACTION LEDGER TAB */}
            {activeTab === "ledger" && (
              <div>
                <div className="ledger-grid">
                  {/* Left Column: Expected Payments */}
                  <div
                    className="panel"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div className="ledger-header">
                      <div className="ledger-title-row">
                        <span
                          className="chart-title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FileText
                            size={18}
                            style={{ color: "var(--primary)" }}
                          />
                          Expected Invoices ({filteredExpected.length})
                        </span>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => setExpFilter("ALL")}
                            className={`btn ${expFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setExpFilter("PENDING")}
                            className={`btn ${expFilter === "PENDING" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => setExpFilter("MATCHED")}
                            className={`btn ${expFilter === "MATCHED" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            Matched
                          </button>
                        </div>
                      </div>
                      <div className="search-bar">
                        <Search />
                        <input
                          placeholder="Search ref, customer name, email..."
                          value={expSearch}
                          onChange={(e) => setExpSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="ledger-list">
                      {filteredExpected.length > 0 ? (
                        filteredExpected.map((item) => (
                          <div
                            key={item.id}
                            className={`ledger-item ${selectedExpId === item.id ? "selected" : ""}`}
                            onClick={() => {
                              if (item.status === "PENDING") {
                                setSelectedExpId(
                                  selectedExpId === item.id ? null : item.id,
                                );
                              } else {
                                addToast(
                                  "This expected payment is already matched.",
                                  "warning",
                                );
                              }
                            }}
                          >
                            <div className="item-top">
                              <span className="item-name">
                                {item.customerName}
                              </span>
                              <span
                                className="item-amount"
                                style={{ color: "var(--primary)" }}
                              >
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <div className="item-meta">
                              <span>
                                Ref:{" "}
                                <span className="item-ref">
                                  {item.reference}
                                </span>
                              </span>
                              <span
                                className={`status-badge ${item.status.toLowerCase()}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                marginTop: "0.2rem",
                              }}
                            >
                              Created: {formatDate(item.createdAt)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "3rem 0",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                          }}
                        >
                          No expected invoices found matching current criteria.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Received Payments */}
                  <div
                    className="panel"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div className="ledger-header">
                      <div className="ledger-title-row">
                        <span
                          className="chart-title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <Banknote
                            size={18}
                            style={{ color: "var(--success)" }}
                          />
                          Received Bank Inflow ({filteredReceived.length})
                        </span>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => setRecFilter("ALL")}
                            className={`btn ${recFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setRecFilter("UNMATCHED")}
                            className={`btn ${recFilter === "UNMATCHED" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            Unmatched
                          </button>
                          <button
                            onClick={() => setRecFilter("MATCHED")}
                            className={`btn ${recFilter === "MATCHED" ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                            }}
                          >
                            Matched
                          </button>
                        </div>
                      </div>
                      <div className="search-bar">
                        <Search />
                        <input
                          placeholder="Search narrative, sender account, provider..."
                          value={recSearch}
                          onChange={(e) => setRecSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="ledger-list">
                      {filteredReceived.length > 0 ? (
                        filteredReceived.map((item) => (
                          <div
                            key={item.id}
                            className={`ledger-item ${selectedRecId === item.id ? "selected" : ""}`}
                            onClick={() => {
                              if (item.status === "UNMATCHED") {
                                setSelectedRecId(
                                  selectedRecId === item.id ? null : item.id,
                                );
                              } else {
                                addToast(
                                  "This transaction is already matched.",
                                  "warning",
                                );
                              }
                            }}
                          >
                            <div className="item-top">
                              <span
                                className="item-name"
                                style={{ textTransform: "capitalize" }}
                              >
                                {item.senderName ||
                                  item.provider + " Transaction"}
                              </span>
                              <span
                                className="item-amount"
                                style={{ color: "var(--success)" }}
                              >
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <div className="item-meta">
                              <span>
                                Ref:{" "}
                                <span className="item-ref">
                                  {item.reference}
                                </span>
                              </span>
                              <span
                                className={`status-badge ${item.status.toLowerCase()}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            {item.narrative && (
                              <div
                                style={{
                                  fontSize: "0.725rem",
                                  color: "var(--text-secondary)",
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid var(--border-color)",
                                  padding: "0.2rem 0.4rem",
                                  borderRadius: "4px",
                                  margin: "0.2rem 0",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.narrative}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "between",
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                marginTop: "0.1rem",
                                width: "100%",
                              }}
                            >
                              <span>
                                Bank: {item.provider} (
                                {item.channel.replace("_", " ")})
                              </span>
                              <span style={{ marginLeft: "auto" }}>
                                Date: {formatDate(item.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "3rem 0",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                          }}
                        >
                          No received bank transactions found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual match overlay dock */}
                {(selectedExpId || selectedRecId) && (
                  <div className="reconcile-bar">
                    <div className="dock-content">
                      <div className="dock-item-preview">
                        <span className="dock-item-title">
                          Selected Expected Order
                        </span>
                        <span
                          className="dock-item-val"
                          style={{ color: "var(--primary)" }}
                        >
                          {selectedExpId ? (
                            <>
                              {
                                expected.find((e) => e.id === selectedExpId)
                                  ?.customerName
                              }{" "}
                              (
                              {formatCurrency(
                                expected.find((e) => e.id === selectedExpId)
                                  ?.amount || 0,
                              )}
                              )
                            </>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                              }}
                            >
                              Select an invoice...
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="link-icon">
                        <ArrowLeftRight size={24} />
                      </div>

                      <div className="dock-item-preview">
                        <span className="dock-item-title">
                          Selected Bank Deposit
                        </span>
                        <span
                          className="dock-item-val"
                          style={{ color: "var(--success)" }}
                        >
                          {selectedRecId ? (
                            <>
                              {received.find((r) => r.id === selectedRecId)
                                ?.senderName ||
                                received.find((r) => r.id === selectedRecId)
                                  ?.provider}{" "}
                              (
                              {formatCurrency(
                                received.find((r) => r.id === selectedRecId)
                                  ?.amount || 0,
                              )}
                              )
                            </>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                              }}
                            >
                              Select a transaction...
                            </span>
                          )}
                        </span>
                      </div>

                      {selectedExpId && selectedRecId && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginLeft: "1rem",
                          }}
                        >
                          <span className="dock-item-title">Notes:</span>
                          <input
                            type="text"
                            placeholder="Add reason/audit notes..."
                            value={manualNotes}
                            onChange={(e) => setManualNotes(e.target.value)}
                            style={{
                              backgroundColor: "rgba(255,255,255,0.05)",
                              border: "1px solid var(--border-color)",
                              padding: "0.4rem 0.75rem",
                              color: "#fff",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              outline: "none",
                              width: "220px",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <button
                        className="btn btn-primary"
                        disabled={!selectedExpId || !selectedRecId}
                        onClick={handleManualMatch}
                      >
                        <LinkIcon size={16} />
                        Submit Manual Match Link
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem" }}
                        onClick={() => {
                          setSelectedExpId(null);
                          setSelectedRecId(null);
                          setManualNotes("");
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. RECONCILED HISTORY TAB */}
            {activeTab === "history" && (
              <div
                className="panel"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="chart-header">
                  <span className="chart-title">
                    Matched Audit Entries ({matches.length})
                  </span>
                </div>

                <div className="table-container">
                  {matches.length > 0 ? (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Expected Customer</th>
                          <th>Order Ref</th>
                          <th>Settled Amount</th>
                          <th>Received Source</th>
                          <th>Bank Ref</th>
                          <th>Match Method</th>
                          <th>Confidence</th>
                          <th>Reconciled Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((m) => {
                          const confidenceVal = m.confidenceScore * 100;
                          let confClass = "high";
                          if (confidenceVal < 70) confClass = "low";
                          else if (confidenceVal < 90) confClass = "medium";

                          return (
                            <tr key={m.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {m.expectedPayment?.customerName || "N/A"}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  ID: {m.expectedPaymentId}
                                </div>
                              </td>
                              <td className="item-ref">
                                {m.expectedPayment?.reference}
                              </td>
                              <td
                                style={{
                                  fontWeight: 700,
                                  color: "var(--success)",
                                }}
                              >
                                {formatCurrency(m.receivedPayment?.amount || 0)}
                              </td>
                              <td>
                                <div>
                                  {m.receivedPayment?.senderName ||
                                    m.receivedPayment?.provider}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {m.receivedPayment?.provider} (
                                  {m.receivedPayment?.channel})
                                </div>
                              </td>
                              <td
                                style={{
                                  fontSize: "0.8rem",
                                  fontFamily: "monospace",
                                }}
                              >
                                {m.receivedPayment?.reference}
                              </td>
                              <td>
                                <span
                                  className="rule-badge"
                                  style={{
                                    fontSize: "0.65rem",
                                    padding: "0.1rem 0.35rem",
                                  }}
                                >
                                  {m.matchMethod.replace("AUTOMATIC_", "AUTO ")}
                                </span>
                                {m.notes && (
                                  <div
                                    style={{
                                      fontSize: "0.65rem",
                                      color: "var(--text-muted)",
                                      marginTop: "0.2rem",
                                      maxWidth: "160px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={m.notes}
                                  >
                                    Note: {m.notes}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`match-score ${confClass}`}>
                                  {confidenceVal.toFixed(0)}%
                                </span>
                              </td>
                              <td
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {formatDate(m.matchedAt)}
                                <div
                                  style={{
                                    fontSize: "0.65rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  By: {m.matchedBy}
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                    color: "var(--danger)",
                                  }}
                                  title="Unmatch records"
                                  onClick={() => handleUnmatch(m.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        padding: "4rem 0",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      No reconciled transaction pairs recorded in audit ledger.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. STATEMENT INGESTION PORTAL TAB */}
            {activeTab === "ingestion" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                <div
                  className="panel"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div className="chart-header">
                    <span className="chart-title">
                      Direct Narrative CSV Parser Ingest
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Paste standard statement logs
                    </span>
                  </div>

                  <div className="config-group">
                    <label>
                      Paste CSV text containing bank settlements (columns:{" "}
                      <code>amount</code>, <code>channel</code>,{" "}
                      <code>provider</code>, <code>reference</code>, and
                      optionally <code>narrative</code>, <code>sendername</code>
                      ):
                    </label>
                    <textarea
                      className="csv-textarea"
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleIngestCsv}
                    >
                      <UploadCloud size={16} />
                      Ingest bank transaction records
                    </button>
                  </div>
                </div>

                {/* CSV Format Documentation Help */}
                <div
                  className="panel"
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "flex-start",
                    backgroundColor: "rgba(99, 102, 241, 0.03)",
                    borderColor: "rgba(99, 102, 241, 0.15)",
                  }}
                >
                  <div className="upload-icon" style={{ flexShrink: 0 }}>
                    <Info size={24} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                      }}
                    >
                      CSV Parser Reference Schema
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: "1.4",
                      }}
                    >
                      Expected columns are comma-separated in the first line.
                      The matching engine checks <code>amount</code> and{" "}
                      <code>reference</code> or searches inside{" "}
                      <code>narrative</code> text for fuzzy name matches and
                      contact details. You can import multiple statements from
                      different channels (e.g. POS, BANK_TRANSFER).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. MATCHING RULES MANAGER TAB */}
            {activeTab === "rules" && (
              <div
                className="panel"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                <div className="chart-header">
                  <span className="chart-title">
                    Dynamic Matching Rules Configuration
                  </span>
                  <span className="rule-badge">
                    Total Rules: {rules.length}
                  </span>
                </div>

                <div className="rules-list">
                  {rules.map((rule) => {
                    // Define local state hooks inside list or use parent config parsing
                    let parsedConfig = {};
                    try {
                      parsedConfig = JSON.parse(rule.config);
                    } catch (e) {
                      console.error(e);
                    }

                    return (
                      <RuleConfigRow
                        key={rule.id}
                        rule={rule}
                        initialConfig={parsedConfig}
                        onSave={handleSaveRule}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Subcomponent for rule configurations row to isolate local slider states
interface RuleConfigRowProps {
  rule: ReconciliationRule;
  initialConfig: any;
  onSave: (
    ruleId: string,
    isActive: boolean,
    priority: number,
    config: any,
  ) => void;
}

function RuleConfigRow({ rule, initialConfig, onSave }: RuleConfigRowProps) {
  const [active, setActive] = useState(rule.isActive);
  const [priority, setPriority] = useState(rule.priority);

  // Custom states depending on rule type
  const [tolerance, setTolerance] = useState(
    initialConfig.amountTolerance || 0,
  );
  const [timeWindow, setTimeWindow] = useState(
    initialConfig.timeWindowHours || 72,
  );
  const [threshold, setThreshold] = useState(
    initialConfig.similarityThreshold || 0.75,
  );

  const handleToggle = () => {
    setActive(!active);
  };

  const handleSave = () => {
    const configObj: any = { amountTolerance: Number(tolerance) };
    if (rule.id === "EXACT_AMOUNT_AND_FUZZY_NAME") {
      configObj.timeWindowHours = Number(timeWindow);
      configObj.similarityThreshold = Number(threshold);
    }
    onSave(rule.id, active, priority, configObj);
  };

  return (
    <div className="rule-card">
      <div className="rule-top">
        <div className="rule-info">
          <div className="rule-name-badge">
            <h4
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              {rule.name}
            </h4>
            <span className="rule-badge">Priority {priority}</span>
          </div>
          <p className="rule-desc">{rule.description}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: active ? "var(--success)" : "var(--text-muted)",
              fontWeight: "600",
            }}
          >
            {active ? "Active" : "Inactive"}
          </span>
          <label className="switch">
            <input type="checkbox" checked={active} onChange={handleToggle} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {active && (
        <div className="rule-config-row">
          <div className="config-group">
            <label>Rule Priority Weight (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
            <div className="config-val">{priority} / 10</div>
          </div>

          <div className="config-group">
            <label>Amount Matching Tolerance (NGN):</label>
            <input
              type="number"
              min="0"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
            <div
              className="config-val"
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                fontStyle: "italic",
                textAlign: "left",
                marginTop: "0.25rem",
              }}
            >
              Accept slight difference in transaction vs invoice amount
            </div>
          </div>

          {rule.id === "EXACT_AMOUNT_AND_FUZZY_NAME" && (
            <>
              <div className="config-group">
                <label>Fuzzy Name Match Threshold:</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
                <div className="config-val">
                  {(threshold * 100).toFixed(0)}% Similarity
                </div>
              </div>

              <div className="config-group">
                <label>Transaction Time Window Range (Hours):</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(Number(e.target.value))}
                />
                <div
                  className="config-val"
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontStyle: "italic",
                    textAlign: "left",
                    marginTop: "0.25rem",
                  }}
                >
                  Accept matches within {timeWindow} hours (up to 7 days) of
                  invoice creation
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-secondary"
          style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
          onClick={handleSave}
        >
          Save Rule Parameters
        </button>
      </div>
    </div>
  );
}
