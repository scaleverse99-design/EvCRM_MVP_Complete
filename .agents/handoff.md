# ⚠️ REDIRECT — the canonical handoff is `HANDOFF.md` in the repo root

**Read `../HANDOFF.md` (repo root, capitalized) for the full, always-current project state.**
It is the single source of truth, kept live by every working session. This file exists only
to redirect agents (e.g. Antigravity) that look for `.agents/handoff.md` by default. Do not
treat the snapshot below as complete — always open `HANDOFF.md` and `TASKS.md` for detail, and
`git pull origin main` first if your working copy is behind.

---

## Current-state snapshot — 2026-07-18 (if `HANDOFF.md` is newer, trust it over this)

**Everything below is LIVE on evcrm.in and pushed to `origin/main`.** If your Antigravity view
still shows older items like "OEM login redirect loop" or "Quote Pro Tracking" as the latest
work, you are reading stale cached memory — pull `origin/main` and re-read `HANDOFF.md`.

Shipped this session (all deployed + verified):

- **OEM bulk dealer import** (Excel/CSV → accounts → email/WhatsApp verification), incl.
  phone-only onboarding, a Pending-Verification queue in My Network (paginated 100/page,
  batch "Send Onboard Email", Resend/WhatsApp/Copy-Link/Remove per dealer).
- **OEM Prospects tab** — import any contact list as a call queue (no accounts created).
- **Network Inventory Tracker** (OEM tab) — network-wide In-Stock/Booked/Sold/Cancelled/
  Dead-Stock with cancellation & dead-stock reason rollups. Dealer inventory statuses expanded;
  Cancelled/Dead-Stock now require a reason.
- **Universal automobile CRM** — dealers pick **EV or ICE (petrol/diesel)** at self-registration
  (`dealerCategory` on the user row; `fuelType` on inventory; used vehicles require a dealer-
  approved inspection checklist before publishing). Marketplace has an "All Fuel Types" filter.
- **"🚙 Used Car Dealer" login tile** on `/login` (4th tile; submits `role:"dealer"`, UI-only
  variant). Its "Create dealer account" link pre-selects ICE at `/register?category=ICE`.
- **Marketplaces consolidated** — the dark `/buy-vehicles` page was **deleted** (404s now);
  the light `/showroom` (and `/`) is the sole marketplace.
- **CRITICAL data-loss fix** — `readTable()` in `lib/store.js` was truncating at Supabase's
  1000-row cap; any table over 1000 rows silently lost rows past 1000 on the next write. Now
  paginates. (See HANDOFF.md §8.00.)
- EMI calculator **disabled** behind `EMI_ENABLED=false`; detail-page thumbnail category labels
  **removed**. (Docs previously described both as live — corrected in HANDOFF.md §7.)

**Open items** (see HANDOFF.md §8 / TASKS.md): ~990 dummy pending-verification dealers still in
prod need cleanup (safe now, via My Network → Pending Verification → Remove); Razorpay live keys;
SMS gateway; row-level store rewrite (§8.4, top priority); Resend paid tier before real bulk
onboarding.

**Prod test account:** `usedcar.demo@evcrm.in` / `UsedCar123` (ICE used-car dealer) — log in via
the Used Car Dealer tile.
