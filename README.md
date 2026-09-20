# INE Product Price Tracker & Telemetry Engine

An autonomous price tracking system and web application that monitors, scrapes, and visualizes dynamic product prices, inventory levels, and historical trends from anti-bot-protected e-commerce platforms.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Anti-Bot Defense Bypass](#anti-bot-defense-bypass)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [CLI Testing Commands](#cli-testing-commands)
- [Design Decisions](#design-decisions)
- [Author](#author)

---

## 🚀 Overview

Modern e-commerce sites often protect price data behind client-side WebAssembly challenges, mouse movement tracking, and decoy honeypot DOM elements. Standard HTTP scraping (e.g., Axios + Cheerio) fails because the initial HTML shell is empty (`<div id="root"></div>`).

**INE Product Price Tracker** provides a complete end-to-end telemetry system:
- Crawls and catalogs **630+ products** across multiple categories.
- Emulates human mouse interaction ($\ge 8$ trajectory moves, $750\text{ms}$ container dwell) and native trusted click events (`isTrusted: true`) using **Playwright**.
- Filters out decoy honeypot prices and validates real DOM data before writing to the database.
- Implements an **honest execution audit trail** where every attempt (latency, HTTP status, errors) is logged transparently.
- Offers an interactive dark **INE Telemetry UI** with Recharts price trajectory curves, All-Time Low (ATL), All-Time High (ATH), hardware specifications, customer reviews, and automated email alerts.

---

## ✨ Key Features

- **Catalog Discovery**: Automatically scrapes and indexes 630+ products with pagination, search, and category filtering.
- **On-Demand "Reveal Price" Worker**: Dispatches a Playwright headless browser to solve the WASM challenge in real time.
- **Anti-Bot Challenge Bypass**:
  - Automatically dismisses blocking cookie consent overlays.
  - Simulates natural human mouse curves with dwell time.
  - Generates authentic OS-level clicks (`isTrusted: true`).
  - Ignores decoy honeypot spans (`aria-hidden="true"`, `data-price="true"`, `display:none`).
- **Validation Pipeline & Exponential Backoff**: 3-attempt retry loop ($2\text{s} \to 4\text{s} \to 8\text{s}$). Corrupted or partial data is never saved to price history.
- **Dual-Table Architecture**:
  - `price_history`: Clean, validated time-series data for analytics.
  - `scrape_log`: Complete audit trail of every scrape attempt.
- **Price Trajectory & Analytics**: Interactive area chart showing price trends against ATL and ATH.
- **Hardware Specifications & Review Explorer**: Dedicated tabs for chassis specs, warranty, box contents, and verified customer reviews.
- **Alert Trigger Engine**:
  - Custom target price threshold alerts.
  - Back-in-Stock restock event triggers.
  - In-app notification queue with unread badge counter.
  - Automated email dispatch via SendGrid.
- **User Authentication**: Operator sign-up, sign-in, and JWT session persistence backed by Supabase Auth.
- **6-Hour Scheduled Cron**: Background cron endpoint for recurring automated catalog price updates.

---

## 🛡️ Anti-Bot Defense Bypass

| Challenge | What Naive Scrapers Do | How INE Tracker Solves It |
|---|---|---|
| **Empty HTML Shell** | `axios.get()` returns empty `<div id="root"></div>` | Uses **Playwright** to execute JS bundle and hydrate React DOM |
| **Mouse Hover Tracking** | Clicks immediately $\to$ rejected | Generates **8+ coordinate mouse moves** and dwells for **$750\text{ms}$** |
| **`isTrusted` Verification** | Synthetic `element.click()` sets `isTrusted: false` | Uses native **`page.mouse.click(x, y)`** for authentic OS click events |
| **Cookie Overlay** | Intercepts pointer events $\to$ clicks fail | Detects and clears the cookie overlay before interaction |
| **WASM Retry Backoff** | Fixed `sleep(3000)` wastes time or times out | Event-driven **`page.waitForFunction()`** waiting for settled class state |
| **Honeypot Decoy Spans** | Reads `.price-value` $\to$ gets fake inflated price | Multi-layer DOM filtering (`aria-hidden`, computed styles, font-size $\ge 20\text{px}$) |

---

## 🏗️ System Architecture

```
[ Frontend: React 18 + Vite ]
         │
         ├── REST API Requests (Auth, Catalog, Alerts, Telemetry)
         ▼
[ Backend: Node.js + Express ]
         │
         ├── 1. Database Operations ─────────► [ Supabase PostgreSQL ]
         │                                       ├── products
         │                                       ├── price_history
         │                                       ├── scrape_log
         │                                       ├── alert_rules
         │                                       └── notifications
         │
         ├── 2. Live Scraper Worker ─────────► [ Playwright Stealth ]
         │                                       │ (Simulate Hover + Native Click)
         │                                       ▼
         │                                  [ Demo E-Commerce Store ]
         │
         └── 3. Alert & Email Dispatch ──────► [ SendGrid Mail API ]
```

---

## 🗄️ Database Schema

1. **`products`**: Catalog metadata (`id`, `name`, `brand`, `category`, `sku`, `product_url`, `external_id`, `description`, `first_seen_at`).
2. **`tracked_products`**: Products flagged for active monitoring (`product_id`, `active`, `created_at`).
3. **`price_history`**: Validated price recordings (`id`, `product_id`, `price`, `original_price`, `stock`, `currency`, `scraped_at`).
4. **`scrape_log`**: Transparent execution log (`id`, `product_id`, `attempt_number`, `status`, `error_message`, `http_status`, `duration_ms`, `attempted_at`).
5. **`alert_rules`**: User alert thresholds (`id`, `user_email`, `product_id`, `target_price`, `on_price_drop`, `on_back_in_stock`).
6. **`notifications`**: In-app alert dispatch records (`id`, `user_email`, `product_id`, `type`, `title`, `message`, `is_read`, `created_at`).

---

## 💻 Tech Stack

- **Backend:** Node.js (v22+), Express.js (ES Modules), Playwright
- **Frontend:** React 18, Vite, Recharts, Lucide Icons, Vanilla CSS Design System
- **Database:** Supabase (PostgreSQL)
- **Email:** SendGrid Mail API (`@sendgrid/mail`)

---

## 📁 Project Structure

```
product-price-tracker-ine/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── supabase.js       # Supabase client & DB operations
│   │   ├── routes/
│   │   │   ├── alerts.js         # Alert rules & notification endpoints
│   │   │   ├── auth.js           # Authentication routes
│   │   │   ├── cron.js           # 6-hour cron scraping worker
│   │   │   └── products.js       # Catalog, reveal-price & tracking routes
│   │   ├── scraper/
│   │   │   ├── cli.js            # CLI testing interface
│   │   │   ├── scraper.js        # Playwright scraper core
│   │   │   └── validator.js      # Scrape data validation & sanitization
│   │   ├── services/
│   │   │   ├── alertService.js   # Price-drop & restock evaluation
│   │   │   ├── emailService.js   # SendGrid email dispatch
│   │   │   └── trackerService.js # Retry loop & orchestration
│   │   └── server.js             # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx          # Terminal-style auth dialog
│   │   │   ├── CatalogBrowser.jsx     # Discovered products grid
│   │   │   ├── Header.jsx             # Telemetry top bar with status
│   │   │   ├── NotificationCenter.jsx # Alert dropdown feed
│   │   │   ├── PriceChart.jsx         # Recharts area trajectory chart
│   │   │   ├── ProductDetailModal.jsx # Specs, reviews, chart & logs modal
│   │   │   ├── ScrapeLogsTable.jsx    # Honest audit trail table
│   │   │   ├── SetAlertModal.jsx      # Alert rule creation dialog
│   │   │   └── TrackedList.jsx        # Monitored items view
│   │   ├── App.jsx                    # Root app layout & tabs
│   │   └── index.css                  # Obsidian dark telemetry design tokens
│   ├── package.json
│   └── vite.config.js
├── DESIGN_NOTE.md                     # Detailed technical design note
└── README.md                          # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 22+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/janviii09/Product-Price-Tracker-INE.git
cd Product-Price-Tracker-INE
```

### 2. Backend Setup
```bash
cd backend
npm install
npx playwright install chromium

# Copy environment template
cp .env.example .env
```
*(Fill in your Supabase and SendGrid credentials in `backend/.env`)*

Start the backend server:
```bash
npm run dev
# Server running at http://localhost:3001
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install

# Start the frontend dev server
npm run dev
# Application running at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```ini
PORT=3001
STORE_URL=https://demo.inelabteamdev.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
FRONTEND_URL=http://localhost:5173
CRON_SECRET=your-cron-secret-token
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:3001
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products/catalog` | Paginated catalog with category filters, sorting & search |
| `GET` | `/api/products` | Returns all actively tracked products with latest prices |
| `GET` | `/api/products/:id/details` | Returns product specifications, reviews, and latest spot |
| `POST` | `/api/products/:id/reveal-price` | Dispatches Playwright worker to bypass challenge and extract spot price |
| `POST` | `/api/products/:id/scrape` | Triggers a single product scrape attempt |
| `GET` | `/api/products/:id/history` | Returns historical price records for trajectory charts |
| `GET` | `/api/products/:id/logs` | Returns honest scrape audit logs (latency, status, errors) |
| `POST` | `/api/products/:id/track` | Adds a product to the active tracking watchlist |
| `DELETE` | `/api/products/:id/track` | Removes a product from active tracking |
| `POST` | `/api/products/sync-catalog` | Crawls the store to discover and register all 630+ products |
| `GET` | `/api/cron/scrape` | Automated 6-hour cron scraping endpoint |
| `POST` | `/api/alerts` | Creates a price drop or back-in-stock alert rule |
| `GET` | `/api/alerts/notifications` | Returns user notification queue |
| `PATCH` | `/api/alerts/notifications/:id/read` | Marks a notification as acknowledged |
| `POST` | `/api/auth/signup` | Registers a new operator account |
| `POST` | `/api/auth/login` | Authenticates operator credentials |

---

## 🛠️ CLI Testing Commands

Test scraper behaviors directly from the command line:

```bash
cd backend

# Scrape a specific product URL
node src/scraper/cli.js /product/888

# Run with a visible browser window to observe mouse interactions
node src/scraper/cli.js /product/888 --headed

# Trigger the catalog discovery crawler
npm run scrape:all
```

---

## 📑 Design Decisions

- **Why separate `price_history` and `scrape_log`?** Combining successes and failures into one table causes price graphs to break with `null` entries or swallows error visibility. Separating them keeps charting clean while recording 100% of execution attempts.
- **Why avoid `sleep()`?** Fixed sleeps either waste time or fail during multi-attempt WASM challenges. We use event-driven `waitForFunction` polling for settled class states.
- **Why native clicks?** Simulated JavaScript clicks set `isTrusted: false`, which the store's WebAssembly challenge detects and rejects.

For complete architectural notes, see [**`DESIGN_NOTE.md`**](./DESIGN_NOTE.md).

---

## 👤 Author

- **Janvi Gupta** — [GitHub Profile](https://github.com/janviii09)
