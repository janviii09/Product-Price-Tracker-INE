/**
 * validator.js — Strict price & stock validation + honeypot filtering
 * 
 * The non-negotiable rule: a scrape that produces invalid, partial, or
 * unparseable data is a FAILURE, not a success with bad data.
 */

/**
 * Cleans a formatted price string (e.g., "₹8,323", "Rs. 1,234.00", "₹１２３")
 * and returns the numeric value.
 */
export function parsePrice(raw) {
  if (raw === null || raw === undefined) return NaN;
  
  let str = String(raw).trim();
  
  // Handle fullwidth unicode digits (U+FF10–U+FF19) → ASCII digits
  str = str.replace(/[\uFF10-\uFF19]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 48)
  );
  
  // Strip currency symbols, spaces, non-breaking spaces, zero-width chars
  str = str.replace(/[₹$€£¥\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
  
  // Remove "Rs.", "INR", leading text like "/- (incl. of all taxes)"
  str = str.replace(/^(Rs\.?|INR)/i, '');
  str = str.replace(/\/-.*$/, '');
  str = str.replace(/,00$/, ''); // euro format trailing ",00"
  
  // Remove thousands separators (commas and dots used as group separators)
  // Indian format: 1,23,456 or international: 123,456
  str = str.replace(/,/g, '');
  
  // Handle dots: if there's a trailing ".XX" treat as decimal, otherwise remove
  const dotParts = str.split('.');
  if (dotParts.length > 2) {
    // Multiple dots → group separators, keep last as decimal
    str = dotParts.slice(0, -1).join('') + '.' + dotParts[dotParts.length - 1];
  }
  
  const num = parseFloat(str);
  return num;
}

/**
 * Validates that a parsed price is a sane, positive number.
 * Guards against NaN, Infinity, negative, zero, and absurdly large values.
 */
export function isValidPrice(price) {
  return (
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0 &&
    price < 10_000_000 // ₹1 crore upper bound — reasonable for a mock store
  );
}

/**
 * Known stock text patterns from the mock store.
 * The store randomly picks from templates like:
 *   "In stock · 15 left", "Only 3 left", "12 in stock",
 *   "Selling fast — 7 left", "Hurry, just 2 left", "Out of stock"
 */
const STOCK_PATTERNS = [
  /^in stock/i,
  /^\d+ in stock/i,
  /^only \d+ left/i,
  /\d+ left$/i,
  /^selling fast/i,
  /^hurry/i,
  /^out of stock/i,
  /^limited stock/i,
  /^available/i,
];

/**
 * Validates that stock text matches an expected pattern.
 */
export function isValidStock(stock) {
  if (!stock || typeof stock !== 'string') return false;
  const trimmed = stock.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return false;
  return STOCK_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Extracts the numeric stock quantity from stock text, if present.
 * Returns null if not parseable (e.g., "Out of stock").
 */
export function extractStockQuantity(stockText) {
  if (!stockText) return null;
  const match = stockText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Full validation gate: both price and stock must pass.
 * Returns { valid, price, stock, errors[] }
 */
export function validateScrapeResult(rawPrice, rawStock) {
  const errors = [];
  
  const price = typeof rawPrice === 'number' ? rawPrice : parsePrice(rawPrice);
  if (!isValidPrice(price)) {
    errors.push(`Invalid price: raw="${rawPrice}", parsed=${price}`);
  }
  
  const stock = rawStock?.trim?.() ?? '';
  if (!isValidStock(stock)) {
    errors.push(`Invalid stock: "${rawStock}"`);
  }
  
  return {
    valid: errors.length === 0,
    price,
    stock,
    errors,
  };
}
