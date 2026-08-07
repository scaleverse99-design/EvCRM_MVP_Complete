# Pointer — read HANDOFF.md (uppercase) instead

This file is a SNAPSHOT ONLY. The single source of truth is **`HANDOFF.md`**
in the repo root. Never write full content here — per the standing protocol
in HANDOFF.md §4 it gets overwritten and ignored.

Last refreshed: **2026-08-07** (Claude Code session)

## Start here

`HANDOFF.md` §8 → the **"PICK UP HERE"** block at the top.

## One-line state

`origin/main` @ `e0fda15`, everything pushed. **`68e96d8` (homepage +
/showroom SSR) is pushed but NOT DEPLOYED** — deploying it is the next step.

## What shipped to production today

- SSR + real titles for `/blog/[slug]`, `/learn/[slug]`, `/price/[slug]`
  (article pages were serving crawlers 73 bytes of "Loading…")
- Unique titles on 50 pages, including all 43 `/compare` pages — 48 had been
  sharing one generic title
- Inventory schema migration: marketplace and MCP went **0 → 10 vehicles**
  (`status:"AVAILABLE"` never matched the `"IN_STOCK"` every filter tests)
- CTE answer cache now actually populates (was 0 rows); Gemini removed from
  the request path
- `book_test_drive` on the public MCP — returns a signed human-confirmed
  link, writes nothing
- Rewritten `llms.txt` (llmstxt.org format) + accessibility fixes
- **All three leaked credentials rotated** (2 GCP, 1 Supabase full-DB)

## Biggest open item

`/charging` — **423 of 431** tracked Search Console queries are
charging-related and **every one has 0.0% CTR**. The page serves only 1,262
bytes because stations render client-side. Server-render it and add
`/charging/[city]` pages. Full ranked list in `HANDOFF.md` §8.
