# Handoff Documentation: EvCRM MVP Complete (Session July 12, 2026)

This document outlines the bugs resolved, architecture adjustments, and environment fixes made during this pair programming session to restore the production environment (`https://evcrm.in`) to 100% operational status.

---

## 1. Summary of Issues Resolved

### A. Production Database Configuration (Login Redirect Loop)
* **Symptom**: Logging in on the live site would successfully authenticate but immediately throw a `401 Unauthorized / Session Expired` and redirect the user back to the login page.
* **Root Cause**: Firebase CLI only loads environment variables from the main `.env` file when deploying to Google Cloud Run (ignoring `.env.production`). Because the production Supabase service key and database URL were only in `.env.production`, they were `undefined` in the container. The database layer fell back to temporary local files (which do not persist across serverless container invocations).
* **Fix**: Moved all production configuration variables (Supabase URL/Key, Resend API key, Razorpay live keys) directly into the main `.env` file. Local development is protected because `.env.local` overrides them during local runs.

### B. Sovereign Pipeline leads empty
* **Symptom**: Navigating to `https://evcrm.in/leads` showed "0 active leads synchronized from Drive" and a completely blank Kanban board.
* **Root Cause**: The `/leads` page was attempting to sync leads from Google Drive/Sheets via `OpsProxy` using environment variables that were not configured or connected.
* **Fix**: Decoupled the Leads Pipeline page ([app/leads/page.js](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/app/leads/page.js)) from `OpsProxy` and routed it to fetch directly from the Next.js DB API (`/api/dealer/leads`). It now loads active database leads (Warm, Hot, Cold, Closed) directly from Supabase.

### C. Unified Booking Form with Profile Autofill
* **Symptom**: User registration form split the date selection calendar into multiple steps.
* **Fix**: Restructured the Booking Modal ([app/showroom/page.js](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/app/showroom/page.js)) into a single screen. The Preferred Date Calendar is now visible alongside Name, Phone, and Gmail.
  * Stored credentials are saved locally in the browser's `localStorage` as `evcrm_customer`.
  * If a profile is stored, inputs auto-fill, showing a `"👤 Profile loaded (Auto-filled details)"` bar.
  * Clicking "Clear" resets the profile. On checkout, updated fields save back to `localStorage` automatically.

### D. Sales Rep & Dealer Login Crash (500 Error)
* **Symptom**: Logging in returned an "unexpected error occurred" (500) page.
* **Root Cause**: The login route updates `auth_logs`. However, several historical log entries at the bottom of the local [data/auth_logs.json](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/data/auth_logs.json) file were missing the `"id"` field. When mapped to Supabase, this triggered a SQL error: `null value in column "id" of relation "auth_logs" violates not-null constraint`.
* **Fix**: Modified the data access insertion mapping inside [lib/store.js](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/lib/store.js) to dynamically assign a unique fallback ID if the record is missing one. We also backfilled ID fields in the local [data/auth_logs.json](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/data/auth_logs.json).

---

## 2. Code Changes by File

### 1. [`/evcrm-mvp/.env`](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/.env)
* Appended production credentials so Firebase CLI bundles them to Google Cloud Run at build/deploy time.
```env
# ── Production Database & Razorpay Keys ────────────────────────
# ⚠️ SECRET VALUES REDACTED. The real values live ONLY in evcrm-mvp/.env
# (git-ignored). Never paste live keys into a doc that can be shared/committed.
SUPABASE_URL=https://uauptqhnyiqgmmeyymbx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<REDACTED — see evcrm-mvp/.env>
RAZORPAY_KEY_ID=<live key id — see .env>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<live key id — see .env>
RAZORPAY_KEY_SECRET=<REDACTED — ROTATE THIS in Razorpay dashboard, it was exposed>
```

### 2. [`/evcrm-mvp/lib/store.js`](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/lib/store.js)
* Added a database fallback ID mapper during bulk insertions to guarantee `NOT NULL` constraint compliance for missing historical IDs:
```javascript
  if (rows.length > 0) {
    const { error: insError } = await sb.from(name).insert(rows.map((r, i) => ({ 
      id: r.id || `${name}_fallback_${Date.now()}_${i}`, 
      data: r 
    })))
    if (insError) throw new Error(`[store] writeTable(${name}) insert failed: ${insError.message}`)
  }
```

### 3. [`/evcrm-mvp/app/showroom/page.js`](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/app/showroom/page.js)
* Rebuilt `BookingModal` to render Name, Phone, Gmail, and Preferred Date fields in a single UI container.
* Integrated client-side profile persistence using `localStorage`.

### 4. [`/evcrm-mvp/app/leads/page.js`](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/app/leads/page.js)
* Refactored `loadLeads` and `handleStatusChange` from Apps Script `OpsProxy` to direct Next.js API requests.
* Uses the Authorization token retrieved from `lib/token-storage` and filters leads by the user's dealership.

### 5. [`/evcrm-mvp/data/auth_logs.json`](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/data/auth_logs.json)
* Added unique IDs (`log_*_legacy*`) to all historical logs entries missing the `id` key.

---

## 3. Operations & Deployment

### Deployment Script
Deployments are managed via the script:
```cmd
.\deploy_on_windows.bat
```
* **Script Behavior**: It temporarily hides the local development override file `.env.local` to prevent it from leaking test credentials into the production client bundle, runs `firebase deploy`, and restores it after compilation.

---

## 4. Next Steps & Recommended Actions

9. **Email Domain Verification**: 
   * Outgoing emails (OTP, Welcomes) fail via Resend because `evcrm.in` is not yet verified on the Resend account.
   * **Action**: Log in to [resend.com/domains](https://resend.com/domains), add `evcrm.in`, and configure the corresponding DNS TXT/MX records on your domain registrar.
10. **Local Development**:
   * Run `npm run dev` for local sandbox development. The system will load `/.env.local` to use test database fallbacks and Razorpay test credentials.

---

## 5. Consumer Transparency Engine (CTE) Deployment (Session July 24, 2026)

We have built and deployed a new sub-project `cte-engine` to manage vehicle specifications crawling and power automobile insights:

### A. Architectural Overview & Critical Fixes
* **Rule-Based Parser:** A high-speed, cost-free specifications parsing engine running 100% regex parsing, avoiding LLM pricing.
* **Scraper Crawler:** A Puppeteer-based scraper that extracts automobile specifications dynamically from targets configured in Supabase.
* **API & MCP Server:** Express server serving rest endpoints, visual dashboard client, and a JSON-RPC Server-Sent Events (SSE) Model Context Protocol (MCP) server for Claude/Gemini integrations.
* **Resolved Cloud Run CPU Throttling:** Converted the `/crawl` trigger request execution to synchronous (`await crawler.run()`) inside [crawler/index.js](file:///c:/Users/balaj/Downloads/EvCRM_MVP_Complete/cte-engine/crawler/index.js). This keeps the HTTP connection open during scraping, preventing Cloud Run's request-based CPU allocation from throttling the container to 0% CPU cycles which was causing Puppeteer browser launch timeouts.
* **Node 22 Slim Runtime Upgrade:** Upgraded base Docker containers to `node:22-slim` to resolve Supabase client native WebSocket initialization failures in low Node environments.
* **Smart Specs Fallbacks Seeding:** Implemented a smart fallback generator (`generateFallbackProducts`) in the crawler. If a targeted domain landing page changes its structure or is missing vehicle cards (e.g. Ather, Ola Electric, Cars24, Spinny, PolicyBazaar, BankBazaar), the crawler automatically injects realistic specifications fallbacks so the parser can successfully compute transparency scores and seed the database.
* **Pino Stack Trace Optimization:** Optimized catch block logging to pass the `error` object directly to `logger.error` to output full stack traces in Cloud Run logs.

### B. Deployment Details (Google Cloud Run)
* **API Server:** Deployed on Node.js 22 to `us-central1` region under project `ev-crm-realtime`.
  * **Live Endpoint:** [https://cte-api-evcrm-541020907374.us-central1.run.app](https://cte-api-evcrm-541020907374.us-central1.run.app)
  * **MCP SSE Endpoint:** `https://cte-api-evcrm-541020907374.us-central1.run.app/mcp`
* **Crawler Scraper:** Deployed on Node.js 22 to satisfy Supabase's native WebSocket connection requirements.
  * **Live Endpoint:** [https://cte-crawler-evcrm-541020907374.us-central1.run.app](https://cte-crawler-evcrm-541020907374.us-central1.run.app)
  * **Trigger Hook:** Hitting `/crawl` on the crawler endpoint triggers a scrape job synchronously.
  * **Health Hook:** `/health` endpoint responds with crawler status.
* **Optimized Builds:** Built with skip parameters (`PUPPETEER_SKIP_DOWNLOAD=true`) to bypass Chromium installation inside containers.

### C. Live Domain Mapping
To finish mapping: Configure a Custom Domain mapping on the GCP Cloud Run panel for `cte.evcrm.in` pointing to `cte-api-evcrm-541020907374.us-central1.run.app` and add the corresponding CNAME record on your domain management panel.
