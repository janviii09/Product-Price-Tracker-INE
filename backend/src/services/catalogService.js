/**
 * catalogService.js — Proxy service for the INE mock store catalog API
 * 
 * The mock store exposes /api/catalog for product listing and
 * /api/product/:id for individual product details.
 * Neither contains price/stock — that's the scraper's job.
 */

const BASE_API = 'https://demo.inelabteamdev.com/api';

/**
 * Search the mock store catalog by query string.
 * Fetches multiple pages and filters by name/brand/category.
 */
export async function searchCatalog(query, page = 1, pageSize = 20) {
  const url = `${BASE_API}/catalog?page=${page}&pageSize=${pageSize}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Catalog API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // If query provided, filter results (the API doesn't have search)
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    data.items = data.items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)
    );
  }
  
  return data;
}

/**
 * Search across multiple pages to find matching products.
 * Returns up to maxResults matches.
 */
export async function searchCatalogFull(query, maxResults = 20) {
  if (!query || !query.trim()) {
    // Return first page of all products
    return searchCatalog('', 1, maxResults);
  }
  
  const q = query.trim().toLowerCase();
  const allMatches = [];
  const pageSize = 50; // Fetch larger pages for search efficiency
  let page = 1;
  const maxPages = 10; // Don't fetch more than 10 pages
  
  while (allMatches.length < maxResults && page <= maxPages) {
    const data = await searchCatalog('', page, pageSize);
    
    const matches = data.items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
    
    allMatches.push(...matches);
    
    if (page >= data.pages) break; // No more pages
    page++;
  }
  
  return {
    items: allMatches.slice(0, maxResults),
    total: allMatches.length,
    query,
  };
}

/**
 * Get a single product's details from the mock store.
 */
export async function getProductDetails(productId) {
  const url = `${BASE_API}/product/${productId}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Product API error: ${response.status}`);
  }
  
  return response.json();
}
