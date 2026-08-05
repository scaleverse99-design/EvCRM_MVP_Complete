-- ───────────────────────────────────────────────────────────────────
-- Query signal capture — tracks user intent from MCP server calls
-- ───────────────────────────────────────────────────────────────────
--
-- Run this in Supabase SQL editor (prod):
--   1. Copy the entire contents of this file
--   2. Paste into the Supabase SQL editor for evcrm.in project
--   3. Click "Run"
--
-- RLS is enabled to prevent anon key from reading accumulated queries —
-- user intent is aggregate data, not something to expose in a public API.

create table if not exists query_signals (
  signature        text primary key,
  tool_name        text not null,
  sample_args      text,
  hit_count        int not null default 1,
  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now(),
  published_article_slug text,
  published_at     timestamptz
);

create index if not exists query_signals_hit_count_idx
  on query_signals (hit_count desc);

create index if not exists query_signals_published_at_idx
  on query_signals (published_at desc)
  where published_at is not null;

alter table query_signals enable row level security;

-- Increment hit count and update last_seen without touching first_seen
create or replace function bump_query_signal(sig text, tool text, args text)
returns void
language plpgsql
as $$
begin
  insert into query_signals (signature, tool_name, sample_args, hit_count, last_seen)
  values (sig, tool, args, 1, now())
  on conflict (signature)
  do update set hit_count = query_signals.hit_count + 1, last_seen = now();
end;
$$;
