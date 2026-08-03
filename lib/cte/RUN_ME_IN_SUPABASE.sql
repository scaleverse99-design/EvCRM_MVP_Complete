-- ═══════════════════════════════════════════════════════════════════
-- Paste this whole file into the Supabase SQL editor (prod) and run it.
-- Verified against prod 2026-08-04: research_cache and outbound_clicks are
-- MISSING; dealer_outreach and query_signals already exist.
--
-- Safe to re-run — every statement is create-if-not-exists or
-- create-or-replace, so running it twice changes nothing.
--
-- Until this runs, the deployed code fails closed: live sourcing returns
-- nothing rather than guessing, and /go redirects correctly but records no
-- clicks. Nothing breaks; the features just don't do their job.
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
