-- Run once in the Supabase SQL editor (prod) before the live visitor badge
-- can show a real number.
--
-- Replaces a badge that displayed `85 + Math.floor(Math.random() * 65)` as
-- "N people actively viewing in <city> right now", ticking every 4 seconds,
-- on 1,344 /price/ pages and every /blog/ page. That is fabricated social
-- proof shown to buyers — the same class of thing as India's CCPA
-- Guidelines for Prevention and Regulation of Dark Patterns (2023) call
-- "false urgency".
--
-- Design notes:
--   * session_id is a random client-generated id in sessionStorage. NOT a
--     user id, NOT an IP, NOT a cookie that survives the tab. It exists only
--     to avoid counting one person twice, and it is deleted minutes later.
--   * No page history is kept. This table is a live window, not analytics.
--   * Rows are disposable — losing all of them costs nothing but a
--     momentarily low count.
create table if not exists active_visitors (
  session_id text primary key,
  path       text,
  city       text,
  last_seen  timestamptz not null default now()
);

-- The only read pattern: count rows seen in the last N seconds.
create index if not exists active_visitors_last_seen_idx on active_visitors (last_seen desc);

-- Service-role only. Written via getSupabaseAdmin() from the API route; the
-- public anon key has no reason to read or write it directly.
alter table active_visitors enable row level security;

-- Heartbeat + count in ONE round trip.
--
-- The naive version (upsert, then select count, then delete stale) is three
-- queries per heartbeat per visitor. At any real traffic that is the most
-- frequently executed statement in the system, so it is worth doing
-- properly: this upserts, sweeps rows older than 5 minutes, and returns the
-- current count in a single call.
create or replace function heartbeat_presence(
  p_session text,
  p_path    text,
  p_city    text,
  p_window  int default 90
)
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into active_visitors (session_id, path, city, last_seen)
  values (p_session, p_path, p_city, now())
  on conflict (session_id)
  do update set last_seen = now(), path = excluded.path, city = excluded.city;

  -- Opportunistic cleanup. Avoids needing a cron job for a table whose rows
  -- are worthless after a few minutes.
  delete from active_visitors where last_seen < now() - interval '5 minutes';

  select count(*) into n
  from active_visitors
  where last_seen > now() - (p_window || ' seconds')::interval;

  return n;
end;
$$;
