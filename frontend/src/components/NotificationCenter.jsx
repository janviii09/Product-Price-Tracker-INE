import { useState, useEffect, useRef } from 'react';
import { Bell, TrendingDown, Package, Check, CheckCheck, ExternalLink, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function NotificationCenter({ user, onSelectProduct }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`${API_BASE}/api/alerts/notifications${emailParam}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/alerts/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/api/alerts/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    if (min < 1) return 'JUST NOW';
    if (min < 60) return `${min}M AGO`;
    if (hr < 24) return `${hr}H AGO`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="btn btn--ghost"
        onClick={() => setIsOpen(!isOpen)}
        title="Telemetry Notifications"
        style={{
          position: 'relative',
          padding: '0.4rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          background: isOpen ? 'rgba(232, 168, 56, 0.1)' : 'transparent',
          border: isOpen ? '1px solid var(--amber-glow)' : '1px solid transparent',
          color: 'var(--amber-primary)',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            background: 'var(--amber-primary)',
            color: '#080b12',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: '2px',
            minWidth: '14px',
            textAlign: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '380px',
          maxWidth: '90vw',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(232, 168, 56, 0.05)',
          zIndex: 1100,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.4)',
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} color="var(--amber-primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                DISPATCH QUEUE
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--amber-dim)',
                  color: 'var(--amber-bright)',
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  borderRadius: '2px',
                }}>
                  {unreadCount} UNREAD
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: 0,
                }}
              >
                <CheckCheck size={12} />
                <span>ACK ALL</span>
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                DISPATCH QUEUE EMPTY // NO EVENTS
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.product_id) {
                      onSelectProduct?.(item.product_id);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: item.is_read ? 'transparent' : 'rgba(232, 168, 56, 0.03)',
                    cursor: item.product_id ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: item.type === 'price_drop' ? 'var(--teal-status)' : 'var(--amber-primary)',
                      letterSpacing: '0.04em',
                    }}>
                      {item.type === 'price_drop' ? '▼ PRICE DROP' : '● DISPATCH EVENT'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {formatTime(item.created_at)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                    {item.message || item.content}
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkRead(item.id, e)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: '0.2rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--amber-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      [ ACKNOWLEDGE ]
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
