# Memory

## Project
**EvCRM MVP** - EV CRM platform. Production stack: Cloudflare → Firebase Hosting → Cloud Run. Supabase in prod, local JSON in dev.

## Recent Work
**News Orchestrator — daily auto-published articles ✅ LIVE ON PRODUCTION (2026-07-22)**
Pipeline that publishes trending Indian auto/EV news articles daily to evcrm.in/blog. Three stages
in lib/orchestrator/{discover,research,write}.js: Gemini+google_search finds ~10 trending topics
with real source URLs → grounded Gemini produces cited research briefs (the NotebookLM-equivalent
step, automated) → writer generates 900-1200 word cited SEO articles into blog_posts (type="news").
- API: app/api/orchestrator/{discover,research,write,run,status} — Bearer INTERNAL_API_SECRET auth.
  /run is what the cron hits (all 3 stages). Composite proven end-to-end on prod: 5 articles live.
- Admin: /admin/orchestrator (founder/superadmin) — queue counts, manual trigger buttons, topic table.
  Routes via app/api/admin/orchestrator-proxy so browser never sees the secret.
- Writer defaults to Gemini free tier (GEMINI_ORCHESTRATOR_KEY — separate key so it doesn't compete
  with the /learn daily agent's quota). ORCH_WRITER=claude + CLAUDE_API_KEY switches to Claude (paid).
- Cron: .github/workflows/hybrid-orchestrate.yml, 3x/day via curl. NEEDS repo secrets ORCHESTRATOR_URL
  + ORCHESTRATOR_TOKEN before it runs. NOT yet enabled as of 2026-07-22.
- orch_topics Supabase table created in prod 2026-07-22.
- **Reliability lessons baked in**: (1) transient errors (rate limit/capacity/parse-fail) are
  classified retryable in lib/orchestrator/gemini.js isRetryableError() — they leave topic state
  untouched + retryCount++ instead of permanent FAILED, so a "high demand" blip doesn't drop good
  topics. (2) Never string-substitute to "repair" corrupted Gemini JSON (a prior '?'→'Rs.' fix made
  corruption 4x worse) — let it fail cleanly and retry. (3) Free-tier Gemini is 20 req/day per model;
  heavy testing exhausts it — resets next day.
- **Antigravity's abandoned browser-automation approach was deleted** (Puppeteer driving logged-in
  Gemini/NotebookLM/Claude web UIs). Don't revive it: violates Claude+Google ToS (account-ban risk),
  UI selectors break constantly, NotebookLM has no automation surface, needs a headed browser login
  so GitHub Actions can't run it. API-key pipeline is strictly better.

**OEM Console — 5-area build ✅ LIVE & FULLY VERIFIED ON PRODUCTION (2026-07-15)**
All 5 tabs confirmed working on evcrm.in/oem via live click-through: My Network, Onboard Dealer,
Feedback, Stock Requests, Reports. Two deploy pipeline bugs found and fixed (see below) — worth
remembering for future deploys.

### Historical notes (bugs hit during this deploy, now resolved)
- All 5 areas verified locally: My Network, Onboard Dealer, Feedback, Stock Requests, Reports
- Code confirmed correct in app/oem/page.js (TABS array has all 5 tabs, commit a97ae0f)
- **ROOT CAUSE FOUND**: deploy_on_windows.bat uses FIREBASE_CLI_EXPERIMENTS=webframeworks which
  does its OWN internal Next.js build — this was reusing a STALE .next/cache and stale
  .firebase/ev-crm-realtime build output, regenerating the OLD bundle hash (page-002192c6ee3856cc.js,
  12.8KB) instead of the new one (page-fc4df192968a031e.js, 27.2KB) even after manual `npm run build`.
- Confirmed via network requests on evcrm.in: old bundle hash still served after 2 deploy attempts.
- **FIX APPLIED**: Cleared both `.next` and `.firebase` directories completely, running a fully
  clean deploy (no cache to fall back on). This takes longer (~5-8 min vs 3-5 min).
- **LESSON FOR FUTURE DEPLOYS**: If a deploy doesn't reflect code changes, suspect stale
  `.next/cache` or `.firebase/<project>` build cache — clear both before redeploying.
- **SECOND ISSUE FOUND (2026-07-15, after clean rebuild+deploy succeeded)**: Deploy log confirmed
  "Deploy complete!" and origin now correctly has `page-fc4df192968a031e.js` (27KB, new OEM code,
  buildId different from old). BUT browser still receives OLD HTML referencing
  `page-002192c6ee3856cc.js` with old `buildId:"LgMaGUkHYjKdrcNCDbHwI"`. Confirmed via raw response
  body inspection — this is **Cloudflare edge cache** serving stale HTML (Cloudflare sits in front
  of Firebase Hosting per architecture, confirmed by cf-beacon script in response). No Cloudflare
  API token found in .env files, so cache purge must be done manually via Cloudflare dashboard:
  **Caching → Configuration → Purge Everything** for zone evcrm.in.
  **ACTION NEEDED FROM USER**: Purge Cloudflare cache to make new deploy visible.

## Key Files
(Track important paths here)

## Working Principles
**CRITICAL: handoff.md is the LIVE REFERENCE document**
- Update handoff.md in real-time as work progresses — after each meaningful change (features built, bugs fixed, issues discovered, deployments)
- This ensures work can continue in any IDE if Claude hits context limits or session interrupts
- Update these sections regularly:
  - §7 (What's Built & Verified) — add completed features
  - §8 (Known Issues & Open Bugs) — add/update issues as they're discovered or resolved
  - §10 (Suggested Roadmap) — reorder priorities as work progresses

## Known Issues (Recent Discoveries)
- Admin panel (/admin) has basic metrics dashboard (revenue/dealers/users) but most content below is empty
- User Ops section exists but incomplete — lacks dealer management, analytics, system oversight tools

## Notes
(Observations, patterns, decisions)
