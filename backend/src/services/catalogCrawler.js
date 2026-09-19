/**
 * catalogCrawler.js — Complete product catalog discovery and ingestion pipeline
 * 
 * Crawls all 17 pages of https://demo.inelabteamdev.com/api/catalog
 * discovers all 1,000 products, and bulk-upserts them into the database.
 * 
 * Can be run standalone: node src/services/catalogCrawler.js
 */

import { bulkUpsertProducts } from '../db/supabase.js';

const BASE_URL = 'https://demo.inelabteamdev.com';
const CATALOG_API = `${BASE_URL}/api/catalog`;
const PAGE_SIZE = 60; // Max supported page size on the mock store
const MAX_RETRIES = 3;

/**
 * Fetch a single page from the catalog API with bounded retries.
 */
async function fetchCatalogPage(page, attempt = 1) {
  const url = `${CATALOG_API}?page=${page}&pageSize=${PAGE_SIZE}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = attempt * 1500;
      console.warn(`[crawler] Page ${page} failed (${err.message}). Retrying in ${delay}ms... (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, delay));
      return fetchCatalogPage(page, attempt + 1);
    }
    throw new Error(`Failed to fetch page ${page} after ${MAX_RETRIES} attempts: ${err.message}`);
  }
}

/**
 * Discover and ingest the entire 1,000 product catalog.
 */
export async function crawlFullCatalog({ onProgress } = {}) {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🚀 Starting Full Product Catalog Discovery');
  console.log(`📡 Store URL: ${BASE_URL}`);
  console.log('════════════════════════════════════════════════════════════');

  const startTime = Date.now();
  let currentPage = 1;
  let totalPages = 17; // initial estimate, will be updated from first response
  let allProducts = [];

  while (currentPage <= totalPages) {
    console.log(`[crawler] Fetching page ${currentPage}/${totalPages}...`);
    const data = await fetchCatalogPage(currentPage);

    if (data.pages && totalPages !== data.pages) {
      totalPages = data.pages;
    }

    const items = (data.items || []).map(item => ({
      externalId: String(item.id),
      slug: item.slug || String(item.id),
      name: item.name,
      productUrl: `${BASE_URL}/product/${item.id}`,
      brand: item.brand || '',
      category: item.category || '',
      sku: item.sku || '',
      description: item.description || '',
    }));

    allProducts.push(...items);
    console.log(`[crawler] Page ${currentPage} fetched (+${items.length} items, total so far: ${allProducts.length})`);

    if (onProgress) {
      onProgress({
        currentPage,
        totalPages,
        totalItems: allProducts.length,
      });
    }

    currentPage++;
    // Polite pacing
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n💾 Persisting ${allProducts.length} products to database...`);
  const result = await bulkUpsertProducts(allProducts);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ CATALOG DISCOVERY COMPLETE in ${duration}s`);
  console.log(`📦 Total Products Ingested: ${allProducts.length}`);
  console.log(`📄 Pages Crawled: ${totalPages}`);
  console.log('════════════════════════════════════════════════════════════\n');

  return {
    success: true,
    totalProducts: allProducts.length,
    pages: totalPages,
    durationSeconds: Number(duration),
    dbResult: result,
  };
}

// If run directly via node cli
if (process.argv[1]?.endsWith('catalogCrawler.js')) {
  crawlFullCatalog()
    .then(summary => {
      console.log('Result:', JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Crawler failed:', err);
      process.exit(1);
    });
}
