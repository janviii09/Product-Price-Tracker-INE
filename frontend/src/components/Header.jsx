import { Activity } from 'lucide-react';

export default function Header({ trackedCount, lastScrapeTime }) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo">₹</div>
        <div>
          <h1 className="app-header__title">INE Price Tracker</h1>
          <p className="app-header__subtitle">Real-time product price monitoring</p>
        </div>
      </div>

      <div className="app-header__stats">
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
      </div>
    </header>
  );
}
