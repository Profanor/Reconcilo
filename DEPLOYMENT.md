# 🚀 Reconcilo Production Deployment & Testing Guide

This document outlines the zero-downtime cloud deployment blueprints and verification procedures for the Reconcilo (Lissafi) Payment Reconciliation platform.

---

## 🏗️ Architecture Overview

| Component | Technology | Cloud Host Recommendation | Build / Deploy Command |
|---|---|---|---|
| **Backend API** | NestJS, Prisma ORM, PostgreSQL | **Render** / **Railway** / **Fly.io** | `npx prisma db push --skip-generate && npm run seed && npm run start:prod` |
| **Database** | PostgreSQL 16 | **Render PostgreSQL** / **Neon** / **Supabase** | Auto-provisioned |
| **Frontend** | React 19, Vite, TailwindCSS | **Vercel** / **Netlify** | `npm run build` |

---

## ⚡ Option A: 1-Click Deploy on Render (Recommended)

The repository includes a root `render.yaml` blueprint that deploys the PostgreSQL database, NestJS API service, and React static frontend together.

### Steps:
1. Push your latest code to GitHub (`main` or `develop`).
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** ➡️ **Blueprint**.
4. Connect the `Profanor/Reconcilo` repository.
5. Render will detect `render.yaml` and display the blueprint plan:
   - `reconcilo-db` (Managed Postgres)
   - `reconcilo-api` (Web service with `/api/health` probe)
   - `reconcilo-frontend` (Static site with SPA rewrites)
6. Click **Apply**.
7. Once deployed:
   - Backend URL: `https://reconcilo-api.onrender.com`
   - Frontend URL: `https://reconcilo-frontend.onrender.com`

---

## 🌐 Option B: Frontend on Vercel + Backend on Render/Railway

For maximum edge CDN speed, deploy the frontend on Vercel and the backend on Render or Railway.

### 1. Deploy Backend (Render / Railway)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm run deploy:prod`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  ```env
  NODE_ENV=production
  PORT=10000
  DATABASE_URL=postgresql://user:pass@host:5432/reconcilo?sslmode=require
  ALLOWED_ORIGINS=https://your-reconcilo-frontend.vercel.app
  ```

### 2. Deploy Frontend (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_API_BASE=https://your-backend-api.onrender.com/api
  ```
- *The repository contains [`frontend/vercel.json`](file:///Users/david/Documents/Reconcilo/frontend/vercel.json) ensuring all SPA client-side routes rewrite to `/index.html`.*

---

## 🛡️ Option C: Frontend on Netlify
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_API_BASE=https://your-backend-api.onrender.com/api
  ```
- *The repository contains [`frontend/netlify.toml`](file:///Users/david/Documents/Reconcilo/frontend/netlify.toml) configured with redirect rules and secure headers.*

---

## 🧪 Post-Deployment Verification & Testing Checklist

Once deployed, run these 4 verification steps to confirm everything is operational:

### 1. Health Probe Verification
```bash
curl -i https://<your-backend-domain>/api/health
```
**Expected Response (HTTP 200)**:
```json
{
  "status": "ok",
  "service": "lissafi-reconciliation-backend",
  "version": "1.0.0",
  "database": "healthy",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-19T09:45:00.000Z"
}
```

### 2. Swagger Documentation
Visit `https://<your-backend-domain>/api/docs` in your browser to verify all REST endpoints, schemas, and API documentation are accessible.

### 3. Multi-Tenant Pilot Demo Verification
1. Open the deployed frontend URL (`https://<your-frontend-domain>`).
2. Click the **"Pilot Demo"** button on the top right.
3. Personalize the business name (e.g. *“Eko Mart Logistics”*), operator name (*“Amina Bello”*), and role (*“Head of Finance”*).
4. Switch between **Apex Superstores** and **Alaba Prime Wholesale** in the tenant selector.
5. Confirm that:
   - Order references, inflow amounts, and metrics update dynamically.
   - Bank statement uploads are scoped to the active tenant.
   - Automatic reconciliation runs without cross-tenant interference.

### 4. Automated E2E Security Tests
To verify data isolation before or after production updates:
```bash
cd backend
npm run test:e2e
```
Verifies all 7 tenant isolation tests pass:
- ✅ Read boundary isolation between Tenant A and Tenant B
- ✅ Financial metrics separation on dashboard
- ✅ Prevention of ID-guessing deletions (404)
- ✅ Prevention of cross-tenant manual matching
- ✅ Order reference reuse independence across tenants
- ✅ Matching engine boundary confinement
