-- ==============================================================================
-- Ev.CRM Supabase Schema Setup
-- Run this script in the Supabase SQL Editor to create the required tables
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.evcrm_users (
    id UUID DEFAULT auth.uid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dealer', 'rep', 'admin')),
    name TEXT NOT NULL,
    phone TEXT,
    dealership TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Since we use Service Role Key for backend logic, we can just leave it as is or secure it)
ALTER TABLE public.evcrm_users ENABLE ROW LEVEL SECURITY;

-- 2. Sessions Table (for JWT tracking and revocation)
CREATE TABLE IF NOT EXISTS public.evcrm_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.evcrm_users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.evcrm_sessions ENABLE ROW LEVEL SECURITY;

-- 3. OTP Table (for password resets, email verifications)
CREATE TABLE IF NOT EXISTS public.evcrm_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT DEFAULT 'password_reset',
    used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.evcrm_otps ENABLE ROW LEVEL SECURITY;

-- 4. Login Attempts Table (for rate limiting and security)
CREATE TABLE IF NOT EXISTS public.evcrm_login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.evcrm_login_attempts ENABLE ROW LEVEL SECURITY;

-- Set up index for faster rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
ON public.evcrm_login_attempts(email, created_at);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time 
ON public.evcrm_login_attempts(ip_address, created_at);
