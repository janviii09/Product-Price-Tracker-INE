import { useState, useEffect } from 'react';
import { X, Bell, Mail, TrendingDown, Package, Check, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SetAlertModal({ isOpen, onClose, product, user, onAlertSaved }) {
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [onPriceDrop, setOnPriceDrop] = useState(true);
  const [onBackInStock, setOnBackInStock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (product?.latestPrice?.price) {
      // Default suggested target price: 5% lower than current price
      const suggested = Math.floor(product.latestPrice.price * 0.95);
      setTargetPrice(suggested);
    }
    setError(null);
    setSuccess(false);
  }, [user, product, isOpen]);

  if (!isOpen || !product) return null;

  const currentPrice = product.latestPrice?.price || product.price;

  const formatPrice = (p) => {
    if (!p) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(p);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please provide a valid email address');
      }

      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          userEmail: email,
          productId: product.id,
          targetPrice: targetPrice ? Number(targetPrice) : null,
          onPriceDrop,
          onBackInStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save alert rule');
      }

      setSuccess(true);
      onAlertSaved?.(data.rule);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fade-in" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', width: '90%', padding: '2rem' }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bell size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Set Price & Stock Alert
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              We'll notify you automatically when prices change
            </p>
          </div>
        </div>

        {/* Product summary card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>{product.brand || product.category}</div>
          <div style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>{product.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Current Price:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatPrice(currentPrice)}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{
            padding: '1.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#34d399',
          }}>
            <Check size={36} style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Alert Activated!</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
              We will send updates directly to <strong>{email}</strong>.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Your Email (for SendGrid notifications)
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Target Price Threshold (₹ INR)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>₹</span>
                <input
                  type="number"
                  placeholder="e.g. 18000"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Leave empty to be alerted on ANY price decrease.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onPriceDrop}
                  onChange={(e) => setOnPriceDrop(e.target.checked)}
                  style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                />
                <TrendingDown size={16} color="#818cf8" />
                <span>Notify me whenever the price drops</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onBackInStock}
                  onChange={(e) => setOnBackInStock(e.target.checked)}
                  style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                />
                <Package size={16} color="#34d399" />
                <span>Notify me when item comes back in stock</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary"
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="loading-spinner" />
                  <span>Saving Alert...</span>
                </>
              ) : (
                <>
                  <Bell size={16} />
                  <span>Activate Alert</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
