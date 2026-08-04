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

---

## Source research, 2026-08-04 — checked, not assumed

The plan was to replace the LLM extraction with deterministic per-source
parsers: free, no quota, same input → same output, and no surface on which
a number can be invented. Right idea. But the sources have to exist first,
so each was probed directly rather than assumed.

### data.gov.in — CORRECTED 2026-08-04: usable, my first check was wrong

**The finding below was reached by a bad method and is wrong.** I paged
blindly through 1,000 of 237,327 resources and concluded from that sample
that the portal held nothing current. A title-filtered search
(`/lists?filters[title]=vahan`) finds real e-VAHAN datasets:

  State/UT-wise EV Charging Stations Installed      portal-updated 2026-02-25
  State/UT-wise EVs Registered                      portal-updated 2025-10-10
  State/UT-wise Electric Buses per VAHAN            portal-updated 2025-03-05
  Year-wise Registered EVs per e-vahan Portal       portal-updated 2024-11-02
  Category-wise EVs Sold per e-vahan Portal         portal-updated 2024-04-24

These are Rajya Sabha parliamentary answers sourced from e-VAHAN — official
and citable. Granularity appears to be state/year/category, NOT model-month,
so they likely answer "EV registrations in Telangana" but not "Nexon EV
monthly average" — to be confirmed by reading actual rows.

Blocked on a key: the public sample key everyone shares returns HTTP 429
"Rate limit exceeded". Register a free key (Dashboard -> My Account ->
Generate Key) and set DATA_GOV_IN_API_KEY.

Lesson for the next source check: search the catalogue, do not sample it.
A negative result from an unrepresentative sample is worse than no result,
because it closes off a real option.

### The original, incorrect finding, kept for the record

The API works (public sample key, `/lists`, 237,327 resources). The vehicle
data does not. Scanned 1,000 resources; all 25 vehicle-related ones are
historical statistical-yearbook extracts:

  Total Registered Motor Vehicles in India 1951-2013   portal-updated 2018-11-29
  Newly Registered Motor Vehicles 2011-12              portal-updated 2018-11-29
  Category-wise Registered Motor Vehicles ... 2015     portal-updated 2018-11-29
  Road Accidents / Registered Vehicles ... to 2017     portal-updated 2019-08-20

Latest data year 2017, portal last touched 2019. Nothing monthly, nothing
EV-specific, nothing after 2017. Useless for "EV sales in June 2026".

Caveat: 1,000 of 237,327 scanned, so not exhaustive — but the pattern is
consistent and every hit is the same vintage. Do not build an ingester here
without re-checking first.

### FADA — blocked

https://www.fada.in/ returns **HTTP 406** to our requests. Bot protection.
Their monthly retail releases are the cleanest tabulated retail data in the
market, but they are not fetchable from a server without an arrangement.

### SIAM — accessible

https://www.siam.in/statistics.aspx returns **200, ~90KB HTML**. Currently
the only structured industry source we can actually reach. Note SIAM
publishes DISPATCHES (factory → dealer), not retail registrations — the two
differ by thousands of units monthly and conflating them is the single most
common error in this data.

### Where that leaves it

No deterministic source is validated well enough to build against yet. The
honest order of work:

1. Inspect the SIAM statistics page structure and decide if it is stably
   parseable, or if it is JS-rendered/session-bound.
2. OEM press-release pages (Tata, Mahindra, Ather, Ola, TVS, Bajaj) — each
   publishes its own monthly numbers, unambiguous provenance, and no bot
   protection encountered so far. Most promising, needs per-OEM parsers.
3. EVreporter / Autopunditz — already tabulate VAHAN monthly. Aggregators,
   so attribution matters, but reachable.

### Why the LLM path was NOT ripped out yet

Deleting working code before its replacement is validated would leave live
sourcing with nothing at all. The Gemini path fails closed (returns null,
invents nothing, logs the real reason) and costs nothing when unused, so it
stays as the fallback until a parser proves itself. Once a source-specific
parser handles a question, it should take precedence — deterministic first,
model only as backstop.
