import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

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
      background: 'var(--bg-card)',
      border: '1px solid var(--amber-primary)',
      borderRadius: '4px',
      padding: '8px 12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
      fontFamily: 'var(--font-mono)',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '4px' }}>
        {new Date(data.scraped_at).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
      <p style={{ color: 'var(--amber-bright)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
        {price}
      </p>
      {data.stock && (
        <p style={{ color: 'var(--teal-status)', fontSize: '0.65rem', marginTop: '4px', margin: 0 }}>
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
      <div className="chart-container" style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <p>SELECT A TRACKED TARGET TO INSPECT HISTORICAL TELEMETRY</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chart-container" style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <span className="loading-spinner" style={{ color: 'var(--amber-primary)' }} />
        <p style={{ marginTop: '0.75rem' }}>POLLING TELEMETRY HISTORY...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="chart-container" style={{
        padding: '2rem 1.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-primary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <TrendingUp size={16} />
          <span>PRICE TELEMETRY TRAJECTORY</span>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No price logs recorded. Trigger a live crawl to begin plotting trajectory.
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
    <div className="chart-container" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '4px',
      padding: '1.25rem',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-primary)', fontSize: '0.85rem', fontWeight: 700 }}>
          <TrendingUp size={16} />
          <span>PRICE TELEMETRY TRAJECTORY</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--teal-status)' }}>
            ATL: ₹{minPrice.toLocaleString('en-IN')}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            AVG: ₹{Math.round(avgPrice).toLocaleString('en-IN')}
          </span>
          <span style={{ color: '#f87171' }}>
            ATH: ₹{maxPrice.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {isSinglePoint && (
        <div style={{
          padding: '0.5rem 0.85rem',
          margin: '0 0 1rem 0',
          background: 'rgba(232, 168, 56, 0.08)',
          border: '1px solid rgba(232, 168, 56, 0.25)',
          borderRadius: '3px',
          fontSize: '0.75rem',
          color: 'var(--amber-dim-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Activity size={14} color="var(--amber-primary)" />
          <span>Single spot price indexed. Trajectory curve activates upon subsequent scrape cycles.</span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="amberChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e8a838" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#e8a838" stopOpacity={0} />
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
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tick={{ fill: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            domain={[Math.max(0, Math.floor(minPrice - padding)), Math.ceil(maxPrice + padding)]}
            tick={{ fill: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {!isSinglePoint && (
            <ReferenceLine
              y={avgPrice}
              stroke="#e8a838"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#e8a838"
            strokeWidth={2}
            fill="url(#amberChartGrad)"
            dot={{
              fill: '#e8a838',
              strokeWidth: 2,
              r: 4,
              stroke: '#080b12',
            }}
            activeDot={{
              fill: '#ffd070',
              strokeWidth: 2,
              r: 6,
              stroke: '#e8a838',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
