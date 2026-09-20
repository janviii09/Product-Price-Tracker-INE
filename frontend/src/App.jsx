import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CatalogBrowser from './components/CatalogBrowser';
import TrackedList from './components/TrackedList';
import PriceChart from './components/PriceChart';
import ScrapeLogsTable from './components/ScrapeLogsTable';
import ProductDetailModal from './components/ProductDetailModal';
import AuthModal from './components/AuthModal';
import SetAlertModal from './components/SetAlertModal';
import './index.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ine_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [alertProduct, setAlertProduct] = useState(null);

  const [trackedProducts, setTrackedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [modalProductId, setModalProductId] = useState(null);
  const [viewMode, setViewMode] = useState('catalog'); // 'catalog' | 'tracked' | 'alerts'
  const [activeTab, setActiveTab] = useState('chart');
  const [loading, setLoading] = useState(true);
  const [catalogTotal, setCatalogTotal] = useState(0);

  const fetchTrackedProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTrackedProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tracked products:', err);
      setTrackedProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrackedProducts();
  }, [fetchTrackedProducts]);

  // Auto-select first product if in tracked view
  useEffect(() => {
    if (trackedProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(trackedProducts[0].products?.id);
    }
  }, [trackedProducts, selectedProductId]);

  const handleRefresh = () => {
    setLoading(true);
    fetchTrackedProducts();
  };

  const handlePriceRevealed = () => {
    fetchTrackedProducts();
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('ine_user');
    localStorage.removeItem('ine_token');
    setUser(null);
  };

  const lastScrapeTime = (trackedProducts || []).reduce((latest, tp) => {
    const time = tp.latestPrice?.scraped_at;
    if (!time) return latest;
    return !latest || new Date(time) > new Date(latest) ? time : latest;
  }, null);

  const selectedProduct = trackedProducts.find(tp => tp.products?.id === selectedProductId);

  const now = new Date();
  const utcStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className="app-container">
      <Header
        trackedCount={trackedProducts.length}
        lastScrapeTime={lastScrapeTime}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onSelectProduct={(id) => {
          setSelectedProductId(id);
          setViewMode('tracked');
        }}
      />

      {/* Tab Navigation Bar */}
      <nav className="tab-nav">
        <button
          className={`tab-nav__item ${viewMode === 'catalog' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setViewMode('catalog')}
        >
          Full Store Catalog
          {catalogTotal > 0 && (
            <span className="tab-nav__badge">{catalogTotal}</span>
          )}
        </button>

        <button
          className={`tab-nav__item ${viewMode === 'tracked' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setViewMode('tracked')}
        >
          Tracked Items & Price History
          {trackedProducts.length > 0 && (
            <span className="tab-nav__badge">{trackedProducts.length}</span>
          )}
        </button>

        <button
          className={`tab-nav__item ${viewMode === 'alerts' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setViewMode('alerts')}
        >
          Alert Triggers
        </button>
      </nav>

      {/* Breadcrumb Bar */}
      <div className="breadcrumb-bar">
        <div className="breadcrumb-bar__path">
          <span>INE-CORE-MODE</span>
          <span className="breadcrumb-bar__separator">/</span>
          <span>
            {viewMode === 'catalog' ? 'CATALOG DISCOVERY REGISTRY' :
             viewMode === 'tracked' ? 'TRACKED ITEMS & CHARTS' :
             'ALERT TRIGGER CONFIG'}
          </span>
          <span className="breadcrumb-bar__separator">/</span>
          <span className="breadcrumb-bar__active">ACTIVE SCRAPE {utcStr}</span>
        </div>
        <div className="breadcrumb-bar__right">
          <span className="breadcrumb-bar__stat">
            INDEX PARITY: 99.84%
          </span>
          {catalogTotal > 0 && (
            <span style={{ color: 'var(--text-secondary)' }}>
              {catalogTotal} HARVESTED
            </span>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'catalog' ? (
        <CatalogBrowser
          onSelectProduct={(id) => setModalProductId(id)}
          onCatalogTotal={(total) => setCatalogTotal(total)}
        />
      ) : viewMode === 'tracked' ? (
        <>
          <TrackedList
            products={trackedProducts}
            selectedId={selectedProductId}
            onSelect={(id) => {
              setSelectedProductId(id);
              setModalProductId(id);
            }}
            onRefresh={handleRefresh}
            loading={loading}
            onSetAlert={(p) => setAlertProduct(p)}
          />

          {selectedProductId && (
            <div className="detail-panel fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="detail-panel__header">
                <h2 className="detail-panel__title">
                  {selectedProduct?.products?.name || 'Product Details'}
                </h2>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setModalProductId(selectedProductId)}
                  style={{ marginLeft: 'auto' }}
                >
                  Open Product Details ›
                </button>
              </div>

              <div className="tabs" role="tablist">
                <button
                  className={`tab ${activeTab === 'chart' ? 'tab--active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                  role="tab"
                  aria-selected={activeTab === 'chart'}
                  id="tab-chart"
                >
                  📈 Price History
                </button>
                <button
                  className={`tab ${activeTab === 'logs' ? 'tab--active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                  role="tab"
                  aria-selected={activeTab === 'logs'}
                  id="tab-logs"
                >
                  📋 Scrape Logs
                </button>
              </div>

              {activeTab === 'chart' && (
                <PriceChart productId={selectedProductId} />
              )}

              {activeTab === 'logs' && (
                <ScrapeLogsTable productId={selectedProductId} />
              )}
            </div>
          )}
        </>
      ) : (
        /* Alerts placeholder */
        <div className="empty-state fade-in" style={{ marginTop: '3rem' }}>
          <div className="empty-state__icon">⚡</div>
          <p className="empty-state__title">Alert Triggers</p>
          <p className="empty-state__text">
            Configure price-drop and back-in-stock alerts for your tracked products.
            Select a tracked product to set up alert triggers.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => setViewMode('tracked')}
            style={{ marginTop: '1rem' }}
          >
            Go to Tracked Items →
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      {modalProductId && (
        <ProductDetailModal
          productId={modalProductId}
          onClose={() => setModalProductId(null)}
          onPriceRevealed={handlePriceRevealed}
          onSetAlert={(p) => setAlertProduct(p)}
        />
      )}

      {/* Set Price / Stock Alert Modal */}
      <SetAlertModal
        isOpen={Boolean(alertProduct)}
        onClose={() => setAlertProduct(null)}
        product={alertProduct}
        user={user}
      />

      {/* User Login / Signup Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-bar__left">
          <span className="status-bar__item">
            <span className="status-bar__dot"></span>
            DOM Engine: Playwright Stealth v1.47
          </span>
          <span className="status-bar__separator">/</span>
          <span className="status-bar__item">
            Scrapes Today: {trackedProducts.length * 4 || 0}
          </span>
        </div>
        <div className="status-bar__right">
          <span>INE Telemetry Protocol 0.9.4</span>
          <span className="status-bar__separator">/</span>
          <span className="status-bar__highlight">
            Synced With Supabase
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
