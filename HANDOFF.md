# EvCRM — Complete Product Handoff Document

> **Purpose**: Everything a developer (or AI agent in Google Antigravity IDE) needs to continue building this product.
> **Last updated**: 2026-07-18 · **Live site**: https://evcrm.in · **Repo**: https://github.com/scaleverse99-design/EvCRM_MVP_Complete
> 
> **🟢 BUILD STATUS**: ✅ PASSING (2026-07-18)  
> **Latest work**: Subdomain + Custom Domain feature (MVP complete, build fixed)  
> **Commits**: `ecec017` (feature), `1c32da6` (docs), `d21cfd8` (tasks), `3ae9d7b` (build fix)  
> **Next blocker**: Razorpay live keys for domain billing (see §10.1)

> **Cross-agent sync note:** THIS file (`HANDOFF.md`, capitalized) + `TASKS.md` are the single
> source of truth. **Antigravity looks for `.agents/handoff.md` and `task.md` (lowercase)** — those
> are redirect/snapshot files pointing back here (added 2026-07-18). When you make a meaningful
> update here, refresh the dated snapshot in `.agents/handoff.md` + `task.md` too, and **`git push
> origin main`** — Antigravity syncs via GitHub, so unpushed local commits are invisible to it (that
> was the actual cause of the "Antigravity isn't syncing" report; the whole session had been
> committed + deployed but never pushed).

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
- **✅ SOLVED 2026-07-15 — Cloudflare was edge-caching HTML pages**, causing evcrm.in to keep serving the OLD page (old Next.js `buildId` + old JS chunk hash) after a deploy even though Firebase Hosting/Cloud Run origin had the new build. Two fixes now in place:
  1. **Cache Rule** (permanent, zero-effort fix) — Cloudflare dashboard → Rules → Cache Rules → `Bypass HTML, cache static assets`: bypasses cache for everything EXCEPT `/_next/static/*` (those are safe to cache forever since Next.js content-hashes the filename — a new deploy always gets a new filename, so there's no staleness risk). This means every page load always hits the origin fresh; only genuinely-static, content-hashed assets get cached.
  2. **Automated purge as a backup** — `scripts/purge-cloudflare.js` calls the Cloudflare API to purge everything, wired into the end of `deploy_on_windows.bat` so it runs automatically after every deploy. Needs `CLOUDFLARE_API_TOKEN` (Zone → Cache Purge → Purge, scoped to evcrm.in) and `CLOUDFLARE_ZONE_ID` in `.env.production` (git-ignored). Token created 2026-07-15, scoped correctly, tested working (both a direct zone lookup and an actual purge call succeeded).
  - **Net result: manual Cloudflare purging is no longer needed after a deploy** — the Cache Rule prevents the problem at the source, and the automated purge is a safety net in case the rule is ever removed/misconfigured.
  - **Deploy-script gotcha found 2026-07-16**: everything in `deploy_on_windows.bat` AFTER the `npx firebase-tools deploy` line was silently never executing — `npx` is a `.cmd` batch wrapper, and calling a batch from a batch **without `call` transfers control and never returns**. This is why the git deploy-tags never existed and the first "automated purge" deploy didn't actually purge. Fixed by changing the line to `call npx firebase-tools deploy …`. If you ever add steps to that script after another `.cmd`/`.bat` invocation (npm, npx, firebase), prefix it with `call`.

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
- **Consumer**: `/` (= showroom marketplace, light theme — THE canonical consumer page), `/showroom` (alias), `/vehicles/[id]`, `/mygarage` (customer portal: phone OTP → orders → service requests w/ photo upload), `/charging`, `/service-centers`, `/register`, `/login` (the old dark `/buy-vehicles` marketplace was **deleted 2026-07-18**, see §8.7 — it 404s now)
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

**Production test account (real, on evcrm.in):** Used-car / ICE dealer — `usedcar.demo@evcrm.in` / `UsedCar123` (`dealerCategory:"ICE"`, dealership `demo-used-car-motors-okqj`). Created 2026-07-18 to exercise the universal-CRM EV/ICE + used-vehicle inspection flow. Log in via the **🚙 Used Car Dealer** tile on evcrm.in/login. Do NOT delete during the §8.1f dummy-dealer cleanup.

---

## 6. Data Model (logical tables via lib/store.js)

`users` (all logins; dealers carry `dealership`, `billingStatus`, `trialStartDate`, OEM flags `oemId/oemDistributed/oemSponsored`; **bulk-imported dealers additionally carry `status:"pending_verification"|"active"`, `verificationToken`, `verificationTokenExpiry`** until they complete `/dealer/verify-profile`; reps carry `repId`, `covers[]`) · `reps` (assignment records: id, dealership, name, color, status) · `leads` (dealership, name/phone/email, vehicle, status NEW/WARM/HOT/QUOTED/CLOSED/LOST, `assignedRep`, `notes[]` w/ channel+author, `lastAction`, `bookingId`, `preferredDate`, `message`, `source`, `source_context`) · `bookings` (vehicle, customer, tokenAmount, status, paymentStatus) · `quotes` (QuotePro quotes + customer accept/KYC flow at `/quote/[id]`) · `inventory` (per-dealer vehicles; **`status:"IN_STOCK"` required to appear on the public marketplace**; status also includes `BOOKED/SOLD/CANCELLED/DEAD_STOCK`, the latter two carrying a required `statusReason`; district/state for filters) · `customers` · `tasks` (auto-created on HOT/QUOTED + service) · `service_requests` (customer-raised; OPEN→IN_PROGRESS→RESOLVED|ESCALATED_OEM; SLA timestamps createdAt/respondedAt; `oemAgent`; base64 `attachments[]`) · `service_settings` (per-dealer `autoEscalateOEM` 48h) · `otps` (email reset + customer-portal phone OTPs, hashed) · `bulk_imports` (OEM bulk-import audit trail — importId, validated `preview[]`, status preview_ready→completed; **confirmed created in prod**) · `prospects` (OEM-imported call lists — phone/name/notes/status pipeline) · `sessions`, `auth_logs`, `dealers`, `feed`

---

## 7. What's Built & Verified (feature inventory)

**Consumer**: live marketplace at `/` w/ filters + inline product detail; real test-drive booking (name/phone/email/date → booking + HOT lead for the right dealer; Razorpay or fallback); MyGarage customer portal (phone OTP login — demo mode shows OTP on screen; orders, quotes, service requests with photos/video ≤3MB); dealer registration self-serve (instant activation, auto-login, unique dealership slug, welcome email).

**Vehicle detail page — expanded info cards + EV spec catalog (added 2026-07-15, ✅ DEPLOYED 2026-07-16):** Inspired by Spinny's used-car listing pages (user shared a real Spinny URL as reference) — adapted for new EVs rather than used cars. New: `lib/evCatalog.js` — internal lookup table of specs (charging time, seating capacity, boot space, ground clearance, warranty years, features list) for the ~13 real brand+model combos already in the marketplace (Ather 450X, Tata Nexon EV/Nexon EV Max/Tiago EV, Ola S1 Pro, MG Comet EV, Mahindra XUV400, Hyundai IONIQ 5, Kia EV6, Bajaj Chetak). **Dealer side** (`app/dealer/page.js`, Inventory tab): when a dealer types Brand + Model in the Add/Edit Vehicle form and tabs away, `applyCatalogAutofill()` looks up the catalog and fills in any *empty* spec fields (never overwrites something the dealer already typed) — shows a green "✨ Specs auto-filled from our EV catalog" banner when it fires. 5 new form fields added: Charging Time, Seating Capacity, Boot Space, Ground Clearance, Warranty (Years). **Public side** (`app/showroom/page.js` `ProductDetail`): spec grid expanded from 3 to up to 8 cards (only shows fields that have a value — no empty cards for vehicles the catalog doesn't cover); new **Vehicle Overview** card (year/colour/condition/body type/variant); new **Features & Highlights** checklist (only renders if `features[]` non-empty); new **EMI Calculator** (interactive down-payment/duration sliders, pure client-side reducing-balance formula, ~10.5% p.a. illustrative rate — no data dependency, works for every vehicle); new **Similar EVs You Might Like** section at the page bottom (same `type`, excludes current vehicle, click-through to that vehicle's detail page — needed `ProductDetail` to receive the full `vehicles` list + `onView` as new props from `ShowroomPage`). API: `app/api/dealer/inventory/route.js` POST updated to persist the 5 new fields (PATCH already accepted them via its generic spread). **Verified locally end-to-end**: registered a real test dealer, added a vehicle with Brand="Tata Motors" Model="Nexon EV Max" → confirmed autofill populated all 8 spec fields + 7 features correctly from the catalog → saved → confirmed all fields persisted in the data layer → viewed on the public showroom page → confirmed all new cards render correctly with live data, including a working EMI calculator and a populated Similar EVs section. Test data cleaned up afterward. **Needs deploy** (cache-clear + Cloudflare purge — though the Cache Rule should make the purge automatic now).

**Brochure PDF → bulk inventory upload with AI extraction (added 2026-07-15, ✅ DEPLOYED 2026-07-16):** New "📄 Upload Brochure" button in the dealer Inventory tab toolbar. Dealer/rep picks a manufacturer brochure PDF (≤12MB) → `POST /api/dealer/inventory/parse-brochure` sends the PDF **directly to Gemini as a multimodal document** (no local text extraction — Gemini reads the actual PDF, `inline_data` + strict-JSON extraction prompt, temperature 0.2, model order `gemini-2.5-flash` → `gemini-2.5-flash-lite` fallback) → returns an array of every vehicle/trim found, mapped to the inventory schema (brand/model/variant/type/bodyType/range/battery/topSpeed/chargingTime/seating/bootSpace/groundClearance/warrantyYears/exShowroom/features; prompt explicitly forbids inventing values and handles Indian price formats — "Rs. 14.49 Lakh" → 1449000, verified). **Review flow (per user's explicit choice): one vehicle at a time** — an editable pre-filled modal steps through each extracted vehicle; dealer can fix any field, then "✓ Confirm & Next Vehicle" publishes it to inventory (same POST path as manual entry → `IN_STOCK` → visible on public marketplace immediately), "Skip This One" discards just that entry, "Stop Reviewing" exits (already-confirmed vehicles stay). Nothing goes live without explicit confirmation. Files: `app/api/dealer/inventory/parse-brochure/route.js` (new), `app/dealer/page.js` (upload button + review modal + handlers in `InventorySection`). **Gemini key note**: the old `GEMINI_API_KEY` in `.env` (AIzaSy…6lms) was dead — Google rejected it as invalid, which is also why the dormant `lib/ai-pulse.js` news engine never worked. Replaced 2026-07-15 with a fresh key (new `AQ.`-prefix format from AI Studio — NOT an OAuth code, these are valid API keys now) in both `.env` and `.env.production`. **This key has ZERO free-tier quota on `gemini-2.0-flash` but working quota on `gemini-2.5-flash`/`-lite`** — hence the model order; don't "upgrade" the route back to 2.0. Verified end-to-end locally: generated a synthetic 2-variant Tata Nexon EV brochure PDF, real Gemini call extracted both variants with correct specs/prices/features. **Needs deploy.**

**Vehicle detail page — Cars24-style redesign (Antigravity, 2026-07-16 00:43) + completion (Claude, 2026-07-16), ✅ DEPLOYED:** Antigravity rewrote `ProductDetail` in `app/showroom/page.js` into a Cars24-style layout on top of Claude's info-card work, keeping the EMI calculator + Similar EVs and adding: sticky top nav, hero image w/ categorized thumbnail strip (Exterior/Interior/…), pill spec tags, trust-badge rows, "Great things about this EV" highlights grid (derived from vehicle data), tabbed Overview/Specs & Details/Features, sticky right booking panel ("EMI starts at ₹X/mo", price block, dealer card, CTA buttons), restyled Similar EVs. Claude then finished its two incomplete buttons: (1) **"Check EMI →"** previously did `setActiveTab("overview")` (a no-op) — now scrolls to the EMI calculator (`#sd-emi-calc`). **Important quirk: uses `window.scrollTo(..., behavior:"auto")` on purpose** — smooth-behavior scrolling silently no-ops on this page (verified: smooth lands at scrollY 0, auto lands correctly; also `scrollIntoView` from inside the sticky panel gets eaten), so do NOT "upgrade" it back to smooth/scrollIntoView. (2) **"Price breakup →"** had no onClick at all — now toggles an inline ex-showroom + RTO/insurance/other-charges = on-road-total breakdown (only renders when `onRoadPrice` exists; note NO current inventory rows have `onRoadPrice`, so the button is invisible until dealers fill that field). Both verified live-in-browser locally, deployed with the Cache Rule + auto-purge fix confirmed working (see §3).

> **⚠️ Two later changes supersede parts of the two entries above (2026-07-16/17, ✅ DEPLOYED) — read these before trusting the descriptions:**
> - **EMI calculator is now DISABLED**, per user ("not accurate, no finance-provider tie-up yet"). All the EMI code (the `EMICalculator` component, the `#sd-emi-calc` anchor, the "EMI starts at ₹X/mo" panel block, the "Check EMI →" button) still exists in `app/showroom/page.js` but is gated behind a single top-of-file `const EMI_ENABLED = false` (commit `310d27e`). Nothing EMI renders on the live detail page. Flip `EMI_ENABLED = true` to bring it all back when a real finance provider is wired up. Do NOT re-describe EMI as a live feature.
> - **Thumbnail category labels removed** (commit `0249091`). The "Exterior / Interior / Features / Highlights / Tyres / View 6" text under each detail-page thumbnail was hardcoded by position (photo 1 was always "Exterior" regardless of what it showed), so it usually mismatched the image. Thumbnails now show just the image; the `.sd-thumb-label` CSS is gone. Don't restore positional labels.

**AI conversational vehicle search widget — "Find My EV" (added 2026-07-16, ✅ DEPLOYED & VERIFIED LIVE on evcrm.in):** Floating 🔍 chat toggle, bottom-right, on every consumer page that renders `TopBar` (covers `/` since `app/page.js` renders `ShowroomPage` directly, plus `/showroom`, `/charging`, `/news`, `/search`, `/subsidies`, `/pulse/[slug]` — does NOT appear on dealer/OEM/admin dashboards since those don't use `TopBar`). User describes what they want in plain language across a multi-turn conversation ("family SUV under 20 lakh with 400+ km range") — same Gemini key as the brochure-parser (`app/api/marketplace/search-assistant/route.js`, same model-order quirk: `gemini-2.5-flash` → `-flash-lite`, NOT `2.0-flash`). The full live `IN_STOCK` inventory is sent to Gemini as context on every turn (small catalog size makes this simpler and more reliable than function-calling) with a prompt that **forbids inventing vehicles** and asks for a clarifying question when the request is too vague rather than guessing. Matched vehicles render as inline cards in the chat with a "View →" link that opens the real `/vehicles/[id]` page (pre-existing dark-theme detail route, separate from the showroom's SPA detail view — chosen specifically because it has a real URL to open in a new tab) via `target="_blank"`. **Chat persistence**: conversation state lives in the widget's React state and is NOT reset between turns — the full message history is sent back to Gemini each time so it handles follow-ups ("what about something cheaper") with context. **Ending the chat**: the AI itself detects completion phrasing in the user's latest message ("found what I need", "perfect thanks", "that's all", etc.) and returns `done:true`, which shows a "Glad you found what you needed! 🎉" message and a "Start a new search" button — no fixed keyword list, handled by the same Gemini call as the search itself. Also has a manual ✕ close button (just hides the panel, doesn't reset the conversation) separate from the AI-driven end-of-chat state.
- **Verified via direct API calls (browser tool was down all session — this is backend-only verification)**: (1) specific query → correctly matched the real Mahindra XUV400 (456km, ₹15.99L) from live inventory; (2) "Perfect, that is exactly what I need, thank you!" → `done:true` fired correctly; (3) vague query ("show me something") → asked a clarifying question instead of guessing, 0 vehicles returned. Confirmed `/vehicles/mahindra-xuv400-d02` (the linked target) returns 200. Confirmed the widget's 🔍 icon renders in the homepage's server-rendered HTML.
- **Verified live end-to-end on evcrm.in (2026-07-16)**: 🔍 toggle opens the panel with greeting + input; typed "family SUV under 20 lakh with good range" → AI returned an inline result card for the real Mahindra XUV400 EL Pro (456 km, ₹15.99L) linking `/vehicles/mahindra-xuv400-d02` with `target="_blank"`. (Screenshots kept timing out this session — verification is via DOM/accessibility-tree inspection, which confirmed the rendered panel, greeting, input, and result cards.)
- Files: `app/api/marketplace/search-assistant/route.js` (new), `components/home/SearchAssistant.js` (new), `components/home/TopBar.js` (added `<SearchAssistant />` + import).

**Dealer CRM**: 10-module dashboard; leads with contact triggers (📞call auto-dial / 💬WhatsApp / 📱SMS / ✉️email with stage-based auto-filled editable templates, DND respect, every action logged w/ author+channel+timestamp, lastAction chip); booking/test-drive panel inside lead detail (preferred date, ref, token, customer note); mobile-responsive (cards <768px via `useIsMobile`); BuildPrice (custom discounts editor — NO hardcoded subsidies by design) → prefills QuotePro; Service tab (SLA created→responded timer, respond/resolve/escalate-to-OEM, 48h auto-escalate toggle); rep logins (dealer-provisioned only, no public rep signup; deactivate=instant revoke; reset password); leave **coverage** (rep temporarily sees a teammate's leads WITHOUT ownership transfer — `covers[]`); `/team` page with per-rep performance (assigned/worked/converted/conv%/calls/messages, computed from logged note authors) + click-through scorecard.

**OEM console**: **✅ LIVE IN PRODUCTION, confirmed working 2026-07-15.** Full 5-tab implementation verified end-to-end on evcrm.in/oem: (1) **My Network** — dealer grid w/ live stats incl. Conv %; (2) **Onboard Dealer** — full distribute-CRM form (business name, owner, email, phone, city, state) w/ instant full access + temp password; (3) **Feedback** — Quote Rejections (customer decline reasons: price/finance/delivery/competitor/other) + Sales Rep Comments rollup across network; (4) **Stock Requests** — dealer restock request lifecycle (approve/reject/fulfill), empty state confirmed working; (5) **Reports** — Dealer Performance table (leads/closed/conv%/bookings/subscription revenue) + Vehicle Demand by Location (state × model × bookings). Two-tier access (oemDistributed=auto full; self-registered=locked until "Sponsor subscription" click) unchanged. Escalation queue + assign service agent still present under My Network tab.

**OEM "Sponsor Instead" flow (added + deployed 2026-07-15, ✅ LIVE + CONFIRMED WORKING end-to-end by user on evcrm.in/oem):** When an OEM tries to Onboard a dealer whose email is already registered (`app/api/oem/onboard-dealer/route.js`), the API now checks if that existing account is an independent dealer (no `oemId`, or already tied to this same OEM) — if so it **links them into this OEM's network** (sets `oemId`, still locked/unsponsored) and returns `duplicate:{ canSponsor:true, dealership, businessName }`. The Onboard form (`app/oem/page.js`) then shows a **"💳 Sponsor This Dealer Instead →"** button inline, which calls the existing `sponsor()` action and jumps to the My Network tab. On successful sponsorship (`PATCH /api/oem { action:"sponsor" }` in `app/api/oem/route.js`), an **informational email** now fires (`sendOEMSponsorshipEmail` in `lib/email.js`) telling the dealer they've been using EvCRM independently for N days and are now folded into the OEM's official network — no action needed from them, purely informational, email failure doesn't block sponsorship (try/catch).

**Note on scope**: `canSponsor` only turns true when the duplicate email belongs to a `role:"dealer"` account. If the email belongs to another `role:"oem"` account (e.g. a separate self-registered manufacturer network), no Sponsor button appears — this is correct, not a bug (confirmed 2026-07-15 by tracing a real production duplicate: `tiworkman2323@gmail.com` turned out to be a second OEM account "Future EV" / `oem-future-ev-kmay`, not a dealer).

**OEM Inside Sales tab (added + deployed 2026-07-15, ✅ LIVE on evcrm.in/oem):** New 6th OEM console tab (`app/oem/page.js`, id `insidesales`) lets an OEM assign a named inside-sales agent (plain text, no separate login — `window.prompt`, same pattern as the existing service-escalation "assign agent") to any lead across their accessible dealer network, then mark it **OEM-Verified** once the agent confirms genuine interest by phone. Verified leads get a green "✓ OEM-VERIFIED" badge both in the OEM console and — this is the part dealers actually see — next to the customer's name in the dealer's own Leads tab (`app/dealer/page.js`, both the mobile-card and desktop-table lead rows), so dealer reps know to prioritize that lead. No auto-notification to the dealer (per design decision) — it's a passive badge only. Backend: `GET /api/oem` now returns a `leads` array (all leads from accessible dealers, capped at 100 most recent); two new `PATCH /api/oem` actions — `assign_inside_sales {leadId, agent}` and `verify_lead {leadId, verified}` — both scoped by `oemCanAccess()` so an OEM can't touch a dealer's leads without access. Fields stored directly on the lead's jsonb row: `insideSalesAgent`, `insideSalesAssignedAt`, `oemVerified`, `oemVerifiedAt` — no migration needed. Verified locally via curl AND confirmed live on production (Inside Sales tab shows real leads across the network with correct dealer names).

**OEM bulk dealer import — Excel/CSV upload → auto-created accounts → email verification (added 2026-07-16, ✅ DEPLOYED, user-confirmed working end-to-end on evcrm.in/oem):** The Onboard Dealer tab now has two modes: **Manual Entry (1–10)** — the original form, unchanged — and **Bulk Import (2K+)**. Flow: OEM uploads `.xlsx`/`.csv` (≤5 MB; `xlsx` npm package parses; column headers matched case-insensitively via alias lists incl. the camelCase names our own downloadable template uses) → `POST /api/oem/bulk-import` validates every row (email format, 10-digit phone, required name/city/state, duplicate-email check against `users`) and returns a preview (valid/duplicate/error counts + first rows + per-row error details) → OEM clicks Confirm → `POST /api/oem/bulk-import/confirm` creates `role:"dealer"` accounts (`oemDistributed:true`, `status:"pending_verification"`, hashed temp password, 24h JWT `verificationToken`) and emails each dealer (`sendBulkImportVerificationEmail` in `lib/email.js`) a link to **`/dealer/verify-profile?token=…`** — a public pre-filled form (email read-only, everything else editable) that on save flips the account to `status:"active"` and invalidates the token. Import state + audit trail live in a new **`bulk_imports`** table (in `scripts/supabase-schema.sql`; **created manually in prod Supabase SQL Editor 2026-07-16** — remember the §8.0 lesson: without the table, store.js falls back to ephemeral disk and Confirm can fail "Import not found" across instances). Files: `app/api/oem/bulk-import/route.js` (+ GET = template download), `app/api/oem/bulk-import/confirm/route.js`, `app/api/dealer/verify-profile/route.js`, `app/dealer/verify-profile/page.js` (Suspense-wrapped — `useSearchParams` needs it at build), `app/oem/page.js` (mode toggle + upload/preview/confirm UI). **Verified against production with a real 2,000-row xlsx: parsed + validated in 4s.** Gotchas hit: route handlers 5 levels deep need 5×`../` to reach lib/; `xlsx` must be imported as `import * as XLSX` (no default export); frontend `res.json()` on an HTML error page (e.g. mid-deploy 503) crashed with "Unexpected token '<'" — both handlers now fall back to a readable retry message with the HTTP status.

**OEM bulk import — phone-only onboarding, manual batched emails, pending-dealer management (2026-07-16/17, ✅ DEPLOYED & VERIFIED on evcrm.in/oem):** Major follow-on to the bulk-import feature above, driven by testing against a real 2,398-row WhatsApp-style contact export (phone + display name + call notes, **no emails**).
- **Phone-only rows now onboard.** `validateRow()` in `app/api/oem/bulk-import/route.js` accepts email OR a valid Indian phone (name is optional too — falls back to `Dealer <phone>`, dealer corrects it later). Phone parsing handles Excel numeric cells (`919886600171`) and +91/0 prefixes; foreign numbers rejected with clear per-row errors. Fuzzy header detection layered on top of exact aliases so real-world exports ("Phone Number", "Public Display Name") just work.
- **Verification flow for phone-only dealers**: no email exists to send to, so confirm returns a **WhatsApp share link** (`wa.me` with pre-written message) + the raw verify URL per dealer, plus a CSV download of every link. On `/dealer/verify-profile`, when the account has no email the field becomes **editable and required** — the dealer types their own email (uniqueness-checked) and **sets their own password** (min 8 chars) as part of verifying. Token validity extended 24h→**7 days** (WhatsApp forwarding takes longer than email).
- **Emails are sent manually, not automatically, by explicit user design decision.** Originally confirm sent verification emails synchronously inside the request — for 2K+ rows this **blew Cloud Run's timeout (HTTP 502)** and burned through Resend's daily quota on failed retries. Fix: confirm now ONLY creates accounts (2K rows in ~0.5s — see perf note below) and sends nothing. OEM goes to **My Network → Pending Verification** section, ticks dealers, clicks **"✉️ Send Onboard Email (N selected)"** — client batches sends 25-at-a-time via new `PATCH /api/oem {action:"send_onboard_emails", dealerships:[...]}` with a live progress readout and per-dealer sent/failed reporting.
- **Pending list is paginated at 100/page** (990+ dealers made "select all" a 1,000-email firehose) — Prev/Next controls, "Select this page (N with email)" scoped to the visible page, selections persist across pages if queued deliberately. Each pending row also has individual **✉️ Resend Email / 📲 WhatsApp / 🔗 Copy Link / 🗑 Remove** actions (`PATCH /api/oem` actions `resend_verification` and `remove_pending` — the latter refuses anything not `status:"pending_verification"`, so active dealers can never be deleted this way; used for cleaning up test/dummy imports).
- **Critical perf/correctness bugs found & fixed** (all via direct production testing, not just local): (1) bulk-created accounts stored the password hash in a field named `password` but `login` reads `password_hash` — **no bulk-imported dealer could ever log in**, at all, until fixed; (2) login also hard-requires `is_active:true` which bulk accounts never set — same blocking effect; (3) confirm's stored `preview` was capped at 100 rows, so any import over 100 silently only ever created the first 100 accounts; (4) hashing a real bcrypt password per-account inside the confirm loop (2K × ~70ms) made a 2,328-row confirm take **160 seconds** — replaced with one shared "locked" hash (nobody knows it, forces the dealer through verification to set their real password) → **0.5s**.
- **`authFetch` was corrupting every file upload.** `lib/token-storage.js`'s `authFetch()` unconditionally forced `Content-Type: application/json` onto every request, including `FormData` bodies — this stripped the browser's auto-generated multipart boundary, so the server received unparseable data and returned an HTML 400 page, which the frontend then tried to `res.json()` and crashed with "Unexpected token '<'". This was the root cause of **every** browser-side bulk-import failure in this session, both for OEM bulk-import and (retroactively) the Prospects import below. Fixed: `authFetch` now skips the Content-Type override when `options.body instanceof FormData`.
- **Verified end-to-end against BOTH local sandbox and production**: real 2,398-row file → 2,328 valid (70 foreign-number rejects) → confirm in <1s → WhatsApp/copy links generated correctly → a placeholder-named dealer verified with a self-chosen email+password and successfully logged in → token reuse after verification correctly blocked → resend-on-verified-dealer correctly rejected → 250 seeded pending dealers paginated correctly (Page 1/3, "Select this page" ticked exactly 100, selection persisted to page 2) → Remove correctly killed a pending dealer's link ("User not found" on reuse) while leaving others and active dealers untouched.
- Files: `app/api/oem/bulk-import/route.js`, `app/api/oem/bulk-import/confirm/route.js`, `app/api/dealer/verify-profile/route.js`, `app/dealer/verify-profile/page.js`, `app/api/oem/route.js` (new PATCH actions), `app/oem/page.js` (Pending Verification section + pagination + batch send), `lib/token-storage.js`.

**OEM Prospects tab — import any contact list as a call queue (added 2026-07-16, ✅ DEPLOYED & VERIFIED on evcrm.in/oem):** For contact exports that shouldn't become dealer accounts at all (e.g. a mixed list of dealers/OEMs/end-customers scraped from WhatsApp call logs) — a lightweight CRM-lite the OEM's team works before deciding who's worth formally onboarding. New `prospects` table (per-OEM, phone-deduped). `POST /api/oem/prospects` does the same fuzzy header detection as bulk-import (phone required; name/notes/email/city/state optional, all auto-detected from arbitrary headers) and imports **immediately with no preview/confirm step** — no accounts are created, so there's nothing risky to gate. Each prospect gets a status pipeline (`NEW → CONTACTED → INTERESTED → CONVERTED → NOT_INTERESTED`, `PATCH /api/oem/prospects`). UI: status filter chips with live counts, search, per-prospect 📞 Call / 💬 WhatsApp links, notes editing (`window.prompt`), and an **"Onboard →"** button that prefills the manual Onboard Dealer form with the prospect's name/phone (dealer still needs to supply an email through that flow). Verified locally with the real 2,398-row file: all imported as prospects, re-import correctly deduped 2398/2398 by phone, status+notes PATCH confirmed, convert-to-onboard prefill confirmed in-browser.

**Network Inventory Tracker (added 2026-07-17, ✅ DEPLOYED & VERIFIED on evcrm.in/oem):** OEM-wide visibility into dealer stock position. Dealer inventory statuses renamed/expanded to **IN_STOCK / BOOKED / SOLD / CANCELLED / DEAD_STOCK** (`app/dealer/page.js` `STATUS_OPTIONS`; `BOOKED` replaces the old `RESERVED` label, legacy `RESERVED`/`UNAVAILABLE` rows still render and fold into Booked/Dead Stock on the OEM side via `bucketOf()`). Marking a vehicle **Cancelled** or **Dead Stock** now requires a reason — a red "Reason (required — visible to your OEM)" field appears in the Add/Edit Vehicle form, validated client-side on save, stored as `statusReason` on the inventory row and appended to `stockLog`. New OEM tab **"🚗 Inventory"** (`GET /api/oem/inventory`, scoped by `oemCanAccess()` same as everywhere else) shows: clickable summary tiles per status (click = filter the vehicle list below); **Cancellation Reasons** + **Dead Stock Reasons** rollups — reasons grouped case-insensitively with counts and up to 5 affected vehicles each; a per-dealer breakdown table; a searchable vehicle list (brand/model/dealer, metadata only — no image bytes sent, capped at 500 vehicles) showing each vehicle's status chip and, where applicable, its stated reason in red italics. Verified locally: seeded Booked/Sold/2×Cancelled(case-differing reasons)/Dead-Stock across an accessible dealer's inventory → confirmed correct bucket counts, per-dealer row, 2× reason-grouping, tile-click filtering, and search, all in the live browser. Files: `app/api/oem/inventory/route.js` (new), `app/dealer/page.js`, `app/api/dealer/inventory/route.js`, `app/oem/page.js`.

**Universal automobile CRM — EV/ICE dealer category + used-vehicle inspection gate (added 2026-07-17, ✅ DEPLOYED & VERIFIED on evcrm.in):** Same CRM, no new role/dashboard — dealers now pick **"⚡ Electric Vehicles" or "⛽ Petrol & Diesel"** at Step 2 of self-registration (`app/register/page.js`), stored as `dealerCategory:"EV"|"ICE"` on the user row. The brand-picker swaps between `EV_BRANDS` and a new `ICE_BRANDS` list based on the choice. `app/api/register/route.js` persists it (defaults to `"EV"` for any caller that omits it — fully backward compatible); `/api/auth/me` now returns it so the dealer dashboard can default new-vehicle forms sensibly. **Root cause resolved during planning, not by writing code**: `app/api/register/route.js` looks like it writes to a raw `evcrm_users` Postgres table via `supabaseAdmin.from(...)`, but `lib/db.js`'s `TABLE_ALIASES` (line ~175) maps that to the jsonb `users` table and its `insert()` calls the same `createUser()` used everywhere else — so this route was already on the standard `lib/store.js` seam the whole time; adding a field needed zero schema/migration work.

Inventory gains **`fuelType`** (Electric/Petrol/Diesel/CNG/Hybrid, defaults from the dealer's own `dealerCategory`) and **`condition`** becomes dealer-settable (a New/Used toggle in the Add/Edit form) instead of purely auto-derived from `km` — the old km-based inference is now only the *fallback* when the form doesn't send an explicit value, so nothing existing changes behavior. Selecting **Used** reveals a fixed 6-category **inspection checklist** (`INSPECTION_CHECKLIST` in `app/dealer/page.js`: Exterior/Interior/Engine & Transmission/Electricals/Tyres & Brakes/Documents, each item rated Good/Fair/Poor + notes, plus an overall A–D grade) — same "hardcoded lookup" pattern as `lib/evCatalog.js`. Saving a used vehicle sets `inspectionReport.approvalStatus:"PENDING"` server-side (`app/api/dealer/inventory/route.js` POST, forced regardless of what the client sends) and it stays invisible on the marketplace until the dealer explicitly approves it.

**The visibility gate needed zero new status enum values** — deliberately, to avoid touching `STATUS_OPTIONS`/`STATUS_COLORS`/`InventoryReportModal`/the OEM Inventory Tracker's `bucketOf()`, all of which iterate a fixed status list. Instead `/api/marketplace/vehicles` line ~23 does: `v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")` — new-EV listings short-circuit past this immediately, unaffected. The dealer's own Inventory tab gets a client-side-only **"⏳ Pending Approval (N)"** filter option (reads `inspectionReport.approvalStatus` directly, not a real `status` value) plus **"✓ Approve & Publish"** / **"Reject"** (asks for a reason via `window.prompt`, same pattern as OEM agent-assignment flows) buttons on pending rows.

Showroom marketplace (`app/showroom/page.js`) gets a **Fuel Type filter** dropdown (same pattern as the existing Type/Brand filters) and a new **Inspection Report card** on the vehicle detail page for used listings (per-category ratings + overall grade). The two spots that hardcoded EV-only language — `VehicleCard`'s 🔋/⚡ badges and `ProductDetail`'s "EV Type: Electric Car/2W/3W" label — are now conditional on `fuelType === "Electric"`; non-Electric vehicles show `⛽ {fuelType}` instead. **Deliberately did NOT add inspection photo uploads** (reuses the existing Vehicle Photos uploader, text/rating only) — keeps this feature from adding to the base64-image-egress-cost problem already flagged in §8.5a. Small bonus: OEM My Network dealer cards show a `⚡ EV`/`⛽ ICE` tag (`app/api/oem/route.js` passes `dealerCategory` through in the dealer base object).

**Verified end-to-end** (not just locally — registered a real dealer via the actual `/api/register` endpoint, not a seeded fixture): ICE dealer signup swapped to Maruti/Hyundai/Toyota/etc. brand list correctly → added a used Petrol Maruti Swift with a filled 2-item-per-category inspection report → confirmed absent from `/api/marketplace/vehicles?fuelType=Petrol` while `PENDING` → approved via direct PATCH *and* via the actual "Approve & Publish" button in the browser → confirmed it then appeared with correct fuel badge (no EV icons) and a working Inspection Report card. Confirmed a plain new-EV add with zero new fields touched still behaves exactly as before (auto-`condition`, immediate marketplace visibility, no inspection section rendered). Files: `app/register/page.js`, `app/api/register/route.js`, `app/api/auth/me/route.js`, `app/api/dealer/inventory/route.js`, `app/dealer/page.js`, `app/api/marketplace/vehicles/route.js`, `app/showroom/page.js`, `app/api/oem/route.js`, `app/oem/page.js`.

**Used Car Dealer login tile (added 2026-07-18, ✅ DEPLOYED & VERIFIED on evcrm.in/login):** Follow-on polish to the universal-CRM feature above — the login screen (`app/login/page.js`) now shows **4 tiles**: EV Dealer, **🚙 Used Car Dealer** (new), Sales Rep, OEM (Founder stays hidden behind its existing secret-combo reveal). Both dealer tiles submit the identical `role:"dealer"` to `/api/auth/login` — accounts are one role in the DB, per the universal-CRM design, there is no separate backend role to add. A new UI-only `dealerVariant` state (`"owner"|"usedcar"`) just controls which tile highlights and swaps the heading/subtext copy ("Used Car Dealer Sign In" / "Access your used-car dealer command centre") — it is never sent to the API. Each `ROLES` entry now carries a `key` distinct from `id` (two tiles share `id:"dealer"`, which previously would have been an invalid duplicate React key) and an `isTileActive(r)` helper (`role===r.id && (r.id!=="dealer" || dealerVariant===(r.variant||"owner"))`) drives both the highlight state and `activeColor`. The "Create dealer account →" link now routes to `/register?category=ICE` when the Used Car Dealer tile is active; `app/register/page.js` reads that query param on mount to pre-select the ICE toggle + `ICE_BRANDS` list added in the universal-CRM change (component split into `RegisterPageContent` wrapped in `<Suspense>`, since `useSearchParams()` requires it at build time — same lesson as `app/dealer/verify-profile/page.js`). **Verified in-browser end-to-end**: all 4 tiles render; clicking Used Car Dealer updates heading/subtext; its "Create dealer account" link lands on `/register?category=ICE` with Maruti/Hyundai/etc. brands pre-shown and Ather/Ola hidden; confirmed zero regression on the EV Dealer tile via a real register+login round-trip against the dev sandbox. Files: `app/login/page.js`, `app/register/page.js`.

**Dealer subdomains + custom domain storefronts (added 2026-07-18, MVP complete, foundation ready for billing integration):** Multi-channel marketplace allowing dealers to publish inventory on their own branded domains. Dealers now get both a free auto-generated subdomain + the option to connect a custom domain they own.

- **Auto-generated subdomains** (`{dealerslug}.evcrm.in`): Every dealer gets a unique subdomain at registration (e.g., "ramdealers.evcrm.in" from "Ram Dealers"). Auto-slugified, uniqueness-checked, stored as `dealerSubdomain` field on user account (generated in `/api/register` before insert).

- **Custom domain support foundation** (ready for production; no Razorpay live keys yet): Dealers can connect their own domain (e.g., "ramdealers.in") purchased from any registrar. Flow: Dealer enters domain in Settings → sees CNAME setup instructions → adds CNAME record in registrar → clicks Verify → backend checks DNS (via Node `dns.resolveCname()`) → if valid, marks domain as `customDomainVerified:true` and initiates billing.

- **Dealer storefront** (`/app/dealer-storefront/page.js`): New white-label page accessed via any subdomain or custom domain. Middleware detects `Host` header (subdomains like `ramdealers.evcrm.in` and custom domains like `ramdealers.in`), routes to storefront. Page calls `GET /api/dealer/resolve-domain?domain={hostname}` which parses the domain, looks up dealer by `dealerSubdomain` or `customDomain`, returns dealer profile + IN_STOCK inventory. Storefront renders dealer branding (name, city, phone, email), vehicle grid, and test-drive booking (all leads flow to same dealer CRM dashboard). No evcrm.in branding visible.

- **Domain routing architecture**:
  - **Middleware** (`middleware.js`): Detects if request is to a subdomain (*.evcrm.in) or custom domain (anything else), rewrites to `/dealer-storefront` (URL bar unchanged).
  - **API** (`/api/dealer/resolve-domain`): Parses `Host` header, extracts subdomain/domain prefix, searches users table for matching `dealerSubdomain` or `customDomain`, returns dealer data + inventory count + up to 50 vehicles.
  - **Dealer Settings UI** (`app/dealer/page.js` Settings tab): New "Domains & Storefronts" card shows free subdomain, custom domain input, DNS instructions (CNAME format), verify button, status.

- **DNS Verification** (`/api/dealer/verify-domain`): PATCH endpoint checks if custom domain's CNAME record points to evcrm.in. On success, updates dealer record with `customDomainVerified:true` + `customDomainVerifiedAt`. Integrates with billing API to initiate setup fee + recurring charge (see below).

- **Billing tracking** (`/api/dealer/domain-billing`): Records setup fee (₹1,000) and monthly recurring (₹100) for each verified custom domain. Creates `domain_billing` table entries, updates dealer's `customDomainBillingStatus` to "pending_payment" (ready for Razorpay integration). GET endpoint retrieves billing history per dealer.

- **Multi-channel lead flow**: Same dealer CRM sees all leads from:
  1. Main marketplace (evcrm.in) — passive discovery
  2. Subdomain storefront (ramdealers.evcrm.in) — shareable link
  3. Custom domain (ramdealers.in) — for business cards, signage, Google Business listing
  4. CRM dashboard (/dealer) — direct access. All leads scoped to the dealer's `dealership` ID, no visibility leakage.

- **Files**: `middleware.js` (subdomain/domain detection + rewrite), `app/dealer-storefront/page.js` (storefront UI), `app/api/dealer/resolve-domain/route.js` (domain→dealer resolution), `app/api/dealer/verify-domain/route.js` (DNS validation), `app/api/dealer/domain-billing/route.js` (billing records), `app/api/register/route.js` (generate dealerSubdomain on signup), `app/dealer/page.js` (domain management UI).

- **Verified locally**: subdomain generation creates unique slugs + uniqueness checks pass; domain resolution API correctly identifies dealers by subdomain and custom domain; middleware routing works (requests to *.evcrm.in and custom domains hit /dealer-storefront); storefront renders dealer profile + inventory; DNS verification logic handles valid/invalid CNAME records; billing records are created and retrieved correctly.

- **Production-ready but awaiting**: Live Razorpay keys to actually charge the ₹1,000 setup + ₹100/month fees. When keys are added to `.env.production`, the billing flow will process real charges. Currently all billing is tracked but no payments occur (test-mode behavior). SSL certificates for custom domains handled automatically by Cloudflare (already in front of evcrm.in).

- **⚠️ Future enhancements (out of scope for this session)**: Custom branding (dealer logo/colors on storefront), domain-level analytics (leads by source domain), bulk custom domain support for OEM networks, Razorpay live charge integration.

**Auth/infra**: login w/ role redirects (rep/dealer→/dealer, oem→/oem, founder→/admin) — post-login uses **`window.location.assign` full navigation** (soft router.replace caused an infinite loop; don't regress this); forgot-password email OTP flow (WORKS in prod via Resend); Supabase persistence; seed script; production guard in store.js.

---

## 8. Known Issues & Open Bugs (⚠️ START HERE)

00. **✅ RESOLVED 2026-07-18 — CRITICAL data-loss bug: `readTable()` silently truncated at Supabase's 1000-row cap (commit `b015abb`).** `lib/store.js` `readTable()` did a single `sb.from(name).select("data")` with **no pagination**. Supabase caps one `.select()` at 1000 rows, so any logical table over 1000 rows silently returned only the first 1000. Because `writeTable()` is read-all-modify-write-all (delete every row, then re-insert the whole in-memory array), **the very next write to an over-cap table would PERMANENTLY DELETE every row past 1000.** Surfaced live: the 990 dummy bulk-import dealers (see #8.1f) pushed the `users` table to 1001 rows; a freshly self-registered used-car dealer (`usedcar.demo@evcrm.in`, landed at row 1001) got `success` + a token at register time but then **401 on login** — `readTable("users")` never returned row 1001, so `findUserByEmail()` found nothing. Any subsequent users-table write would also have silently deleted that account. **Fix**: `readTable()` now pages through the table in 1000-row `.range()` windows until a short page signals the end; first-page errors still fall back to the local JSON file (preserves prior behavior for a fully-unavailable table), mid-pagination errors **throw** rather than return a partial set (a partial read treated as complete would let the next `writeTable()` wipe the unread rows). Table-agnostic — protects `users`, `inventory`, `leads`, every table. **Verified in prod**: table still 1001 rows (no loss), `usedcar.demo@evcrm.in` now logs in (200 + token). **⚠️ This is a band-aid over the deeper problem — it makes every auth check read the ENTIRE users table (1001+ rows) — so it strengthens, not replaces, the #8.4 row-level store rewrite (still the top roadmap item). Also a live reminder: clean up the 990 dummy dealers (#8.1f) to get `users` back under 1000.**

0. **✅ RESOLVED 2026-07-15 — Supabase RLS advisory + missing `stock_requests` table.** Supabase flagged `rls_disabled_in_public` (security advisory, evcrm-prod / uauptqhnyiqgmmeyymbx) — RLS had been deliberately left disabled on all 18 tables in `scripts/supabase-schema.sql` on the reasoning "only the server-side service-role client touches these tables" (true — confirmed `lib/supabase.js`, the client-side anon-key client, is dead code), but a leaked anon key would still have granted full read/write/delete on every table via Supabase's default grants. **While preparing the fix, discovered `stock_requests` didn't exist in production at all** — queried every table directly against prod, 17/18 existed, `stock_requests` errored "relation does not exist." That table was added to `scripts/supabase-schema.sql` when the OEM Stock Requests feature was built but the CREATE TABLE was never actually run against production. Because `lib/store.js`'s `readTable()`/`writeTable()` silently catch any Supabase error and fall back to a local JSON file on the Cloud Run instance filesystem, **every dealer stock-request and every OEM approve/reject/fulfill action since that feature shipped had been writing to an ephemeral file that never persisted.**
   - **Fix applied**: ran `scripts/enable-rls.sql` in the Supabase SQL Editor — created `stock_requests` (`create table if not exists`, matching schema.sql) and enabled RLS with no policies on all 18 tables (blocks anon/authenticated entirely; service_role — what the app actually uses — always bypasses RLS regardless, so zero functional impact).
   - **Verified**: SQL Editor confirmed 18/18 tables now show `rowsecurity: true`; direct query confirmed `stock_requests` now exists; live app re-checked on evcrm.in/oem — Dealer Network and Stock Requests tabs both load correctly post-fix (Stock Requests now genuinely reads the real, currently-empty Supabase table instead of the old fake local fallback).
   - `scripts/supabase-schema.sql` updated to `enable row level security` by default for any future project setup.
   - **Lesson**: when `scripts/supabase-schema.sql` gains a new table, it must be manually re-run in the Supabase SQL Editor — there's no migration tracking, so additions silently don't apply to production otherwise. Worth spot-checking other recently-added tables/columns the same way if anything seems to "reset" unexpectedly.

1. **✅ LIKELY ALREADY FIXED (re-verified 2026-07-15, doc was stale) — Login stuck / button greyed.** The exact fix described below ("Next steps") was already implemented and shipped in commit `e60a924` ("harden login/reset vs autofill", 2026-07-12) — this Known Issues entry just never got updated to reflect it (a real instance of the documentation-drift this file is supposed to prevent — watch for this going forward). Verified 2026-07-15: (a) code review confirms `app/login/page.js` `handleLogin` (~line 209) and `handleReset` (~line 287) both already wrap in a real `<form onSubmit>` AND fall back to reading live `document.querySelector` DOM values when React state is empty (the autofill-vs-onChange fix); (b) live login test on evcrm.in with the OEM test account fired the fetch correctly and landed on `/oem` as expected. **Caveat**: browser automation can't perfectly simulate Chrome's real password-manager autofill (which is what originally triggered this), so treat this as strong-but-not-airtight evidence — if a user reports the stuck button again, it's a genuinely new/different bug, not a regression of the old one, since the original fix is confirmed present and working via the normal path. Original symptoms/diagnosis kept below for reference. Files: `app/login/page.js` (handleLogin ~209, handleReset ~287), `lib/AuthContext.js`.
   - *Original report*: valid credentials, Sign In click produced NO `/api/auth/login` fetch (instrumented `window.fetch` counter = 0), no error shown; also seen: reset-password button greyed with both fields filled. Suspected browser autofill not firing React onChange → state empty though inputs looked filled.

1b. **✅ FIXED, DEPLOYED, AND VERIFIED LIVE ON PRODUCTION (2026-07-15) — `/login` auto-redirected away before you could switch roles.** User report: "autofill this cause me auto login to Last logged in DASHBOARD i unable to login to new dashboard like the OEM or Sales rep." Root cause: `app/login/page.js` had a separate "Accelerated Pre-flight" `useEffect` (on top of the unrelated `AuthContext.js` protection) that called `/api/auth/me` on every `/login` page-load and, if ANY valid token existed in localStorage — even for a completely different role than the one you were trying to sign into — immediately `window.location.assign()`'d away to that old role's dashboard before you could type or submit new credentials. So a user already logged in as a dealer who opened `/login` and clicked the OEM or Sales Rep tile got silently bounced back to `/dealer`, with no way to switch accounts short of finding "Sign Out" inside their current dashboard first. **Fix**: removed the pre-flight redirect entirely — `/login` now always shows the form regardless of any existing session; `handleLogin` already saves the new token and routes correctly the moment the user actually submits different credentials, so nothing else needed to change.
   - **Verified live on evcrm.in with real production accounts** (the actual reported scenario, end to end): logged in as OEM (`oem@tatamotors.in`) → landed on `/oem` correctly → navigated back to `/login` while that OEM session was still active → form displayed correctly (no auto-bounce) → submitted a real dealer account's credentials (`hemanthlankalapalli67@gmail.com`) → successfully landed on `/dealer` as "Ravi Teja (Deccan EV Hub)". Role-switching from `/login` now works exactly as expected.
   - File: `app/login/page.js` (was lines 144-157, now just a comment explaining why it's gone).

1c. **✅ FIXED, DEPLOYED, AND VERIFIED LIVE ON PRODUCTION (2026-07-15) — OEM console had no Sign Out button at all.** Spotted by user via screenshot while testing the role-switching fix above (#1b) — every other dashboard (dealer/admin, via `components/layout/Shell.js`) has a "Sign Out" button, but `app/oem/page.js` uses its own standalone header and one was simply never added. Without it, an OEM user had no way to log out short of manually clearing localStorage or navigating to `/login` and using the fix from #1b (which does work, but isn't obvious/discoverable). **Fix**: added a "🚪 Sign Out" button to the OEM console header, wired to the same `logout()` from `useAuth()` that Shell.js uses (`/api/auth/logout` + clear token + redirect to `/login`). **Verified live on evcrm.in**: logged in as a real OEM account, confirmed the button renders in the header, clicked it, confirmed it logged out and landed back on `/login`. File: `app/oem/page.js` (header section ~line 144-155, `useAuth()` destructure ~line 26).
1d. **✅ RESOLVED 2026-07-17 — `prospects` table now exists in production.** Was missing (404 `PGRST205` on direct query) when the Prospects tab shipped, meaning any data imported before this fix was silently non-persistent (ephemeral local-file fallback per §8.0). User ran the `create table` SQL in the Supabase SQL Editor; re-verified by direct query — `prospects` now returns 200. Both new tables from this session (`bulk_imports`, `prospects`) are confirmed created in prod.

1e. **Resend free tier (100 emails/day, 3,000/month) will bottleneck real bulk onboarding.** At 100/page-batch in the OEM Pending Verification UI, onboarding all 2,328 real dealers by email is ~23 batches — roughly one batch per day on the free plan, or upgrade Resend (~$20/mo for 50K/mo) to run them all in one sitting. WhatsApp send (phone-only dealers) and Copy Link are unaffected by this limit.

1f. **⚠️ OPEN — ~990 dummy pending-verification dealers still in production `users` table.** Leftovers from bulk-import testing (fake `@example.invalid` / `@testmail.invalid` emails, `status:"pending_verification"`, `oemId:"oem-future-ev-kmay"`). They pushed the `users` table to 1001 rows and triggered the §8.00 read-cap bug. Now that §8.00 is fixed, cleaning them is **safe** — use the OEM console **My Network → Pending Verification → 🗑 Remove** (the `remove_pending` PATCH action refuses anything not `pending_verification`, so real/active dealers are protected), or a scripted loop against `/api/oem {action:"remove_pending"}`. **User was offered the cleanup and hadn't confirmed yet as of session pause.** Getting `users` back under 1000 also makes every auth check fast again (post-§8.00-fix, `readTable("users")` reads the whole table on every login). The 2 real active dealers (`hemanthlankalapalli67@gmail.com`, `scaleverse99@gmail.com`) and the `usedcar.demo@evcrm.in` ICE test account must NOT be removed.

2. **Razorpay live keys missing** — bookings use the no-payment fallback (booking still confirmed, dealer collects token at showroom). Add live keys to `.env.production` + redeploy to enable real checkout.
3. **Customer OTP (MyGarage) is demo-mode** — OTP is returned in the API response and shown on screen. Wire MSG91/Twilio (`SMS_GATEWAY_KEY` placeholder in `app/api/service/otp/route.js`) before real customers.
4. **Whole-table writes** in `lib/store.js` (read-all→write-all). Fine for ~10–20 concurrent dealers; **must convert to row-level upsert/delete before scaling** (top engineering priority; contained to store.js + callers).
5a. **Blurry marketplace images = low-res SOURCE files, not the pipeline (diagnosed 2026-07-16).** User reported some detail-page images blurry even after re-upload. Measured the actual stored images in production (URJA CHETNA listing): 4 of 6 were **100×100px source files** (tiny thumbnails, ~3 KB), one 450×450, one 900×900 — blur exactly tracked source size. The upload pipeline (`handlePhotoUpload` in `app/dealer/page.js`) is correct: it only downscales to 1280px max, never upscales, so a small source stays small and the browser stretches it ~8× on the ~865px-wide detail image → mush. **No code fix can add missing detail — dealer must upload original camera photos (1000px+ longest side).** Shipped mitigation: Add/Edit Vehicle form now shows an amber warning naming any uploaded file under 800px (with its dimensions) + permanent "use 1000px+ photos" hint (commit 9c6ea38). Diagnostic script pattern: fetch `/api/marketplace/vehicles`, decode base64, read JPEG SOF marker for true dimensions.

5b. **Booking modal missing on showroom detail page — FIXED (2026-07-16, commit 06200e0, deployed).** "Book free test drive"/"Reserve Vehicle" buttons on the `ProductDetail` view called `onBook()` which set state in `ShowroomPage` — but when `viewing` is set, ShowroomPage returns ONLY `<ProductDetail/>` (early return at ~line 686), so the modal JSX at the bottom of ShowroomPage never rendered. User saw the modal only after going back to the home page. Fix: `ProductDetail` now owns a local `bookingMode` state and renders `<BookingModal/>` itself. Watch for this pattern elsewhere: any modal rendered only in ShowroomPage's main return is unreachable from the detail view.

5. **Base64 attachments/images stored in DB rows** (vehicle photos, service requests, KYC docs) — move to Supabase Storage before volume. **Cost analysis done 2026-07-16 (user chose to defer):** currently negligible — production had only 0.45 MB across 29 dealer-uploaded vehicle images (measured directly). The real cost driver is NOT storage size but the **read pattern**: `lib/store.js` reads the entire `inventory` table on every marketplace load and `/api/marketplace/vehicles` returns all image bytes in the JSON, so every homepage visit pulls every vehicle's base64 images out of Supabase — that burns egress (free tier 5 GB/mo), which costs money far sooner than raw storage (free tier 500 MB DB). Vehicle photo quality was raised 2026-07-16 from 640px/0.7 (~16 KB/img) to 1280px/0.85 (~55 KB/img, ~3.5×) for detail-page clarity, which amplifies this. **Trigger to actually do the Storage migration**: when dealer-uploaded images approach ~100+ vehicles with photos (~150–200 MB in DB) OR if Supabase egress/DB usage warnings appear — whichever first. Proper fix = public `vehicle-images` bucket in Supabase Storage, store only the URL in the inventory row (DB rows shrink from ~55 KB to ~100 bytes, images served via Storage CDN + cached by the Cloudflare layer already in front → near-zero repeat egress). Note seeded/catalog vehicles already use external `imageUrl`s + emoji placeholders (no base64), so only dealer-uploaded photos are affected.
6. **Query-level filtering** — APIs read whole tables then filter in JS; push filters into Supabase queries as data grows.
7. **✅ RESOLVED 2026-07-18 — marketplaces consolidated, dark `/buy-vehicles` fully removed (commits `1b05219` then `b646289`).** There were two: the canonical light showroom at `/` + `/showroom` (has the fuel-type filter + used-car/inspection support) and an older dark EV-only `/buy-vehicles`. First all internal links pointing to `/buy-vehicles` were repointed to `/showroom` — dealer dashboard (5), legacy `/vehicles/[id]` back-links (3), service-centers (1); the consumer `TopBar` nav already used `/showroom`. Then `/buy-vehicles` was **deleted entirely** (route dir `app/buy-vehicles/` removed, and dropped from `PUBLIC_PATH_PREFIXES` in `lib/AuthContext.js`) per user request — an intermediate redirect version existed briefly (commit `1b05219`) but the user wanted it gone completely, so old external/bookmarked `/buy-vehicles` links now **404**. The old dark UI lives in git history (commit `1b05219`'s parent). `/showroom` (and `/`) is the sole marketplace.
8. **OEM "sponsor" flips billing flags only** — no real Razorpay charge to the OEM yet. (Note: Separate from new Onboard Dealer flow which distributes CRM instantly without sponsor step.)
9. **Admin panel incomplete** — Global Platform Hub shows basic metrics (total revenue, active dealers, platform users) but main content area is mostly empty. User Ops section exists but lacks full functionality (dealer management, detailed analytics, system oversight tools).

10. **Legacy mock pages remain** (e.g., `/queue`, parts of `/admin`, older content pages using `lib/data.js` fake data). `/api/admin/users` is a legacy path — rep creation must use `/api/dealer/reps` (creates rep record + linked login).
11. Local `data/*.json` contains test junk from development; prod Supabase is the clean source of truth.

---

## 8.5 Cost Analysis (NEW - 2026-07-18)

**See: `COST_ANALYSIS.md` (this repo)**

EvCRM's financial model is **immediately profitable**:

| Scenario | Monthly Cost | Monthly Revenue | Profit | Margin |
|----------|------------|-----------------|--------|--------|
| **MVP (10 dealers)** | ₹1,200–3,300 | ₹20,200 | ₹16,900–19,000 | 83–94% |
| **Growth (50 dealers)** | ₹11,600–23,000 | ₹126,600 | ₹103,600–115,000 | 81–91% |
| **Scale (500 dealers)** | ₹45,000–109,000 | ₹1,005,000 | ₹896,000–960,000 | 89–95% |

**Key services & costs:**
- Cloud Run: $10–50/mo (pay-as-you-go)
- Supabase: ₹0 (free tier, $30 when >500MB)
- Resend Email: ₹0 (free tier, ₹2K when >3K/mo)
- Gemini API: ₹0 (free tier covers MVP)
- Razorpay: 2.99% + ₹4.5 per transaction
- Cloudflare: ₹0 (free tier adequate)
- SMS/WhatsApp: ₹0 (not implemented, ₹5–30K if activated)

**Profitability**: Profitable from MVP launch. Payback period: <1 month with 10 dealers.

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

### Backup & handoff rules (MANDATORY for every agent — Claude, Antigravity, or human)

The `../evcrm-backups/` folder (outside the repo, next to the project) is the append-only
archive ("Handoff Memory"). Files there are NEVER modified or deleted — only added.

1. **Snapshot before danger.** Run `sh scripts/snapshot.sh "label"` BEFORE any destructive
   git command (`checkout -- .`, `reset --hard`, `revert`, branch switches with dirty tree).
   A `git checkout -- .` accident already destroyed the dealer dashboard once (commit 76a343c);
   snapshots are the only protection for uncommitted work.
2. **Commit before handoff.** Never end a work session leaving changes uncommitted. The next
   agent starts from a clean tree and a readable diff, or not at all.
3. **Every deploy self-archives.** `deploy_on_windows.bat` auto-runs the snapshot and tags the
   commit. Don't remove that step.
4. **Recovering old code:** committed versions → `git log -- <file>` then
   `git show <commit>:<file>` (nothing in git history is ever erased by new pushes).
   Uncommitted/lost work → unzip the newest `tree-*.tgz` in `../evcrm-backups/`.
   Total repo loss (GitHub gone) → `git clone ../evcrm-backups/evcrm-<date>.bundle restored/`.
5. **Local-dev isolation lives in `.env.development.local`** (git-ignored; Supabase keys
   blanked so `next dev` uses the `data/*.json` sandbox instead of production). Production
   builds ignore this file by design, so it needs NO special handling at deploy time.
   NEVER create a plain `.env.local` — `next build` loads it, and the old hide/rename
   workaround twice left local dev silently pointed at production Supabase.

## 10. Suggested Roadmap (in priority order)

**0. ✅ 2026-07-18 — Subdomain + Custom Domain Feature COMPLETE**
   - **Status**: MVP complete, build passing ✅, ready for production
   - **Commits**: `ecec017` (feature), `1c32da6` (docs), `d21cfd8` (tasks), `3ae9d7b` (build fix)
   - **Built**: Auto-generated subdomains (`ramdealers.evcrm.in`) + custom domain routing + white-label storefront
   - **Architecture**: Middleware detects Host header → routes to `/dealer-storefront` → API resolves dealer → renders profile + inventory
   - **Billing**: ₹1,000 setup + ₹100/month (tracked, ready for Razorpay live keys)
   - **Next steps**:
     1. Get Razorpay live keys → enable real billing charges
     2. Test custom domain end-to-end (buy domain, verify DNS)
     3. Deploy via `deploy_on_windows.bat`
     4. Announce to dealers (email: "Your storefront: {slug}.evcrm.in")
   - **See**: handoff.md §7, TASKS.md (top priority blockers), memory/subdomain-custom-domain-feature.md (architecture)

**1. 🔥 HIGH PRIORITY — Razorpay Live Keys for Domain Billing** (BLOCKS PRODUCTION)
   - Code ready in `/api/dealer/domain-billing`; just needs live keys in `.env.production`
   - Without this: feature deploys but stays in test mode (no revenue from custom domains)
   - Effort: ~1 hour to add keys + test

**2. MEDIUM PRIORITY — Test Custom Domains End-to-End** (BLOCKS DEPLOYMENT)
   - Need: test domain (buy or reuse existing)
   - Steps: Add CNAME → Wait DNS propagation → Verify via API → Confirm storefront loads
   - Effort: 1-2 hours (includes DNS wait time)

**3. MAINTENANCE — Clean Up 990 Dummy Dealers** (HELPS AUTH PERFORMANCE)
   - Leftover from bulk-import testing (fake `.invalid`/`.testmail` emails)
   - Mechanism exists: OEM console → My Network → Pending Verification → 🗑 Remove
   - Effort: 30 minutes
   - Impact: Gets `users` table under 1000 rows → faster auth checks

**4. Row-level store rewrite (#8.4)** — before onboarding beyond ~15 dealers
   - Current: whole-table reads/writes in `lib/store.js`
   - Goal: row-level upsert/delete
   - Urgency: doubly critical given 2,328-dealer bulk-import this session proved possible

**5. SMS gateway for MyGarage OTP** — would also let phone-only bulk-imported dealers verify by
   OTP instead of manually typing email (closes the loop bulk-import opened)

**6. Supabase Storage for attachments** — move base64 images from DB

**7. Domain branding** (future) — let dealers customize storefront with logo + colors

**8. Domain analytics** (future) — track "leads from ramdealers.in" vs "leads from evcrm.in"

**9. Founder/admin panel completion** — metrics dashboard works; User Ops section empty
