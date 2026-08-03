# CTE live sourcing on cache miss — design (not yet built)

Written 2026-08-01. Nothing here is implemented. Read this before starting.

## The goal, in one line

When the MCP server has no data for a question, it should **source from the
live internet, extract clean typed fields server-side, and return an answer**
— not raw pages, and not nothing.

## Why this is the whole argument

The token saving does not come from "fewer searches". It comes from **moving
the parsing out of the model's context**. Web search puts source material in
the conversation and makes the model reconcile it. CTE should hand back an
answer instead.

**The tokens do not vanish — they move from the consumer to us.** Our server
pays the fetch + extraction cost so the user's context doesn't. That is the
product ("we already did the expensive part"), but it only works if the cost
is amortised across many users. See caching below; without it the economics
are upside down.

## What must be true, or this recreates an old bug

`cte-engine/api/server.js` already had a live-sourcing path
(`execute_universal_research`). It was disabled 2026-08-01 (commit 787ad49)
because it **templated** rather than extracted:

- poured search snippets into a markdown template with emoji headings and
  called the result a "verified report"
- emitted a literal `git status` as a "reference CLI command" for dev queries
- its price regex matched the year out of "How many ev vehicles sold in
  Last 5years" and stored `current_price: 2026`
- wrote all of this into `products`, the vehicle catalog `search_market`
  reads, so invented rows were served to real buyers with a Google News link
  as the "buy" URL

**Rule for the rebuild: extract, never template.** Return typed fields with
provenance — `{ value, unit, period, sourceUrl }` — and return *nothing* for
any field that cannot be grounded in a fetched source. A missing field is a
correct answer. A guessed one is a buyer acting on a wrong price.

## The caching decision (needs the founder's call)

Earlier decision (2026-08-01): "keep query and intent, not the sourced data."
That was correct about the **catalog** — sourced content must never enter
`products` again.

But taken literally it also means every miss re-sources, so the 3,000th person
asking the same question costs the same as the first. Live sourcing costs real
money per call.

Proposed resolution: a **separate `research_cache` table keyed by normalised
query signature, with a short TTL**. Structurally different from polluting the
catalog — it is an answer cache, not a product record. Source once, serve many.

**This reverses part of an explicit founder instruction, so it needs a yes
before building.**

## Build outline

1. `lib/cte/sourceLive.js` — `sourceLiveAnswer(query)`: search → fetch →
   extract typed fields → drop anything ungroundable → return `{fields[],
   sources[]}` or null.
2. `research_cache` table — key = normalised query signature (reuse the
   bucketing idea from `buildSignature()` in `lib/orchestrator/queryTrigger.js`,
   which already collapses re-worded and re-ordered variants), short TTL,
   RLS enabled, service-role only.
3. Wire into the **miss** path of `search_market` (empty result → source).
4. Cost guards from day one — `/api/mcp` is public and unauthenticated, and
   every unique query misses by definition, so an unguarded miss path is an
   open cost vector. Copy the pattern proven in `lib/cte/places.js`: cache
   first, hard daily cap, fail CLOSED on a cap-check error, and make the guard
   log *why* it blocked (see commit 04f3a1a — a guard that lies about its
   reason cost an hour of debugging).
5. Response must label provenance: `"source": "live"` vs `"verified_db"`, so
   the calling AI can signal confidence to the user.

## Test case

"What did the Nexon EV average per month in 2025?" — the question that failed
2026-08-01. Correct outcomes are either real month-level figures with a source
URL, or an honest "not available at model-month granularity". Never an average
computed across mismatched periods (FY vs CY vs rolling 12-month), which is
exactly how the open web gets this wrong: published figures conflate the Nexon
nameplate (all fuel types), Tata's whole EV portfolio, and Nexon EV alone.

## Still unproven, and cheap to settle

The token-saving claim has **never been measured**.
`scripts/benchmark-mcp-token-savings.js` measures both paths off real
`usage.input_tokens` / `usage.output_tokens` and refuses to print anything
without `ANTHROPIC_API_KEY`. A few rupees of spend turns "should save tokens"
into a defensible number. Do this before pitching the saving to anyone.

Known factors that shrink the win, so the number may disappoint:
- ~1,057 tokens of tool schema are sent on **every** request, used or not.
  That is the floor, and it is the largest remaining fixed cost.
- The AI platform's own search tool already returns a compressed digest, not
  raw pages — so the comparison is against something fairly efficient, not
  against raw HTML.
- Per-question the two may be comparable; the win compounds across a session,
  where schemas are paid once and each further question is one small call.

The claim that does **not** depend on any of this: coverage. `find_dealers`
returned six real Vijayawada dealerships with phone numbers in ~658 tokens.
No web page contains that list. Lead with coverage, not cost.
