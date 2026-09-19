import { useState, useEffect, useCallback } from 'react';
import {
  Search, Lock, Unlock, ChevronLeft, ChevronRight, Loader2,
  Headphones, Laptop, Monitor, MousePointer, Briefcase, Footprints, Zap, Home, Watch, Utensils, Package
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  'All',
  'Audio',
  'Laptops',
  'Monitors',
  'Peripherals',
  'Bags',
  'Footwear',
  'Power',
  'Smart Home',
  'Wearables',
  'Kitchen',
];

function getCategoryIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('audio')) return <Headphones size={22} color="#818cf8" />;
  if (c.includes('laptop')) return <Laptop size={22} color="#38bdf8" />;
  if (c.includes('monitor')) return <Monitor size={22} color="#a855f7" />;
  if (c.includes('peripheral')) return <MousePointer size={22} color="#f472b6" />;
  if (c.includes('bag')) return <Briefcase size={22} color="#fbbf24" />;
  if (c.includes('footwear')) return <Footprints size={22} color="#34d399" />;
  if (c.includes('power')) return <Zap size={22} color="#f59e0b" />;
  if (c.includes('smart')) return <Home size={22} color="#10b981" />;
  if (c.includes('wearable')) return <Watch size={22} color="#6366f1" />;
  if (c.includes('kitchen')) return <Utensils size={22} color="#ec4899" />;
  return <Package size={22} color="#94a3b8" />;
}

export default function CatalogBrowser({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async (targetPage, currentCategory, query) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: targetPage,
        pageSize,
      });
      if (currentCategory && currentCategory !== 'All') {
        params.set('category', currentCategory);
      }
      if (query && query.trim()) {
        params.set('q', query.trim());
      }

      const res = await fetch(`${API_BASE}/api/products/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setProducts(data.items || []);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
      setPage(data.page || targetPage);
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog(page, category, searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchCatalog, page, category, searchQuery]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (p) => {
    if (!p && p !== 0) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(p);
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Search & Category Filter Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search discovered products (by name, brand, SKU)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-bar__input"
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <strong>{products.length}</strong> of <strong>{totalItems}</strong> discovered products
        </div>
      </div>

      {/* Category Pills */}
      <div style={{
        display: 'flex',
        gap: '0.45rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1.5rem',
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              background: category === cat
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255, 255, 255, 0.04)',
              color: category === cat ? '#ffffff' : 'var(--text-secondary)',
              border: category === cat
                ? '1px solid transparent'
                : '1px solid var(--border-color)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="loading-spinner" />
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading catalog products...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-muted)',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)',
        }}>
          <p>No products match your search or filter.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {products.map((item) => {
            const hasRevealedPrice = Boolean(item.latestPrice);

            return (
              <div
                key={item.id}
                onClick={() => onSelectProduct(item.id)}
                className="product-card fade-in"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                }}
              >
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {getCategoryIcon(item.category)}
                    </div>

                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                    }}>
                      {item.category}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#818cf8',
                    marginBottom: '0.25rem',
                  }}>
                    {item.brand}
                  </div>

                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.3,
                  }}>
                    {item.name}
                  </h3>

                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    margin: '0 0 1rem 0',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.description}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  {hasRevealedPrice ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Unlock size={14} color="#34d399" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatPrice(item.latestPrice.price)}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      color: '#fbbf24',
                    }}>
                      <Lock size={13} />
                      <span>Price Hidden</span>
                    </div>
                  )}

                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(item.id);
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    View Details ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            className="btn btn--ghost btn--sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
