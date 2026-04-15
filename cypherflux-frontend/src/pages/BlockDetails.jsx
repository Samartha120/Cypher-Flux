import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Ban } from 'lucide-react';
import api from '../services/api';

const BlockDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const [loadedBlock, setLoadedBlock] = useState(null);
  const [loading, setLoading] = useState(false);

  const fromState = location?.state?.block || null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (fromState) {
        setLoadedBlock(fromState);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get('/blocked');
        const rows = Array.isArray(res?.data) ? res.data : [];
        const found = rows.find((b) => String(b?.id) === String(id));
        if (!cancelled) setLoadedBlock(found || null);
      } catch {
        if (!cancelled) setLoadedBlock(null);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fromState, id]);

  const block = useMemo(() => {
    if (!loadedBlock) return null;
    return {
      id: loadedBlock.id,
      ip: loadedBlock.ip,
      reason: loadedBlock.reason,
      timestamp: loadedBlock.blockedAt || loadedBlock.timestamp,
      attackType: loadedBlock.attackType || loadedBlock.attack_type,
      details: loadedBlock.details,
      detectionSource: loadedBlock.detectionSource || loadedBlock.detection_source,
      severity: loadedBlock.severity,
      riskScore: loadedBlock.riskScore ?? loadedBlock.risk_score,
      actionType: loadedBlock.actionType || loadedBlock.action_type,
      requestCount: loadedBlock.requestCount ?? loadedBlock.request_count,
      lastPath: loadedBlock.lastPath || loadedBlock.last_path,
      lastMethod: loadedBlock.lastMethod || loadedBlock.last_method,
      sourceAlertId: loadedBlock.sourceAlertId ?? loadedBlock.source_alert_id,
    };
  }, [loadedBlock]);

  const formatTimestamp = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  };

  return (
    <div className="page-container">
      <div className="flex-center" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="neon-text text-red flex-center" style={{ margin: 0 }}>
          <Ban size={24} style={{ marginRight: '12px' }} />
          BLOCK DETAILS
        </h2>

        <Link to="/blocked" className="cyber-button flex-center" style={{ textDecoration: 'none', padding: '10px 14px' }}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Back to Blocks
        </Link>
      </div>

      {loading ? (
        <div className="glass-card mt-4">
          <div className="text-gray">Loading…</div>
        </div>
      ) : null}

      {!loading && !block ? (
        <div className="glass-card mt-4">
          <div className="text-gray">Block entry not found (it may have been purged).</div>
        </div>
      ) : null}

      {!loading && block ? (
        <div className="glass-card mt-4" style={{ borderLeft: '4px solid var(--neon-red)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>ID</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{block.id ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Timestamp</div>
              <div>{formatTimestamp(block.timestamp)}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Blocked IP</div>
              <div className="text-red" style={{ fontFamily: 'monospace', fontWeight: 900 }}>{block.ip || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Reason</div>
              <div style={{ fontWeight: 800 }}>{block.reason || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Attack Type</div>
              <div>{block.attackType || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Detection Source</div>
              <div>{block.detectionSource || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Severity</div>
              <div style={{ textTransform: 'uppercase', fontWeight: 800 }}>{block.severity || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Risk Score</div>
              <div>{block.riskScore ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Action Type</div>
              <div style={{ textTransform: 'uppercase' }}>{block.actionType || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Request Count</div>
              <div>{block.requestCount ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Last Request</div>
              <div>{block.lastMethod && block.lastPath ? `${block.lastMethod} ${block.lastPath}` : '—'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Detailed Description</div>
              <div>{block.details || 'No detailed explanation stored for this block.'}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BlockDetails;
