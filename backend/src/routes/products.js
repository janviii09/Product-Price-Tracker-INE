/**
 * products.js — Product tracking, history, and logs endpoints
 * 
 * POST /api/products/track       → Track a product (persist + first scrape)
 * GET  /api/products             → List all tracked products with latest price
 * GET  /api/products/:id/history → Price/stock over time, for the chart
 * GET  /api/products/:id/logs    → Scrape log rows, for the log table
 * POST /api/products/:id/scrape  → Manual on-demand scrape
 * DELETE /api/products/:id/track → Untrack a product
 */

import { Router } from 'express';
import {
  findOrCreateProduct,
  trackProduct,
  untrackProduct,
  getTrackedProductsWithLatestPrice,
  getPriceHistory,
  getScrapeLogs,
  getProductById,
  getProductByExternalId,
  getCatalogProducts,
  getLatestPrice,
} from '../db/supabase.js';
import { scrapeProduct } from '../services/trackerService.js';
import { crawlFullCatalog } from '../services/catalogCrawler.js';

const router = Router();

const BASE_URL = 'https://demo.inelabteamdev.com';

/**
 * POST /api/products/track
 * Body: { external_id, slug, name, brand, category, sku, description }
 * Persists the product, marks it as tracked, and triggers an initial scrape.
 */
router.post('/track', async (req, res) => {
  try {
    const { external_id, slug, name, brand, category, sku, description } = req.body;
    
    if (!external_id || !name) {
      return res.status(400).json({ error: 'external_id and name are required' });
    }
    
    const productUrl = `${BASE_URL}/product/${external_id}`;
    
    // Step 1: Find or create the product
    const product = await findOrCreateProduct({
      externalId: external_id,
      slug,
      name,
      productUrl,
      brand,
      category,
      sku,
      description,
    });
    
    if (!product) {
      return res.status(500).json({ error: 'Failed to find or create product in database' });
    }

    // Step 2: Mark as tracked
    const tracked = await trackProduct(product.id);
    
    // Step 3: Trigger initial scrape (fire and forget — don't block the response)
    console.log(`[products] Triggering initial scrape for ${name}...`);
    scrapeProduct({
      id: product.id,
      name: product.name,
      product_url: product.product_url,
    }).then(result => {
      console.log(`[products] Initial scrape for ${name}: ${result.success ? 'success' : 'failed'}`);
    }).catch(err => {
      console.error(`[products] Initial scrape error for ${name}:`, err.message);
    });
    
    res.json({
      message: 'Product tracked successfully. Initial scrape started.',
      product,
      tracked,
    });
    
  } catch (err) {
    console.error('[products] Track error:', err.message);
    res.status(500).json({ error: 'Failed to track product', message: err.message });
  }
});

/**
 * GET /api/products
 * Returns all tracked products with their latest scraped price.
 */
router.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const products = await getTrackedProductsWithLatestPrice();
    res.json(products);
  } catch (err) {
    console.error('[products] List error:', err.message);
    res.status(500).json({ error: 'Failed to list products', message: err.message });
  }
});

/**
 * GET /api/products/catalog
 * Returns paginated catalog of all discovered products (~1,000 products).
 * Query params: page=1&pageSize=24&category=Laptops&q=meridian
 */
router.get('/catalog', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 24));
    const category = req.query.category || '';
    const query = req.query.q || '';

    const catalog = await getCatalogProducts({ page, pageSize, category, query });
    res.json(catalog);
  } catch (err) {
    console.error('[products] Catalog error:', err.message);
    res.status(500).json({ error: 'Failed to fetch catalog', message: err.message });
  }
});

/**
 * POST /api/products/sync-catalog
 * Triggers full product catalog crawler across all 17 pages.
 */
router.post('/sync-catalog', async (req, res) => {
  try {
    console.log('[products] Manual catalog sync triggered...');
    const result = await crawlFullCatalog();
    res.json(result);
  } catch (err) {
    console.error('[products] Sync error:', err.message);
    res.status(500).json({ error: 'Catalog sync failed', message: err.message });
  }
});

/**
 * GET /api/products/:id/history
 * Returns price/stock time series for charting.
 */
router.get('/:id/history', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    const history = await getPriceHistory(productId);
    res.json(history);
  } catch (err) {
    console.error('[products] History error:', err.message);
    res.status(500).json({ error: 'Failed to get history', message: err.message });
  }
});

/**
 * GET /api/products/:id/logs
 * Returns all scrape attempts (for the honest log table).
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    const logs = await getScrapeLogs(productId);
    res.json(logs);
  } catch (err) {
    console.error('[products] Logs error:', err.message);
    res.status(500).json({ error: 'Failed to get logs', message: err.message });
  }
});

/**
 * POST /api/products/:id/scrape
 * Manually trigger an on-demand scrape for a single product.
 */
router.post('/:id/scrape', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const result = await scrapeProduct({
      id: product.id,
      name: product.name,
      product_url: product.product_url,
    });
    
    res.json(result);
  } catch (err) {
    console.error('[products] Scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed', message: err.message });
  }
});

/**
 * GET /api/products/:id/details
 * Returns comprehensive product metadata and specifications for the product page.
 * Price is ONLY included if it has already been revealed/scraped before.
 */
router.get('/:id/details', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Try to enrich with specifications from store API
    let storeData = null;
    try {
      const extId = product.external_id;
      const resp = await fetch(`https://demo.inelabteamdev.com/api/product/${extId}`);
      if (resp.ok) {
        storeData = await resp.json();
      }
    } catch {
      // Non-blocking if store detail API is unreachable
    }

    const latestPrice = await getLatestPrice(product.id);

    res.json({
      ...product,
      specs: storeData?.specs || product.specs || null,
      reviews: storeData?.reviews || [],
      latestPrice, // null if price has NOT been revealed yet
      isPriceRevealed: Boolean(latestPrice),
    });
  } catch (err) {
    console.error('[products] Details error:', err.message);
    res.status(500).json({ error: 'Failed to get product details', message: err.message });
  }
});

/**
 * POST /api/products/:id/reveal-price
 * Triggers on-demand live scrape to reveal the current price & stock.
 * Validates the data, persists to price_history, logs to scrape_log,
 * and marks product as tracked for subsequent scheduled checks.
 */
router.post('/:id/reveal-price', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`[reveal-price] Scraping live price for "${product.name}" (${product.product_url})...`);

    // Ensure product is also marked as tracked
    await trackProduct(product.id);

    // Run real-time live scrape
    const result = await scrapeProduct({
      id: product.id,
      name: product.name,
      product_url: product.product_url,
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: 'Failed to reveal price from store',
        message: result.error,
        status: result.status,
      });
    }

    res.json({
      success: true,
      productId: product.id,
      price: result.price,
      stock: result.stock,
      mrpText: result.mrpText,
      scraped_at: new Date().toISOString(),
      duration_ms: result.duration,
      attempts: result.attempt,
    });
  } catch (err) {
    console.error('[reveal-price] Error:', err.message);
    res.status(500).json({ error: 'Failed to reveal price', message: err.message });
  }
});

/**
 * DELETE /api/products/:id/track
 * Untrack a product (keep data, just stop scraping).
 */
router.delete('/:id/track', async (req, res) => {
  try {
    const productId = /^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : req.params.id;
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    await untrackProduct(productId);
    res.json({ message: 'Product untracked' });
  } catch (err) {
    console.error('[products] Untrack error:', err.message);
    res.status(500).json({ error: 'Failed to untrack product', message: err.message });
  }
});

export default router;
