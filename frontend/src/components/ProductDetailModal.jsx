import { useState, useEffect, useCallback } from 'react';
import {
  X, Lock, Unlock, Loader2, RefreshCw, ExternalLink,
  ShieldCheck, Package, Clock, TrendingUp, AlertTriangle, Bell,
  Headphones, Laptop, Monitor, MousePointer, Briefcase, Footprints, Zap, Home, Watch, Utensils
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Category icon helper
function getCategoryIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('audio')) return <Headphones size={28} color="#818cf8" />;
  if (c.includes('laptop')) return <Laptop size={28} color="#38bdf8" />;
  if (c.includes('monitor')) return <Monitor size={28} color="#a855f7" />;
  if (c.includes('peripheral')) return <MousePointer size={28} color="#f472b6" />;
  if (c.includes('bag')) return <Briefcase size={28} color="#fbbf24" />;
  if (c.includes('footwear')) return <Footprints size={28} color="#34d399" />;
  if (c.includes('power')) return <Zap size={28} color="#f59e0b" />;
  if (c.includes('smart')) return <Home size={28} color="#10b981" />;
  if (c.includes('wearable')) return <Watch size={28} color="#6366f1" />;
  if (c.includes('kitchen')) return <Utensils size={28} color="#ec4899" />;
  return <Package size={28} color="#94a3b8" />;
}

export default function ProductDetailModal({ productId, onClose, onPriceRevealed, onSetAlert }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'chart' | 'logs'
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/products/${productId}/details`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProduct(data);

      // If price was already revealed, fetch history & logs
      if (data.isPriceRevealed || data.latestPrice) {
        fetchHistoryAndLogs(data.id);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchHistoryAndLogs = async (id) => {
    try {
      const [histRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/products/${id}/history`),
        fetch(`${API_BASE}/api/products/${id}/logs`),
      ]);
      if (histRes.ok) setHistory(await histRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (e) {
      console.warn('Failed to load history/logs:', e);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchDetails();
    }
  }, [productId, fetchDetails]);

  // Handle "Reveal Price" click
  const handleRevealPrice = async () => {
    try {
      setRevealing(true);
      const res = await fetch(`${API_BASE}/api/products/${productId}/reveal-price`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`Scrape failed: ${data.message || data.error}`);
        return;
      }

      // Update product with revealed price
      setProduct(prev => ({
        ...prev,
        latestPrice: {
          price: data.price,
          stock: data.stock,
          scraped_at: data.scraped_at,
          mrpText: data.mrpText,
        },
        isPriceRevealed: true,
      }));

      // Refresh history & logs
      await fetchHistoryAndLogs(productId);
      setActiveTab('chart');
      onPriceRevealed?.();
    } catch (err) {
      console.error('Reveal price error:', err);
      alert('Error revealing price. Check your internet connection.');
    } finally {
      setRevealing(false);
    }
  };

  const formatPrice = (p) => {
    if (!p && p !== 0) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(p);
  };

  const formatTime = (ts) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!productId) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'var(--surface-color, #131722)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            zIndex: 10,
          }}
        >
          <X size={18} />
        </button>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={36} className="loading-spinner" />
            <p style={{ marginTop: '1rem' }}>Loading product details...</p>
          </div>
        ) : !product ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Product could not be loaded.</p>
          </div>
        ) : (
          <div>
            {/* Header / Media Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))',
              padding: '2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'center',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {getCategoryIcon(product.category)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#818cf8',
                  }}>
                    {product.brand}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '8px',
                  }}>
                    {product.category}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    SKU {product.sku}
                  </span>
                </div>

                <h1 style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem 0',
                  lineHeight: 1.25,
                }}>
                  {product.name}
                </h1>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.45,
                }}>
                  {product.description}
                </p>
              </div>
            </div>

            {/* Price Showcase Card — 🔒 Reveal Price Flow */}
            <div style={{
              margin: '1.5rem',
              padding: '1.25rem 1.5rem',
              borderRadius: '14px',
              background: product.latestPrice
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.04))',
              border: product.latestPrice
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: product.latestPrice ? '#34d399' : '#fbbf24',
                  marginBottom: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  {product.latestPrice ? <Unlock size={14} /> : <Lock size={14} />}
                  {product.latestPrice ? 'Live Store Price' : 'Price Status (Anti-Bot Protected)'}
                </div>

                {product.latestPrice ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatPrice(product.latestPrice.price)}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: (product.latestPrice.stock || '').toLowerCase().includes('out of stock') ? '#f87171' : '#34d399',
                      background: (product.latestPrice.stock || '').toLowerCase().includes('out of stock') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid currentColor',
                    }}>
                      📦 {product.latestPrice.stock}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Scraped {formatTime(product.latestPrice.scraped_at)}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                    Price is hidden behind the store's anti-bot verification. Click to reveal live price.
                  </div>
                )}
              </div>

              {/* Reveal / Refresh Action Button */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {product.latestPrice ? (
                  <>
                    <button
                      className="btn btn--primary"
                      disabled={revealing}
                      onClick={handleRevealPrice}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                    >
                      {revealing ? (
                        <>
                          <Loader2 size={16} className="loading-spinner" />
                          Scraping Live Store...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Re-Scrape Live Price
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn--ghost"
                      onClick={() => onSetAlert?.(product)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}
                      title="Configure price-drop & back-in-stock alert"
                    >
                      <Bell size={16} color="#818cf8" />
                      <span>Set Alert</span>
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn--primary"
                    disabled={revealing}
                    onClick={handleRevealPrice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {revealing ? (
                      <>
                        <Loader2 size={18} className="loading-spinner" />
                        Bypassing Challenge & Scraping...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        🔒 Reveal Price
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              padding: '0 1.5rem',
              marginBottom: '1.25rem',
            }}>
              <button
                className={`tab ${activeTab === 'specs' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                📋 Specifications
              </button>

              {product.latestPrice && (
                <>
                  <button
                    className={`tab ${activeTab === 'chart' ? 'tab--active' : ''}`}
                    onClick={() => setActiveTab('chart')}
                  >
                    📈 Price History ({history.length})
                  </button>
                  <button
                    className={`tab ${activeTab === 'logs' ? 'tab--active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                  >
                    📝 Scrape Logs ({logs.length})
                  </button>
                </>
              )}

              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                }}
              >
                <span>View on demo store</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
              {activeTab === 'specs' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}>
                  {product.specs ? Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}>
                        {k.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {String(v)}
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                      gridColumn: '1 / -1',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}>
                      Full specifications can be inspected directly on the store listing.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chart' && (
                <div>
                  {history.length > 0 ? (
                    <div style={{ height: '240px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history.map(h => ({
                          time: new Date(h.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          price: Number(h.price),
                        }))}>
                          <defs>
                            <linearGradient id="detailPriceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                          <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                          <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} fill="url(#detailPriceGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                      No historical price data recorded yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="logs-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Attempt</th>
                        <th>Duration</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l, i) => (
                        <tr key={l.id || i}>
                          <td>{formatTime(l.attempted_at)}</td>
                          <td>
                            <span className={`status-badge status-badge--${l.status}`}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{l.attempt_number}</td>
                          <td>{l.duration_ms ? `${l.duration_ms}ms` : '—'}</td>
                          <td style={{ color: l.error_message ? '#f87171' : 'var(--text-muted)' }}>
                            {l.error_message || 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
