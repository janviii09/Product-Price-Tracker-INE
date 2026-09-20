import { useState, useEffect, useCallback } from 'react';
import {
  Search, Lock, Unlock, ChevronLeft, ChevronRight, Loader2, ArrowUpRight,
  Headphones, Laptop, Monitor, MousePointer, Briefcase, Footprints, Zap, Home, Watch, Utensils, Package, SlidersHorizontal
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
  if (c.includes('audio')) return <Headphones size={18} color="#e8a838" />;
  if (c.includes('laptop')) return <Laptop size={18} color="#00d4aa" />;
  if (c.includes('monitor')) return <Monitor size={18} color="#60a5fa" />;
  if (c.includes('peripheral')) return <MousePointer size={18} color="#f472b6" />;
  if (c.includes('bag')) return <Briefcase size={18} color="#fbbf24" />;
  if (c.includes('footwear')) return <Footprints size={18} color="#34d399" />;
  if (c.includes('power')) return <Zap size={18} color="#f59e0b" />;
  if (c.includes('smart')) return <Home size={18} color="#00d4aa" />;
  if (c.includes('wearable')) return <Watch size={18} color="#a78bfa" />;
  if (c.includes('kitchen')) return <Utensils size={18} color="#ec4899" />;
  return <Package size={18} color="#94a3b8" />;
}

export default function CatalogBrowser({ onSelectProduct, onCatalogTotal }) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
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

      let items = data.items || [];
      if (sortBy === 'price_asc') {
        items = [...items].sort((a, b) => (a.latestPrice?.price || 999999) - (b.latestPrice?.price || 999999));
      } else if (sortBy === 'price_desc') {
        items = [...items].sort((a, b) => (b.latestPrice?.price || 0) - (a.latestPrice?.price || 0));
      } else if (sortBy === 'name') {
        items = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      setProducts(items);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
      setPage(data.page || targetPage);
      onCatalogTotal?.(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortBy, onCatalogTotal]);

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
    <div className="catalog-section" style={{ marginTop: '0.5rem' }}>
      {/* Category Pills Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {CATEGORIES.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '0.4rem 0.85rem',
                background: isActive ? 'var(--amber-dim)' : 'rgba(255, 255, 255, 0.03)',
                color: isActive ? 'var(--amber-bright)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--amber-glow)' : '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'All' ? `ALL (${totalItems || '...'})` : cat}
            </button>
          );
        })}
      </div>

      {/* Query Bar & Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '480px' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--amber-primary)',
          }} />
          <input
            type="text"
            placeholder="SEARCH REGISTRY (NAME, BRAND, SKU)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <SlidersHorizontal size={14} color="var(--amber-primary)" />
            <span>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '0.4rem 0.6rem',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <option value="default">RECENTLY SCRAPED</option>
              <option value="price_asc">PRICE: LOW TO HIGH</option>
              <option value="price_desc">PRICE: HIGH TO LOW</option>
              <option value="name">NAME (A-Z)</option>
            </select>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            padding: '0.35rem 0.6rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}>
            DISCOVERED: <strong style={{ color: 'var(--amber-primary)' }}>{totalItems}</strong>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
        }}>
          <Loader2 size={32} className="loading-spinner" style={{ color: 'var(--amber-primary)' }} />
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            SCANNING INE TELEMETRY REGISTRY...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-card)',
          borderRadius: '4px',
          border: '1px dashed var(--border-color)',
        }}>
          <p style={{ fontSize: '0.9rem' }}>NO MATCHING ITEMS IN SCRAPE REGISTRY</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Try clearing filters or search query</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '1rem',
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
                  padding: '1.15rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Tag & Brand Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        background: 'rgba(232, 168, 56, 0.08)',
                        border: '1px solid rgba(232, 168, 56, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: 'var(--amber-primary)',
                        textTransform: 'uppercase',
                      }}>
                        {item.brand || 'GENERIC'}
                      </span>
                    </div>

                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '2px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      letterSpacing: '0.04em',
                    }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.35,
                  }}>
                    {item.name}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    margin: '0 0 1rem 0',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom / Price Row */}
                <div style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'auto',
                }}>
                  {hasRevealedPrice ? (
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--teal-status)',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginBottom: '0.15rem',
                      }}>
                        <Unlock size={11} />
                        LIVE SPOT
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--amber-bright)',
                        letterSpacing: '-0.02em',
                      }}>
                        {formatPrice(item.latestPrice.price)}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--amber-dim-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.5rem',
                      background: 'rgba(232, 168, 56, 0.05)',
                      border: '1px dashed rgba(232, 168, 56, 0.3)',
                      borderRadius: '3px',
                    }}>
                      <Lock size={12} color="var(--amber-primary)" />
                      <span>PRICE MASKED</span>
                    </div>
                  )}

                  <button
                    className="btn btn--outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(item.id);
                    }}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      padding: '0.35rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>DETAILS</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cyberpunk Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginTop: '2rem',
          padding: '1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            BATCH <strong style={{ color: 'var(--amber-primary)' }}>{String(page).padStart(2, '0')}</strong> // {String(totalPages).padStart(2, '0')}
            <span style={{ margin: '0 0.5rem', color: 'var(--border-color)' }}>|</span>
            {pageSize} ITEMS PER QUERY
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn--outline"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <ChevronLeft size={14} />
              PREV
            </button>

            <button
              className="btn btn--outline"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              NEXT
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
