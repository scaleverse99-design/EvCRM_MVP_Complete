# Tasks

## Pending (Priority Order)

- [ ] Row-level store rewrite (§8.4) — required before scaling beyond ~15 dealers
  - Current: whole-table reads/writes in `lib/store.js`
  - Goal: convert to row-level upsert/delete
  - Impact: top engineering priority, affects performance

- [ ] Razorpay live keys + real token payments (§8.2)
  - Add live keys to `.env.production` + redeploy
  - Currently: bookings fall back to no-payment mode

- [ ] Wire SMS gateway for MyGarage OTP (§8.3)
  - Current: demo-mode returns OTP in response
  - Target: MSG91/Twilio via `SMS_GATEWAY_KEY` in `app/api/service/otp/route.js`

- [ ] Move base64 attachments to Supabase Storage (§8.5)

- [ ] Push query filtering into Supabase (§8.6)

- [ ] Consolidate two marketplaces; clean legacy pages (§8.7)
  - `/` vs `/buy-vehicles` — keep only one
  - Remove `/queue`, mock admin pages

- [ ] Complete founder/admin panel (§8.8)

## In Progress

(none)

## Completed

- [x] **OEM bulk dealer import (Excel/CSV → accounts → email verification)** — ✅ LIVE,
  user-confirmed working on evcrm.in/oem (2026-07-16)
  - Onboard Dealer tab: Manual Entry (1–10) / Bulk Import (2K+) toggle; upload → validated
    preview → confirm → accounts created (`pending_verification`) → branded verification
    email → dealer edits & saves at `/dealer/verify-profile?token=…` → account active
  - Verified against prod with a 2,000-row xlsx (parsed+validated in 4s); `bulk_imports`
    table created manually in prod Supabase SQL Editor (per §8.0 lesson)
  - Same session: booking modal fixed to open on detail page, thumbnail category labels
    removed, EMI surface hidden behind `EMI_ENABLED=false`, low-res photo upload warning,
    image-blur root-caused to 100×100px source files (see handoff §7/§8.5a-b)

- [x] **Vehicle detail page — 4 fixes from user QA** — ✅ deploying (2026-07-16)
  1. Blurry images: dealer photo upload was downscaling to 640×480 @ 70% JPEG; bumped to
     1280px longest side @ 85% + high smoothing. NOTE: only helps NEW uploads — existing
     vehicles' images are already stored at 640px, dealer must re-upload to get crisp ones.
  2. "EV.CRM Certified" / "Warranty Covered" no longer hardcoded-on — Certified now gated
     behind a new dealer `certified` checkbox (Inventory form); warranty badge only shows
     when `warrantyYears` is set. "Free Test Drive" / "Safe Booking" / "Refundable Token"
     stay (always-true platform facts).
  3. "Car Overview" heading → "Vehicle Overview" (was wrong for 2-wheelers).
  4. Stray "0"s in the price panel: `{v.onRoadPrice && …}` rendered a literal 0 when the
     value was 0 (React number-falsy footgun) — converted all `number && JSX` in
     ProductDetail to ternaries (price block + pill tags).
  - Files: `app/dealer/page.js` (image resize + certified checkbox + emptyVehicle),
    `app/api/dealer/inventory/route.js` (persist certified), `app/showroom/page.js` (badges/heading/zeros)
  - Verified locally: certified badge hidden by default, heading correct, no stray 0s

- [x] **"Find My EV" AI search widget** — ✅ DEPLOYED & VERIFIED LIVE on evcrm.in (2026-07-16)
  - Floating 🔍 chat on all consumer pages; plain-language multi-turn search over live
    inventory via Gemini; matched vehicles open `/vehicles/[id]` in a new tab; AI detects
    when the user is done and shows an end state + "Start a new search"
  - Verified live end-to-end: "family SUV under 20 lakh with good range" → returned the
    real Mahindra XUV400 result card linking the right detail page in a new tab
  - Files: `app/api/marketplace/search-assistant/route.js`, `components/home/SearchAssistant.js`,
    `components/home/TopBar.js`

- [x] **Brochure-PDF bulk upload (AI extraction)** — ✅ DEPLOYED (2026-07-16)
  - "📄 Upload Brochure" in dealer Inventory tab → Gemini reads the PDF directly →
    step-through review modal (one vehicle at a time, editable, explicit confirm)
  - Real-extraction verified: 2-variant Nexon brochure → both variants w/ correct specs,
    features, Lakh→rupees conversion
  - Gemini key: new AQ.-format key in `.env` + `.env.production`; quota on 2.5-flash only

- [x] **Vehicle detail page + EV spec catalog** — ✅ DEPLOYED (2026-07-16)
  - `lib/evCatalog.js` autofill in dealer Inventory form + expanded public detail page
  - Antigravity then redesigned the detail page Cars24-style (2026-07-16 00:43);
    Claude completed its 2 dead buttons: "Check EMI →" (now scrolls to calculator —
    instant scroll on purpose, smooth silently fails on this page) and "Price breakup →"
    (now toggles inline ex-showroom + charges = on-road breakdown)
  - Both verified in-browser locally; deployed with the fixes

- [x] **Deploy script bug: post-deploy steps never ran** — ✅ FIXED (2026-07-16)
  - `npx` without `call` in deploy_on_windows.bat never returned control — git deploy-tags
    and the Cloudflare auto-purge silently never executed
  - Fixed with `call npx …`; purge + tagging now run after every deploy

- [x] **OEM Sign Out button (§8.1c)** — ✅ FIXED, DEPLOYED, VERIFIED LIVE (2026-07-15)
  - OEM console had no way to sign out at all — every other dashboard has one, OEM's
    standalone header just never got one added
  - Added "🚪 Sign Out" button wired to the same `logout()` used elsewhere
  - Verified live on evcrm.in: logged in as real OEM account, button renders, click
    logs out and lands on /login correctly

- [x] **Cloudflare cache purging automated — manual purge no longer needed** (2026-07-15)
  - Root cause of needing manual purges: Cloudflare was edge-caching HTML pages
  - Added a Cache Rule (Bypass HTML, cache only `/_next/static/*`) — permanent fix,
    every page load now always hits origin fresh
  - Added `scripts/purge-cloudflare.js`, wired into `deploy_on_windows.bat` as a backup —
    auto-purges after every deploy using `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ZONE_ID`
    in `.env.production` (git-ignored)
  - Tested: token scoped correctly (Zone → Cache Purge → Purge, evcrm.in only), zone
    lookup + actual purge call both succeeded

- [x] **Login auto-redirect bug (§8.1b)** — ✅ FIXED, DEPLOYED, VERIFIED LIVE (2026-07-15)
  - `/login` was silently bouncing users back to their old dashboard before they could
    switch roles/accounts — removed the "Accelerated Pre-flight" redirect in
    `app/login/page.js`
  - Verified live on evcrm.in with real accounts (the actual reported scenario): logged in
    as OEM → landed on /oem → went back to /login with that session active → form showed
    correctly (no bounce) → logged in as a real dealer → landed on /dealer successfully
  - Role-switching from /login now works end-to-end

- [x] **Login/reset stuck-button bug (§8.1)** — confirmed ALREADY FIXED, doc was stale (2026-07-15)
  - The fix was actually shipped 3 days earlier in commit `e60a924` ("harden login/reset vs
    autofill", 2026-07-12) — handoff.md's Known Issues section just never got updated
  - Re-verified: code review confirms both `handleLogin` and `handleReset` in
    `app/login/page.js` already wrap in `<form onSubmit>` + fall back to reading live DOM
    input values when React state is empty (the exact autofill fix)
  - Live-tested: login on evcrm.in with OEM test account fired the fetch correctly, landed
    on `/oem` as expected
  - Caveat: couldn't perfectly simulate real Chrome password-manager autofill via browser
    automation — if a user reports this again, treat as a new bug, not a regression (the
    original fix is confirmed present and working via the normal path)
  - **Lesson**: handoff.md's Known Issues section can go stale when a fix ships without
    updating the doc — worth periodically re-verifying "open" issues against recent commits

- [x] **Fixed Supabase RLS security advisory + missing `stock_requests` table** (2026-07-15)
  - Enabled RLS (no policies) on all 18 production tables — closes the anon-key exposure
    risk Supabase's own advisor flagged; zero functional impact (app uses service_role key)
  - **Bonus bug fixed**: `stock_requests` table never existed in production — every OEM
    Stock Requests action since that feature shipped was silently writing to an ephemeral
    local file that never persisted. Table now created and confirmed working live.
  - Ran via `scripts/enable-rls.sql` in the Supabase SQL Editor (no DB connection string /
    Management API token exists in this project for automated execution)
  - Verified: 18/18 tables show `rowsecurity: true`; live app re-checked, no regressions
  - Details: handoff.md §8.0

- [x] **OEM "Sponsor Instead" flow** — ✅ LIVE on evcrm.in/oem (2026-07-15)
  - When Onboard Dealer hits a duplicate email, links the existing independent dealer into
    this OEM's network and offers a "💳 Sponsor This Dealer Instead →" shortcut
  - Sponsoring sends an informational email to the dealer (new to network, no action needed)
  - Files: `app/api/oem/onboard-dealer/route.js`, `app/api/oem/route.js`, `lib/email.js`, `app/oem/page.js`
  - Verified locally (full flow incl. email) AND live on production (duplicate detection +
    Sponsor-Instead button both confirmed rendering correctly)

- [x] **OEM Inside Sales tab** — ✅ LIVE on evcrm.in/oem (2026-07-15)
  - New 6th OEM tab: assign a named inside-sales agent to any lead across the network,
    mark it "OEM-Verified" once the agent confirms genuine interest by phone
  - Verified lead shows a green "✓ OEM-VERIFIED" badge on the dealer's own Leads tab
    (mobile card + desktop table) so dealer reps prioritize it — passive badge only, no
    auto-notification to dealer (per design decision)
  - Files: `app/api/oem/route.js` (GET leads + 2 new PATCH actions), `app/oem/page.js`
    (new tab UI), `app/dealer/page.js` (badge, 2 spots)
  - Verified locally via curl AND live on production (tab shows real leads across network
    with correct dealer names)

- [x] **OEM Console 5-Area Deploy** — ✅ LIVE & VERIFIED on evcrm.in/oem (2026-07-15)
  - ✅ My Network — dealer grid w/ live stats + Conv %
  - ✅ Onboard Dealer — full form (business/owner/email/phone/city/state), tested UI
  - ✅ Feedback — Quote Rejections + Sales Rep Comments, real data confirmed
  - ✅ Stock Requests — restock lifecycle, empty state confirmed working
  - ✅ Reports — Dealer Performance table + Vehicle Demand by Location
  - Root causes found & fixed along the way:
    1. Stale `.next`/`.firebase` local build cache caused deploy to repackage old bundle — fixed by clearing both before rebuild
    2. Cloudflare edge cache served stale HTML after deploy — fixed by manual Cloudflare cache purge
  - Note: Subscription cost shows only for "active" billing (trial dealers show "—") — accurate to billing model, not a bug
