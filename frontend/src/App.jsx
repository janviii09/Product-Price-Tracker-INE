import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CatalogBrowser from './components/CatalogBrowser';
import TrackedList from './components/TrackedList';
import PriceChart from './components/PriceChart';
import ScrapeLogsTable from './components/ScrapeLogsTable';
import ProductDetailModal from './components/ProductDetailModal';
import AuthModal from './components/AuthModal';
import SetAlertModal from './components/SetAlertModal';
import { ShoppingBag, LayoutGrid, Sparkles } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('catalog'); // 'catalog' | 'tracked'
  const [activeTab, setActiveTab] = useState('chart');
  const [loading, setLoading] = useState(true);

  const fetchTrackedProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const data = await res.json();
      setTrackedProducts(data || []);
    } catch (err) {
      console.error('Failed to fetch tracked products:', err);
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

  const lastScrapeTime = trackedProducts.reduce((latest, tp) => {
    const time = tp.latestPrice?.scraped_at;
    if (!time) return latest;
    return !latest || new Date(time) > new Date(latest) ? time : latest;
  }, null);

  const selectedProduct = trackedProducts.find(tp => tp.products?.id === selectedProductId);

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

      {/* Top View Mode Switcher */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.75rem',
        margin: '1.5rem 0',
      }}>
        <button
          className={`btn ${viewMode === 'catalog' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setViewMode('catalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.4rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <ShoppingBag size={17} />
          Full Store Catalog (Discovered Products)
        </button>

        <button
          className={`btn ${viewMode === 'tracked' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setViewMode('tracked')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.4rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <LayoutGrid size={17} />
          Tracked Products & Price Charts ({trackedProducts.length})
        </button>
      </div>

      {/* Main View Area */}
      {viewMode === 'catalog' ? (
        <CatalogBrowser
          onSelectProduct={(id) => setModalProductId(id)}
        />
      ) : (
        <>
          <TrackedList
            products={trackedProducts}
            selectedId={selectedProductId}
            onSelect={(id) => {
              setSelectedProductId(id);
              setModalProductId(id); // Also allows viewing the full modal with Reveal/Refresh
            }}
            onRefresh={handleRefresh}
            loading={loading}
            onSetAlert={(p) => setAlertProduct(p)}
          />

          {selectedProductId && (
            <div className="detail-panel fade-in" style={{ marginTop: '2rem' }}>
              <div className="detail-panel__header">
                <h2 className="detail-panel__title">
                  {selectedProduct?.products?.name || 'Product Details'}
                </h2>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setModalProductId(selectedProductId)}
                  style={{ marginLeft: 'auto' }}
                >
                  Open Product Details Modal ›
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
      )}

      {/* Dedicated Product Details Modal with 🔒 Reveal Price Flow */}
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
    </div>
  );
}

export default App;
