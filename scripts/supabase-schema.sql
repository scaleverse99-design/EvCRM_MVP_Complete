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

-- RLS: disabled — all access goes through the server-side service-role
-- client (lib/supabaseAdmin.js), never directly from the browser. If you
-- later add direct client-side Supabase queries, enable RLS + policies
-- per table before doing so.
alter table users        disable row level security;
alter table sessions     disable row level security;
alter table otps         disable row level security;
alter table auth_logs    disable row level security;
alter table dealers      disable row level security;
alter table reps         disable row level security;
alter table inventory    disable row level security;
alter table leads        disable row level security;
alter table customers    disable row level security;
alter table tasks        disable row level security;
alter table bookings     disable row level security;
alter table feed         disable row level security;
alter table service_centers disable row level security;
