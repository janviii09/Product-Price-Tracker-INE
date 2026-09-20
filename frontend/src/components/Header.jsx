import { Activity, User, LogOut, LogIn } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Header({ trackedCount, lastScrapeTime, user, onOpenAuth, onLogout, onSelectProduct }) {
  const formatTime = (t) => {
    if (!t) return null;
    return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo">₹</div>
        <div>
          <h1 className="app-header__title">
            INE Price Tracker
            <span className="app-header__version">v2.4 Live Engine</span>
          </h1>
        </div>
      </div>

      <div className="app-header__center">
        <div className="stat-badge stat-badge--online">
          <span style={{ fontWeight: 600, color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Online
          </span>
        </div>

        {trackedCount > 0 && (
          <div className="stat-badge" style={{ borderColor: 'rgba(232, 168, 56, 0.25)' }}>
            <span style={{ color: '#00d4aa', fontSize: '0.5rem' }}>●</span>
            <span style={{ color: '#e8a838', fontWeight: 600 }}>Tracking {trackedCount} items</span>
          </div>
        )}

        {lastScrapeTime && (
          <div className="stat-badge">
            <Activity size={12} />
            <span>Scrape Cycle:</span>
            <span className="stat-badge__value">{formatTime(lastScrapeTime)}</span>
          </div>
        )}
      </div>

      <div className="app-header__stats">
        {/* Notification Center */}
        <NotificationCenter user={user} onSelectProduct={onSelectProduct} />

        {/* Auth */}
        {user ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.3rem 0.65rem',
            borderRadius: '5px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #e8a838, #c48a20)',
              color: '#080b12',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#e6edf3',
              fontFamily: 'var(--font-mono)',
            }}>
              {user.name || user.email.split('@')[0]}
            </span>
            <button
              onClick={onLogout}
              className="btn btn--ghost btn--sm"
              title="Sign Out"
              style={{ padding: '0.15rem', marginLeft: '0.15rem' }}
            >
              <LogOut size={13} color="#8b949e" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn btn--ghost btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}

        <div className="stat-badge" style={{ padding: '0.25rem 0.5rem' }}>
          <span style={{ fontWeight: 700, color: '#e8a838', fontFamily: 'var(--font-mono)' }}>₹</span>
          <span>INR</span>
        </div>
      </div>
    </header>
  );
}
