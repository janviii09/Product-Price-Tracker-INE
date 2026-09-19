/**
 * cli.js — Standalone CLI runner for the scraper
 * 
 * Usage:
 *   node src/scraper/cli.js --url="/product/888"           # headless, single product
 *   node src/scraper/cli.js --url="/product/888" --headed   # headed mode (visible browser)
 *   node src/scraper/cli.js --id=888                        # by product ID
 *   node src/scraper/cli.js --slug=meridian-receiver-studio # by slug
 *   node src/scraper/cli.js --all --headed                  # scrape all tracked products
 * 
 * This CLI is designed for:
 * 1. Manual testing of the scraper against the live mock store
 * 2. Headed-mode recording for the assignment submission
 * 3. Debugging scrape failures
 */

import { scrapeSingleProduct } from './scraper.js';
import { validateScrapeResult, parsePrice } from './validator.js';

// Parse CLI args
const args = process.argv.slice(2);
const flags = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, ...valueParts] = arg.slice(2).split('=');
    flags[key] = valueParts.length > 0 ? valueParts.join('=') : true;
  }
}

const headed = flags.headed === true;
const MAX_RETRIES = 3;

function backoff(attempt) {
  return 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape with retry/validation loop — the core algorithm.
 * This is the exact pattern from the assignment spec.
 */
async function scrapeWithRetry(url) {
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 Target: ${url}`);
  console.log(`🔧 Mode: ${headed ? 'HEADED (visible browser)' : 'HEADLESS'}`);
  console.log(`🔄 Max retries: ${MAX_RETRIES}`);
  console.log('='.repeat(60) + '\n');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    
    console.log(`\n📍 Attempt ${attempt}/${MAX_RETRIES}`);
    console.log('-'.repeat(40));
    
    try {
      // Step 1: Fetch the page and extract raw data
      const raw = await scrapeSingleProduct(url, { headed });
      
      // Step 2: Validate extracted data
      console.log('\n[validate] Validating extracted data...');
      const parsedPrice = parsePrice(raw.priceText);
      const validation = validateScrapeResult(parsedPrice, raw.stockText);
      
      if (!validation.valid) {
        // Data was extracted but is invalid/incomplete
        throw new ValidationError(
          `Incomplete/invalid data: ${validation.errors.join('; ')}`
        );
      }
      
      // Step 3: Success!
      const duration = Date.now() - attemptStart;
      
      const result = {
        price: validation.price,
        stock: validation.stock,
        mrpText: raw.mrpText,
        duration,
        attempt,
        status: 'success',
      };
      
      console.log('\n✅ SCRAPE SUCCESSFUL');
      console.log('─'.repeat(40));
      console.log(`  💰 Price: ₹${result.price.toLocaleString('en-IN')}`);
      console.log(`  📦 Stock: ${result.stock}`);
      if (result.mrpText) console.log(`  🏷️  MRP: ${result.mrpText}`);
      console.log(`  ⏱️  Duration: ${result.duration}ms`);
      console.log(`  🔄 Attempts: ${result.attempt}`);
      console.log('─'.repeat(40));
      
      // Log what we would save
      console.log('\n📝 [scrape_log] Would log:', JSON.stringify({
        status: 'success',
        attempt_number: attempt,
        duration_ms: duration,
      }));
      console.log('📊 [price_history] Would save:', JSON.stringify({
        price: result.price,
        stock: result.stock,
      }));
      
      return result;
      
    } catch (err) {
      const duration = Date.now() - attemptStart;
      const isLastAttempt = attempt === MAX_RETRIES;
      const status = isLastAttempt ? 'failed' : 'retried';
      
      console.log(`\n${isLastAttempt ? '❌' : '⚠️'} Attempt ${attempt} ${status}: ${err.message}`);
      
      // Log this attempt
      console.log(`📝 [scrape_log] Would log:`, JSON.stringify({
        status,
        attempt_number: attempt,
        duration_ms: duration,
        error_message: err.message,
      }));
      
      if (isLastAttempt) {
        console.log('\n❌ ALL RETRIES EXHAUSTED — never writing bad data');
        console.log('📊 [price_history] NO DATA WRITTEN (this is correct behavior)\n');
        return {
          status: 'failed',
          error: err.message,
          attempt,
          duration,
        };
      }
      
      const waitMs = backoff(attempt);
      console.log(`⏳ Waiting ${waitMs}ms before retry...`);
      await sleep(waitMs);
    }
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Determine URL from flags
let targetUrl;
if (flags.url) {
  targetUrl = flags.url;
} else if (flags.id) {
  targetUrl = `/product/${flags.id}`;
} else if (flags.slug) {
  targetUrl = `/product/${flags.slug}`;
} else {
  // Default: test with product 888
  targetUrl = '/product/888';
  console.log('ℹ️  No --url, --id, or --slug provided. Using default: /product/888');
  console.log('   Usage: node src/scraper/cli.js --url="/product/888" [--headed]');
  console.log('');
}

console.log('🚀 INE Product Price Tracker — Scraper CLI');
console.log(`📅 ${new Date().toISOString()}`);

scrapeWithRetry(targetUrl)
  .then(result => {
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result?.status === 'failed' ? 1 : 0);
  })
  .catch(err => {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  });
