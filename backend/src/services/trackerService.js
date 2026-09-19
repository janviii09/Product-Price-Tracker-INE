/**
 * trackerService.js — Orchestrates scraping with retry, validation, and persistence
 * 
 * This is the bridge between the scraper module and the database.
 * It implements the retry/validate loop from the assignment spec:
 * 
 * 1. For each attempt (up to MAX_RETRIES):
 *    a. Call the scraper to fetch price/stock
 *    b. Validate the extracted data
 *    c. If valid: log success + save to price_history → return
 *    d. If invalid or error: log retry/failure → backoff → next attempt
 * 
 * The NON-NEGOTIABLE RULE: a scrape that produces invalid, partial, or
 * unparseable data is a FAILURE, not a success with bad data.
 */

import { scrapeSingleProduct, launchBrowser } from '../scraper/scraper.js';
import { validateScrapeResult, parsePrice } from '../scraper/validator.js';
import {
  savePriceHistory,
  logScrapeAttempt,
  getActiveProductsForScraping,
} from '../db/supabase.js';

const MAX_RETRIES = 3;

function backoff(attempt) {
  return 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape a single product with retry + validation loop.
 * This is the heart of the assignment — the exact pattern from the spec.
 */
export async function scrapeProduct(product, options = {}) {
  const { browser, context } = options;
  
  console.log(`\n[tracker] Scraping: ${product.name} (${product.product_url})`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    
    try {
      // Step 1: Fetch the page and extract raw data
      const raw = await scrapeSingleProduct(product.product_url, {
        browser,
        context,
      });
      
      // Step 2: Validate extracted data
      const parsedPrice = parsePrice(raw.priceText);
      const parsedMrp = raw.mrpText ? parsePrice(raw.mrpText) : null;
      const validation = validateScrapeResult(parsedPrice, raw.stockText);
      
      if (!validation.valid) {
        throw new ValidationError(
          `Incomplete data: ${validation.errors.join('; ')}`
        );
      }
      
      const durationMs = Date.now() - attemptStart;
      
      // Step 3: SUCCESS — log attempt and save validated data
      await logScrapeAttempt(
        product.id,
        attempt,
        'success',
        null,   // no error
        200,    // nominal HTTP status
        durationMs
      );
      
      await savePriceHistory(
        product.id,
        validation.price,
        validation.stock,
        'INR',
        parsedMrp
      );
      
      console.log(`[tracker] ✅ ${product.name}: ₹${validation.price} | ${validation.stock} (${durationMs}ms, attempt ${attempt})`);
      
      return {
        success: true,
        price: validation.price,
        stock: validation.stock,
        duration: durationMs,
        attempt,
      };
      
    } catch (err) {
      const durationMs = Date.now() - attemptStart;
      const isLastAttempt = attempt === MAX_RETRIES;
      const status = isLastAttempt ? 'failed' : 'retried';
      
      // Log this attempt — EVERY attempt gets logged
      await logScrapeAttempt(
        product.id,
        attempt,
        status,
        err.message,
        err.httpStatus || null,
        durationMs
      );
      
      console.log(`[tracker] ${isLastAttempt ? '❌' : '⚠️'} ${product.name}: ${status} (attempt ${attempt}): ${err.message}`);
      
      if (isLastAttempt) {
        // Never write bad data — just return the failure
        return {
          success: false,
          error: err.message,
          attempt,
          duration: durationMs,
        };
      }
      
      // Exponential backoff before retry
      const waitMs = backoff(attempt);
      console.log(`[tracker] ⏳ Waiting ${waitMs}ms before retry...`);
      await sleep(waitMs);
    }
  }
}

/**
 * Run the full scrape cycle for all active tracked products.
 * This is what the cron endpoint calls.
 */
export async function runScrapeAll() {
  const products = await getActiveProductsForScraping();
  
  if (products.length === 0) {
    console.log('[tracker] No active tracked products to scrape.');
    return { total: 0, results: [] };
  }
  
  console.log(`[tracker] Starting scrape cycle for ${products.length} product(s)...`);
  
  // Launch a shared browser for efficiency
  const { browser, context } = await launchBrowser({ headed: false });
  
  const results = [];
  
  try {
    for (const product of products) {
      const result = await scrapeProduct(product, { browser, context });
      results.push({
        productId: product.id,
        name: product.name,
        ...result,
      });
    }
  } finally {
    await browser.close().catch(() => {});
  }
  
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n[tracker] Scrape cycle complete: ${succeeded} succeeded, ${failed} failed out of ${products.length} total.`);
  
  return {
    total: products.length,
    succeeded,
    failed,
    results,
  };
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
