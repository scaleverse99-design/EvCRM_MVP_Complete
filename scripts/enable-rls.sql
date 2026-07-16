-- ══════════════════════════════════════════════════════════════════
--  Fix for Supabase security advisory: "rls_disabled_in_public"
--  + fixes a discovered bug: stock_requests table was missing entirely
--  Run once in: Supabase Dashboard → SQL Editor → New query → Run
--  Project: evcrm-prod (uauptqhnyiqgmmeyymbx)
--
--  Part 1 creates any table that's missing (safe — "if not exists").
--  Discovered 2026-07-15: stock_requests didn't exist in production at
--  all, so every read/write silently fell back to a local JSON file on
--  the Cloud Run instance (lib/store.js's error-fallback behavior) —
--  meaning OEM stock-request data was NOT persisting. This creates it.
--
--  Part 2 enables RLS on every table with NO permissive policies — this
--  blocks the anon/authenticated roles (i.e. anyone using only the
--  public NEXT_PUBLIC_SUPABASE_ANON_KEY) from touching any row.
--  Safe for this app: every API route uses the service_role key
--  (lib/supabaseAdmin.js), and service_role ALWAYS bypasses RLS
--  regardless of policies — so nothing about app behavior changes.
-- ══════════════════════════════════════════════════════════════════

-- ── Part 1: ensure every table from scripts/supabase-schema.sql exists ──
create table if not exists stock_requests (id text primary key, data jsonb not null, created_at timestamptz default now());
create index if not exists idx_stock_requests_dealership on stock_requests ((data->>'dealership'));

-- ── Part 2: enable RLS everywhere, no policies (deny anon/authenticated) ──
alter table users            enable row level security;
alter table sessions         enable row level security;
alter table otps             enable row level security;
alter table auth_logs        enable row level security;
alter table dealers          enable row level security;
alter table reps             enable row level security;
alter table inventory        enable row level security;
alter table leads            enable row level security;
alter table customers        enable row level security;
alter table tasks            enable row level security;
alter table bookings         enable row level security;
alter table feed             enable row level security;
alter table service_centers  enable row level security;
alter table quotes           enable row level security;
alter table service_requests enable row level security;
alter table service_settings enable row level security;
alter table attendance       enable row level security;
alter table stock_requests   enable row level security;

-- Verify: every row here should show rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
