# Reconcilo

> **A Payment Reconciliation System for SMEs in Nigeria**
> 
> Reconcilo helps businesses automatically match incoming payments to expected transactions across multiple channels, reducing manual reconciliation, revenue leakage, and financial confusion.

---

## 📌 Problem Statement

Even with modern payment providers like Moniepoint, OPay, and bank APIs, SMEs in Nigeria still struggle with financial clarity, not just payment success.

### Key Operational Challenges:
*   **Fragmented payment sources:** Bank transfers, POS terminals, cash, and fintech wallets.
*   **Lack of order-to-payment matching:** No direct linkage between what was ordered and what was paid.
*   **Manual reconciliation:** Heavy reliance on Excel sheets, WhatsApp notes, and bank app screenshots.
*   **Missing or duplicated payments:** Difficulty tracking down specific transaction reference numbers.
*   **Delayed revenue visibility:** Lag between payment ingestion and knowing actual cash flow.
*   **High staff dependency:** Operations are bottlenecked by staff memory or specific accountants.

*Payment providers ensure money moves, but businesses still lack a system that ensures money is correctly understood.*

---

## 🎯 What Reconcilo Solves

Reconcilo sits above the payment rails and solves the **truth layer** problem:

> *"What was paid, what was expected, and what actually matches?"*

We help businesses:
1.  **Automatically match** payments to orders/invoices.
2.  **Detect unmatched** or suspicious transactions.
3.  **Eliminate manual** reconciliation overhead.
4.  **Maintain a single source** of financial truth.
5.  **Reduce revenue leakage** stemming from human error.

---

## 💥 Core Pain Points Addressed

### 1. Fragmented Income Streams
Businesses receive payments from bank transfers, POS terminals, wallets (Moniepoint, OPay, etc.), and staff cash. No single system provides a unified view.

### 2. No Order-to-Payment Mapping
Payments often arrive without clear references, customer identifiers, or order context. Businesses cannot easily map money to actual sales.

### 3. Manual Reconciliation Overhead
The standard workflow today involves: *“Check Excel” ➡️ “Ask customer for proof” ➡️ “Confirm with cashier” ➡️ “Reconcile at end of day/week manually.”* This is slow, error-prone, and expensive.

### 4. Revenue Leakage through Errors
Common issues include duplicate payments not being detected, missed payments being marked as unpaid, incorrect manual assignment of funds, and untracked cash transactions. Businesses lose money silently.

### 5. Lack of a Financial Truth Layer
Even with perfect payment systems, accounting still lives in spreadsheets, operations rely on human memory, and disputes require manual investigation.

---

## 🧠 Solution Overview

Reconcilo provides a robust platform comprising:
*   **Transaction Ingestion:** API integration, CSV uploading, and manual entry.
*   **Expected Payment Registry:** Database of orders, invoices, and subscriptions.
*   **Intelligent Matching Engine:** A rules-based reconciliation engine.
*   **Exception Handling Queue:** An interface for manual resolution of unmatched transactions.
*   **Reconciliation Dashboard:** Real-time visibility into matched vs. unmatched income.
*   **Exportable Financial Reports:** Accountant-ready CSV and PDF exports.

---

## ⚙️ System Philosophy

*   **Simplicity over complexity:** Focus on clear workflows and high reliability.
*   **Auditability over assumptions:** Every match must have a clear trail showing *why* it matched.
*   **Deterministic matching over "black box AI":** Rely on rules (amount, timestamp, reference prefix, sender name) rather than guesswork.
*   **Business truth over payment execution:** Validate against internal order logs, not just bank logs.

---

## 🧩 Target Audience
*   SMEs processing daily payments.
*   E-commerce, Instagram, and WhatsApp sellers.
*   Logistics and delivery companies.
*   POS-heavy retail businesses.
*   Clinics, gyms, schools, and subscription services.

---

## 🚫 What Reconcilo is NOT
*   A payment processor
*   A wallet system
*   A bank alternative
*   A money transfer app

*We do not move money. We make sense of money.*

---

## 🚀 Future Direction
*   Direct bank & fintech API integrations.
*   AI-assisted anomaly detection.
*   Cashflow intelligence.
*   Debt tracking and automated reminders.
*   Developer-first reconciliation API.

---

## 📊 Success Metric
If a business owner says:
> *"I don’t need to ask anyone where my money is anymore."*

**Then Reconcilo is working.**

---

## 🛠️ Technical Architecture

Reconcilo is structured as a monorepo containing a modular **NestJS** backend and a **Vite + React** frontend.

```
Reconcilo/
├── backend/
│   ├── prisma/             # Schema definitions & migrations
│   │   ├── schema.prisma   # PostgreSQL prisma schema
│   │   └── generated/      # Generated Prisma 7 Client
│   ├── src/
│   │   ├── prisma/         # Prisma Module & Service (driver adapter)
│   │   ├── engine/         # Reconciliation rules matching logic
│   │   ├── reconciliation/ # Match, unmatch, and manual linking
│   │   ├── expected-payments/ # Invoice registry
│   │   ├── received-payments/ # Bank statement ingestion & CSV parsing
│   │   ├── rules/          # Rule configurations
│   │   ├── dashboard/      # Metrics aggregations
│   │   ├── seed.ts         # DB Seeder using PG Pools
│   │   └── main.ts         # NestJS bootstrap
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx         # Premium dashboard UI with state managers
    │   ├── index.css       # Core Vanilla CSS design tokens & animations
    │   └── main.tsx        # React entrypoint
    ├── index.html
    └── tsconfig.json
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js**: v18+ or v20+ (recommended)
- **PostgreSQL**: A running instance locally or via cloud (e.g. Supabase, RDS)

---

### 1. Backend Setup (NestJS + Prisma + Postgres)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create or edit your environment file `backend/.env` with your PostgreSQL database URL:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reconcilo?schema=public"
   PORT=4000
   ```

3. Run migrations to create the database tables:
   ```bash
   npx prisma migrate dev --name init
   ```
   *(Alternatively, run `npx prisma db push` to synchronize the schema without generating migration files).*

4. Generate the Prisma Client (if not already done during installation):
   ```bash
   npx prisma generate
   ```

5. Seed the database with the core matching rules and initial test transaction data:
   ```bash
   npx ts-node src/seed.ts
   ```

6. Start the NestJS backend dev server:
   ```bash
   npm run start:dev
   ```
   The backend will be listening on [http://localhost:4000/api](http://localhost:4000/api).

---

### 2. Frontend Setup (React + Vite)

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend UI dashboard will be running on [http://localhost:5173](http://localhost:5173).

---

### 🧪 Running Tests

We have written isolated unit tests for our matching engine rules (Exact Reference, Narrative matching, Fuzzy Name overlap matching with Date constraints, and strict compile mode checking).

To execute the tests:
```bash
cd backend
npm run test
```

