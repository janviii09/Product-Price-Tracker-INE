/**
 * localStore.js — Lightweight local fallback store
 * 
 * Used automatically when Supabase credentials are not provided.
 * Persists data to a local JSON file so tracked products and price history
 * survive server restarts during development and testing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'local_data.json');

let state = {
  products: [],
  tracked_products: [],
  price_history: [],
  scrape_log: [],
};

// Load saved data if present
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    state = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[localStore] Could not read existing local data file, starting fresh:', e.message);
}

let nextProductId = 1;
let nextTrackId = 1;
let nextPriceId = 1;
let nextLogId = 1;

// Recompute counters from existing data
if (state.products.length > 0) {
  nextProductId = Math.max(...state.products.map(p => Number(p.id) || 0), 0) + 1;
}
if (state.tracked_products.length > 0) {
  nextTrackId = Math.max(...state.tracked_products.map(t => Number(t.id) || 0), 0) + 1;
}
if (state.price_history.length > 0) {
  nextPriceId = Math.max(...state.price_history.map(p => Number(p.id) || 0), 0) + 1;
}
if (state.scrape_log.length > 0) {
  nextLogId = Math.max(...state.scrape_log.map(l => Number(l.id) || 0), 0) + 1;
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[localStore] Error writing local data file:', e.message);
  }
}

export const localStore = {
  bulkUpsertProducts(productsArray) {
    let inserted = 0;
    let updated = 0;
    for (const item of productsArray) {
      const extId = String(item.externalId || item.external_id || item.id);
      let existing = state.products.find(p => String(p.external_id) === extId);
      if (existing) {
        existing.name = item.name || existing.name;
        existing.slug = item.slug || existing.slug;
        existing.brand = item.brand || existing.brand;
        existing.category = item.category || existing.category;
        existing.sku = item.sku || existing.sku;
        existing.description = item.description || existing.description;
        existing.product_url = item.productUrl || item.product_url || existing.product_url;
        if (item.specs) existing.specs = item.specs;
        updated++;
      } else {
        const prod = {
          id: nextProductId++,
          external_id: extId,
          slug: item.slug || extId,
          name: item.name || `Product ${extId}`,
          product_url: item.productUrl || item.product_url || `https://demo.inelabteamdev.com/product/${extId}`,
          brand: item.brand || '',
          category: item.category || '',
          sku: item.sku || '',
          description: item.description || '',
          specs: item.specs || null,
          first_seen_at: new Date().toISOString(),
        };
        state.products.push(prod);
        inserted++;
      }
    }
    save();
    return { inserted, updated, total: state.products.length };
  },

  getCatalogProducts({ page = 1, pageSize = 20, category = '', query = '' } = {}) {
    let filtered = [...state.products];
    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      filtered = filtered.filter(p => (p.category || '').toLowerCase() === catLower);
    }
    if (query && query.trim()) {
      const qLower = query.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || '').toLowerCase().includes(qLower) ||
        (p.brand || '').toLowerCase().includes(qLower) ||
        (p.category || '').toLowerCase().includes(qLower) ||
        (p.sku || '').toLowerCase().includes(qLower)
      );
    }

    const total = filtered.length;
    const pages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    // Enrich with latest price if available
    const enriched = items.map(item => {
      const latestPrice = this.getLatestPrice(item.id);
      const isTracked = state.tracked_products.some(t => t.active && String(t.product_id) === String(item.id));
      return {
        ...item,
        latestPrice,
        isTracked,
      };
    });

    return {
      items: enriched,
      total,
      page,
      pageSize,
      pages,
    };
  },

  getProductByExternalId(externalId) {
    const extId = String(externalId);
    return state.products.find(p => String(p.external_id) === extId) || null;
  },

  findOrCreateProduct({ externalId, slug, name, productUrl, brand, category, sku, description }) {
    let prod = state.products.find(p => String(p.external_id) === String(externalId));
    if (!prod) {
      prod = {
        id: nextProductId++,
        external_id: String(externalId),
        slug: slug || String(externalId),
        name: name || `Product ${externalId}`,
        product_url: productUrl,
        brand: brand || '',
        category: category || '',
        sku: sku || '',
        description: description || '',
        first_seen_at: new Date().toISOString(),
      };
      state.products.push(prod);
      save();
    }
    return prod;
  },

  trackProduct(productId) {
    let tracked = state.tracked_products.find(t => String(t.product_id) === String(productId));
    if (!tracked) {
      tracked = {
        id: nextTrackId++,
        product_id: productId,
        active: true,
        created_at: new Date().toISOString(),
      };
      state.tracked_products.push(tracked);
    } else {
      tracked.active = true;
    }
    save();
    return tracked;
  },

  untrackProduct(productId) {
    let tracked = state.tracked_products.find(t => String(t.product_id) === String(productId));
    if (tracked) {
      tracked.active = false;
      save();
    }
    return tracked;
  },

  getTrackedProducts() {
    return state.tracked_products
      .filter(t => t.active)
      .map(t => {
        const prod = state.products.find(p => String(p.id) === String(t.product_id));
        return {
          id: t.id,
          active: t.active,
          created_at: t.created_at,
          products: prod || null,
        };
      })
      .filter(t => t.products !== null);
  },

  getActiveProductsForScraping() {
    return this.getTrackedProducts().map(tp => ({
      id: tp.products.id,
      external_id: tp.products.external_id,
      slug: tp.products.slug,
      name: tp.products.name,
      product_url: tp.products.product_url,
    }));
  },

  savePriceHistory(productId, price, stock, currency = 'INR', originalPrice = null) {
    const entry = {
      id: nextPriceId++,
      product_id: productId,
      price: Number(price),
      original_price: originalPrice ? Number(originalPrice) : null,
      currency,
      stock,
      scraped_at: new Date().toISOString(),
    };
    state.price_history.push(entry);
    save();
    return entry;
  },

  getPriceHistory(productId, limit = 100) {
    return state.price_history
      .filter(p => String(p.product_id) === String(productId))
      .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
      .slice(-limit);
  },

  getLatestPrice(productId) {
    const history = state.price_history
      .filter(p => String(p.product_id) === String(productId))
      .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    return history[0] || null;
  },

  logScrapeAttempt(productId, attemptNumber, status, errorMessage = null, httpStatus = null, durationMs = 0) {
    const entry = {
      id: nextLogId++,
      product_id: productId,
      attempted_at: new Date().toISOString(),
      status,
      attempt_number: attemptNumber,
      http_status: httpStatus,
      error_message: errorMessage,
      duration_ms: durationMs,
    };
    state.scrape_log.push(entry);
    save();
    return entry;
  },

  getScrapeLogs(productId, limit = 50) {
    return state.scrape_log
      .filter(l => String(l.product_id) === String(productId))
      .sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at))
      .slice(0, limit);
  },

  getProductById(productId) {
    return state.products.find(p => String(p.id) === String(productId)) || null;
  },

  getTrackedProductsWithLatestPrice() {
    const tracked = this.getTrackedProducts();
    return tracked.map(tp => ({
      ...tp,
      latestPrice: this.getLatestPrice(tp.products.id),
    }));
  },
};
