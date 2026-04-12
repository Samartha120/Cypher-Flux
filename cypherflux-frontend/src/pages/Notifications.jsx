import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, RefreshCcw, Trash2, ShieldCheck, AlertTriangle,
  Flame, ChevronDown, ChevronUp, ExternalLink, X, Activity,
  LayoutGrid,
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const PAGE_SIZE      = 50;      // items loaded per "Load More" click
const GROUP_WINDOW   = 5 * 60;  // seconds – group identical events within this window

/* ─── Severity helpers ───────────────────────────────────────────────────── */

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

const normSev = (sev) => {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical' || s === 'crit') return 'critical';
  if (s === 'high'     || s === 'warning') return 'high';
  if (s === 'medium'   || s === 'normal')  return 'medium';
  if (s === 'low'      || s === 'info' || s === 'success') return 'low';
  return 'medium';
};

const SEV_COLOR  = { critical: '#ff3b3b', high: '#facc15', medium: 'var(--neon-blue)', low: '#94a3b8' };
const SEV_BG     = { critical: 'rgba(255,59,59,0.10)', high: 'rgba(250,204,21,0.08)', medium: 'rgba(0,240,255,0.07)', low: 'rgba(255,255,255,0.04)' };
const SEV_BORDER = { critical: 'rgba(255,59,59,0.30)', high: 'rgba(250,204,21,0.28)', medium: 'rgba(0,240,255,0.25)', low: 'rgba(255,255,255,0.12)' };
const SEV_ORDER  = { critical: 0, high: 1, medium: 2, low: 3 };

const SevIcon = ({ sev, size = 16 }) => {
  const s     = normSev(sev);
  const color = SEV_COLOR[s];
  const style = {
    color,
    transition: 'filter 0.2s',
    filter: 'drop-shadow(0 0 2px currentColor)',
  };
  if (s === 'critical') return <Flame         size={size} style={style} />;
  if (s === 'high')     return <AlertTriangle  size={size} style={style} />;
  if (s === 'medium')   return <Activity       size={size} style={style} />;
  return <ShieldCheck size={size} style={{ ...style, color }} />;
};

const SevPill = ({ sev }) => {
  const s = normSev(sev);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 999,
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.07em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      background: SEV_BG[s], border: `1px solid ${SEV_BORDER[s]}`, color: SEV_COLOR[s],
    }}>
      <SevIcon sev={s} size={11} />
      {s.toUpperCase()}
    </span>
  );
};

/* ─── Normalise data sources ─────────────────────────────────────────────── */

const fromAlert = (a) => ({
  _key:       `alert-${a.id}`,
  _source:    'alert',
  id:         a.id,
  title:      a.type || 'Security Alert',
  message:    a.details || `Suspicious activity detected from ${a.ip}${a.hostname ? ` (${a.hostname})` : ''}.`,
  severity:   normSev(a.severity),
  source_ip:  a.ip || null,
  hostname:   a.hostname || null,
  event_type: 'security.alert',
  count:      a.count || 1,
  is_read:    false,
  created_at: a.timestamp,
  _raw_alert: a,
});

const fromNotification = (n) => ({
  _key:       `notif-${n.id}`,
  _source:    'notification',
  id:         n.id,
  title:      n.title || 'System Notification',
  message:    n.message || '',
  severity:   normSev(n.severity),
  source_ip:  n.source_ip || null,
  hostname:   null,
  event_type: n.event_type || 'system',
  count:      1,
  is_read:    Boolean(n.is_read),
  created_at: n.created_at,
  _raw:       n,
});

/* ─── GroupBadge ─────────────────────────────────────────────────────────── */

const GroupBadge = ({ count }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
    background: 'rgba(0,240,255,0.18)', border: '1px solid rgba(0,240,255,0.35)',
    fontSize: '0.7rem', fontWeight: 900, color: 'var(--neon-blue)',
    letterSpacing: 0, flexShrink: 0,
  }}>
    ×{count}
  </span>
);

/* ─── DetailPanel ────────────────────────────────────────────────────────── */

const DetailPanel = ({ item, onClose, onView, onToggleRead, onDelete }) => {
  const sev   = normSev(item.severity);
  const color = SEV_COLOR[sev];

  const fields = [
    { label: 'Time',       value: item.created_at ? new Date(item.created_at).toLocaleString() : '—' },
    { label: 'Event Type', value: item.event_type },
    { label: 'Source IP',  value: item.source_ip, mono: true, color: 'var(--neon-blue)' },
    item.hostname && { label: 'Hostname', value: item.hostname, mono: true },
    item.count > 1 && { label: 'Occurrences', value: `${item.count}×` },
    item._source === 'notification' && { label: 'Status', value: item.is_read ? 'Read' : 'Unread' },
  ].filter(Boolean);

  return (
    <div style={{
      margin: '0 0 4px 0', borderRadius: '0 0 12px 12px',
      background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
      border: `1px solid ${color}33`, borderTop: 'none',
      padding: '18px 20px 16px 20px', animation: 'slideDown 0.18s ease',
    }}>
      <div style={{
        fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0',
        lineHeight: 1.65, background: 'rgba(0,0,0,0.25)',
        padding: '12px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {item.message || '—'}
      </div>

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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <button onClick={onView} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em', background: `${color}18`, border: `1px solid ${color}44`, color }}>
          <ExternalLink size={14} /> View Full Details
        </button>

        {item._source === 'notification' && (<>
          <button onClick={onToggleRead} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
            {item.is_read ? 'Mark Unread' : 'Mark Read'}
          </button>
          <button onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(255,0,60,0.07)', border: '1px solid rgba(255,0,60,0.2)', color: 'var(--neon-red)' }}>
            <Trash2 size={13} /> Delete
          </button>
        </>)}

        <button onClick={onClose} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
          <X size={13} /> Close
        </button>
      </div>
    </div>
  );
};

/* ─── Filter tabs ────────────────────────────────────────────────────────── */

const TABS = [
  { key: 'all',      label: 'All',      Icon: LayoutGrid  },
  { key: 'critical', label: 'Critical', Icon: Flame        },
  { key: 'high',     label: 'High',     Icon: AlertTriangle },
  { key: 'medium',   label: 'Medium',   Icon: Activity     },
  { key: 'low',      label: 'Low',      Icon: ShieldCheck  },
];

const FilterTabs = ({ active, counts, onChange }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {TABS.map((t) => {
      const { Icon } = t;
      const cnt   = t.key === 'all' ? (counts.all || 0) : (counts[t.key] || 0);
      const isAct = active === t.key;
      const color = t.key === 'all' ? 'var(--neon-blue)' : SEV_COLOR[t.key] || 'var(--text-muted)';
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: isAct ? 800 : 600,
            letterSpacing: '0.03em', transition: 'all 0.15s',
            background: isAct ? `${color}22` : 'rgba(255,255,255,0.04)',
            border: isAct ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.08)',
            color: isAct ? color : 'var(--text-muted)',
            boxShadow: isAct ? `0 0 8px ${color}44` : 'none',
          }}
        >
          <Icon size={13} style={{ flexShrink: 0 }} />
          {t.label}
          {cnt > 0 && (
            <span style={{ fontSize: '0.68rem', background: isAct ? `${color}33` : 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '1px 6px' }}>
              {cnt > 999 ? '999+' : cnt}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* ─── Group identical nearby events ──────────────────────────────────────── */

const groupItems = (items) => {
  const groups  = [];
  const seen    = new Map(); // key → group index

  for (const item of items) {
    const ts  = item.created_at ? new Date(item.created_at).getTime() / 1000 : 0;
    const key = `${item.title}||${item.source_ip || ''}||${item.severity}`;

    if (seen.has(key)) {
      const gIdx = seen.get(key);
      const g    = groups[gIdx];
      const gTs  = g.created_at ? new Date(g.created_at).getTime() / 1000 : 0;
      // Only group if within the rolling window
      if (Math.abs(ts - gTs) <= GROUP_WINDOW) {
        g._groupCount = (g._groupCount || 1) + 1;
        g._groupItems = g._groupItems || [];
        g._groupItems.push(item);
        continue;
      }
    }

    const entry = { ...item, _groupCount: 1, _groupItems: [] };
    seen.set(key, groups.length);
    groups.push(entry);
  }
  return groups;
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

const Notifications = () => {
  const navigate = useNavigate();

  const [alerts,         setAlerts]         = useState([]);
  const [notifs,         setNotifs]         = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [openKey,        setOpenKey]        = useState(null);
  const [activeFilter,   setActiveFilter]   = useState('all');

  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE);
  const [streamStartId,  setStreamStartId]  = useState(null);

  const eventSourceRef = useRef(null);
  const syncTimerRef   = useRef(null);
  const loaderRef      = useRef(null);   // IntersectionObserver sentinel

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, nRes] = await Promise.all([
        api.get('/alerts?per_page=200'),
        api.get('/notifications?per_page=200'),
      ]);

      // Handle both old (array) and new (paginated object) response shapes
      const rawAlerts = Array.isArray(aRes.data)
        ? aRes.data
        : Array.isArray(aRes.data?.items) ? aRes.data.items : [];
      const rawNotifs = Array.isArray(nRes.data)
        ? nRes.data
        : Array.isArray(nRes.data?.items) ? nRes.data.items : [];

      setAlerts(rawAlerts);
      setNotifs(rawNotifs);

      if (streamStartId === null) {
        const maxId = rawNotifs.reduce((m, n) => {
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
  }, [streamStartId]);

  useEffect(() => { fetchAll(); }, []);

  /* ── SSE stream ── */
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token || streamStartId === null) return;
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}&last_id=${streamStartId}`;
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

  /* ── Merge + sort all items ── */
  const allItems = useMemo(() => {
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

  /* ── Apply severity filter ── */
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter((i) => i.severity === activeFilter);
  }, [allItems, activeFilter]);

  /* ── Group nearby identical events ── */
  const grouped = useMemo(() => groupItems(filtered), [filtered]);

  /* ── Visible slice (lazy loading) ── */
  const visible = useMemo(() => grouped.slice(0, visibleCount), [grouped, visibleCount]);

  /* ── IntersectionObserver for infinite scroll ── */
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { rootMargin: '120px' }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [grouped.length]);

  /* ── Tab counts ── */
  const counts = useMemo(() => {
    const c = { all: allItems.length };
    VALID_SEVERITIES.forEach((s) => { c[s] = allItems.filter((i) => i.severity === s).length; });
    return c;
  }, [allItems]);

  /* ── Unread count ── */
  const unreadCount = useMemo(
    () => notifs.filter((n) => !n.is_read).length,
    [notifs]
  );

  /* ── Actions ── */
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

  /* ── Render ── */

  return (
    <div className="page-container" style={{ paddingBottom: 80 }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <h2 className="neon-text text-red flex-center">
        <Bell size={24} style={{ marginRight: 12 }} />
        NOTIFICATION CENTER
        {unreadCount > 0 && (
          <span style={{
            marginLeft: 12, background: 'var(--neon-red)', color: '#fff',
            borderRadius: 999, fontSize: '0.7rem', fontWeight: 900,
            padding: '2px 10px', boxShadow: '0 0 10px rgba(255,50,50,0.6)',
          }}>
            {unreadCount} UNREAD
          </span>
        )}
      </h2>

      {/* Toolbar */}
      <div className="glass-card mt-4" style={{ padding: '14px 16px' }}>
        {/* Filter tabs */}
        <FilterTabs active={activeFilter} counts={counts} onChange={(k) => { setActiveFilter(k); setVisibleCount(PAGE_SIZE); }} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Showing {Math.min(visible.length, grouped.length)} of {grouped.length} events
            {activeFilter !== 'all' && ` · ${activeFilter.toUpperCase()} only`}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={fetchAll} className="cyber-button" disabled={loading} title="Refresh">
              <RefreshCcw size={14} style={{ marginRight: 6 }} />
              Refresh
            </button>

            <button
              onClick={clearAll}
              className="cyber-button"
              style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)' }}
              disabled={loading || notifs.length === 0}
              title="Clear system notifications"
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              Clear All
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: 'var(--neon-red)', fontWeight: 700, fontSize: '0.83rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* List */}
      <div className="glass-card mt-4" style={{ padding: 12 }}>
        {loading && grouped.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <Bell size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
            No {activeFilter === 'all' ? '' : activeFilter + ' '}alerts yet.
            <br />
            <span style={{ fontSize: '0.8rem' }}>Connect to the backend and run a scan to generate events.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 0.2s ease' }}>
            {visible.map((item) => {
              const sev      = normSev(item.severity);
              const color    = SEV_COLOR[sev];
              const isOpen   = openKey === item._key;
              const isUnread = item._source === 'notification' && !item.is_read;
              const hasGroup = item._groupCount > 1;

              return (
                <div key={item._key}>
                  {/* Row */}
                  <div
                    onClick={() => setOpenKey(isOpen ? null : item._key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 16px',
                      borderRadius: isOpen ? '12px 12px 0 0' : 12,
                      cursor: 'pointer',
                      background: isOpen
                        ? 'rgba(0,0,0,0.35)'
                        : isUnread ? 'rgba(0,240,255,0.03)' : 'rgba(0,0,0,0.15)',
                      border: `1px solid ${isOpen ? color + '33' : 'rgba(255,255,255,0.05)'}`,
                      borderLeft: `3px solid ${color}`,
                      opacity: item.is_read && item._source === 'notification' ? 0.72 : 1,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <SevIcon sev={sev} size={18} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 900, color: '#fff', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        {isUnread && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', flexShrink: 0, boxShadow: '0 0 5px var(--neon-blue)' }} />
                        )}
                        {hasGroup && <GroupBadge count={item._groupCount} />}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.73rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.source_ip && (
                          <span style={{ fontFamily: 'monospace', color: 'var(--neon-blue)' }}>{item.source_ip}</span>
                        )}
                        <span>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6 }}>{item.event_type}</span>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SevPill sev={sev} />
                      {isOpen
                        ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      }
                    </div>
                  </div>

                  {/* Inline detail panel */}
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

            {/* Infinite scroll sentinel */}
            {visibleCount < grouped.length && (
              <div ref={loaderRef} style={{ textAlign: 'center', padding: '18px 0' }}>
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="cyber-button"
                  style={{ margin: '0 auto' }}
                >
                  Load More ({grouped.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
