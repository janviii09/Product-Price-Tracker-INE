import { useState } from 'react';
import { Package, ExternalLink, RefreshCw, Loader2, Trash2, Bell, ShieldCheck, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TrackedList({ products, selectedId, onSelect, onRefresh, loading, onSetAlert }) {
  const [scrapingId, setScrapingId] = useState(null);

  if (loading) {
    return (
      <div style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <Loader2 size={32} className="loading-spinner" style={{ color: 'var(--amber-primary)' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>LOADING ACTIVE WATCHLIST...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem 1.5rem',
        background: 'var(--bg-card)',
        border: '1px dashed var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '4px',
          background: 'rgba(232, 168, 56, 0.08)',
          border: '1px solid rgba(232, 168, 56, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: 'var(--amber-primary)',
        }}>
          <Package size={24} />
        </div>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
          NO ACTIVE TRACKING TARGETS
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
          Explore the Catalog registry and click "Track" to monitor price volatility and set alert triggers.
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
    if (!dateStr) return 'NEVER';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'JUST NOW';
    if (diffMin < 60) return `${diffMin}M AGO`;
    if (diffHr < 24) return `${diffHr}H AGO`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  const isInStock = (stockText) => {
    if (!stockText) return false;
    return !stockText.toLowerCase().includes('out of stock');
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        marginBottom: '1rem',
        fontFamily: 'var(--font-mono)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          <Activity size={16} color="var(--amber-primary)" />
          <span>ACTIVE TELEMETRY TARGETS</span>
          <span style={{
            background: 'var(--amber-dim)',
            color: 'var(--amber-bright)',
            padding: '0.15rem 0.4rem',
            borderRadius: '2px',
            fontSize: '0.7rem',
          }}>
            {products.length}
          </span>
        </div>

        <button
          className="btn btn--outline"
          onClick={onRefresh}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '0.3rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <RefreshCw size={12} />
          <span>POLL ALL</span>
        </button>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
      }}>
        {products.map((item, idx) => {
          const product = item.products;
          const latest = item.latestPrice;
          const isSelected = selectedId === product?.id;

          return (
            <div
              key={`${item.id || 'item'}-${idx}`}
              className={`product-card fade-in ${isSelected ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                background: isSelected ? 'rgba(232, 168, 56, 0.04)' : 'var(--bg-card)',
                border: isSelected ? '1px solid var(--amber-primary)' : '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onClick={() => onSelect?.(product?.id)}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: 'var(--amber-primary)',
                    textTransform: 'uppercase',
                  }}>
                    {product?.brand || 'MONITORED'}
                  </span>

                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}>
                    {product?.category}
                  </span>
                </div>

                <h4 style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.75rem 0',
                  lineHeight: 1.3,
                }}>
                  {product?.name}
                </h4>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  marginBottom: '0.75rem',
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.05em',
                    }}>
                      LATEST SPOT
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--amber-bright)',
                    }}>
                      {latest ? formatPrice(latest.price) : 'PENDING'}
                    </div>
                  </div>

                  {latest && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '2px',
                      background: isInStock(latest.stock) ? 'rgba(0, 212, 170, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isInStock(latest.stock) ? 'var(--teal-status)' : '#f87171',
                      border: `1px solid ${isInStock(latest.stock) ? 'rgba(0, 212, 170, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}>
                      {isInStock(latest.stock) ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.6rem',
                borderTop: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {latest ? formatTime(latest.scraped_at) : 'NO TELEMETRY'}
                </span>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn btn--outline"
                    title={scrapingId === product?.id ? 'Scraping...' : 'Trigger Immediate Scrape'}
                    disabled={scrapingId === product?.id}
                    onClick={(e) => handleScrapeNow(e, product?.id)}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    {scrapingId === product?.id ? (
                      <Loader2 size={12} className="loading-spinner" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                  </button>

                  <button
                    className="btn btn--outline"
                    title="Configure Alert Trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetAlert?.(product);
                    }}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    <Bell size={12} />
                  </button>

                  {product?.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--outline"
                      title="Open Merchant Page"
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}

                  <button
                    className="btn btn--outline"
                    title="Remove Tracking"
                    onClick={(e) => handleUntrack(e, product?.id)}
                    style={{
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.7rem',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
