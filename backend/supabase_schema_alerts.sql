-- ==============================================================================
-- Schema Migration: Alert Rules & In-App Notifications
-- Run this in your Supabase SQL Editor for production deployment
-- ==============================================================================

-- 1. Alert Rules Table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT, -- Supabase Auth user ID or guest identifier
    user_email TEXT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    target_price NUMERIC,
    on_price_drop BOOLEAN DEFAULT true,
    on_back_in_stock BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_product_alert UNIQUE (user_email, product_id)
);

-- Index for speedy lookups when scrapes finish
CREATE INDEX IF NOT EXISTS idx_alert_rules_product ON public.alert_rules(product_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON public.alert_rules(user_email);

-- 2. Notifications Table (In-app notification feed)
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'PRICE_DROP' | 'BACK_IN_STOCK'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying unread user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_email, is_read, created_at DESC);

-- Enable Row Level Security (optional but recommended for production)
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on alert_rules" ON public.alert_rules
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on notifications" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);
