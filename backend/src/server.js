/**
 * server.js — Express application entry point
 * 
 * API Surface:
 *   GET  /api/search?q=         → Proxy-search mock store catalog
 *   POST /api/products/track    → Track a product + first scrape
 *   GET  /api/products          → List tracked products with latest price
 *   GET  /api/products/:id/history → Price/stock time series
 *   GET  /api/products/:id/logs    → Scrape attempt logs
 *   POST /api/products/:id/scrape  → Manual on-demand scrape
 *   POST /api/scrape/run           → Cron-triggered (secret-protected)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import searchRouter from './routes/search.js';
import productsRouter from './routes/products.js';
import cronRouter from './routes/cron.js';
import alertsRouter from './routes/alerts.js';
import authRouter from './routes/auth.js';
import { isSupabaseConfigured, getSupabase } from './db/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL?.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, mobile apps, cron triggers)
    if (!origin) return callback(null, true);
    // If FRONTEND_URL is set to '*' allow all
    if (process.env.FRONTEND_URL === '*') return callback(null, true);
    // Allow localhost, matched FRONTEND_URL, or any vercel.app preview/production deployment
    if (
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[http] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Routes
app.use('/api/search', searchRouter);
app.use('/api/products', productsRouter);
app.use('/api/scrape', cronRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/auth', authRouter);

// Health check
const healthCheck = async (req, res) => {
  let catalogCount = null;
  let supabaseError = null;
  try {
    const db = getSupabase();
    if (db) {
      const { count, error } = await db.from('products').select('*', { count: 'exact', head: true });
      catalogCount = count;
      if (error) supabaseError = error.message;
    }
  } catch (e) {
    supabaseError = e.message;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: isSupabaseConfigured ? 'supabase' : 'localStore',
    catalogCount,
    supabaseError,
    supabaseUrl: process.env.SUPABASE_URL || null,
  });
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 INE Price Tracker Backend`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   API docs: GET /api/health\n`);
  console.log(`   Endpoints:`);
  console.log(`   GET  /api/search?q=       → Search mock store`);
  console.log(`   POST /api/products/track   → Track a product`);
  console.log(`   GET  /api/products         → List tracked products`);
  console.log(`   GET  /api/products/:id/history → Price history`);
  console.log(`   GET  /api/products/:id/logs    → Scrape logs`);
  console.log(`   POST /api/products/:id/scrape  → Manual scrape`);
  console.log(`   POST /api/scrape/run            → Cron scrape\n`);
});

export default app;
