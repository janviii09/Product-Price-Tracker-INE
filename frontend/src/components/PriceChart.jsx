import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const price = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(data.price);

  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
        {new Date(data.scraped_at).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
      <p style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
        {price}
      </p>
      {data.stock && (
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
          {data.stock}
        </p>
      )}
    </div>
  );
};

export default function PriceChart({ productId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/${productId}/history`);
        const data = await res.json();
        setHistory(data || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [productId]);

  if (!productId) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <p>Select a tracked product to view price history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <span className="loading-spinner" /> Loading chart data...
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="chart-container">
        <div className="card__header">
          <h3 className="card__title"><TrendingUp size={18} /> Price History</h3>
        </div>
        <div className="chart-empty">
          <p>No price data yet. Trigger a scrape to start collecting data.</p>
        </div>
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const isSinglePoint = history.length === 1;
  const padding = isSinglePoint ? maxPrice * 0.1 : ((maxPrice - minPrice) * 0.2 || maxPrice * 0.05);

  const chartData = history.map(h => {
    const d = new Date(h.scraped_at);
    return {
      ...h,
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      fullDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  });

  const formatYAxis = (v) => {
    if (v >= 100000) return `₹${(v / 1000).toFixed(0)}k`;
    if (v >= 1000) {
      const k = v / 1000;
      return k % 1 === 0 ? `₹${k.toFixed(0)}k` : `₹${k.toFixed(1)}k`;
    }
    return `₹${Math.round(v).toLocaleString('en-IN')}`;
  };

  return (
    <div className="chart-container">
      <div className="card__header">
        <h3 className="card__title"><TrendingUp size={18} /> Price History</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ color: '#10b981' }}>
            Low: ₹{minPrice.toLocaleString('en-IN')}
          </span>
          <span style={{ color: '#94a3b8' }}>
            Avg: ₹{Math.round(avgPrice).toLocaleString('en-IN')}
          </span>
          <span style={{ color: '#ef4444' }}>
            High: ₹{maxPrice.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {isSinglePoint && (
        <div style={{
          padding: '0.5rem 1rem',
          margin: '0.5rem 0 1rem 0',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#c7d2fe',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>ℹ️</span>
          <span>
            Only <strong>1 data point</strong> recorded so far. A trend line requires 2+ scrapes. Click the <strong>↻ (Scrape)</strong> button on the product card above to add another price check!
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            domain={[Math.max(0, Math.floor(minPrice - padding)), Math.ceil(maxPrice + padding)]}
          />
          <Tooltip content={<CustomTooltip />} />
          {!isSinglePoint && (
            <ReferenceLine
              y={avgPrice}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={{
              fill: '#6366f1',
              strokeWidth: 2,
              r: 5,
              stroke: '#111827',
            }}
            activeDot={{
              fill: '#a5b4fc',
              strokeWidth: 2,
              r: 7,
              stroke: '#6366f1',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
