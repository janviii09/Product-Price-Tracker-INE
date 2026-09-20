/**
 * supabase.js — Supabase client & database query helpers with local fallback
 * 
 * Provides all database operations:
 * - Product CRUD (find, create, list tracked)
 * - Price history (save validated price, fetch history for charts)
 * - Scrape log (log every attempt honestly)
 * 
 * If Supabase credentials are not configured, it automatically falls back
 * to localStore so the application is completely functional out of the box.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { localStore } from './localStore.js';

dotenv.config();

const clean = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');

const supabaseUrl = clean(process.env.SUPABASE_URL);
const supabaseKey = clean(
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('your_') &&
  supabaseKey &&
  !supabaseKey.includes('your_')
);

if (!isSupabaseConfigured) {
  console.log('[db] ℹ️  Running with local file storage fallback. (Configure SUPABASE_URL & SUPABASE_SERVICE_KEY in .env to use Supabase)');
} else {
  console.log(`[db] ✅ Supabase configured with URL: ${supabaseUrl}`);
}

let supabase = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!supabase) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.warn('[db] Failed to initialize Supabase client:', e.message);
      return null;
    }
  }
  return supabase;
}

// ─── Product Operations ───────────────────────────────────────────────

/**
 * Bulk upsert products into the database.
 */
export async function bulkUpsertProducts(productsArray) {
  const db = getSupabase();
  if (!db) {
    return localStore.bulkUpsertProducts(productsArray);
  }

  const records = productsArray.map(item => ({
    external_id: String(item.externalId || item.external_id || item.id),
    slug: item.slug || String(item.id),
    name: item.name,
    product_url: item.productUrl || item.product_url || `https://demo.inelabteamdev.com/product/${item.id}`,
    brand: item.brand,
    category: item.category,
    sku: item.sku,
    description: item.description,
  }));

  const { data, error } = await db
    .from('products')
    .upsert(records, { onConflict: 'external_id' })
    .select();

  if (error) throw new Error(`Failed to bulk upsert products: ${error.message}`);
  return { inserted: data?.length || 0, total: data?.length || 0 };
}

/**
 * Get catalog products with pagination, category filter, and search.
 */
export async function getCatalogProducts({ page = 1, pageSize = 20, category = '', query = '' } = {}) {
  const db = getSupabase();
  if (!db) {
    return localStore.getCatalogProducts({ page, pageSize, category, query });
  }

  let queryBuilder = db
    .from('products')
    .select('*', { count: 'exact' });

  if (category && category !== 'All') {
    queryBuilder = queryBuilder.ilike('category', category);
  }

  if (query && query.trim()) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%,sku.ilike.%${query}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await queryBuilder
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw new Error(`Failed to get catalog products: ${error.message}`);

  const total = count || 0;
  const pages = Math.ceil(total / pageSize) || 1;

  // Enrich with latest price & tracked status
  const enriched = await Promise.all(
    (data || []).map(async (item) => {
      const latestPrice = await getLatestPrice(item.id);
      return {
        ...item,
        latestPrice,
      };
    })
  );

  return {
    items: enriched,
    total,
    page,
    pageSize,
    pages,
  };
}

/**
 * Get product by external_id (store ID).
 */
export async function getProductByExternalId(externalId) {
  const db = getSupabase();
  if (!db) {
    return localStore.getProductByExternalId(externalId);
  }

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('external_id', String(externalId))
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get product by external ID: ${error.message}`);
  }
  return data || null;
}

/**
 * Find or create a product in the database.
 * Returns the product row.
 */
export async function findOrCreateProduct({ externalId, slug, name, productUrl, brand, category, sku, description }) {
  const db = getSupabase();
  if (!db) {
    return localStore.findOrCreateProduct({ externalId, slug, name, productUrl, brand, category, sku, description });
  }
  
  // Try to find existing
  const { data: existing } = await db
    .from('products')
    .select('*')
    .eq('external_id', String(externalId))
    .single();
  
  if (existing) return existing;
  
  // Create new
  const { data, error } = await db
    .from('products')
    .insert({
      external_id: String(externalId),
      slug,
      name,
      product_url: productUrl,
      brand,
      category,
      sku,
      description,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return data;
}

/**
 * Track a product (set active=true in tracked_products).
 */
export async function trackProduct(productId) {
  const db = getSupabase();
  if (!db) {
    return localStore.trackProduct(productId);
  }
  
  const { data, error } = await db
    .from('tracked_products')
    .upsert(
      { product_id: productId, active: true },
      { onConflict: 'product_id' }
    )
    .select()
    .single();
  
  if (error) throw new Error(`Failed to track product: ${error.message}`);
  return data;
}

/**
 * Untrack a product (set active=false).
 */
export async function untrackProduct(productId) {
  const db = getSupabase();
  if (!db) {
    return localStore.untrackProduct(productId);
  }
  
  const { data, error } = await db
    .from('tracked_products')
    .update({ active: false })
    .eq('product_id', productId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to untrack product: ${error.message}`);
  return data;
}

/**
 * Get all actively tracked products with their product details.
 */
export async function getTrackedProducts() {
  const db = getSupabase();
  if (!db) {
    return localStore.getTrackedProducts();
  }
  
  const { data, error } = await db
    .from('tracked_products')
    .select(`
      id,
      active,
      created_at,
      products (
        id,
        external_id,
        slug,
        name,
        product_url,
        brand,
        category,
        sku,
        first_seen_at
      )
    `)
    .eq('active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(`Failed to get tracked products: ${error.message}`);
  return data || [];
}

/**
 * Get all tracked products as flat list (for scraper).
 */
export async function getActiveProductsForScraping() {
  const db = getSupabase();
  if (!db) {
    return localStore.getActiveProductsForScraping();
  }
  
  const { data, error } = await db
    .from('tracked_products')
    .select(`
      product_id,
      products (
        id,
        external_id,
        slug,
        name,
        product_url
      )
    `)
    .eq('active', true);
  
  if (error) throw new Error(`Failed to get active products: ${error.message}`);
  
  return (data || []).map(tp => ({
    id: tp.products.id,
    external_id: tp.products.external_id,
    slug: tp.products.slug,
    name: tp.products.name,
    product_url: tp.products.product_url,
  }));
}

// ─── Price History Operations ─────────────────────────────────────────

/**
 * Save a validated price to price_history.
 * ONLY call this after validation passes — never with bad data.
 */
export async function savePriceHistory(productId, price, stock, currency = 'INR', originalPrice = null) {
  const db = getSupabase();
  if (!db) {
    return localStore.savePriceHistory(productId, price, stock, currency, originalPrice);
  }
  
  const { data, error } = await db
    .from('price_history')
    .insert({
      product_id: productId,
      price,
      original_price: originalPrice,
      currency,
      stock,
      scraped_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to save price history: ${error.message}`);
  return data;
}

/**
 * Get price history for a product (for the chart).
 */
export async function getPriceHistory(productId, limit = 100) {
  const db = getSupabase();
  if (!db) {
    return localStore.getPriceHistory(productId, limit);
  }
  
  const { data, error } = await db
    .from('price_history')
    .select('*')
    .eq('product_id', productId)
    .order('scraped_at', { ascending: true })
    .limit(limit);
  
  if (error) throw new Error(`Failed to get price history: ${error.message}`);
  return data || [];
}

/**
 * Get the latest price for a product.
 */
export async function getLatestPrice(productId) {
  const db = getSupabase();
  if (!db) {
    return localStore.getLatestPrice(productId);
  }
  
  const { data, error } = await db
    .from('price_history')
    .select('*')
    .eq('product_id', productId)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get latest price: ${error.message}`);
  }
  return data || null;
}

// ─── Scrape Log Operations ────────────────────────────────────────────

/**
 * Log a scrape attempt. EVERY attempt gets logged — success, retry, or failure.
 * This is what makes "honest logging" possible.
 */
export async function logScrapeAttempt(productId, attemptNumber, status, errorMessage = null, httpStatus = null, durationMs = 0) {
  const db = getSupabase();
  if (!db) {
    return localStore.logScrapeAttempt(productId, attemptNumber, status, errorMessage, httpStatus, durationMs);
  }
  
  const { data, error } = await db
    .from('scrape_log')
    .insert({
      product_id: productId,
      attempted_at: new Date().toISOString(),
      status,
      attempt_number: attemptNumber,
      http_status: httpStatus,
      error_message: errorMessage,
      duration_ms: durationMs,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to log scrape attempt: ${error.message}`);
  return data;
}

/**
 * Get scrape logs for a product (for the log table).
 */
export async function getScrapeLogs(productId, limit = 50) {
  const db = getSupabase();
  if (!db) {
    return localStore.getScrapeLogs(productId, limit);
  }
  
  const { data, error } = await db
    .from('scrape_log')
    .select('*')
    .eq('product_id', productId)
    .order('attempted_at', { ascending: false })
    .limit(limit);
  
  if (error) throw new Error(`Failed to get scrape logs: ${error.message}`);
  return data || [];
}

/**
 * Get a product by its internal ID.
 */
export async function getProductById(productId) {
  const db = getSupabase();
  if (!db) {
    return localStore.getProductById(productId);
  }
  
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (error) throw new Error(`Failed to get product: ${error.message}`);
  return data;
}

/**
 * Get all products with their latest price (for the tracked products list).
 */
export async function getTrackedProductsWithLatestPrice() {
  const db = getSupabase();
  if (!db) {
    return localStore.getTrackedProductsWithLatestPrice();
  }
  
  // Get tracked products
  const tracked = await getTrackedProducts();
  
  // Enrich with latest price for each
  const enriched = await Promise.all(
    tracked.map(async (tp) => {
      const latestPrice = await getLatestPrice(tp.products.id);
      return {
        ...tp,
        latestPrice,
      };
    })
  );
  
  return enriched;
}

/**
 * Get the latest two price history entries for a product (to detect price drops/restocks).
 */
export async function getLatestTwoPrices(productId) {
  const db = getSupabase();
  if (!db) {
    const history = localStore.getPriceHistory(productId, 2);
    return history.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
  }

  try {
    const { data, error } = await db
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .order('scraped_at', { ascending: false })
      .limit(2);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[db] getLatestTwoPrices fallback to localStore:', err.message);
    return localStore.getPriceHistory(productId, 2);
  }
}

// ─── Alert Rules Operations ───────────────────────────────────────────

export async function saveAlertRule(ruleData) {
  const db = getSupabase();
  if (!db) return localStore.saveAlertRule(ruleData);

  try {
    const { data, error } = await db
      .from('alert_rules')
      .upsert({
        user_id: ruleData.userId || null,
        user_email: ruleData.userEmail.toLowerCase(),
        product_id: ruleData.productId,
        target_price: ruleData.targetPrice ? Number(ruleData.targetPrice) : null,
        on_price_drop: ruleData.onPriceDrop !== undefined ? Boolean(ruleData.onPriceDrop) : true,
        on_back_in_stock: ruleData.onBackInStock !== undefined ? Boolean(ruleData.onBackInStock) : true,
        active: true,
      }, { onConflict: 'user_email,product_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[db] saveAlertRule fallback to localStore:', err.message);
    return localStore.saveAlertRule(ruleData);
  }
}

export async function getUserAlertRules(userEmail) {
  const db = getSupabase();
  if (!db) return localStore.getUserAlertRules(userEmail);

  try {
    const { data, error } = await db
      .from('alert_rules')
      .select(`
        *,
        products (*)
      `)
      .eq('user_email', userEmail.toLowerCase())
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[db] getUserAlertRules fallback to localStore:', err.message);
    return localStore.getUserAlertRules(userEmail);
  }
}

export async function getAlertRulesForProduct(productId) {
  const db = getSupabase();
  if (!db) return localStore.getAlertRulesForProduct(productId);

  try {
    const { data, error } = await db
      .from('alert_rules')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[db] getAlertRulesForProduct fallback to localStore:', err.message);
    return localStore.getAlertRulesForProduct(productId);
  }
}

export async function deleteAlertRule(ruleId, userEmail = null) {
  const db = getSupabase();
  if (!db) return localStore.deleteAlertRule(ruleId, userEmail);

  try {
    let query = db.from('alert_rules').delete().eq('id', ruleId);
    if (userEmail) {
      query = query.eq('user_email', userEmail.toLowerCase());
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[db] deleteAlertRule fallback to localStore:', err.message);
    return localStore.deleteAlertRule(ruleId, userEmail);
  }
}

// ─── Notifications Operations ─────────────────────────────────────────

export async function createNotification(notifData) {
  const db = getSupabase();
  if (!db) return localStore.createNotification(notifData);

  try {
    const { data, error } = await db
      .from('notifications')
      .insert({
        user_id: notifData.userId || null,
        user_email: notifData.userEmail ? notifData.userEmail.toLowerCase() : 'all',
        product_id: notifData.productId,
        type: notifData.type,
        title: notifData.title,
        message: notifData.message,
        old_value: notifData.oldValue !== null && notifData.oldValue !== undefined ? String(notifData.oldValue) : null,
        new_value: notifData.newValue !== null && notifData.newValue !== undefined ? String(notifData.newValue) : null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[db] createNotification fallback to localStore:', err.message);
    return localStore.createNotification(notifData);
  }
}

export async function getUserNotifications(userEmail, limit = 50) {
  const db = getSupabase();
  if (!db) return localStore.getUserNotifications(userEmail, limit);

  try {
    let query = db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userEmail) {
      query = query.or(`user_email.eq.${userEmail.toLowerCase()},user_email.eq.all`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[db] getUserNotifications fallback to localStore:', err.message);
    return localStore.getUserNotifications(userEmail, limit);
  }
}

export async function markNotificationAsRead(notificationId, userEmail = null) {
  const db = getSupabase();
  if (!db) return localStore.markNotificationAsRead(notificationId, userEmail);

  try {
    let query = db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (userEmail) {
      query = query.or(`user_email.eq.${userEmail.toLowerCase()},user_email.eq.all`);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[db] markNotificationAsRead fallback to localStore:', err.message);
    return localStore.markNotificationAsRead(notificationId, userEmail);
  }
}

export async function markAllNotificationsRead(userEmail = null) {
  const db = getSupabase();
  if (!db) return localStore.markAllNotificationsRead(userEmail);

  try {
    let query = db
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (userEmail) {
      query = query.or(`user_email.eq.${userEmail.toLowerCase()},user_email.eq.all`);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data?.length || 0;
  } catch (err) {
    console.warn('[db] markAllNotificationsRead fallback to localStore:', err.message);
    return localStore.markAllNotificationsRead(userEmail);
  }
}
