import { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Loader2, Terminal, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? `${API_BASE}/api/auth/signup` : `${API_BASE}/api/auth/login`;
      const body = mode === 'signup' ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save user session to localStorage for persistence across reloads
      if (data.user) {
        localStorage.setItem('ine_user', JSON.stringify(data.user));
        if (data.session?.access_token) {
          localStorage.setItem('ine_token', data.session.access_token);
        }
        onAuthSuccess?.(data.user);
        onClose();
      }
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
        style={{
          maxWidth: '440px',
          width: '90%',
          padding: '2rem',
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

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--amber-primary)',
            letterSpacing: '0.08em',
            marginBottom: '0.4rem',
          }}>
            <Terminal size={14} />
            <span>INE PULSE TERMINAL // AUTH ENGINE</span>
          </div>

          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 0.3rem 0',
            letterSpacing: '-0.01em',
          }}>
            {mode === 'signup' ? 'REGISTER OPERATOR' : 'SIGN IN TO WORKSPACE'}
          </h2>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}>
            {mode === 'signup'
              ? 'CONFIGURE ACCESS KEY FOR AUTOMATED ALERT DISPATCH'
              : 'ENTER CREDENTIALS TO ACCESS TELEMETRY ALERTS'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            color: '#f87171',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
                marginBottom: '0.4rem',
              }}>
                OPERATOR IDENTITY
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--amber-primary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Operator Zero"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
          )}

          <div>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              marginBottom: '0.4rem',
            }}>
              OPERATOR EMAIL
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
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              marginBottom: '0.4rem',
            }}>
              ACCESS KEY / TOKEN
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="var(--amber-primary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="btn btn--primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'var(--amber-primary)',
              color: '#080b12',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="loading-spinner" />
                <span>AUTHORIZING...</span>
              </>
            ) : mode === 'signup' ? (
              'CREATE ACCESS RECORD →'
            ) : (
              'AUTHORIZE & ENTER WORKSPACE →'
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          {mode === 'signup' ? (
            <span>
              EXISTING OPERATOR?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--amber-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                SIGN IN
              </button>
            </span>
          ) : (
            <span>
              NEW OPERATOR?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--amber-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                REQUEST ACCESS
              </button>
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--teal-status)' }}>
            <Shield size={12} />
            <span>256-BIT TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
