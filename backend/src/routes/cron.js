/**
 * cron.js — POST /api/scrape/run
 * 
 * Protected by X-Cron-Secret header.
 * Called by cron-job.org every 2 hours.
 * 
 * This wakes the Render free-tier instance (the HTTP request itself
 * wakes the sleeping instance — that's the whole trick) and scrapes
 * all active tracked products.
 */

import { Router } from 'express';
import { runScrapeAll } from '../services/trackerService.js';

const router = Router();

/**
 * POST /api/scrape/run
 * Header: X-Cron-Secret: <shared secret>
 */
router.post('/run', async (req, res) => {
  // Authenticate with shared secret
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'] || req.body?.secret || req.query?.secret;
  
  if (cronSecret && providedSecret !== cronSecret) {
    console.warn('[cron] Unauthorized scrape attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('[cron] Cron-triggered scrape starting...');
    const result = await runScrapeAll();
    console.log(`[cron] Scrape complete: ${result.succeeded}/${result.total} succeeded`);
    res.json(result);
  } catch (err) {
    console.error('[cron] Scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed', message: err.message });
  }
});

export default router;
