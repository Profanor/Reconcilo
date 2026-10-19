import React, { useState } from "react";
import { PRODUCT_NAME } from "./api";
import type { DashboardStats } from "./api";
import {
  ArrowRight,
  ChevronRight,
  X,
  Check,
  Building2,
  Phone,
  Mail,
  User,
} from "lucide-react";

const formatNGN = (amt: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amt);
};

interface LandingPageProps {
  onLaunchApp: () => void;
  stats: DashboardStats | null;
}

export default function LandingPage({ onLaunchApp, stats }: LandingPageProps) {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [volume, setVolume] = useState("₦5M – ₦50M / month");

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      // Auto close after 3s or allow closing
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* -------------------------------------------------------------
          1. NAVIGATION BAR
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              {PRODUCT_NAME}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Private Beta
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#accuracy" className="hover:text-slate-900 transition-colors">
              Controlled Matching
            </a>
            <a href="#rails" className="hover:text-slate-900 transition-colors">
              Supported Rails
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors"
            >
              Request Pilot Demo
            </button>
            <button
              onClick={onLaunchApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all hover:gap-2"
            >
              <span>Launch Demo App</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          2. HERO SECTION
      ------------------------------------------------------------- */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-slate-200/50 via-slate-100/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-[11px] font-medium text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Built for Nigerian Commerce & High-Volume Merchant Teams</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.12]">
            Know what should have come in. <br />
            <span className="text-slate-500">Know what actually came in.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Stop spending hours comparing payment records, bank statements, and sales reports.
            Reconcile transactions, identify discrepancies, and see what needs your attention in one place.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-all hover:scale-[1.01]"
            >
              <span>Request a pilot demo</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-colors"
            >
              <span>See how it works</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Data
              </span>
            </button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-emerald-600" />
              No financial lock-in
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-emerald-600" />
              Zero false matches guarantee
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-emerald-600" />
              Accountant-ready CSVs
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------------
            3. INTERACTIVE PRODUCT PREVIEW CARD
        ------------------------------------------------------------- */}
        <div className="max-w-5xl mx-auto px-6 mt-12 md:mt-16">
          <div className="relative rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="ml-2 text-xs font-semibold text-slate-900">
                  {PRODUCT_NAME} Ledger Engine
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  SESSION · LIVE RUN
                </span>
              </div>
              <button
                onClick={onLaunchApp}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Open Full Workspace</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Reconciliation Comparison Mock */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
              {/* Expected Side */}
              <div className="md:col-span-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[10px] uppercase">
                  <span>Sales Order (Shopify)</span>
                  <span className="text-indigo-600 font-bold">EXPECTED</span>
                </div>
                <div className="font-bold text-sm text-slate-900">ORD-2026-0004</div>
                <div className="text-slate-700">
                  Customer: <strong>Emeka Okafor</strong>
                </div>
                <div className="text-base font-extrabold text-slate-950 font-mono">
                  ₦150,000.00
                </div>
                <div className="text-[10px] text-slate-400">Due Date: 17 Oct 2026</div>
              </div>

              {/* Matching Engine Bridge */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-2 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs mb-1 shadow-2xs">
                  ✓
                </div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">
                  100% Match
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                  Ref & Amount
                </span>
              </div>

              {/* Received Side */}
              <div className="md:col-span-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[10px] uppercase">
                  <span>Bank Statement (Access)</span>
                  <span className="text-emerald-700 font-bold">CREDIT INFLOW</span>
                </div>
                <div className="font-mono text-xs text-slate-900 truncate font-semibold">
                  ACC-SESSION-90823192083
                </div>
                <div className="text-slate-700 truncate">
                  Sender: <strong>EMEKA OKAFOR</strong>
                </div>
                <div className="text-base font-extrabold text-slate-950 font-mono">
                  ₦150,000.00
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Narrative: "transfer for ORD-2026-0004"
                </div>
              </div>
            </div>

            {/* Bottom Proof Metrics */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Expected
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {stats?.expected?.totalAmount ? formatNGN(stats.expected.totalAmount) : "₦297,700"}
                </div>
              </div>
              <div className="p-2">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Actual Received
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {stats?.received?.totalAmount ? formatNGN(stats.received.totalAmount) : "₦274,700"}
                </div>
              </div>
              <div className="p-2">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  False Matches Prevented
                </div>
                <div className="text-sm font-bold text-amber-700">
                  {stats?.trustMetrics?.falseMatchesPrevented ?? 1} Guarded
                </div>
              </div>
              <div className="p-2">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Audit Logging
                </div>
                <div className="text-sm font-bold text-emerald-700">
                  100% Immutable
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. SUPPORTED PAYMENT RAILS
      ------------------------------------------------------------- */}
      <section id="rails" className="py-12 border-y border-slate-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
            Standardize statements and logs across Nigeria's banking & payment ecosystem
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-semibold text-slate-700">
            {["Access Bank", "GTBank", "Zenith Bank", "OPay", "Moniepoint", "Kuda", "Paystack", "Flutterwave"].map(
              (rail) => (
                <div
                  key={rail}
                  className="px-4 py-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {rail}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. HOW IT WORKS (THE 3 CORE PILLARS)
      ------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 md:py-28 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            One deterministic workflow. <br />
            Zero guesswork.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Designed to replace manual spreadsheet lookups with a dependable, audit-trailed engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1: Import */}
          <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">Import</h3>
              <p className="text-xs text-indigo-700 font-semibold">
                Bring in your payment records.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload CSV statements from your bank, POS terminal settlement exports, or sales order registries from Shopify, WooCommerce, or WhatsApp logs.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Auto-strips currency symbols (₦, $) and commas
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Filters out debits and keeps credit inflows
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Flags in-file and cross-file statement duplicates
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
              Output: Canonical Ledger Format
            </div>
          </div>

          {/* Step 2: Match */}
          <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">Match</h3>
              <p className="text-xs text-emerald-700 font-semibold">
                Compare expected and received payments.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our controlled rule engine evaluates records by amount, reference codes, customer phone numbers, and bank narrative tokens in milliseconds.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Exact matches (≥95%) auto-commit immediately
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Amount-alone matches are NEVER blindly paired
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Zero risk of shipping goods to the wrong buyer
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
              Confidence Engine: Exact Reference First
            </div>
          </div>

          {/* Step 3: Resolve */}
          <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">Resolve</h3>
              <p className="text-xs text-amber-700 font-semibold">
                Investigate discrepancies & missing payments.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uncertain transactions, partial payments, and third-party payer transfers land in the Exceptions Queue for quick human confirmation.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  1-click Confirm Match or Reject Suggestion
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Permanent audit trail (who, what, reason, timestamp)
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  Download accountant-ready CSVs in 1 click
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
              Deliverable: Audited Reconciliation Report
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          6. WHY LISSAFI (THE NIGERIAN COMMERCIAL REALITY)
      ------------------------------------------------------------- */}
      <section id="accuracy" className="py-16 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              The Reality of Nigerian Commerce
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Why generic reconciliation software fails in Africa.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              In Nigerian business, customers pay from spouses’ bank accounts, banks truncate order numbers, and multiple people transfer identical amounts like ₦15,000 every single hour.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="text-xs font-bold text-amber-400">01 / The Third-Party Payer</div>
              <h4 className="text-sm font-semibold text-white">
                Paid from a spouse or corporate account
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                A customer orders under "Chioma Nze" but transfers from "Kelechi Nze (GTBank)" with no memo. Generic tools mark it as lost. Lissafi's fuzzy candidate suggester surfaces the match with side-by-side evidence for fast operator sign-off.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="text-xs font-bold text-amber-400">02 / The Identical Amount Trap</div>
              <h4 className="text-sm font-semibold text-white">
                Blind amount-matching causes chaos
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                If 5 customers owe ₦25,000 and one ₦25,000 transfer arrives with "USSD TRANSFER", matching either blindly is a disaster. Lissafi categorizes identical amounts as Ambiguous, safeguarding you from fulfilling the wrong order.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="text-xs font-bold text-amber-400">03 / The Audit Defense</div>
              <h4 className="text-sm font-semibold text-white">
                Accountants demand proof, not black boxes
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every single match, exception rejection, and manual link writes an immutable event to the audit trail. When tax season or annual audits arrive, export the reconciled CSV with full verifier signatures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          7. PILOT DEMO CALL TO ACTION
      ------------------------------------------------------------- */}
      <section className="py-20 md:py-28 max-w-4xl mx-auto px-6 text-center space-y-6">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
          Ready to eliminate payment reconciliation headaches?
        </h2>
        <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto">
          Join high-volume online retailers, supermarkets, and B2B distributors pilot-testing Lissafi.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-all hover:scale-[1.01]"
          >
            <span>Request a pilot demo →</span>
          </button>
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-colors"
          >
            <span>Launch Live Interactive Demo</span>
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------------
          8. FOOTER
      ------------------------------------------------------------- */}
      <footer className="py-8 border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span>⚡</span>
            <span>{PRODUCT_NAME}</span>
            <span className="text-slate-400 font-normal">
              — Smart Transaction Matching Engine
            </span>
          </div>
          <div>
            © 2026 {PRODUCT_NAME}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* -------------------------------------------------------------
          MODAL: REQUEST PILOT DEMO
      ------------------------------------------------------------- */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Request a Pilot Demo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Experience {PRODUCT_NAME} on your actual bank statements and orders.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsDemoModalOpen(false);
                  setDemoSubmitted(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {demoSubmitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Pilot Request Received!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong>{fullName || "Partner"}</strong>. Our team will reach out via WhatsApp or email within 24 hours to set up your customized pilot.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsDemoModalOpen(false);
                      setDemoSubmitted(false);
                      onLaunchApp();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold"
                  >
                    <span>Explore Live Interactive App Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Adaobi Okoye"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Business / Store Name
                  </label>
                  <div className="relative">
                    <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Haven Mart Lagos"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="adaobi@havenmart.ng"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      WhatsApp / Phone
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="080 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Estimated Monthly Transaction Volume
                  </label>
                  <select
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-800 outline-none focus:border-slate-400 focus:bg-white text-xs cursor-pointer font-medium"
                  >
                    <option value="Under ₦5M / month">Under ₦5M / month</option>
                    <option value="₦5M – ₦50M / month">₦5M – ₦50M / month</option>
                    <option value="₦50M – ₦250M / month">₦50M – ₦250M / month</option>
                    <option value="Over ₦250M / month">Over ₦250M / month</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
                  >
                    Submit Pilot Request →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
