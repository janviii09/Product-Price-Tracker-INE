import { useState, useEffect } from 'react';
import { X, Bell, Mail, TrendingDown, Package, Check, Loader2, AlertCircle, Terminal } from 'lucide-react';

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
        throw new Error('Please provide a valid operator email address');
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
        throw new Error(data.error || 'Failed to save alert trigger');
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
    <div className="modal-backdrop fade-in" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '90%',
          padding: '1.75rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(232, 168, 56, 0.05)',
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
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
            <Bell size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--amber-primary)', letterSpacing: '0.06em' }}>
              TELEMETRY DISPATCH TRIGGER
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Arm Price & Stock Alert
            </h3>
          </div>
        </div>

        {/* Product summary pill */}
        <div style={{
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          marginBottom: '1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
        }}>
          <div style={{ color: 'var(--amber-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
            [{product.brand?.toUpperCase()}] {product.name}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            CURRENT SPOT: <span style={{ color: 'var(--amber-bright)', fontWeight: 700 }}>{formatPrice(currentPrice)}</span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.65rem 0.85rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            color: '#f87171',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            padding: '0.65rem 0.85rem',
            background: 'rgba(0, 212, 170, 0.08)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            borderRadius: '4px',
            color: 'var(--teal-status)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '1rem',
          }}>
            <Check size={14} />
            <span>ALERT TRIGGER ARMED AND RECORDED!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              OPERATOR EMAIL FOR DISPATCH
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="var(--amber-primary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                placeholder="operator@ine.telemetry"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              PRICE DROP THRESHOLD (INR)
            </label>
            <input
              type="number"
              placeholder={currentPrice ? `Target ≤ ${Math.floor(currentPrice * 0.95)}` : 'Enter target price'}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.65rem 0.75rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onPriceDrop}
                onChange={(e) => setOnPriceDrop(e.target.checked)}
                style={{ accentColor: 'var(--amber-primary)' }}
              />
              <span>Trigger when spot drops below threshold</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onBackInStock}
                onChange={(e) => setOnBackInStock(e.target.checked)}
                style={{ accentColor: 'var(--amber-primary)' }}
              />
              <span>Trigger on Back-in-Stock restock events</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="btn btn--primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              background: 'var(--amber-primary)',
              color: '#080b12',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="loading-spinner" />
                <span>SAVING TRIGGER...</span>
              </>
            ) : (
              <>
                <Bell size={15} />
                <span>ARM DISPATCH TRIGGER →</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
