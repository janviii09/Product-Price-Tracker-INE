-- INE Product Price Tracker — Database Schema
-- Run this in Supabase SQL Editor to set up the database.
-- All tables are deliberately simple and normalized.

-- 1. Products: catalog entries discovered from the mock store
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,              -- ID from the mock store (e.g., "888")
    slug TEXT,                             -- URL slug (e.g., "meridian-receiver-studio")
    name TEXT NOT NULL,
    product_url TEXT NOT NULL,             -- Full URL to scrape
    brand TEXT,
    category TEXT,
    sku TEXT,
    description TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tracked Products: which products the user is actively monitoring
CREATE TABLE IF NOT EXISTS tracked_products (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)                     -- Can't track the same product twice
);

-- 3. Price History: ONLY valid, successfully scraped data
-- A failed or invalid scrape NEVER writes here — that's the core discipline
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    original_price NUMERIC,                -- MRP if available
    currency TEXT DEFAULT 'INR',
    stock TEXT NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scrape Log: honest logging of EVERY attempt (success, retry, or failure)
-- This is what makes debugging possible — you see the full picture
CREATE TABLE IF NOT EXISTS scrape_log (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'retried', 'failed')),
    attempt_number INTEGER NOT NULL,
    http_status INTEGER,
    error_message TEXT,
    duration_ms INTEGER
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_price_history_product_time
    ON price_history(product_id, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_log_product_time
    ON scrape_log(product_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracked_products_active
    ON tracked_products(active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_external_id
    ON products(external_id);
