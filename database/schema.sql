-- ══════════════════════════════════════════════════════════════════
--  Ev.CRM — Database Schema
--  Run this SQL in Supabase → SQL Editor → New query → Run
--  Or in any Postgres database
-- ══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. USERS TABLE ───────────────────────────────────────────────
-- Stores dealer and sales rep accounts
CREATE TABLE IF NOT EXISTS evcrm_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                -- bcrypt hash, never plain text
  role          TEXT NOT NULL DEFAULT 'rep'   -- 'dealer' | 'rep'
                CHECK (role IN ('dealer', 'rep')),
  name          TEXT NOT NULL,
  phone         TEXT,
  dealership    TEXT,                          -- e.g. "Sharma EV Motors"
  city          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups on every login
CREATE INDEX IF NOT EXISTS idx_users_email ON evcrm_users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON evcrm_users(role);

-- ── 2. OTP TABLE ─────────────────────────────────────────────────
-- Stores OTPs for password reset (not login — login uses password)
CREATE TABLE IF NOT EXISTS evcrm_otps (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  otp_hash   TEXT NOT NULL,     -- bcrypt hash of the 6-digit OTP
  purpose    TEXT NOT NULL DEFAULT 'password_reset'
             CHECK (purpose IN ('password_reset', 'email_verify')),
  attempts   INT NOT NULL DEFAULT 0,  -- fail counter, max 5
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,    -- 15 minutes from creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-clean expired OTPs (keeps table small)
CREATE INDEX IF NOT EXISTS idx_otps_email      ON evcrm_otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON evcrm_otps(expires_at);

-- ── 3. SESSIONS TABLE ────────────────────────────────────────────
-- Stores active JWT sessions — allows forced logout / revocation
CREATE TABLE IF NOT EXISTS evcrm_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES evcrm_users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,  -- SHA-256 hash of JWT (not the JWT itself)
  ip_address   TEXT,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON evcrm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON evcrm_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON evcrm_sessions(expires_at);

-- ── 4. LOGIN ATTEMPTS TABLE (rate limiting) ───────────────────────
-- Tracks failed logins to prevent brute force
CREATE TABLE IF NOT EXISTS evcrm_login_attempts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  ip_address TEXT,
  success    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_email      ON evcrm_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_attempts_ip         ON evcrm_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON evcrm_login_attempts(created_at);

-- ── 5. AUTO-UPDATE TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON evcrm_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. CLEANUP FUNCTION (run via cron or pg_cron) ────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS void AS $$
BEGIN
  DELETE FROM evcrm_otps     WHERE expires_at < NOW();
  DELETE FROM evcrm_sessions WHERE expires_at < NOW();
  DELETE FROM evcrm_login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ── 7. ROW LEVEL SECURITY (Supabase) ────────────────────────────
-- Only your API (service role key) can read/write these tables
-- Frontend cannot access them directly
ALTER TABLE evcrm_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evcrm_otps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE evcrm_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE evcrm_login_attempts  ENABLE ROW LEVEL SECURITY;

-- No public access — only service_role (your backend) can access
-- This means frontend JS cannot leak user data even if keys are exposed
CREATE POLICY "service_only_users"    ON evcrm_users    USING (false);
CREATE POLICY "service_only_otps"     ON evcrm_otps     USING (false);
CREATE POLICY "service_only_sessions" ON evcrm_sessions  USING (false);
CREATE POLICY "service_only_attempts" ON evcrm_login_attempts USING (false);

-- ── 8. SEED: Create first dealer account ─────────────────────────
-- Run this after schema creation to add your first dealer
-- Replace values with real data
-- Password below = 'evcrm@2026' bcrypt hashed
-- Generate fresh hash at: https://bcrypt-generator.com (12 rounds)

/*
INSERT INTO evcrm_users (email, password_hash, role, name, phone, dealership, city)
VALUES (
  'dealer@evcrm.in',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUxGSqUzHsUq3Q9jkx.Uy4Ia2',
  'dealer',
  'Balaji Lankalapalli',
  '9999900000',
  'Sharma EV Motors',
  'Hyderabad'
);
*/
