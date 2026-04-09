import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Bell, RefreshCcw, Trash2, ShieldAlert, AlertTriangle,
  Flame, ChevronDown, ChevronUp, ExternalLink, X,
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

/* ─── severity helpers ─────────────────────────────────────── */

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

const normSev = (sev) => {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical' || s === 'crit') return 'critical';
  if (s === 'high' || s === 'hard' || s === 'warning') return 'high';
  if (s === 'low' || s === 'info' || s === 'success') return 'low';
  if (s === 'medium' || s === 'normal') return 'medium';
  return 'medium';
};

const SEV_COLOR = {
  critical: '#ff3b3b',
  high:     '#facc15',
  medium:   'var(--neon-blue)',
  low:      'var(--text-muted)',
};

const SEV_BG = {
  critical: 'rgba(255,59,59,0.10)',
  high:     'rgba(250,204,21,0.08)',
  medium:   'rgba(0,240,255,0.07)',
  low:      'rgba(255,255,255,0.04)',
};

const SEV_BORDER = {
  critical: 'rgba(255,59,59,0.30)',
  high:     'rgba(250,204,21,0.28)',
  medium:   'rgba(0,240,255,0.25)',
  low:      'rgba(255,255,255,0.12)',
};

const SevIcon = ({ sev, size = 16 }) => {
  const s = normSev(sev);
  const color = SEV_COLOR[s];
  if (s === 'critical') return <Flame size={size} style={{ color }} />;
  if (s === 'high')     return <ShieldAlert size={size} style={{ color }} />;
  return <AlertTriangle size={size} style={{ color }} />;
};

const SevPill = ({ sev }) => {
  const s = normSev(sev);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 999,
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.07em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      background: SEV_BG[s],
      border: `1px solid ${SEV_BORDER[s]}`,
      color: SEV_COLOR[s],
    }}>
      <SevIcon sev={s} size={11} />
      {s === 'critical' ? 'CRITICAL' : s === 'high' ? 'HIGH' : s === 'low' ? 'LOW' : 'MEDIUM'}
    </span>
  );
};

/* ─── normalise both data sources into one shape ───────────── */

const fromAlert = (a) => ({
  _key:      `alert-${a.id}`,
  _source:   'alert',
  id:        a.id,
  title:     a.type || 'Security Alert',
  message:   a.details || `Suspicious activity detected from ${a.ip}${a.hostname ? ` (${a.hostname})` : ''}.`,
  severity:  normSev(a.severity),
  source_ip: a.ip || null,
  hostname:  a.hostname || null,
  event_type: 'security.alert',
  is_read:   false,
  created_at: a.timestamp,
  alert_type: a.type,
  _raw_alert: a,
});

const fromNotification = (n) => ({
  _key:      `notif-${n.id}`,
  _source:   'notification',
  id:        n.id,
  title:     n.title || 'System Notification',
  message:   n.message || '',
  severity:  normSev(n.severity),
  source_ip: n.source_ip || null,
  hostname:  null,
  event_type: n.event_type || 'system',
  is_read:   Boolean(n.is_read),
  created_at: n.created_at,
  alert_type: null,
  _raw:       n,
});

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/* ─── Detail Panel (inline slide-down) ──────────────────────── */

const DetailPanel = ({ item, onClose, onView, onToggleRead, onDelete }) => {
  const sev   = normSev(item.severity);
  const color = SEV_COLOR[sev];

  const fields = [
    { label: 'Time',       value: item.created_at ? new Date(item.created_at).toLocaleString() : '—' },
    { label: 'Event Type', value: item.event_type },
    { label: 'Source IP',  value: item.source_ip, mono: true, color: 'var(--neon-blue)' },
    item.hostname && { label: 'Hostname', value: item.hostname, mono: true },
    item._source === 'notification' && { label: 'Status', value: item.is_read ? 'Read' : 'Unread' },
  ].filter(Boolean);

  return (
    <div style={{
      margin: '0 0 4px 0',
      borderRadius: '0 0 12px 12px',
      background: 'rgba(5,10,20,0.7)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color}33`,
      borderTop: 'none',
      padding: '18px 20px 16px 20px',
      animation: 'slideDown 0.18s ease',
    }}>
      {/* description */}
      <div style={{
        fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0',
        lineHeight: 1.65, background: 'rgba(0,0,0,0.25)',
        padding: '12px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {item.message || '—'}
      </div>

      {/* meta grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px 20px', marginBottom: 16,
      }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 3 }}>
              {f.label}
            </div>
            <div style={{ color: f.color || '#fff', fontFamily: f.mono ? 'monospace' : undefined, fontWeight: 700, fontSize: '0.82rem', wordBreak: 'break-all' }}>
              {f.value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* actions row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <button
          onClick={onView}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em',
            background: `${color}18`, border: `1px solid ${color}44`, color,
          }}
        >
          <ExternalLink size={14} />
          View Full Details
        </button>

        {item._source === 'notification' && (
          <>
            <button
              onClick={onToggleRead}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 700,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)',
              }}
            >
              {item.is_read ? 'Mark Unread' : 'Mark Read'}
            </button>
            <button
              onClick={onDelete}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 700,
                background: 'rgba(255,0,60,0.07)', border: '1px solid rgba(255,0,60,0.2)', color: 'var(--neon-red)',
              }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 700,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)',
          }}
        >
          <X size={13} />
          Close
        </button>
      </div>
    </div>
  );
};

/* ─── main component ─────────────────────────────────────────── */

const Notifications = () => {
  const navigate = useNavigate();
  const [alerts,  setAlerts]  = useState([]);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [openKey, setOpenKey] = useState(null); // which item's detail panel is open
  const [streamStartId, setStreamStartId] = useState(null);
  const eventSourceRef = useRef(null);
  const syncTimerRef   = useRef(null);

  /* ── fetch ── */
  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, nRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/notifications'),
      ]);
      setAlerts(Array.isArray(aRes.data) ? aRes.data : []);
      const rows = Array.isArray(nRes.data) ? nRes.data : [];
      setNotifs(rows);
      if (streamStartId === null) {
        const maxId = rows.reduce((m, n) => {
          const v = Number(n?.id);
          return Number.isFinite(v) && v > m ? v : m;
        }, 0);
        setStreamStartId(maxId);
      }
    } catch {
      setError('Unable to load notifications. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── SSE stream ── */
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token || streamStartId === null) return;
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}&last_id=${encodeURIComponent(String(streamStartId || 0))}`;
    const es  = new EventSource(url);
    eventSourceRef.current = es;

    const scheduleSync = () => {
      if (syncTimerRef.current) return;
      syncTimerRef.current = setTimeout(() => { syncTimerRef.current = null; fetchAll(); }, 400);
    };

    const onNotification = (evt) => {
      try {
        const row = JSON.parse(evt.data);
        if (!row?.id) return;
        setNotifs((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((x) => String(x?.id) === String(row.id))) return list;
          return [row, ...list].slice(0, 200);
        });
      } catch { /* ignore */ }
    };

    es.addEventListener('notification', onNotification);
    es.addEventListener('sync', scheduleSync);
    es.onerror = () => {};

    return () => {
      es.removeEventListener('notification', onNotification);
      es.removeEventListener('sync', scheduleSync);
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
      if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null; }
    };
  }, [streamStartId]);

  /* ── merged list — only critical/high/medium, sorted by severity then time ── */
  const items = useMemo(() => {
    const alertItems = alerts.map(fromAlert).filter((a) => VALID_SEVERITIES.includes(a.severity));
    const notifItems = notifs.map(fromNotification).filter((n) => VALID_SEVERITIES.includes(n.severity));
    const all = [...alertItems, ...notifItems];
    all.sort((a, b) => {
      const sa = SEV_ORDER[a.severity] ?? 99;
      const sb = SEV_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return all;
  }, [alerts, notifs]);

  /* ── actions ── */
  const clearAll = async () => {
    setLoading(true); setError('');
    try { await api.delete('/notifications'); await fetchAll(); }
    catch { setError('Unable to clear notifications.'); setLoading(false); }
  };

  const toggleRead = async (item) => {
    if (item._source !== 'notification' || !item._raw?.id) return;
    try {
      await api.patch(`/notifications/${item._raw.id}`, { is_read: !item._raw.is_read });
      setNotifs((prev) => prev.map((x) => x.id === item._raw.id ? { ...x, is_read: !x.is_read } : x));
    } catch { /* ignore */ }
  };

  const deleteItem = async (item) => {
    if (item._source !== 'notification' || !item._raw?.id) return;
    try {
      await api.delete(`/notifications/${item._raw.id}`);
      setNotifs((prev) => prev.filter((x) => x.id !== item._raw.id));
      if (openKey === item._key) setOpenKey(null);
    } catch { /* ignore */ }
  };

  const openFullDetail = (item) => {
    navigate(`/notifications/view/${encodeURIComponent(item._key)}`, { state: { entry: item } });
  };

  /* ── render ── */
  return (
    <div className="page-container" style={{ paddingBottom: 80 }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* header */}
      <h2 className="neon-text text-red flex-center">
        <Bell size={24} style={{ marginRight: 12 }} />
        NOTIFICATIONS CENTER
      </h2>

      {/* toolbar */}
      <div className="glass-card mt-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {items.length} {items.length === 1 ? 'Event' : 'Events'} · All Severities
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchAll} className="cyber-button" disabled={loading} title="Refresh">
              <RefreshCcw size={15} style={{ marginRight: 6 }} />
              Refresh
            </button>
            <button
              onClick={clearAll}
              className="cyber-button"
              style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)' }}
              disabled={loading || notifs.length === 0}
              title="Clear system notifications"
            >
              <Trash2 size={15} style={{ marginRight: 6 }} />
              Clear
            </button>
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 10, color: 'var(--neon-red)', fontWeight: 700, fontSize: '0.83rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* list */}
      <div className="glass-card mt-4" style={{ padding: 12 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            No alerts or notifications yet. Connect to the backend and run a scan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((item) => {
              const sev      = normSev(item.severity);
              const color    = SEV_COLOR[sev];
              const isOpen   = openKey === item._key;
              const isUnread = item._source === 'notification' && !item.is_read;

              return (
                <div key={item._key}>
                  {/* ── row ── */}
                  <div
                    onClick={() => setOpenKey(isOpen ? null : item._key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 16px',
                      borderRadius: isOpen ? '12px 12px 0 0' : 12,
                      cursor: 'pointer',
                      background: isOpen
                        ? `rgba(0,0,0,0.35)`
                        : isUnread
                          ? 'rgba(0,240,255,0.03)'
                          : 'rgba(0,0,0,0.15)',
                      borderLeft: `3px solid ${color}`,
                      border: `1px solid ${isOpen ? color + '33' : 'rgba(255,255,255,0.05)'}`,
                      borderLeftWidth: 3,
                      borderLeftColor: color,
                      opacity: item.is_read && item._source === 'notification' ? 0.72 : 1,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    {/* icon */}
                    <SevIcon sev={sev} size={18} />

                    {/* text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 900, color: '#fff', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        {isUnread && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', flexShrink: 0, boxShadow: '0 0 5px var(--neon-blue)' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.73rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.source_ip && (
                          <span style={{ fontFamily: 'monospace', color: 'var(--neon-blue)' }}>{item.source_ip}</span>
                        )}
                        <span>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6 }}>{item.event_type}</span>
                      </div>
                    </div>

                    {/* severity pill (right) */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SevPill sev={sev} />
                      {isOpen
                        ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      }
                    </div>
                  </div>

                  {/* ── inline detail panel ── */}
                  {isOpen && (
                    <DetailPanel
                      item={item}
                      onClose={() => setOpenKey(null)}
                      onView={() => openFullDetail(item)}
                      onToggleRead={() => toggleRead(item)}
                      onDelete={() => deleteItem(item)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
