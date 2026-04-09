import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '../services/api';

const safeAtob = (b64) => {
  try {
    return decodeURIComponent(escape(atob(String(b64))));
  } catch {
    try {
      return atob(String(b64));
    } catch {
      return String(b64);
    }
  }
};

const LogDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const [loadedLog, setLoadedLog] = useState(null);
  const [loading, setLoading] = useState(false);

  const fromState = location?.state?.log || null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (fromState) {
        setLoadedLog(fromState);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get('/logs');
        const rows = Array.isArray(res?.data) ? res.data : [];
        const found = rows.find((l) => String(l?.id) === String(id));
        if (!cancelled) setLoadedLog(found || null);
      } catch {
        if (!cancelled) setLoadedLog(null);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fromState, id]);

  const log = useMemo(() => {
    if (!loadedLog) return null;
    const encrypted = loadedLog.encrypted_data || loadedLog.encrypted_payload || '';
    const decrypted = loadedLog.decrypted_data || loadedLog.decrypted_message || (encrypted ? safeAtob(encrypted) : '');
    return {
      id: loadedLog.id,
      timestamp: loadedLog.timestamp,
      encrypted,
      message: loadedLog.message || null,
      decrypted,
    };
  }, [loadedLog]);

  const formatTimestamp = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  };

  return (
    <div className="page-container">
      <div className="flex-center" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="neon-text flex-center" style={{ margin: 0 }}>
          <FileText size={24} style={{ marginRight: '12px' }} />
          LOG DETAILS
        </h2>

        <Link to="/logs" className="cyber-button flex-center" style={{ textDecoration: 'none', padding: '10px 14px' }}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Back to Logs
        </Link>
      </div>

      {loading ? (
        <div className="glass-card mt-4">
          <div className="text-gray">Loading…</div>
        </div>
      ) : null}

      {!loading && !log ? (
        <div className="glass-card mt-4">
          <div className="text-gray">Log not found (it may have been simulated or purged).</div>
        </div>
      ) : null}

      {!loading && log ? (
        <>
          <div className="glass-card mt-4" style={{ borderLeft: '4px solid var(--neon-blue)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>ID</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{log.id || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Timestamp</div>
                <div>{formatTimestamp(log.timestamp)}</div>
              </div>
            </div>
          </div>

          <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Encrypted Payload
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {log.encrypted || '—'}
              </pre>
            </div>

            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Decrypted Message
              </div>
              <pre className="text-green" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                {log.decrypted || '—'}
              </pre>
            </div>
          </div>

          {log.message ? (
            <div className="glass-card mt-4">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Raw Message
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.message}</pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default LogDetails;
