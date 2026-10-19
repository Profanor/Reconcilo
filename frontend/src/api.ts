/**
 * Typed API Client for Ledger Payment Reconciliation
 * Connects to NestJS backend on http://localhost:4000/api
 */

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
export const PRODUCT_NAME = "Lissafi";

export const formatNGN = (amt: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amt);
};

export interface ExpectedPayment {
  id: string;
  amount: number;
  reference: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status: "PENDING" | "MATCHED" | "PARTIAL" | "EXPIRED" | "DUPLICATE";
  createdAt: string;
  dueDate?: string | null;
  description?: string | null;
}

export interface ReceivedPayment {
  id: string;
  amount: number;
  channel: string;
  provider: string;
  reference: string;
  narrative?: string | null;
  senderName?: string | null;
  senderAccount?: string | null;
  status: "UNMATCHED" | "MATCHED" | "IGNORED" | "DUPLICATE";
  createdAt: string;
  ingestedAt: string;
}

export interface ReconciliationMatch {
  id: string;
  expectedPaymentId: string;
  receivedPaymentId: string;
  matchMethod: "AUTOMATIC_EXACT" | "CONFIRMED_SUGGESTION" | "AUTOMATIC_FUZZY" | "MANUAL";
  confidenceScore: number;
  matchedRules: string;
  matchedAt: string;
  matchedBy: string;
  notes?: string | null;
  expectedPayment?: ExpectedPayment;
  receivedPayment?: ReceivedPayment;
}

export interface ReconciliationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  ruleType: string;
  config: string;
}

export interface MatchSuggestion {
  expectedPayment: ExpectedPayment;
  receivedPayment: ReceivedPayment;
  confidenceScore: number;
  matchedRules: string[];
  reason: string;
}

export interface AmbiguousMatchGroup {
  receivedPayment: ReceivedPayment;
  candidateOrders: Array<{
    expectedPayment: ExpectedPayment;
    confidenceScore: number;
    reason: string;
  }>;
  reason: string;
}

export interface ExceptionQueueData {
  suggestions: MatchSuggestion[];
  ambiguous: AmbiguousMatchGroup[];
  unmatchedExpected: ExpectedPayment[];
  unmatchedReceived: ReceivedPayment[];
  duplicates: Array<{ reference?: string; reason?: string; createdAt?: string }>;
  rejectedPairsCount: number;
}

export interface DashboardStats {
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
  trustMetrics: {
    totalMatchedCount: number;
    exactAutomaticCount: number;
    confirmedSuggestionsCount: number;
    manualMatchesCount: number;
    falseMatchesPrevented: number;
    unmatchesCount: number;
    duplicatesCount: number;
  };
  channelBreakdown: Array<{ channel: string; count: number; amount: number }>;
  providerBreakdown: Array<{ provider: string; count: number; amount: number }>;
  recentMatches: Array<{
    id: string;
    matchedAt: string;
    matchMethod: string;
    expectedPayment: { reference: string; customerName: string; amount?: number };
    receivedPayment: { channel: string; provider: string; reference: string; amount?: number; senderName?: string };
  }>;
  recentAudit?: Array<{
    id: string;
    action: string;
    targetId?: string | null;
    user: string;
    reason?: string | null;
    createdAt: string;
  }>;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetId?: string | null;
  user: string;
  reason?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface IngestionResult {
  message: string;
  details: {
    totalRows: number;
    importedCount: number;
    duplicateCount: number;
    errorCount: number;
    duplicates: Array<{ rowNumber: number; reference: string; reason: string }>;
    errors: Array<{ rowNumber: number; raw: any; reason: string }>;
  };
}

// Network Request Helper
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const tenantId = localStorage.getItem("lissafi_tenant_id") || "tenant-apex-001";
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>("/dashboard/stats");
  },

  // Expected Payments (Orders / Invoices)
  async getExpectedPayments(status?: string, search?: string): Promise<ExpectedPayment[]> {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<ExpectedPayment[]>(`/expected${qs}`);
  },

  async createExpectedPayment(data: {
    reference: string;
    amount: number;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    dueDate?: string;
    description?: string;
  }): Promise<ExpectedPayment> {
    return request<ExpectedPayment>("/expected", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async importExpectedCsv(csvText: string, actor?: string): Promise<IngestionResult> {
    return request<IngestionResult>("/expected/csv", {
      method: "POST",
      body: JSON.stringify({ csvText, actor }),
    });
  },

  async deleteExpectedPayment(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/expected/${id}`, {
      method: "DELETE",
    });
  },

  // Received Payments (Bank / POS Statements)
  async getReceivedPayments(status?: string, search?: string): Promise<ReceivedPayment[]> {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<ReceivedPayment[]>(`/received${qs}`);
  },

  async createReceivedPayment(data: {
    reference: string;
    amount: number;
    channel: string;
    provider: string;
    narrative?: string;
    senderName?: string;
    senderAccount?: string;
    createdAt?: string;
  }): Promise<ReceivedPayment> {
    return request<ReceivedPayment>("/received", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async importReceivedCsv(csvText: string, actor?: string): Promise<IngestionResult> {
    return request<IngestionResult>("/received/csv", {
      method: "POST",
      body: JSON.stringify({ csvText, actor }),
    });
  },

  // Matches & Engine
  async getMatches(): Promise<ReconciliationMatch[]> {
    return request<ReconciliationMatch[]>("/matches");
  },

  async runAutoReconciliation(allowFuzzyAuto = false, actor = "SYSTEM"): Promise<{
    message: string;
    matchedCount: number;
    remainingUnmatched: number;
  }> {
    return request("/matches/auto", {
      method: "POST",
      body: JSON.stringify({ allowFuzzyAuto, actor }),
    });
  },

  async getExceptions(): Promise<ExceptionQueueData> {
    return request<ExceptionQueueData>("/matches/exceptions");
  },

  async confirmSuggestion(
    expectedPaymentId: string,
    receivedPaymentId: string,
    confirmedBy = "FINANCE_OPERATOR",
    notes?: string,
  ): Promise<ReconciliationMatch> {
    return request<ReconciliationMatch>("/matches/confirm-suggestion", {
      method: "POST",
      body: JSON.stringify({ expectedPaymentId, receivedPaymentId, confirmedBy, notes }),
    });
  },

  async rejectSuggestion(
    expectedPaymentId: string,
    receivedPaymentId: string,
    rejectedBy = "FINANCE_OPERATOR",
    reason = "Candidate does not match actual transaction",
  ): Promise<{ success: boolean; message: string }> {
    return request("/matches/reject-suggestion", {
      method: "POST",
      body: JSON.stringify({ expectedPaymentId, receivedPaymentId, rejectedBy, reason }),
    });
  },

  async manualMatch(
    expectedPaymentId: string,
    receivedPaymentId: string,
    notes?: string,
    matchedBy = "FINANCE_OPERATOR",
  ): Promise<ReconciliationMatch> {
    return request<ReconciliationMatch>("/matches/manual", {
      method: "POST",
      body: JSON.stringify({ expectedPaymentId, receivedPaymentId, notes, matchedBy }),
    });
  },

  async unmatch(
    matchId: string,
    unmatchBy = "FINANCE_OPERATOR",
    reason = "Transaction unlinked by operator",
  ): Promise<{ success: boolean }> {
    return request(`/matches/unmatch/${matchId}`, {
      method: "POST",
      body: JSON.stringify({ unmatchBy, reason }),
    });
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    return request<AuditLogItem[]>("/matches/audit");
  },

  async getRules(): Promise<ReconciliationRule[]> {
    return request<ReconciliationRule[]>("/rules");
  },

  getReportCsvUrl(): string {
    return `${API_BASE}/matches/report/csv`;
  },
};
