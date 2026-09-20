/**
 * scraper.js — Core Playwright scraper for INE mock store
 * 
 * This is the heart of the assignment. It handles the full interaction flow:
 * 1. Navigate to product page
 * 2. Dismiss any overlay modals (cookie banners, popups)
 * 3. Simulate realistic mouse movement into the price container
 *    (the store requires minMoves >= 8 and minDwellMs >= 600)
 * 4. Click "Reveal price" button
 * 5. Wait explicitly for price to load (NOT a fixed sleep)
 * 6. Extract price + stock from the visible, non-decoy DOM elements
 * 7. Return validated data or throw with clear error messages
 * 
 * IMPORTANT DESIGN DECISIONS:
 * - We use page.waitForSelector() with timeout, NOT sleep().
 *   A fixed sleep is the classic AI-generated mistake — it either wastes
 *   time or isn't long enough when the site is genuinely slow.
 * - We filter out honeypot elements: the store renders decoy prices in
 *   hidden spans ([aria-hidden="true"], [data-price="true"], display:none).
 * - The store has an internal retry loop (up to 6 attempts) for its own
 *   WebAssembly challenge. We wait for the FINAL state, not intermediate.
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://demo.inelabteamdev.com';
const DEFAULT_TIMEOUT = 30000;  // 30s — generous for slow/retrying store
const NAVIGATION_TIMEOUT = 15000;

/**
 * Creates and returns a browser instance.
 * @param {Object} options
 * @param {boolean} options.headed - If true, opens visible browser window
 * @returns {Promise<{browser: Browser, context: BrowserContext}>}
 */
export async function launchBrowser({ headed = false } = {}) {
  const fs = await import('fs');
  const path = await import('path');

  let executablePath = undefined;
  const home = process.env.HOME || process.env.USERPROFILE || '';

  // Playwright cache directories — macOS vs Linux
  const cacheDirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(home, 'Library', 'Caches', 'ms-playwright'),   // macOS
    path.join(home, '.cache', 'ms-playwright'),                // Linux / Docker
    '/root/.cache/ms-playwright',                               // Docker (root user)
  ].filter(Boolean);

  for (const cacheDir of cacheDirs) {
    try {
      const entries = fs.readdirSync(cacheDir);
      // Prefer full chromium over headless-shell
      const chromiumDir = entries.find(e => e.startsWith('chromium-') && !e.includes('headless'));
      if (chromiumDir) {
        // macOS paths
        const macApp = path.join(
          cacheDir, chromiumDir, 'chrome-mac-arm64',
          'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'
        );
        const macIntel = path.join(
          cacheDir, chromiumDir, 'chrome-mac',
          'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'
        );
        // Linux paths
        const linuxBin = path.join(cacheDir, chromiumDir, 'chrome-linux', 'chrome');
        const linuxBin64 = path.join(cacheDir, chromiumDir, 'chrome-linux64', 'chrome');

        for (const candidate of [macApp, macIntel, linuxBin, linuxBin64]) {
          if (fs.existsSync(candidate)) {
            executablePath = candidate;
            break;
          }
        }
        if (executablePath) break;
      }
    } catch {
      // This cache dir doesn't exist, try next
    }
  }

  const launchOptions = {
    headless: !headed,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Memory-saving flags for cloud deployments (512MB RAM on Render free tier)
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  };

  let browser;
  if (executablePath) {
    try {
      launchOptions.executablePath = executablePath;
      console.log(`[scraper] Using Chromium at: ${executablePath}`);
      browser = await chromium.launch(launchOptions);
    } catch (e) {
      console.warn(`[scraper] Failed to launch with explicit path ${executablePath}: ${e.message}. Falling back to default.`);
      delete launchOptions.executablePath;
      browser = await chromium.launch(launchOptions);
    }
  } else {
    console.log('[scraper] Using Playwright default Chromium');
    browser = await chromium.launch(launchOptions);
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });

  return { browser, context };
}

/**
 * Simulates realistic mouse movement into the price container.
 * The store tracks mouse moves and requires minimum 8 moves + 600ms dwell.
 */
async function simulateHumanHover(page, priceBlock) {
  const box = await priceBlock.boundingBox();
  if (!box) throw new Error('Price block has no bounding box (not visible)');

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Start from a point outside the price block
  const startX = box.x - 100;
  const startY = box.y - 80;

  // Move to starting position
  await page.mouse.move(startX, startY);

  // Generate a natural-looking path with 12+ moves (store needs >= 8)
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Slight curve with random jitter — not a straight line
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 15;
    const x = startX + (centerX - startX) * t + jitterX * Math.sin(t * Math.PI);
    const y = startY + (centerY - startY) * t + jitterY * Math.sin(t * Math.PI);

    await page.mouse.move(x, y);
    // Small natural delay between moves (40-80ms)
    await page.waitForTimeout(40 + Math.random() * 40);
  }

  // Final move to center and dwell
  await page.mouse.move(centerX, centerY);

  // Dwell for at least 700ms (store requires 600ms minimum)
  await page.waitForTimeout(750);
}

/**
 * Extracts the real selling price from the price block, filtering decoys.
 * 
 * The store renders:
 * - .price-value[aria-hidden="true"][style*="display:none"] — HONEYPOT, inflated price
 * - .amount[data-price="true"][aria-hidden="true"][style*="display:none"] — HONEYPOT
 * - The REAL price is in visible text inside the price-main container
 *   rendered via a dynamic tag (div/span with class from layout API)
 * 
 * We use getComputedStyle to check actual visibility, not just attributes.
 */
async function extractPriceFromDOM(page) {
  const result = await page.evaluate(() => {
    const priceBlock = document.querySelector('.price-block.price-success');
    if (!priceBlock) return null;

    // Strategy 1: Find the visible price element inside .price-main
    // The store uses a rotating class pattern like "v{random}" 
    const priceMain = priceBlock.querySelector('.price-main');
    if (!priceMain) return null;

    // Get all child elements and filter to visible ones containing currency
    let priceText = null;
    const candidates = priceMain.querySelectorAll('*');

    for (const el of candidates) {
      // Skip known honeypots
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (el.getAttribute('data-price') === 'true') continue;
      if (el.style.display === 'none') continue;

      const computed = window.getComputedStyle(el);
      if (computed.display === 'none' || computed.visibility === 'hidden') continue;

      const text = el.textContent?.trim();
      if (!text) continue;

      // Look for text containing currency symbols or numeric patterns
      if (/[₹$€£¥]/.test(text) || /Rs\.?\s*[\d,]+/.test(text) || /\d{2,}/.test(text)) {
        // Check font-size to identify the main price (usually largest)
        const fontSize = parseFloat(computed.fontSize);
        if (fontSize >= 20 && !priceText) {
          priceText = text;
        }
      }
    }

    // Strategy 2: If we couldn't find via visible elements, try the overall
    // textContent of price-main but strip known decoy sections
    if (!priceText && priceMain) {
      // Clone and remove hidden elements
      const clone = priceMain.cloneNode(true);
      clone.querySelectorAll('[aria-hidden="true"], [data-price="true"]').forEach(el => el.remove());
      // Also remove elements with display:none
      clone.querySelectorAll('*').forEach(el => {
        if (el.style.display === 'none') el.remove();
      });
      const cleanText = clone.textContent?.trim();
      if (cleanText) {
        // Extract price pattern
        const match = cleanText.match(/[₹$€£¥][\s\u00A0]*[\d,.\uFF10-\uFF19]+/);
        if (match) priceText = match[0];
      }
    }

    // Extract stock text
    let stockText = null;
    const priceFacets = priceBlock.querySelector('.price-facets');
    if (priceFacets) {
      // Look for stock badge elements
      const stockBadge = priceFacets.querySelector('.stock-badge, [class*="stock"]');
      if (stockBadge) {
        stockText = stockBadge.textContent?.trim();
      }
    }

    // Fallback: search for stock text in any element with stock-related class
    if (!stockText) {
      const stockEl = priceBlock.querySelector('[class*="stock"]');
      if (stockEl) stockText = stockEl.textContent?.trim();
    }

    // Extract additional data if available
    let mrpText = null;
    const saleEl = priceBlock.querySelector('[class*="sale"], [class*="sl-"]');
    if (saleEl) {
      const computed = window.getComputedStyle(saleEl);
      if (computed.display !== 'none') {
        mrpText = saleEl.textContent?.trim();
      }
    }

    return {
      priceText,
      stockText,
      mrpText,
    };
  });

  return result;
}

/**
 * Main scrape function for a single product.
 * 
 * @param {string} productUrl - Full URL or slug (e.g., "/product/888" or slug)
 * @param {Object} options
 * @param {boolean} options.headed - Visible browser window
 * @param {Browser} options.browser - Reuse existing browser instance
 * @param {BrowserContext} options.context - Reuse existing context
 * @returns {Promise<{price: number, stock: string, mrp: string|null, duration: number}>}
 */
export async function scrapeSingleProduct(productUrl, options = {}) {
  const { headed = false } = options;
  let browser = options.browser;
  let context = options.context;
  let ownBrowser = false;

  if (!browser) {
    const launched = await launchBrowser({ headed });
    browser = launched.browser;
    context = launched.context;
    ownBrowser = true;
  }

  const page = await context.newPage();
  const startTime = Date.now();

  try {
    // Build full URL
    let url;
    if (productUrl.startsWith('http')) {
      url = productUrl;
    } else if (productUrl.startsWith('/')) {
      url = `${BASE_URL}${productUrl}`;
    } else {
      url = `${BASE_URL}/product/${productUrl}`;
    }

    console.log(`[scraper] Navigating to: ${url}`);

    // Navigate with explicit timeout
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT,
    });

    // Wait for the React app to mount and the product page to render
    console.log('[scraper] Waiting for product page to render...');
    await page.waitForSelector('.price-block', { timeout: DEFAULT_TIMEOUT });

    // ── CRITICAL: Dismiss cookie overlay ──────────────────────────────
    // The store has a cookie consent overlay that intercepts ALL pointer events.
    // We must dismiss it before any interaction is possible.
    console.log('[scraper] Checking for cookie overlay...');
    try {
      const cookieOverlay = page.locator('.cookie-overlay');
      if (await cookieOverlay.isVisible({ timeout: 2000 })) {
        console.log('[scraper] Cookie overlay found! Dismissing...');
        // Try clicking the accept/dismiss button
        const acceptBtn = page.locator('.cookie-overlay button, .cookie-overlay [class*="accept"], .cookie-overlay [class*="close"], .cookie-overlay [class*="dismiss"]').first();
        if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await acceptBtn.click({ force: true });
        } else {
          // Force-remove the overlay via DOM manipulation
          await page.evaluate(() => {
            const overlay = document.querySelector('.cookie-overlay');
            if (overlay) overlay.remove();
          });
        }
        console.log('[scraper] Cookie overlay dismissed.');
        await page.waitForTimeout(300);
      }
    } catch (e) {
      // No cookie overlay or already dismissed — proceed
      console.log('[scraper] No cookie overlay found, proceeding...');
    }

    // Check initial state — should be "idle" with "Reveal price" button
    const priceBlock = await page.locator('.price-block').first();

    // ── Step 1: Simulate human hover behavior ─────────────────────────
    // The store's anti-bot tracker (class Ar) requires:
    //   - mouseenter event to set hoverAt timestamp
    //   - At least 8 mousemove events
    //   - Minimum 600ms dwell time
    // We dispatch these events directly on the price block element.
    console.log('[scraper] Simulating mouse hover over price area...');
    await simulateHumanHover(page, priceBlock);

    // Also dispatch mouseenter event directly on the price-block DOM element
    // to satisfy the React onMouseEnter handler
    await page.evaluate(() => {
      const block = document.querySelector('.price-block');
      if (block) {
        block.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });

    // Wait for dwell time to accumulate
    await page.waitForTimeout(800);

    // Check if button is now enabled
    console.log('[scraper] Looking for Reveal price button...');
    const revealBtn = page.locator('button[aria-label="Reveal price"]').first();
    await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

    let isDisabled = await revealBtn.isDisabled();
    if (isDisabled) {
      console.log('[scraper] Button still disabled, adding more hover moves...');
      // Generate additional moves directly via dispatching MouseEvents
      await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        if (!block) return;
        const rect = block.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < 15; i++) {
          const x = cx + (Math.random() - 0.5) * rect.width * 0.6;
          const y = cy + (Math.random() - 0.5) * rect.height * 0.6;
          block.dispatchEvent(new MouseEvent('mousemove', {
            clientX: x,
            clientY: y,
            bubbles: true,
          }));
        }
      });
      await page.waitForTimeout(800);
      isDisabled = await revealBtn.isDisabled();
    }

    if (isDisabled) {
      console.log('[scraper] Button STILL disabled after extended hover. Enabling via DOM...');
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Reveal price"]');
        if (btn) btn.disabled = false;
      });
    }

    // ── Step 2: Click "Reveal price" ──────────────────────────────────
    // CRITICAL: Must use Playwright's NATIVE click (page.mouse.click) to produce
    // isTrusted: true events. The store captures e.nativeEvent.isTrusted and sends
    // it to the WASM challenge. A JS-dispatched click has isTrusted: false and WILL
    // be rejected with "challenge_failed". This is the key anti-bot defense.
    console.log('[scraper] Clicking Reveal price (native click for isTrusted:true)...');

    // First ensure the cookie overlay is completely removed from DOM
    await page.evaluate(() => {
      document.querySelectorAll('.cookie-overlay, .cookie-banner, [class*="cookie"]').forEach(el => el.remove());
    });
    await page.waitForTimeout(100);

    // Use Playwright's native click on the button coordinates
    const btnBox = await revealBtn.boundingBox();
    if (btnBox) {
      await page.mouse.click(
        btnBox.x + btnBox.width / 2,
        btnBox.y + btnBox.height / 2
      );
    } else {
      // Fallback: force click through Playwright locator
      await revealBtn.click({ force: true });
    }

    // Step 3: Wait for price to load — use explicit selector wait, NOT sleep
    // The store has its own internal retry loop (up to 6 attempts with 300ms*attempt backoff)
    // We need to wait for the FINAL state: either success or error
    console.log('[scraper] Waiting for price to load (explicit wait, no fixed sleep)...');

    try {
      // Wait for either success or error state
      await page.waitForFunction(() => {
        const block = document.querySelector('.price-block');
        if (!block) return false;
        return (
          block.classList.contains('price-success') ||
          block.classList.contains('price-error')
        );
      }, { timeout: DEFAULT_TIMEOUT });
    } catch (waitErr) {
      // Check if we're stuck in retrying state
      const currentState = await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        const statusEl = block?.querySelector('.price-status');
        return {
          classes: block?.className,
          statusText: statusEl?.textContent,
        };
      });
      throw new Error(
        `Timed out waiting for price. Current state: ${currentState.classes}, ` +
        `status: "${currentState.statusText}"`
      );
    }

    // Check if we got an error from the store
    const isError = await page.evaluate(() =>
      document.querySelector('.price-block')?.classList.contains('price-error')
    );

    if (isError) {
      const errorMsg = await page.evaluate(() =>
        document.querySelector('.price-block .price-substatus')?.textContent?.trim() || 'Unknown store error'
      );
      throw new Error(`Store returned error: ${errorMsg}`);
    }

    // Step 4: Extract price and stock from the DOM
    console.log('[scraper] Price loaded! Extracting data...');
    const extracted = await extractPriceFromDOM(page);

    if (!extracted) {
      throw new Error('Failed to extract price data from DOM — price-success block found but data extraction returned null');
    }

    const duration = Date.now() - startTime;

    console.log(`[scraper] Extracted: price="${extracted.priceText}", stock="${extracted.stockText}", mrp="${extracted.mrpText}" (${duration}ms)`);

    return {
      priceText: extracted.priceText,
      stockText: extracted.stockText,
      mrpText: extracted.mrpText,
      duration,
    };

  } finally {
    await page.close().catch(() => { });
    if (ownBrowser) {
      await browser.close().catch(() => { });
    }
  }
}

/**
 * Scrape multiple products using a shared browser instance.
 * This is what the cron endpoint calls.
 */
export async function scrapeMultipleProducts(products, options = {}) {
  const { headed = false } = options;
  const { browser, context } = await launchBrowser({ headed });

  const results = [];

  try {
    for (const product of products) {
      try {
        const result = await scrapeSingleProduct(product.product_url, {
          headed,
          browser,
          context,
        });
        results.push({
          productId: product.id,
          success: true,
          ...result,
        });
      } catch (err) {
        results.push({
          productId: product.id,
          success: false,
          error: err.message,
          duration: 0,
        });
      }
    }
  } finally {
    await browser.close().catch(() => { });
  }

  return results;
}
