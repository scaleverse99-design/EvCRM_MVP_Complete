-- ═══════════════════════════════════════════════════════════════════
-- Paste this whole file into the Supabase SQL editor (prod) and run it.
--
-- Checked against prod directly (real SELECTs, not a head-count) 2026-08-04:
--   exists already : research_cache, outbound_clicks, dealer_outreach,
--                     query_signals
--   MISSING        : active_visitors, ai_search_bot_hits,
--                     search_console_queries, heartbeat_presence()
--
-- Safe to re-run in full regardless — every statement is create-if-not-exists
-- or create-or-replace, so running it again changes nothing for the parts
-- already in place.
--
-- Until the missing pieces run: live sourcing returns nothing rather than
-- guessing, /go redirects correctly but records no clicks, the live-visitor
-- badge renders nothing rather than a fabricated number, and the AI-search
-- bot logging in middleware.js silently no-ops. Nothing breaks; those
-- features just don't do their job yet.
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. research_cache ──────────────────────────────────────────────
-- Lets CTE answer questions the catalog can't (sales volumes,
-- registrations) by sourcing live — and remember the answer so the 3,000th
-- person asking costs nothing. Its own table, never `products`: writing
-- sourced answers into the vehicle catalog is what produced rows like
-- "How many ev vehicles sold in Last 5years" with current_price 2026.
create table if not exists research_cache (
  signature text primary key,
  original_query text not null,
  facts jsonb not null,
  sources jsonb,
  hit_count int not null default 1,
  sourced_at timestamptz not null default now(),
  last_served_at timestamptz not null default now()
);

create index if not exists research_cache_sourced_at_idx
  on research_cache (sourced_at desc);

alter table research_cache enable row level security;

-- Bumps the hit counter WITHOUT touching sourced_at, so a popular question
-- still expires on schedule. (If serving refreshed the timestamp, the
-- answers people rely on most would be the most stale — the bug fixed in
-- commit 41e26af for dealer_outreach.)
create or replace function bump_research_hit(sig text)
returns void
language sql
as $$
  update research_cache
     set hit_count = hit_count + 1,
         last_served_at = now()
   where signature = sig;
$$;


-- ── 2. outbound_clicks ─────────────────────────────────────────────
-- Records every buyer sent to CarWale/BikeWale/an OEM while we have no
-- dealer for them. That log IS the dealer pitch: "47 people in Vijayawada
-- came to us for a Nexon EV last month and went to CarWale — list with us
-- and they come to you." Without it the redirect is pure donation.
--
-- No IP, no user id, no user-agent: a dealer needs aggregate demand, and
-- storing anything identifying adds exposure while answering nothing.
create table if not exists outbound_clicks (
  id bigserial primary key,
  destination_host text not null,
  model text,
  brand text,
  city text,
  page_path text,
  clicked_at timestamptz not null default now()
);

create index if not exists outbound_clicks_pitch_idx
  on outbound_clicks (city, model, clicked_at desc);

create index if not exists outbound_clicks_time_idx
  on outbound_clicks (clicked_at desc);

alter table outbound_clicks enable row level security;


-- ── 3. Fix bump_dealer_surfaced ────────────────────────────────────
-- dealer_outreach already exists, but its function still updates
-- last_sourced_at — which is what the 14-day Places cache TTL is measured
-- against. Every cache hit pushes the expiry forward, so a city everyone
-- asks about never refreshes while a city nobody asks about refreshes on
-- schedule. Replacing it with the counter-only version.
create or replace function bump_dealer_surfaced(ids text[])
returns void
language sql
as $$
  update dealer_outreach
     set times_surfaced = times_surfaced + 1
   where place_id = any(ids);
$$;


-- ── 4. active_visitors ────────────────────────────────────────────
-- Backs the real live-visitor badge, replacing two fabricated versions
-- (Math.random(), then 850 + city-name-length*45) shown on 1,344 pages.
-- No IP, no user id, no cookie — a random per-tab id in sessionStorage.
create table if not exists active_visitors (
  session_id text primary key,
  path       text,
  city       text,
  last_seen  timestamptz not null default now()
);

create index if not exists active_visitors_last_seen_idx on active_visitors (last_seen desc);
alter table active_visitors enable row level security;

-- Upsert + stale-sweep + count in ONE round trip — this becomes the most
-- frequently executed statement in the system at any real traffic, so three
-- separate queries per heartbeat was not acceptable.
create or replace function heartbeat_presence(
  p_session text, p_path text, p_city text, p_window int default 90
) returns int language plpgsql as $$
declare n int;
begin
  insert into active_visitors (session_id, path, city, last_seen)
  values (p_session, p_path, p_city, now())
  on conflict (session_id)
  do update set last_seen = now(), path = excluded.path, city = excluded.city;

  delete from active_visitors where last_seen < now() - interval '5 minutes';

  select count(*) into n from active_visitors
  where last_seen > now() - (p_window || ' seconds')::interval;
  return n;
end; $$;


-- ── 5. Intent-capture layers (see lib/cte/aiCrawlers.js and
--      scripts/fetch-search-console-queries.js) ────────────────────
--
-- Three of "what shows AI/search demand touched us", none of which is "what
-- the user asked an AI" (query_signals, from real MCP tool calls, already
-- covers that and needed no new table):
--
--   ai_search_bot_hits    — an AI's search feature (not training crawler)
--                           fetched one of our pages, right now. Not the
--                           query, just proof AI search found this page.
--   search_console_queries — real Google queries that already surface us,
--                           pulled by scripts/fetch-search-console-queries.js.
--                           Whole-market, real, zero install — but only for
--                           pages we already rank on.

create table if not exists ai_search_bot_hits (
  signature   text primary key,   -- bot_name + '|' + path
  bot_name    text not null,
  path        text not null,
  hit_count   int not null default 1,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists ai_search_bot_hits_bot_idx on ai_search_bot_hits (bot_name, hit_count desc);
alter table ai_search_bot_hits enable row level security;

create or replace function bump_bot_hit(p_bot text, p_path text)
returns void
language plpgsql
as $$
begin
  insert into ai_search_bot_hits (signature, bot_name, path, hit_count, last_seen)
  values (p_bot || '|' || p_path, p_bot, p_path, 1, now())
  on conflict (signature)
  do update set hit_count = ai_search_bot_hits.hit_count + 1, last_seen = now();
end;
$$;

create table if not exists search_console_queries (
  query        text primary key,
  clicks       int not null default 0,
  impressions  int not null default 0,
  page_count   int not null default 0,
  window_days  int not null default 28,
  fetched_at   timestamptz not null default now()
);

create index if not exists search_console_queries_impr_idx on search_console_queries (impressions desc);
alter table search_console_queries enable row level security;


-- ── 6. Dealer GSTIN Verification Follow-ups ────────────────────────
-- Tracks dealers who need to verify GSTIN and follow-up attempts
-- Used to send periodic verification requests (e.g., day 7, day 14, day 30)
create table if not exists gstin_verification_followups (
  id bigserial primary key,
  dealer_id text not null,
  dealer_email text not null,
  gstin_provided text,
  gstin_verified boolean default false,
  followup_count int default 0,
  first_followup_sent_at timestamptz,
  last_followup_sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint unique_dealer_verification unique(dealer_id)
);

create index if not exists gstin_followup_dealer_idx on gstin_verification_followups (dealer_id);
create index if not exists gstin_followup_verified_idx on gstin_verification_followups (gstin_verified);
create index if not exists gstin_followup_last_sent_idx on gstin_verification_followups (last_followup_sent_at desc);

alter table gstin_verification_followups enable row level security;


-- ── 7. Dealer offers + re-engagement history ───────────────────────
-- See lib/orchestrator/offerEngine.js — when a dealer announces an offer,
-- every matching rejected/unanswered quote (within windowDays) gets
-- re-priced and the dealer + customer both get notified. This table is
-- just the offer's own record for the dealer's history/reference; the
-- actual re-engagement results live on the affected quote rows
-- (priceHistory, reEngagedAt fields in the quotes table).
create table if not exists dealer_offers (
  id text primary key,
  dealership text not null,
  title text not null,
  discount_amount int not null,
  applicable_vehicle text,
  window_days int not null default 60,
  created_by text,
  created_at timestamptz not null default now(),
  matched_count int default 0,
  updated_count int default 0,
  emails_sent int default 0
);

create index if not exists dealer_offers_dealership_idx on dealer_offers (dealership, created_at desc);

alter table dealer_offers enable row level security;


-- ── 8. cte_facts — THE CTE LIBRARY ─────────────────────────────────
-- See lib/cte/factLibrary.js and lib/cte/sources/*.js.
--
-- This is the table CTE was always supposed to have: crawlers fetch real
-- data from official sources ahead of time, it gets normalised and
-- deduplicated into here, and the MCP server answers from it — a
-- deterministic lookup at zero marginal cost, no model in the path.
--
-- `signature` (metric|geography|period|scope, normalised) is what makes
-- deduplication work: two sources reporting the same fact land on the
-- same row and corroborate it rather than creating a duplicate.
--
-- Conflicts are RECORDED, never silently resolved. Indian vehicle data
-- constantly conflates fiscal vs calendar year, dispatches vs
-- registrations, and nameplate vs powertrain — when two sources disagree,
-- surfacing both values is the correct answer; averaging them is how this
-- data goes wrong.
create table if not exists cte_facts (
  signature          text primary key,
  metric             text not null,
  value              numeric not null,
  unit               text,
  period             text,
  geography          text,
  scope              text,
  sources            jsonb not null default '[]'::jsonb,
  source_count       int not null default 1,
  has_conflict       boolean not null default false,
  conflicting_values jsonb not null default '[]'::jsonb,
  fetched_at         timestamptz not null default now()
);

create index if not exists cte_facts_metric_idx on cte_facts (metric, value desc);
create index if not exists cte_facts_geography_idx on cte_facts (geography);
create index if not exists cte_facts_conflict_idx on cte_facts (has_conflict) where has_conflict = true;

alter table cte_facts enable row level security;
