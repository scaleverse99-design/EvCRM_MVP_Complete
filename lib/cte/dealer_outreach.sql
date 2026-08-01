-- Run once in the Supabase SQL editor (prod project) before the nearby-dealer
-- sourcing path (lib/cte/places.js) can store anything.
--
-- What this is for: when someone asks an AI "used car dealers near me" and we
-- have no partner dealer in that city, we source real nearby dealerships from
-- Google Places, show them to the user CLEARLY LABELLED as non-partners, and
-- keep them here as a sales list. The demand signal and the outreach target
-- arrive together — we learn which city has buyers asking at the same moment
-- we learn who to call there.
--
-- These are REAL third-party businesses that never agreed to be listed. Two
-- rules follow from that:
--   1. Never present them as EvCRM partners. `is_partner` defaults false and
--      the MCP response labels them explicitly.
--   2. This is business contact data sourced under Google's terms. Don't
--      redistribute it as a dataset; it exists to drive our own outreach.
create table if not exists dealer_outreach (
  place_id text primary key,              -- Google Places id, the natural key
  name text not null,
  formatted_address text,
  city text,
  phone text,
  website text,
  maps_url text,
  rating numeric,
  rating_count int,
  business_type text,                     -- what we searched for: used_car / ev / general
  source_query text not null,             -- normalized "city|type" that found it
  times_surfaced int not null default 1,  -- how often real user demand hit it
  is_partner boolean not null default false,
  outreach_status text not null default 'NEW',  -- NEW | CONTACTED | INTERESTED | ONBOARDED | REJECTED
  outreach_notes text,
  first_sourced_at timestamptz not null default now(),
  last_sourced_at timestamptz not null default now()
);

-- "Which cities have we already fetched, and how recently?" — drives the
-- per-city cache TTL so we don't pay Places for the same city repeatedly.
create index if not exists dealer_outreach_source_query_idx
  on dealer_outreach (source_query, last_sourced_at desc);

-- Working the sales list: hottest demand first, already-onboarded excluded.
create index if not exists dealer_outreach_status_idx
  on dealer_outreach (outreach_status, times_surfaced desc);

-- Service-role only. This is a private sales list plus third-party business
-- contact data; the public anon key must never be able to read it.
alter table dealer_outreach enable row level security;
