-- ══════════════════════════════════════════════════════════════════
--  Ev.CRM — Supabase schema
--  Run once in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Every table follows the same shape: id (text primary key) + data
--  (jsonb blob holding the full record). This mirrors the local JSON
--  files the app used before, so no other code changes are needed —
--  it also means adding a new field to any record later (e.g. a
--  dealer's oemId/oemAccessLevel once the OEM dashboard is built)
--  needs zero schema migrations, just start writing that key.
-- ══════════════════════════════════════════════════════════════════

create table if not exists users        (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists sessions     (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists otps         (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists auth_logs    (id text primary key, data jsonb not null, created_at timestamptz default now());

create table if not exists dealers      (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists reps         (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists inventory    (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists leads        (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists customers    (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists tasks        (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists bookings     (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists feed         (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists service_centers (id text primary key, data jsonb not null, created_at timestamptz default now());

-- Indexes for the lookups the app actually does (dealership scoping, email lookup)
create index if not exists idx_users_email        on users        ((data->>'email'));
create index if not exists idx_sessions_token_hash on sessions    ((data->>'token_hash'));
create index if not exists idx_leads_dealership     on leads        ((data->>'dealership'));
create index if not exists idx_customers_dealership on customers    ((data->>'dealership'));
create index if not exists idx_tasks_dealership     on tasks        ((data->>'dealership'));
create index if not exists idx_bookings_dealership  on bookings     ((data->>'dealership'));
create index if not exists idx_inventory_dealership on inventory    ((data->>'dealership'));
create index if not exists idx_feed_dealership      on feed         ((data->>'dealership'));
create index if not exists idx_reps_dealership      on reps         ((data->>'dealership'));

-- RLS: enabled, no policies — every table blocks the anon/authenticated
-- roles entirely (the public NEXT_PUBLIC_SUPABASE_ANON_KEY can't read/
-- write/delete anything). All real access goes through the server-side
-- service-role client (lib/supabaseAdmin.js), which ALWAYS bypasses RLS
-- regardless of policies — so this costs nothing functionally.
-- (Previously left disabled "since nothing touches these tables client-side" —
-- flagged 2026-07-12 by Supabase's own security advisor as rls_disabled_in_public,
-- since a leaked anon key would otherwise have full read/write/delete on every
-- row. Fixed 2026-07-15 — see scripts/enable-rls.sql for the exact migration run.)
alter table users        enable row level security;
alter table sessions     enable row level security;
alter table otps         enable row level security;
alter table auth_logs    enable row level security;
alter table dealers      enable row level security;
alter table reps         enable row level security;
alter table inventory    enable row level security;
alter table leads        enable row level security;
alter table customers    enable row level security;
alter table tasks        enable row level security;
alter table bookings     enable row level security;
alter table feed         enable row level security;
alter table service_centers enable row level security;

-- ── Added 2026-07-11: tables for QuotePro quotes + customer service module ──
create table if not exists quotes           (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists service_requests (id text primary key, data jsonb not null, created_at timestamptz default now());
create table if not exists service_settings (id text primary key, data jsonb not null, created_at timestamptz default now());
alter table quotes           enable row level security;
alter table service_requests enable row level security;
alter table service_settings enable row level security;

-- Rep geo-tagged attendance (added Jul 2026, replaces the old Firestore path)
create table if not exists attendance (id text primary key, data jsonb not null, created_at timestamptz default now());
create index if not exists idx_attendance_dealership on attendance ((data->>'dealership'));
alter table attendance enable row level security;

-- OEM restock requests from dealers (added Jul 2026)
create table if not exists stock_requests (id text primary key, data jsonb not null, created_at timestamptz default now());
create index if not exists idx_stock_requests_dealership on stock_requests ((data->>'dealership'));
alter table stock_requests enable row level security;

-- OEM bulk dealer imports — preview/confirm state + audit trail (added 2026-07-16).
-- IMPORTANT: run this in the production Supabase SQL Editor — without it, store.js
-- silently falls back to the Cloud Run instance's ephemeral disk and the Confirm
-- step can fail with "Import not found" when it lands on a different instance.
create table if not exists bulk_imports (id text primary key, data jsonb not null, created_at timestamptz default now());
alter table bulk_imports enable row level security;

-- OEM prospect/call lists imported from contact exports (added 2026-07-17).
-- Run in the production Supabase SQL Editor (same §8.0 lesson as bulk_imports).
create table if not exists prospects (id text primary key, data jsonb not null, created_at timestamptz default now());
alter table prospects enable row level security;

-- Used-car dealer Procurement pipeline — sellers offering a vehicle to the
-- dealer, tracked NEW -> INSPECTION_SCHEDULED -> INSPECTED -> OFFER_MADE ->
-- NEGOTIATING -> PURCHASED|REJECTED (added 2026-07-19). Run in the
-- production Supabase SQL Editor (same §8.0 lesson as bulk_imports/prospects
-- — without this, store.js silently falls back to the Cloud Run instance's
-- ephemeral disk and every procurement lead is lost on restart).
create table if not exists procurement (id text primary key, data jsonb not null, created_at timestamptz default now());
create index if not exists idx_procurement_dealership on procurement ((data->>'dealership'));
alter table procurement enable row level security;
