-- Run once in the Supabase SQL editor (prod project) before live sourcing
-- (lib/cte/sourceLive.js) can serve anything.
--
-- Purpose: CTE should never miss. A question the database cannot answer gets
-- sourced live, extracted into typed facts, and served — and remembered here
-- so the next person asking the same thing is served instantly and for free.
--
-- Why its own table, and never `products`: `products` is the vehicle catalog
-- that search_market reads. An earlier version of live sourcing wrote its
-- answers there keyed on the query text, so "How many ev vehicles sold in
-- Last 5years" became a row that looked like a vehicle for sale with
-- current_price 2026 (the year, matched by a price regex) and a Google News
-- link as its buy URL. Those rows were served to real buyers. An answer cache
-- and a product catalog are different things and must stay in different
-- tables.
--
-- Cost note: this table IS the economics. Live sourcing costs a grounded
-- Gemini call per miss; without the cache the 3,000th person asking a
-- question costs exactly as much as the first.
create table if not exists research_cache (
  signature text primary key,        -- normalised query, see buildResearchSignature()
  original_query text not null,      -- what was actually asked, for debugging
  facts jsonb not null,              -- [{label, value, unit, period, sourceUrl}]
  sources jsonb,                     -- [{title, url}] backing the facts
  hit_count int not null default 1,  -- how often this answer has been served
  sourced_at timestamptz not null default now(),  -- when it was fetched; TTL runs off this
  last_served_at timestamptz not null default now()
);

-- TTL sweeps and the daily-spend cap both filter on sourced_at.
create index if not exists research_cache_sourced_at_idx on research_cache (sourced_at desc);

-- Which tier produced this answer. Added 2026-08-07, and it is load-bearing,
-- not metadata: underDailyCap() in sourceLive.js counts rows written in the
-- last 24h as a proxy for Gemini calls (free tier = 20/day). liveCrawl.js now
-- caches into this same table, but it costs nothing and calls no model — so
-- without this column a burst of free data.gov.in answers would silently
-- exhaust the Gemini budget and stop tier 3 from ever running.
--
-- Default 'gemini' is the conservative direction: pre-existing rows predate
-- liveCrawl caching and were all Gemini-sourced, so counting them is correct.
alter table research_cache add column if not exists source text default 'gemini';

-- The cap query filters on this, so it must not be a sequential scan.
create index if not exists idx_research_cache_source_sourced_at
  on research_cache (source, sourced_at desc);

-- Service-role only. Answers here are unverified third-party-sourced content;
-- the public anon key has no business reading the whole set.
alter table research_cache enable row level security;

-- Serving a cached answer bumps hit_count WITHOUT touching sourced_at.
--
-- Deliberate, and the same bug that bit dealer_outreach (commit 41e26af):
-- if serving refreshed the timestamp, a popular question would never expire
-- while an unpopular one refreshed on schedule — so the answers people
-- actually rely on would be the most stale. sourced_at means "when we
-- fetched this", nothing else.
create or replace function bump_research_hit(sig text)
returns void
language sql
as $$
  update research_cache
     set hit_count = hit_count + 1,
         last_served_at = now()
   where signature = sig;
$$;
