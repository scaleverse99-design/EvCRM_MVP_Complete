-- ── CTE Enterprise Cloud Integration — Supabase Schema ───────────────
-- Run this ONCE in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
--
-- Creates 3 tables for enterprise billing, usage tracking, and client management.
-- All tables use the same (id text, data jsonb) pattern as existing app tables.

-- ── 1. enterprise_clients ─────────────────────────────────────────────
-- One row per enterprise client (AWS/GCP/Azure/direct)
-- Stores hashed API key, tier, usage counts, and cloud platform metadata
CREATE TABLE IF NOT EXISTS enterprise_clients (
  id   text PRIMARY KEY,   -- clientId: client_TIMESTAMP_RANDOM
  data jsonb NOT NULL      -- Full client record as JSON blob
);

-- Index for fast API key lookup (keyHash lookup on every request)
CREATE INDEX IF NOT EXISTS idx_enterprise_clients_keyhash
  ON enterprise_clients USING gin ((data->'keyHash'));

-- Index for cloud platform filtering
CREATE INDEX IF NOT EXISTS idx_enterprise_clients_platform
  ON enterprise_clients USING gin ((data->'cloudPlatform'));

-- ── 2. enterprise_usage ───────────────────────────────────────────────
-- One row per API call — high-volume insert table
-- Used for per-call billing reconciliation and intent analytics
CREATE TABLE IF NOT EXISTS enterprise_usage (
  id   text PRIMARY KEY,   -- usage_TIMESTAMP_RANDOM
  data jsonb NOT NULL      -- { clientId, toolName, queryHash, estimatedTokensSaved, timestamp, metered }
);

-- Index for per-client usage queries (billing reconciliation)
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_client
  ON enterprise_usage USING gin ((data->'clientId'));

-- Index for timestamp range queries (monthly billing)
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_timestamp
  ON enterprise_usage ((data->>'timestamp'));

-- ── 3. enterprise_billing ─────────────────────────────────────────────
-- One row per metered billing batch sent to AWS/GCP/Azure
-- Used for monthly revenue reconciliation and payout tracking
CREATE TABLE IF NOT EXISTS enterprise_billing (
  id   text PRIMARY KEY,   -- batchId: UUID
  data jsonb NOT NULL      -- { clientId, cloudPlatform, quantity, cteEarningsUSD, cloudChargeUSD, timestamp, result }
);

-- Index for per-client billing history
CREATE INDEX IF NOT EXISTS idx_enterprise_billing_client
  ON enterprise_billing USING gin ((data->'clientId'));

-- Index for monthly revenue reports
CREATE INDEX IF NOT EXISTS idx_enterprise_billing_timestamp
  ON enterprise_billing ((data->>'timestamp'));

-- ── 4. Helper: increment_enterprise_call_count RPC ────────────────────
-- Atomic increment for monthly call counter (avoids race conditions on high traffic)
CREATE OR REPLACE FUNCTION increment_enterprise_call_count(p_client_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE enterprise_clients
  SET data = jsonb_set(
    jsonb_set(
      data,
      '{monthlyCallCount}',
      to_jsonb((COALESCE((data->>'monthlyCallCount')::int, 0) + 1))
    ),
    '{totalCallCount}',
    to_jsonb((COALESCE((data->>'totalCallCount')::int, 0) + 1))
  )
  WHERE id = p_client_id;
END;
$$;

-- ── 5. View: enterprise_revenue_summary ───────────────────────────────
-- Convenience view for the admin dashboard
CREATE OR REPLACE VIEW enterprise_revenue_summary AS
SELECT
  b.data->>'clientId'         AS client_id,
  c.data->>'clientName'       AS client_name,
  c.data->>'tier'             AS tier,
  c.data->>'cloudPlatform'    AS cloud_platform,
  c.data->>'status'           AS status,
  COUNT(b.id)                 AS billing_batches,
  SUM((b.data->>'quantity')::int) AS total_calls,
  SUM((b.data->>'cteEarningsUSD')::numeric) AS total_cte_earnings_usd,
  SUM((b.data->>'cloudChargeUSD')::numeric) AS total_cloud_charge_usd
FROM enterprise_billing b
JOIN enterprise_clients c ON c.id = b.data->>'clientId'
GROUP BY 1, 2, 3, 4, 5;

-- ── Sample: Insert a test enterprise client ───────────────────────────
-- Uncomment to create a test client for local development:
--
-- INSERT INTO enterprise_clients (id, data) VALUES (
--   'client_test_001',
--   '{
--     "clientId": "client_test_001",
--     "clientName": "Test Enterprise Client",
--     "clientEmail": "test@enterprise.com",
--     "tier": "growth",
--     "cloudPlatform": "direct",
--     "keyHash": "test_hash_do_not_use_in_production",
--     "status": "active",
--     "monthlyCallCount": 0,
--     "totalCallCount": 0,
--     "billingMonthStart": "2026-07-01T00:00:00.000Z",
--     "createdAt": "2026-07-01T00:00:00.000Z",
--     "metadata": {}
--   }'
-- ) ON CONFLICT (id) DO NOTHING;

-- Verify tables were created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('enterprise_clients', 'enterprise_usage', 'enterprise_billing');
