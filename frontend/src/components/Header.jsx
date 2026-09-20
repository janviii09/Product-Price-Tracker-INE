import { Activity, User, LogOut, LogIn } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Header({ trackedCount, lastScrapeTime, user, onOpenAuth, onLogout, onSelectProduct }) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo">₹</div>
        <div>
          <h1 className="app-header__title">INE Price Tracker</h1>
          <p className="app-header__subtitle">Real-time product price monitoring</p>
        </div>
      </div>

      <div className="app-header__stats" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="stat-badge">
          <Activity size={14} />
          <span>Tracking</span>
          <span className="stat-badge__value">{trackedCount}</span>
        </div>
        {lastScrapeTime && (
          <div className="stat-badge">
            <span>Last scrape</span>
            <span className="stat-badge__value">
              {new Date(lastScrapeTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* In-App Notification Center */}
        <NotificationCenter user={user} onSelectProduct={onSelectProduct} />

        {/* User Auth Controls */}
        {user ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#6366f1',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
              {user.name || user.email.split('@')[0]}
            </span>
            <button
              onClick={onLogout}
              className="btn btn--ghost btn--sm"
              title="Sign Out"
              style={{ padding: '0.2rem', marginLeft: '0.25rem' }}
            >
              <LogOut size={14} color="#94a3b8" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn btn--primary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem' }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
