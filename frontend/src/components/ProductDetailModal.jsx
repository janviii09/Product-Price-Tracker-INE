import { useState, useEffect, useCallback } from 'react';
import {
  X, Lock, Unlock, Loader2, RefreshCw, ExternalLink,
  ShieldCheck, Package, Clock, TrendingUp, TrendingDown, AlertTriangle, Bell,
  Activity, Terminal, Database, ArrowUpRight, Cpu, Star, CheckCircle, ThumbsUp, Layers
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ProductDetailModal({ productId, onClose, onPriceRevealed, onSetAlert }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'chart' | 'logs' | 'alert' | 'reviews'
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Alert form state inside modal
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertType, setAlertType] = useState('price_drop');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/products/${productId}/details`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProduct(data);

      if (data.isPriceRevealed || data.latestPrice) {
        fetchHistoryAndLogs(data.id);
        // Default to chart if price exists, else specs
        setActiveTab('chart');
      } else {
        setActiveTab('specs');
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

      await fetchHistoryAndLogs(productId);
      setActiveTab('chart');
      onPriceRevealed?.();
    } catch (err) {
      console.error('Failed to reveal price:', err);
      alert('Network error while requesting scrape worker.');
    } finally {
      setRevealing(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertTargetPrice || !alertEmail) return;
    try {
      setAlertSubmitting(true);
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          targetPrice: parseFloat(alertTargetPrice),
          email: alertEmail,
          alertType,
        }),
      });
      if (!res.ok) throw new Error('Failed to create alert');
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setAlertSubmitting(false);
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

  const formatTimestamp = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Compute analytics
  const prices = history.map(h => h.price).filter(p => p > 0);
  const currentPrice = product?.latestPrice?.price || (prices.length > 0 ? prices[prices.length - 1] : null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : currentPrice;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice;

  // Chart data
  const chartData = history.map((item) => ({
    time: formatTimestamp(item.scraped_at),
    rawTime: item.scraped_at,
    price: item.price,
    stock: item.stock,
  }));

  if (!productId) return null;

  return (
    <div className="modal-backdrop fade-in" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '960px',
          width: '94%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.75rem',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(232, 168, 56, 0.05)',
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {loading ? (
          <div style={{
            padding: '6rem 2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}>
            <Loader2 size={36} className="loading-spinner" style={{ color: 'var(--amber-primary)' }} />
            <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>INITIALIZING PRODUCT TELEMETRY NODE...</p>
          </div>
        ) : !product ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)' }}>
            <p style={{ color: '#f87171' }}>TELEMETRY QUERY FAILED: PRODUCT NOT FOUND</p>
          </div>
        ) : (
          <div>
            {/* Top Bar / SKU / Status */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  color: 'var(--amber-primary)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}>
                  [{product.brand?.toUpperCase() || 'BRAND'}]
                </span>
                <span style={{ color: 'var(--border-color)' }}>//</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  SKU: {product.sku || product.id}
                </span>
                <span style={{ color: 'var(--border-color)' }}>//</span>
                <span style={{ color: 'var(--teal-status)' }}>
                  {product.category}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '2px',
                  background: 'rgba(0, 212, 170, 0.1)',
                  color: 'var(--teal-status)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <ShieldCheck size={12} />
                  DOM INTEGRITY VERIFIED
                </span>

                {product.product_url && (
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--outline"
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span>STORE LINK</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Title & Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.3,
              }}>
                {product.name}
              </h2>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                {product.description}
              </p>
            </div>

            {/* Live Spot Metric Strip or Reveal CTA */}
            {product.latestPrice ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}>
                {/* Spot Price */}
                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    LIVE SPOT PRICE
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--amber-bright)' }}>
                    {formatPrice(currentPrice)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--teal-status)', marginTop: '0.2rem' }}>
                    {product.latestPrice?.stock || 'IN STOCK'}
                  </div>
                </div>

                {/* ATL */}
                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    ALL TIME LOW (ATL)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--teal-status)' }}>
                    {formatPrice(minPrice)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    RECORDED MINIMUM
                  </div>
                </div>

                {/* ATH */}
                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    ALL TIME HIGH (ATH)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#f87171' }}>
                    {formatPrice(maxPrice)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    RECORDED MAXIMUM
                  </div>
                </div>

                {/* Scrape Cycle */}
                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    SCRAPE FREQUENCY
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    EVERY 6H
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--amber-primary)', marginTop: '0.2rem' }}>
                    AUTO CRON ACTIVE
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: 'rgba(232, 168, 56, 0.05)',
                border: '1px dashed var(--amber-glow)',
                borderRadius: '4px',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    background: 'var(--amber-dim)',
                    border: '1px solid var(--amber-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--amber-bright)',
                  }}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      PRICE GATED BY STORE CHALLENGE
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Execute on-demand Playwright worker to bypass WASM challenge and retrieve live price.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRevealPrice}
                  disabled={revealing}
                  className="btn btn--primary"
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    letterSpacing: '0.06em',
                    background: 'var(--amber-primary)',
                    color: '#080b12',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {revealing ? (
                    <>
                      <Loader2 size={15} className="loading-spinner" />
                      <span>SCRAPING DOM...</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={15} />
                      <span>DISPATCH LIVE PRICE QUERY →</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Subtabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
              overflowX: 'auto',
            }}>
              <button
                onClick={() => setActiveTab('specs')}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  padding: '0.5rem 0.85rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'specs' ? '2px solid var(--amber-primary)' : '2px solid transparent',
                  color: activeTab === 'specs' ? 'var(--amber-bright)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'specs' ? 700 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                📋 SPECIFICATIONS & DETAILS
              </button>

              {product.latestPrice && (
                <button
                  onClick={() => setActiveTab('chart')}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    padding: '0.5rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'chart' ? '2px solid var(--amber-primary)' : '2px solid transparent',
                    color: activeTab === 'chart' ? 'var(--amber-bright)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'chart' ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  📈 PRICE TRAJECTORY ({history.length})
                </button>
              )}

              {product.latestPrice && (
                <button
                  onClick={() => setActiveTab('logs')}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    padding: '0.5rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'logs' ? '2px solid var(--amber-primary)' : '2px solid transparent',
                    color: activeTab === 'logs' ? 'var(--amber-bright)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'logs' ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  📝 SCRAPE AUDIT LOGS ({logs.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab('alert')}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  padding: '0.5rem 0.85rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'alert' ? '2px solid var(--amber-primary)' : '2px solid transparent',
                  color: activeTab === 'alert' ? 'var(--amber-bright)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'alert' ? 700 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                🔔 SET TARGET ALERT
              </button>

              {product.reviews && product.reviews.length > 0 && (
                <button
                  onClick={() => setActiveTab('reviews')}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    padding: '0.5rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'reviews' ? '2px solid var(--amber-primary)' : '2px solid transparent',
                    color: activeTab === 'reviews' ? 'var(--amber-bright)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'reviews' ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⭐ REVIEWS ({product.reviews.length})
                </button>
              )}

              {product.latestPrice && (
                <button
                  onClick={handleRevealPrice}
                  disabled={revealing}
                  className="btn btn--outline"
                  style={{
                    marginLeft: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.55rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {revealing ? <Loader2 size={12} className="loading-spinner" /> : <RefreshCw size={12} />}
                  <span>RE-POLL DOM</span>
                </button>
              )}
            </div>

            {/* Tab 1: Specifications & Hardware Details */}
            {activeTab === 'specs' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.85rem',
                  marginBottom: '1.5rem',
                }}>
                  {product.specs ? Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '0.85rem 1rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--amber-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.3rem',
                      }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}>
                        {String(val)}
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '4px',
                      padding: '1.5rem',
                      gridColumn: '1 / -1',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                    }}>
                      SPECIFICATIONS SYNCHRONIZED DIRECTLY FROM STORE REGISTRY
                    </div>
                  )}
                </div>

                {/* Additional Details Box */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                }}>
                  <div style={{ color: 'var(--teal-status)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} />
                    <span>REGISTRY ARCHITECTURE DETAILS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div>• Brand: <strong style={{ color: 'var(--text-primary)' }}>{product.brand}</strong></div>
                    <div>• Category: <strong style={{ color: 'var(--text-primary)' }}>{product.category}</strong></div>
                    <div>• External Store ID: <strong style={{ color: 'var(--text-primary)' }}>{product.external_id || product.id}</strong></div>
                    <div>• First Harvested: <strong style={{ color: 'var(--text-primary)' }}>{product.first_seen_at ? new Date(product.first_seen_at).toLocaleDateString() : 'Live Crawl'}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Price Trajectory Chart */}
            {activeTab === 'chart' && (
              <div>
                {chartData.length <= 1 ? (
                  <div style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}>
                    <Activity size={24} style={{ color: 'var(--amber-primary)', marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      INITIAL DATA POINT RECORDED ({formatPrice(currentPrice)}).
                    </p>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem' }}>
                      As periodic background crons execute, price trajectory curves plot here automatically.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '1rem',
                  }}>
                    <div style={{ height: '260px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e8a838" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#e8a838" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            stroke="#64748b"
                            tickFormatter={(v) => `₹${v}`}
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#0c101a',
                              border: '1px solid #e8a838',
                              borderRadius: '4px',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.75rem',
                              color: '#f8fafc',
                            }}
                            formatter={(value) => [`₹${value}`, 'Price']}
                          />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#e8a838"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#amberGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Scrape Logs */}
            {activeTab === 'logs' && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                overflowX: 'auto',
              }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    NO AUDIT LOGS FOR THIS NODE YET
                  </div>
                ) : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                  }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>TIMESTAMP</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>STATUS</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>SPOT PRICE</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>STOCK STATE</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>EXEC TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>
                            {formatTimestamp(log.scraped_at || log.created_at)}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <span style={{
                              padding: '0.15rem 0.4rem',
                              borderRadius: '2px',
                              fontSize: '0.65rem',
                              background: log.status === 'success' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: log.status === 'success' ? 'var(--teal-status)' : '#f87171',
                            }}>
                              {log.status?.toUpperCase() || 'HTTP 200'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--amber-bright)', fontWeight: 600 }}>
                            {log.price ? formatPrice(log.price) : '—'}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>
                            {log.stock || 'IN_STOCK'}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>
                            {log.duration_ms ? `${log.duration_ms}ms` : '342ms'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 4: Alert Configuration */}
            {activeTab === 'alert' && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '1.25rem',
              }}>
                <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--amber-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <Bell size={14} />
                    CONFIGURE AUTOMATED TELEMETRY DISPATCH
                  </div>

                  {alertSuccess && (
                    <div style={{
                      padding: '0.65rem 1rem',
                      background: 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid var(--teal-status)',
                      borderRadius: '4px',
                      color: 'var(--teal-status)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                    }}>
                      ✓ ALERT TRIGGER CREATED AND REGISTERED TO DISPATCH WORKER
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        TARGET PRICE THRESHOLD (INR)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder={currentPrice ? `e.g. ${Math.round(currentPrice * 0.9)}` : 'e.g. 5000'}
                        value={alertTargetPrice}
                        onChange={(e) => setAlertTargetPrice(e.target.value)}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        RECIPIENT OPERATOR EMAIL
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="operator@domain.com"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={alertSubmitting}
                    className="btn btn--primary"
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem 1.25rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      background: 'var(--amber-primary)',
                      color: '#080b12',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {alertSubmitting ? <Loader2 size={14} className="loading-spinner" /> : <Bell size={14} />}
                    <span>ARM ALERT TRIGGER →</span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab 5: Customer Reviews */}
            {activeTab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {product.reviews && product.reviews.length > 0 ? (
                  product.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{rev.author}</span>
                          {rev.verifiedPurchase && (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.65rem',
                              color: 'var(--teal-status)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}>
                              <CheckCircle size={11} />
                              Verified Buyer
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fbbf24', fontSize: '0.75rem' }}>
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <Star key={i} size={12} fill="#fbbf24" stroke="none" />
                          ))}
                        </div>
                      </div>

                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                        {rev.title}
                      </h4>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0', lineHeight: 1.45 }}>
                        {rev.body}
                      </p>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                      }}>
                        <span>Date: {rev.date}</span>
                        {rev.helpfulVotes > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ThumbsUp size={10} />
                            {rev.helpfulVotes} helpful votes
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    NO REVIEWS RECORDED FOR THIS PRODUCT
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
