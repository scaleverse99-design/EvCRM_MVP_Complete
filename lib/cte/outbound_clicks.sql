-- Run once in the Supabase SQL editor (prod project) before the tracked
-- outbound redirect (app/go/route.js) can record anything.
--
-- Why this table is the whole point of the redirect strategy:
--
-- Until real dealers onboard, a buyer who lands on evcrm.in and wants to
-- purchase gets sent to CarWale/BikeWale/an OEM site. That looks like giving
-- traffic away, and it would be — except that every one of those clicks is
-- recorded here. THAT is the asset. It turns the dealer pitch from a promise
-- into a receipt:
--
--   "Last month 47 people in Vijayawada clicked through from our site
--    looking for a Nexon EV. They all went to CarWale. Onboard and they
--    come to you instead."
--
-- Without this table the redirect is pure donation. With it, the redirect IS
-- the sales pipeline.
--
-- Privacy: deliberately NO ip address, no user id, no full user-agent, no
-- session identifier. What a dealer needs is "how many people, which model,
-- which city" — aggregate demand. Storing anything that identifies a person
-- would add legal exposure and answer no question we actually have.
create table if not exists outbound_clicks (
  id bigserial primary key,
  destination_host text not null,   -- e.g. www.carwale.com — where the buyer went
  model text,                        -- what they were looking at
  brand text,
  city text,                         -- where the demand is, for the dealer pitch
  page_path text,                    -- which page on our site sent them
  clicked_at timestamptz not null default now()
);

-- The dealer pitch query is "count by city+model over the last N days".
create index if not exists outbound_clicks_pitch_idx
  on outbound_clicks (city, model, clicked_at desc);

create index if not exists outbound_clicks_time_idx
  on outbound_clicks (clicked_at desc);

-- Service-role only. This is commercial intelligence about where our demand
-- is going; the public anon key must not be able to read it.
alter table outbound_clicks enable row level security;
