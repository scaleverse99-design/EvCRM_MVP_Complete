-- Run this once in the Supabase SQL editor (prod project) before the
-- trending-query auto-publish feature (lib/orchestrator/queryTrigger.js)
-- can do anything — it upserts into this table on every search_market /
-- compare_vehicles MCP call.
create table if not exists query_signals (
  signature text primary key,
  tool_name text not null,
  sample_args jsonb,
  hit_count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  published_article_slug text,
  published_at timestamptz
);

create index if not exists query_signals_published_idx on query_signals (published_at) where published_at is not null;

-- Service-role only. recordQuerySignal() writes via getSupabaseAdmin(),
-- which bypasses RLS, so this is functionally a no-op for the app — but
-- without it the public anon key could read every query users have asked
-- through the MCP server, which is exactly the data this table exists to
-- accumulate. No policies are defined on purpose: nothing else should read it.
alter table query_signals enable row level security;
