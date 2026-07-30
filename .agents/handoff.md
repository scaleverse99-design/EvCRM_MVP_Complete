# ⚠️ Snapshot only — real source of truth is `HANDOFF.md` (capitalized, project root) + `TASKS.md`

> Per `HANDOFF.md` line 11: *"THIS file (HANDOFF.md, capitalized) + TASKS.md are the single source
> of truth. Antigravity looks for `.agents/handoff.md` and `task.md` (lowercase) — those are
> redirect/snapshot files pointing back here."* An earlier update in this session (2026-07-30)
> mistakenly wrote full content directly into this file instead of HANDOFF.md — corrected below.
> **`.agents/sync.js` (the "live coordination daemon" this file used to reference) does not exist
> on disk** — there is no automatic locking; treat this purely as a manual snapshot.

**✅ 2026-07-30 — Both blockers resolved. Full detail in HANDOFF.md §8 issues #-1 and #-2.** Summary:
1. `package.json` missing was only the visible symptom of a much bigger problem: commit `87b1549`
   ("chore: resolve merge conflicts on handoff and env template") was a botched merge that deleted
   **25 real source files** — `app/page.js`, `app/dealer/page.js`, `app/showroom/page.js`,
   `app/login/page.js`, `app/layout.js`, `lib/constants.js` (design tokens, used by 50 files),
   `lib/data.js`, and 18 more. Antigravity's reconstructed `package.json` (approximate, from
   `package-lock.json`) got superseded — Claude Code found the fuller damage and restored all 25
   files from their exact pre-accident originals via `git checkout 87b1549^ -- <paths>`. Verified
   end-to-end locally (clean `.next` rebuild, real homepage content, real page title from the
   restored `app/layout.js`, MCP tools responding correctly).
2. Daily article publishing was silently broken since 2026-07-26 — `.env.production` missing
   `INTERNAL_API_SECRET` + 5 other keys. Fix staged in `.env.production`.

**Nothing is committed or deployed yet** — all fixes are staged locally, pending user go-ahead on
commit/push (asked in chat, not yet confirmed). If you're picking this up before that happens,
coordinate first — don't commit/push independently, to avoid conflicting with what's in flight.

Full diagnosis, verification steps, and everything else built this session (new `search_market`/
`compare_vehicles` MCP tools) are in **HANDOFF.md** (top status block + §7 + §8) and **TASKS.md**
(top priority section) — read those, not this file, for anything beyond the summary above.

---

## Project Context & Environment
* **Live Site**: `https://evcrm.in`
* **Local Test Environment**: `http://localhost:3001`
* **Local Run Command**: `npm run dev`
* **Deploy Command**: `.\deploy_on_windows.bat`
* **Database**: Supabase (Live credentials configured in the main `.env` file)
