-- Migration: Create tables for 5-year historical pricing and vehicle registration data
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  specs JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  source_url TEXT,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_name);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON public.price_history(recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.registration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL,
  model TEXT,
  category TEXT NOT NULL,
  registrations_count INT NOT NULL,
  month_year DATE NOT NULL,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_manufacturer ON public.registration_data(manufacturer);
CREATE INDEX IF NOT EXISTS idx_registration_month ON public.registration_data(month_year DESC);
