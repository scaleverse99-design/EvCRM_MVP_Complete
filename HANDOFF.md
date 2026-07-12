# EvCRM — Complete Product Handoff Document

> **Purpose**: Everything a developer (or AI agent in Google Antigravity IDE) needs to continue building this product.
> **Last updated**: 2026-07-12 · **Live site**: https://evcrm.in · **Repo**: https://github.com/scaleverse99-design/EvCRM_MVP_Complete

---

## 1. What This Product Is

**EvCRM** is India's EV Dealer Sales OS + consumer commerce hub. Two-sided product:

- **Consumer side (public)**: A marketplace where anyone can browse live EV inventory from real dealers, book a ₹1,000-token test drive, track their orders, and raise service requests.
- **Business side (login)**: A full CRM for EV dealerships — leads, bookings, inventory, quotes, customers, tasks, service, team/rep management — plus an OEM network console and a founder/admin panel.

**Business model**: Dealers get a 30-day free trial then pay a monthly subscription (Razorpay). OEMs can sponsor dealers' subscriptions to gain network-wide data visibility. Target: 100 dealerships in Phase 1.

---

## 2. Tech Stack & Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 14 (App Router)**, React client components | No TypeScript. No Tailwind — **all styling is inline styles** using color constants from `lib/constants.js` (`C.green`, `C.ink`, etc.). Match this convention. |
| Data layer | **`lib/store.js`** — the single data seam | `readTable(name)` / `writeTable(name, rows)`. Uses **Supabase** (Postgres, one table per logical entity, rows are `{id text pk, data jsonb}`) when `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` are set; falls back to local `data/*.json` files otherwise. **Never bypass this seam.** |
| Auth | **JWT** (`jsonwebtoken`, secret in `JWT_SECRET`) + bcryptjs | Token stored client-side in `localStorage` key `evcrm_auth_token` (legacy fallback key: `evcrm_token`). Firebase strips Set-Cookie, so cookies are NOT reliable — always return tokens in response bodies and send via `Authorization: Bearer` (see `lib/token-storage.js` → `authFetch`). |
| Payments | **Razorpay** (`lib/razorpay.js`, `lib/payments/tokenBooking.js`) | Test/absent keys → graceful no-payment fallback (`/api/marketplace/book`, `paymentStatus: SKIPPED_NO_GATEWAY`). |
| Email | **Resend** (`lib/email.js`) — domain `evcrm.in` is VERIFIED | Branded sender `noreply@evcrm.in`. Gmail SMTP path also exists (set `GMAIL_USER`+`GMAIL_APP_PASSWORD` to use it instead). |
| Hosting | Cloudflare → Firebase Hosting → Cloud Run | See §3. |

### Critical architecture rules
1. **All reads/writes go through `lib/store.js`.** Adding a field to any record needs no migration (jsonb).
2. **Dealer data isolation**: every record carries a `dealership` id; every dealer API filters by the `dealership` claim in the JWT. Reps are further scoped to `assignedRep === repId` (+ coverage).
3. **Local dev = JSON sandbox** (`data/*.json`), **production = Supabase Mumbai**. `.env.local` must NOT contain Supabase keys (that would point local dev at prod data).

---

## 3. Hosting, Domains & Deployment

```
evcrm.in (Cloudflare DNS, account: balajilankalapalli2001@gmail.com)
  └─ A record @ → 199.36.158.100  [MUST stay Proxied/orange, SSL mode "Full"]
       └─ Firebase Hosting (project: ev-crm-realtime, account: scaleverse99@gmail.com)
            └─ Cloud Run function "ssrevcrmrealtime" (us-central1) ← the real Next.js backend
```

**⚠️ Domain gotchas (learned the hard way):**
- Cloudflare proxy must stay **ON (orange)** with SSL mode **"Full"**. Turning it to "DNS only" breaks HTTPS (Firebase never provisioned its own cert for evcrm.in).
- Never add a Cloudflare **Worker route** on `evcrm.in/api/*` — an old `sovereign-gateway` worker used to break all API calls (error 1101) and was deleted.
- There is a SECOND, stale Cloud Run service `ev-crm` (asia-south1, image v12, March code). It does NOT serve evcrm.in. Ignore it or delete it.

### Deploy to production
```bat
cd evcrm-mvp
set FIREBASE_CLI_EXPERIMENTS=webframeworks
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
:: or just run deploy_on_windows.bat
```
- Build bundles env from **`.env.production`** (git-ignored) — this is how prod gets Supabase + Resend keys. Console-set Cloud Run vars get overwritten on deploy; keep secrets in `.env.production`.
- Takes ~3–5 min. Verify at https://ev-crm-realtime.web.app first, then https://evcrm.in.

### One-time data seeding
`node scripts/seed-supabase.js` (with SUPABASE_URL/KEY env) imports all `data/*.json` into Supabase. Already done for prod. Schema: `scripts/supabase-schema.sql` (run in Supabase SQL editor for new projects).

---

## 4. Accounts & Services

| Service | Account | What it holds |
|---|---|---|
| **GitHub** | scaleverse99-design | Repo `EvCRM_MVP_Complete` (branch `main`) |
| **Firebase / Google Cloud** | scaleverse99@gmail.com | Project `ev-crm-realtime` (Hosting + Cloud Run, Blaze plan) |
| **Supabase** | scaleverse99 org | Project `evcrm-prod`, ref `uauptqhnyiqgmmeyymbx`, region **ap-south-1 Mumbai**, free tier |
| **Cloudflare** | balajilankalapalli2001@gmail.com | Zone `evcrm.in` (DNS, proxy/SSL) |
| **Resend** | scaleverse99 (Google login) | Domain `evcrm.in` verified (Tokyo region), API key in env files |
| **Razorpay** | (test keys only so far) | Live keys NOT yet configured |

**Secrets live in** `.env` / `.env.local` (local dev) and `.env.production` (shipped to prod at deploy). All git-ignored. **Back these files up to a password manager** — they exist only on the dev laptop. Key vars: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM_NAME/EMAIL_FROM_EMAIL`, `RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET` (test), `NEXT_PUBLIC_APP_URL`. See `.env.example`.

---

## 5. Roles, Routes & Test Accounts

### Roles
| Role | Landing | Access |
|---|---|---|
| (public customer) | `/` | Browse, book test drives, MyGarage via phone OTP |
| `dealer` | `/dealer` | Full CRM for their dealership; creates rep logins |
| `rep` | `/dealer` (scoped) | ONLY tabs Leads/BuildPrice/QuotePro; only their assigned leads (+ leave-coverage leads); JWT carries `repId` |
| `oem` | `/oem` | Network console; sees a dealer's data only if `oemDistributed` or `oemSponsored` |
| `founder`/`superadmin` | `/admin` | Platform admin |

### Key routes
- **Consumer**: `/` (= showroom marketplace, light theme — THE canonical consumer page), `/showroom` (alias), `/buy-vehicles` (older dark-theme marketplace, still functional), `/vehicles/[id]`, `/mygarage` (customer portal: phone OTP → orders → service requests w/ photo upload), `/charging`, `/service-centers`, `/register`, `/login`
- **Business**: `/dealer` (tabbed dashboard: Dashboard, Leads, Inventory, Bookings, Customers, Tasks, Service, BuildPrice, QuotePro, Settings), `/team` (rep management + per-rep performance; click a rep for full scorecard), `/oem`, `/admin`
- **Public-path guard**: `lib/AuthContext.js` `PUBLIC_PATH_PREFIXES` — any consumer page NOT listed there bounces logged-out visitors to /login. Add new public pages to this list!

### Test accounts (local JSON data; prod has its own seeded set)
| Role | Email | Password |
|---|---|---|
| Dealer (Deccan EV Hub, `hyd-d01`) | dealer@deccanev.in | dealer123 |
| Dealer (Volt EV Motors, `volt-hyd`) | ramesh@voltmotors.in | Volt1234 |
| Sales rep (of hyd-d01) | ravi.rep@deccanev.in | rep12345 |
| Sales rep | priya.rep@deccanev.in | rep22222 |
| OEM (Tata, network `oem-tata`) | oem@tatamotors.in | dealer123 |
| Founder | admin@evcrm.in | (see users.json / ask owner) |
| MyGarage customer | phone `9876543210` + OTP shown on screen (demo mode) |

---

## 6. Data Model (logical tables via lib/store.js)

`users` (all logins; dealers carry `dealership`, `billingStatus`, `trialStartDate`, OEM flags `oemId/oemDistributed/oemSponsored`; reps carry `repId`, `covers[]`) · `reps` (assignment records: id, dealership, name, color, status) · `leads` (dealership, name/phone/email, vehicle, status NEW/WARM/HOT/QUOTED/CLOSED/LOST, `assignedRep`, `notes[]` w/ channel+author, `lastAction`, `bookingId`, `preferredDate`, `message`, `source`, `source_context`) · `bookings` (vehicle, customer, tokenAmount, status, paymentStatus) · `quotes` (QuotePro quotes + customer accept/KYC flow at `/quote/[id]`) · `inventory` (per-dealer vehicles; **`status:"IN_STOCK"` required to appear on the public marketplace**; district/state for filters) · `customers` · `tasks` (auto-created on HOT/QUOTED + service) · `service_requests` (customer-raised; OPEN→IN_PROGRESS→RESOLVED|ESCALATED_OEM; SLA timestamps createdAt/respondedAt; `oemAgent`; base64 `attachments[]`) · `service_settings` (per-dealer `autoEscalateOEM` 48h) · `otps` (email reset + customer-portal phone OTPs, hashed) · `sessions`, `auth_logs`, `dealers`, `feed`

---

## 7. What's Built & Verified (feature inventory)

**Consumer**: live marketplace at `/` w/ filters + inline product detail; real test-drive booking (name/phone/email/date → booking + HOT lead for the right dealer; Razorpay or fallback); MyGarage customer portal (phone OTP login — demo mode shows OTP on screen; orders, quotes, service requests with photos/video ≤3MB); dealer registration self-serve (instant activation, auto-login, unique dealership slug, welcome email).

**Dealer CRM**: 10-module dashboard; leads with contact triggers (📞call auto-dial / 💬WhatsApp / 📱SMS / ✉️email with stage-based auto-filled editable templates, DND respect, every action logged w/ author+channel+timestamp, lastAction chip); booking/test-drive panel inside lead detail (preferred date, ref, token, customer note); mobile-responsive (cards <768px via `useIsMobile`); BuildPrice (custom discounts editor — NO hardcoded subsidies by design) → prefills QuotePro; Service tab (SLA created→responded timer, respond/resolve/escalate-to-OEM, 48h auto-escalate toggle); rep logins (dealer-provisioned only, no public rep signup; deactivate=instant revoke; reset password); leave **coverage** (rep temporarily sees a teammate's leads WITHOUT ownership transfer — `covers[]`); `/team` page with per-rep performance (assigned/worked/converted/conv%/calls/messages, computed from logged note authors) + click-through scorecard.

**OEM console**: two-tier access (oemDistributed=auto full; self-registered=locked until "Sponsor subscription" click), network dealer grid w/ stats, escalation queue, assign service agent (visible on the customer's MyGarage timeline).

**Auth/infra**: login w/ role redirects (rep/dealer→/dealer, oem→/oem, founder→/admin) — post-login uses **`window.location.assign` full navigation** (soft router.replace caused an infinite loop; don't regress this); forgot-password email OTP flow (WORKS in prod via Resend); Supabase persistence; seed script; production guard in store.js.

---

## 8. Known Issues & Open Bugs (⚠️ START HERE)

1. **🔴 OPEN — Login sometimes stuck / button greyed (user-reported on prod, reproduced locally once).** Symptoms: valid credentials, Sign In click produces NO `/api/auth/login` fetch (instrumented `window.fetch` counter = 0), no error shown; also seen: reset-password button greyed with both fields filled (screenshot showed lavender/autofilled inputs). Diagnosis so far: API is fine (curl login = 200 + token); `PBtn onClick={handleLogin}` wiring looks correct; suspicion list: (a) **browser autofill not firing React onChange** → state empty though inputs LOOK filled → validation silently returns (but then "Email is required" error should show… it didn't), (b) stale HMR/service-worker chunk, (c) rate-limit lockout (5 fails/email/15min in `auth_logs`) returns 429 — but no fetch fired at all locally. **Next steps**: add an `onSubmit` form wrapper (Enter key + autofill-safe), read input values from the DOM refs at submit time instead of trusting state, add visible error/console logging in `handleLogin`, and test with real Chrome autofill. Files: `app/login/page.js` (PBtn line ~348, handleReset ~450), `lib/AuthContext.js`.
2. **Razorpay live keys missing** — bookings use the no-payment fallback (booking still confirmed, dealer collects token at showroom). Add live keys to `.env.production` + redeploy to enable real checkout.
3. **Customer OTP (MyGarage) is demo-mode** — OTP is returned in the API response and shown on screen. Wire MSG91/Twilio (`SMS_GATEWAY_KEY` placeholder in `app/api/service/otp/route.js`) before real customers.
4. **Whole-table writes** in `lib/store.js` (read-all→write-all). Fine for ~10–20 concurrent dealers; **must convert to row-level upsert/delete before scaling** (top engineering priority; contained to store.js + callers).
5. **Base64 attachments stored in DB rows** (service requests, KYC docs) — move to Supabase Storage before volume.
6. **Query-level filtering** — APIs read whole tables then filter in JS; push filters into Supabase queries as data grows.
7. **Two marketplaces exist**: `/` (showroom, canonical, light) and `/buy-vehicles` (dark). Dealer-dashboard "View Marketplace" links still point to `/buy-vehicles`. Consider consolidating to one.
8. **OEM "sponsor" flips billing flags only** — no real Razorpay charge to the OEM yet.
9. **Legacy mock pages remain** (e.g., `/queue`, parts of `/admin`, older content pages using `lib/data.js` fake data). `/api/admin/users` is a legacy path — rep creation must use `/api/dealer/reps` (creates rep record + linked login).
10. Local `data/*.json` contains test junk from development; prod Supabase is the clean source of truth.

---

## 9. Development Workflow

```bash
npm install
npm run dev          # http://localhost:3000 — uses data/*.json sandbox
# build features → test locally → commit → push → deploy_on_windows.bat → verify evcrm.in
```
- Verify changes in a real browser flow, not just compile (this codebase has bitten us: booking leads, login loop, register [object Object] were all "compiles fine, broken in flow").
- Conventions: inline styles w/ `C` constants; client components (`"use client"`); API routes under `app/api/**/route.js` with `export const dynamic = "force-dynamic"`; auth guard pattern = parse Bearer token with `verifyToken`, check role + dealership.
- Reference docs in repo: `DEPLOYMENT.md` (Supabase/Cloud Run setup + troubleshooting), `stack_details.md`, `scripts/supabase-schema.sql`.

## 10. Suggested Roadmap (in priority order)

1. Fix the login/reset stuck-button bug (#8.1) — it blocks real users.
2. Row-level store rewrite (#8.4) — before onboarding beyond ~15 dealers.
3. Razorpay live keys + real token payments; wire OEM sponsorship billing.
4. SMS gateway for MyGarage OTP.
5. Supabase Storage for attachments.
6. Consolidate the two marketplaces; clean legacy pages (`/queue`, mock admin panels).
7. Founder/admin panel completion (dealer oversight, platform metrics).
8. Notifications (email on new lead/booking/service; WhatsApp templates via BSP later).
