import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ProductSearch({ onProductTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [tracking, setTracking] = useState(null); // id of product being tracked
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.items || []);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProducts(value), 300);
  };

  const handleTrack = async (product) => {
    setTracking(product.id);
    try {
      const res = await fetch(`${API_BASE}/api/products/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_id: String(product.id),
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          sku: product.sku,
          description: product.description,
        }),
      });

      if (res.ok) {
        onProductTracked?.();
        setShowResults(false);
        setQuery('');
      }
    } catch (err) {
      console.error('Track failed:', err);
    } finally {
      setTracking(null);
    }
  };

  return (
    <div className="search-section" ref={wrapperRef}>
      <div className="search-bar">
        <Search className="search-bar__icon" size={18} />
        <input
          id="product-search-input"
          type="text"
          className="search-bar__input"
          placeholder="Search INE store products to track..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && (
          <Loader2
            className="loading-spinner"
            size={18}
            style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          />
        )}

        {showResults && results.length > 0 && (
          <div className="search-results">
            {results.map((product, idx) => (
              <div
                key={`${product.id || 'p'}-${idx}`}
                className="search-result-item"
                onClick={() => handleTrack(product)}
              >
                <div className="search-result-item__info">
                  <div className="search-result-item__name">{product.name}</div>
                  <div className="search-result-item__meta">
                    {product.brand} · {product.sku}
                  </div>
                </div>
                <span className="search-result-item__category">{product.category}</span>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ marginLeft: '0.75rem' }}
                  disabled={tracking === product.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrack(product);
                  }}
                >
                  {tracking === product.id ? (
                    <Loader2 size={14} className="loading-spinner" />
                  ) : (
                    <>
                      <Plus size={14} /> Track
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {showResults && results.length === 0 && query.trim() && !loading && (
          <div className="search-results">
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p className="empty-state__text">No products found for "{query}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
