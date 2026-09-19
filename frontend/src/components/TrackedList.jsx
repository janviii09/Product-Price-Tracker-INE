import { useState } from 'react';
import { Package, ExternalLink, RefreshCw, Loader2, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TrackedList({ products, selectedId, onSelect, onRefresh, loading }) {
  const [scrapingId, setScrapingId] = useState(null);

  if (loading) {
    return (
      <div className="empty-state fade-in">
        <Loader2 size={32} className="loading-spinner" />
        <p className="empty-state__title" style={{ marginTop: '1rem' }}>Loading tracked products...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state__icon">📦</div>
        <p className="empty-state__title">No products tracked yet</p>
        <p className="empty-state__text">
          Search for products above and click "Track" to start monitoring their prices.
        </p>
      </div>
    );
  }

  const handleScrapeNow = async (e, productId) => {
    e.stopPropagation();
    try {
      setScrapingId(productId);
      await fetch(`${API_BASE}/api/products/${productId}/scrape`, { method: 'POST' });
      onRefresh?.();
    } catch (err) {
      console.error('Scrape failed:', err);
    } finally {
      setScrapingId(null);
    }
  };

  const handleUntrack = async (e, productId) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/products/${productId}/track`, { method: 'DELETE' });
      onRefresh?.();
    } catch (err) {
      console.error('Untrack failed:', err);
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const isInStock = (stockText) => {
    if (!stockText) return false;
    return !stockText.toLowerCase().includes('out of stock');
  };

  return (
    <div>
      <div className="section-title">
        <Package size={18} />
        Tracked Products ({products.length})
        <button
          className="btn btn--ghost btn--sm"
          onClick={onRefresh}
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="products-grid">
        {products.map((item, idx) => {
          const product = item.products;
          const latest = item.latestPrice;
          const isSelected = selectedId === product?.id;

          return (
            <div
              key={`${item.id || 'item'}-${idx}`}
              className={`product-card fade-in ${isSelected ? 'active' : ''}`}
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => onSelect?.(product?.id)}
            >
              <div className="product-card__header">
                <div>
                  <div className="product-card__brand">{product?.brand}</div>
                  <div className="product-card__name">{product?.name}</div>
                </div>
                <span className="search-result-item__category">{product?.category}</span>
              </div>

              <div className="product-card__price-row">
                {latest ? (
                  <>
                    <span className="product-card__price">
                      {formatPrice(latest.price)}
                    </span>
                    <span className={`product-card__stock ${isInStock(latest.stock) ? 'product-card__stock--in' : 'product-card__stock--out'}`}>
                      {latest.stock}
                    </span>
                  </>
                ) : (
                  <span className="product-card__price product-card__price--empty">
                    Awaiting first scrape...
                  </span>
                )}
              </div>

              <div className="product-card__footer">
                <span className="product-card__time">
                  {latest ? formatTime(latest.scraped_at) : 'No data yet'}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    title={scrapingId === product?.id ? 'Scraping...' : 'Scrape now'}
                    disabled={scrapingId === product?.id}
                    onClick={(e) => handleScrapeNow(e, product?.id)}
                  >
                    {scrapingId === product?.id ? (
                      <Loader2 size={13} className="loading-spinner" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    title="Untrack"
                    onClick={(e) => handleUntrack(e, product?.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                  <a
                    href={product?.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost btn--sm"
                    title="Open in store"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
