import { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

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
      <div className="card">
        <div className="chart-empty">
          <p>Select a tracked product to view scrape logs</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="chart-empty">
          <span className="loading-spinner" /> Loading logs...
        </div>
      </div>
    );
  }

  const statusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
      case 'retried': return <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />;
      case 'failed': return <XCircle size={14} style={{ color: 'var(--color-danger)' }} />;
      default: return <Clock size={14} />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      <div className="card__header">
        <h3 className="card__title"><FileText size={18} /> Scrape Logs</h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {logs.length} attempt{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="chart-empty">
          <p>No scrape attempts recorded yet.</p>
        </div>
      ) : (
        <div className="logs-table-wrap">
          <table className="logs-table" id="scrape-logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Attempt</th>
                <th>Duration</th>
                <th>HTTP</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={`${log.id || 'log'}-${idx}`}>
                  <td>{formatTime(log.attempted_at)}</td>
                  <td>
                    <span className={`status-badge status-badge--${log.status}`}>
                      {statusIcon(log.status)}
                      {log.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{log.attempt_number}</td>
                  <td>
                    {log.duration_ms != null ? (
                      <span style={{
                        color: log.duration_ms > 10000
                          ? 'var(--color-warning)'
                          : 'var(--text-secondary)',
                      }}>
                        {log.duration_ms.toLocaleString()}ms
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {log.http_status ? (
                      <span style={{
                        color: log.http_status >= 400
                          ? 'var(--color-danger)'
                          : 'var(--color-success)',
                      }}>
                        {log.http_status}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.error_message ? (
                      <span title={log.error_message} style={{ color: 'var(--color-danger)', opacity: 0.8 }}>
                        {log.error_message}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
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
