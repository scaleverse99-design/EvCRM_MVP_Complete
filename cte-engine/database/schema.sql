-- Create crawler_targets table (stores scraper configurations dynamically)
CREATE TABLE IF NOT EXISTS public.crawler_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  url TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  selectors_json JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  current_price NUMERIC,
  currency TEXT DEFAULT 'INR',
  price_history JSONB DEFAULT '[]'::jsonb,
  specs JSONB,
  overall_score INT,
  quality_score INT,
  value_score INT,
  satisfaction_score INT,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, url)
);

-- Create cte_search_queries table
CREATE TABLE IF NOT EXISTS public.cte_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  category TEXT,
  volume INT DEFAULT 1,
  intent TEXT,
  tracked_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriber emails table
CREATE TABLE IF NOT EXISTS public.subscriber_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Create crawler log table
CREATE TABLE IF NOT EXISTS public.crawler_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL,
  category TEXT,
  products_found INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create articles table (SEO Blog Posts auto-generated from scraped insights)
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  category TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create news_updates table (Alerts for new launches & price drops)
CREATE TABLE IF NOT EXISTS public.news_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  category TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_score ON public.products(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(current_price);
CREATE INDEX IF NOT EXISTS idx_search_category ON public.cte_search_queries(category);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_date ON public.news_updates(date DESC);

-- Seed initial crawler targets (covering Automobile OEMs and loan/insurance sites)
INSERT INTO public.crawler_targets (name, url, category, selectors_json) VALUES
('nk-ebikes', 'nk-ebikes.com', 'ev_two_wheeler', '{
  "products": ".product-card, [data-product-card]",
  "name": ".product-name, [data-product-name], h2",
  "price": ".product-price, [data-price], .price-tag",
  "specs": ".product-specs, [data-specs]"
}'),
('ather', 'ather.com', 'ev_two_wheeler', '{
  "products": ".scooter-model, [data-model]",
  "name": ".model-name, h2",
  "price": ".price-tag, [data-price]",
  "specs": ".range-km, .charge-time, .features, [data-specs]"
}'),
('ola-electric', 'olaelectric.com', 'ev_two_wheeler', '{
  "products": ".scooter-model, [data-model]",
  "name": ".model-name, h2",
  "price": ".price-tag, [data-price]",
  "specs": ".range-km, .charge-time, .features, [data-specs]"
}'),
('cars24', 'cars24.com', 'used_car', '{
  "products": ".car-listing, [data-car-listing]",
  "name": ".car-name, h2",
  "price": ".car-price, [data-price]",
  "specs": ".mileage, .car-age, .condition, [data-specs]"
}'),
('spinny', 'spinny.com', 'used_car', '{
  "products": ".car-listing, [data-car-listing]",
  "name": ".car-name, h2",
  "price": ".car-price, [data-price]",
  "specs": ".mileage, .car-age, .condition, [data-specs]"
}'),
('policybazaar-auto', 'policybazaar.com/car-insurance', 'auto_insurance', '{
  "products": ".insurance-plan, [data-plan]",
  "name": ".plan-name, h2",
  "price": ".premium-price, [data-premium]",
  "specs": ".coverage-type, .claim-settlement, [data-specs]"
}'),
('acko-insurance', 'acko.com/car-insurance', 'auto_insurance', '{
  "products": ".insurance-plan, [data-plan]",
  "name": ".plan-name, h2",
  "price": ".premium-price, [data-premium]",
  "specs": ".coverage-type, .claim-settlement, [data-specs]"
}'),
('bankbazaar-auto-loan', 'bankbazaar.com/auto-loan', 'auto_loan', '{
  "products": ".loan-offer, [data-offer]",
  "name": ".bank-name, h2",
  "price": ".interest-rate, [data-rate]",
  "specs": ".emi-calculator, [data-specs]"
}')
ON CONFLICT (name) DO NOTHING;
