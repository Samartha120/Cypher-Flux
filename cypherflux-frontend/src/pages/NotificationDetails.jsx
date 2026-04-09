import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Trash2, ShieldAlert, Info, AlertTriangle, Flame } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

/* ─── helpers ─────────────────────────────────────────────────── */

const normSev = (sev) => {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high' || s === 'hard') return 'high';
  return 'medium';
};

const getSeverityColor = (sev) => {
  const s = normSev(sev);
  if (s === 'critical') return '#ff3b3b';
  if (s === 'high')     return '#facc15';
  return 'var(--neon-blue)';
};

const getSeverityBg = (sev) => {
  const s = normSev(sev);
  if (s === 'critical') return 'rgba(255,59,59,0.10)';
  if (s === 'high')     return 'rgba(250,204,21,0.08)';
  return 'rgba(0,240,255,0.07)';
};

const SevIcon = ({ sev, size = 18 }) => {
  const s = String(sev || '').toLowerCase();
  const color = getSeverityColor(s);
  if (s === 'critical') return <Flame size={size} style={{ color }} />;
  if (s === 'high')     return <ShieldAlert size={size} style={{ color }} />;
  if (s === 'medium')   return <AlertTriangle size={size} style={{ color }} />;
  return <Info size={size} style={{ color }} />;
};

const Field = ({ label, value, mono = false, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.72rem' }}>
      {label}
    </div>
    <div style={{ color: color || '#fff', fontWeight: 800, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
      {value || '—'}
    </div>
  </div>
);

/* ─── component ───────────────────────────────────────────────── */

const NotificationDetails = () => {
  const { id }      = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();

  // Support both old { notification } state and new { entry } state
  const stateEntry  = location.state?.entry || null;
  const stateNotif  = location.state?.notification || null;

  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');
  const [entry,     setEntry]    = useState(() => stateEntry || (stateNotif ? _fromNotifRaw(stateNotif) : null));
  const [actionBusy, setActionBusy] = useState('');

  function _fromNotifRaw(n) {
    return {
      _key: `notif-${n.id}`, _source: 'notification',
      id: n.id, title: n.title, message: n.message,
      severity: (n.severity || 'info').toLowerCase(),
      source_ip: n.source_ip, hostname: null, event_type: n.event_type,
      is_read: Boolean(n.is_read), created_at: n.created_at,
      alert_type: null, _raw: n,
    };
  }

  // Parse key: "alert-<id>" or "notif-<id>" or numeric (legacy)
  const keyParsed = useMemo(() => {
    const raw = String(id || '').trim();
    if (raw.startsWith('alert-')) return { source: 'alert', numId: Number(raw.replace('alert-', '')) };
    if (raw.startsWith('notif-')) return { source: 'notification', numId: Number(raw.replace('notif-', '')) };
    const num = Number(raw);
    return { source: 'notification', numId: Number.isFinite(num) ? num : null };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (entry) { setLoading(false); return; }
      if (!keyParsed.numId) { setError('Invalid entry id.'); setLoading(false); return; }

      setLoading(true); setError('');
      try {
        if (keyParsed.source === 'alert') {
          const res = await api.get('/alerts');
          const rows = Array.isArray(res.data) ? res.data : [];
          const found = rows.find((a) => Number(a.id) === keyParsed.numId);
          if (!cancelled) {
            if (!found) { setError('Alert not found.'); }
            else {
              setEntry({
                _key: `alert-${found.id}`, _source: 'alert',
                id: found.id, title: found.type, message: found.details || `Detected from ${found.ip}`,
                severity: (found.severity || 'medium').toLowerCase(),
                source_ip: found.ip, hostname: found.hostname, event_type: 'security.alert',
                is_read: false, created_at: found.timestamp, alert_type: found.type,
              });
            }
          }
        } else {
          const res = await api.get('/notifications');
          const rows = Array.isArray(res.data) ? res.data : [];
          const found = rows.find((n) => Number(n.id) === keyParsed.numId);
          if (!cancelled) {
            if (!found) { setError('Notification not found.'); }
            else { setEntry(_fromNotifRaw(found)); }
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [entry, keyParsed]);

  const toggleRead = async () => {
    if (!entry?._raw?.id) return;
    setActionBusy('read'); setError('');
    try {
      const res = await api.patch(`/notifications/${entry._raw.id}`, { is_read: !entry._raw.is_read });
      const updated = res.data || { ...entry._raw, is_read: !entry._raw.is_read };
      setEntry(_fromNotifRaw(updated));
    } catch { setError('Unable to update.'); }
    finally { setActionBusy(''); }
  };

  const deleteEntry = async () => {
    if (!entry?._raw?.id) return;
    setActionBusy('delete'); setError('');
    try {
      await api.delete(`/notifications/${entry._raw.id}`);
      navigate('/notifications', { replace: true });
    } catch { setError('Unable to delete.'); setActionBusy(''); }
  };

  const sev   = entry?.severity || 'info';
  const color = getSeverityColor(sev);

  return (
    <div className="page-container">
      <h2 className="neon-text text-red flex-center">
        <Bell size={24} style={{ marginRight: '12px' }} />
        ALERT DETAILS
      </h2>

      {/* toolbar */}
      <div className="glass-card mt-4" style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} className="cyber-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={18} />
          Back
        </button>

        {entry?._source === 'notification' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={toggleRead} className="cyber-button" disabled={!entry || loading || actionBusy !== ''} title="Toggle read/unread">
              {entry?.is_read ? 'Mark Unread' : 'Mark Read'}
            </button>
            <button
              onClick={deleteEntry}
              className="cyber-button"
              style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              disabled={!entry || loading || actionBusy !== ''}
              title="Delete"
            >
              <Trash2 size={18} />
              {actionBusy === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card mt-4" style={{ padding: 24, textAlign: 'center' }}>Loading…</div>
      ) : error ? (
        <div className="glass-card mt-4" style={{ padding: 18, color: 'var(--neon-red)', fontWeight: 800 }}>{error}</div>
      ) : (
        <>
          {/* severity hero banner */}
          <div
            className="glass-card mt-4"
            style={{
              padding: '20px 22px',
              background: getSeverityBg(sev),
              borderLeft: `4px solid ${color}`,
              display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <SevIcon sev={sev} size={36} />
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff', letterSpacing: '0.5px' }}>
                {entry?.title}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  padding: '3px 12px', borderRadius: 999, fontSize: '0.72rem',
                  fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: `${color}22`, border: `1px solid ${color}55`, color,
                }}>
                  {sev}
                </span>
                {entry?._source === 'alert' && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--neon-blue)', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>
                    SECURITY ALERT
                  </span>
                )}
                {entry?._source === 'notification' && !entry?.is_read && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--neon-green)', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>
                    UNREAD
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* detail grid */}
          <div className="glass-card mt-4" style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <Field label="Time"       value={entry?.created_at ? new Date(entry.created_at).toLocaleString() : '—'} />
              <Field label="Event Type" value={entry?.event_type} />
              <Field label="Source IP"  value={entry?.source_ip} mono color="var(--neon-blue)" />
              {entry?.hostname && <Field label="Hostname" value={entry.hostname} mono />}
              {entry?._source === 'notification' && <Field label="Read" value={entry?.is_read ? 'YES' : 'NO'} />}
            </div>

            {/* message */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.72rem', marginBottom: 10 }}>
                Description
              </div>
              <div style={{ color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                {entry?.message || '—'}
              </div>
            </div>

            {/* user agent (notifications only) */}
            {entry?._raw?.user_agent && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.72rem', marginBottom: 6 }}>User Agent</div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                  {entry._raw.user_agent}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDetails;
