# ──────────────────────────────────────────────────
# INE Price Tracker Backend — Production Dockerfile
# Designed for Render / Railway / any Docker host
# ──────────────────────────────────────────────────

FROM node:20-slim

# Install system dependencies that Playwright Chromium needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Playwright Chromium browser (no --with-deps needed, we installed libs above)
RUN npx playwright install chromium

# Copy application source
COPY . .

# Expose port (Render injects PORT env var automatically)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

CMD ["node", "src/server.js"]
