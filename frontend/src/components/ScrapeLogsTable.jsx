import { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ScrapeLogsTable({ productId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/${productId}/logs`);
        const data = await res.json();
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [productId]);

  if (!productId) {
    return (
      <div style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <p>SELECT A PRODUCT TO INSPECT DOM SCRAPE AUDIT LOGS</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <span className="loading-spinner" style={{ color: 'var(--amber-primary)' }} />
        <p style={{ marginTop: '0.75rem' }}>POLLING WORKER AUDIT LOGS...</p>
      </div>
    );
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '4px',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
          <Terminal size={15} />
          <span>SCRAPE WORKER AUDIT TRAIL</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {logs.length} EXECUTION{logs.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No scrape executions logged for this node.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
            textAlign: 'left',
          }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>TIME (LOCAL)</th>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>ATTEMPT</th>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>LATENCY</th>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>HTTP CODE</th>
                <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>ERROR DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={`${log.id || 'log'}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                    {formatTime(log.attempted_at || log.created_at)}
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '2px',
                      fontSize: '0.65rem',
                      background: log.status === 'success' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: log.status === 'success' ? 'var(--teal-status)' : '#f87171',
                      border: `1px solid ${log.status === 'success' ? 'rgba(0, 212, 170, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}>
                      {log.status?.toUpperCase() || 'SUCCESS'}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>#{log.attempt_number || 1}</td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                    {log.duration_ms != null ? `${log.duration_ms.toLocaleString()}ms` : '—'}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: log.http_status === 200 ? 'var(--teal-status)' : '#f87171' }}>
                    {log.http_status || '200 OK'}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {log.error_message || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
