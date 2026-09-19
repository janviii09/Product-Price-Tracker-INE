/**
 * search.js — GET /api/search?q=
 * Proxy-search the mock store catalog and return matches.
 */

import { Router } from 'express';
import { searchCatalogFull } from '../services/catalogService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await searchCatalogFull(query);
    res.json(results);
  } catch (err) {
    console.error('[search] Error:', err.message);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

export default router;
