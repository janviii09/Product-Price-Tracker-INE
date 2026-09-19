# INE Product Price Tracker

A full-stack web application that monitors product prices from the [INE demo store](https://demo.inelabteamdev.com). Built with a Playwright-based scraper, Express API, Supabase (Postgres), and React dashboard.

## 📁 Project Structure

```
├── backend/               # Express API + Playwright scraper
│   ├── src/
│   │   ├── scraper/       # Core scraper, validator, CLI
│   │   ├── db/            # Supabase client + SQL schema
│   │   ├── services/      # Tracker service, catalog proxy
│   │   └── routes/        # REST API endpoints
│   ├── package.json
│   └── .env.example
├── frontend/              # React + Vite dashboard
│   ├── src/
│   │   ├── components/    # Search, TrackedList, PriceChart, ScrapeLogsTable
│   │   ├── App.jsx
│   │   └── index.css      # Design system
│   └── package.json
├── DESIGN_NOTE.md         # What the first AI-generated scraper got wrong
└── README.md
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials and cron secret
npm install
npx playwright install chromium
```

### 2. Database Setup

Run the SQL in `backend/src/db/schema.sql` in your Supabase SQL Editor.

### 3. Run the Scraper (standalone test)

```bash
# Headless mode
node src/scraper/cli.js --id=888

# Headed mode (visible browser — for recording)
node src/scraper/cli.js --id=888 --headed

# Custom product
node src/scraper/cli.js --url="/product/37"
```

### 4. Start the Backend

```bash
npm run dev
# Server runs on http://localhost:3001
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Dashboard runs on http://localhost:5173
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search?q=` | Search INE store catalog |
| `POST` | `/api/products/track` | Track a product + trigger initial scrape |
| `GET` | `/api/products` | List tracked products with latest price |
| `GET` | `/api/products/:id/history` | Price/stock time series (for chart) |
| `GET` | `/api/products/:id/logs` | Scrape attempt logs (honest logging) |
| `POST` | `/api/products/:id/scrape` | Manual on-demand scrape |
| `POST` | `/api/scrape/run` | Cron-triggered scrape (secret-protected) |

## 🕐 Cron Scheduling

The `/api/scrape/run` endpoint is protected by `X-Cron-Secret` header. Configure [cron-job.org](https://cron-job.org) to hit this endpoint every 2 hours:

- **URL**: `https://your-render-app.onrender.com/api/scrape/run`
- **Method**: POST
- **Header**: `X-Cron-Secret: your_secret`
- **Schedule**: Every 2 hours

This also wakes the Render free-tier instance from sleep.

## 🏗️ Deployment

### Backend → Render
- Web Service, Node.js
- Build command: `npm install && npx playwright install chromium`
- Start command: `npm start`
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CRON_SECRET`, `FRONTEND_URL`

### Frontend → Vercel
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` (your Render URL)

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
CRON_SECRET=my_secret_123
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend
```
VITE_API_URL=http://localhost:3001
```

## 📊 Database Schema

Four tables, deliberately simple:
- **products** — catalog entries from the mock store
- **tracked_products** — which products are actively monitored
- **price_history** — ONLY valid, successfully scraped price data
- **scrape_log** — honest logging of every attempt (success/retry/fail)

See `backend/src/db/schema.sql` for the full schema.
