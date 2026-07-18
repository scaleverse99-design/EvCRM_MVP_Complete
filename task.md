# ⚠️ REDIRECT — the canonical task list is `TASKS.md` in the repo root

**Read `TASKS.md` (repo root, capitalized) for the full, always-current task list.** It is the
single source of truth, kept live by every working session. This lowercase `task.md` exists only
to redirect agents (e.g. Antigravity) that look for `task.md` by default. `git pull origin main`
first if your working copy is behind.

---

## Snapshot — 2026-07-18 (trust `TASKS.md` if it's newer)

If your Antigravity view still lists things like "Verify Resend domain" or "Build OEM Dashboard
features" as the active tasks, you are reading stale cached memory — the OEM dashboard (My
Network, Onboard Dealer, Prospects, Inventory Tracker, Inside Sales, Feedback, Stock Requests,
Reports) is **already built, deployed, and live on evcrm.in**. Pull `origin/main` and read `TASKS.md`.

### Open / next up
- Clean up ~990 dummy pending-verification dealers in prod (safe now; My Network → Pending
  Verification → Remove). Do NOT remove `usedcar.demo@evcrm.in` or the 2 real dealers.
- Row-level store rewrite (`lib/store.js`) — top engineering priority before scaling past ~1000 rows.
- Razorpay live keys; SMS gateway for MyGarage OTP; Supabase Storage for images; Resend paid tier.

### Recently completed (this session — all deployed + verified)
OEM bulk import (+ phone-only, pending-verification queue, batch emails, remove), OEM Prospects
tab, Network Inventory Tracker, Universal EV/ICE CRM + used-vehicle inspection gate, Used Car
Dealer login tile, marketplace consolidation (deleted `/buy-vehicles`), critical `readTable()`
1000-row data-loss fix. Full detail in `TASKS.md` / `HANDOFF.md`.
