import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { useThreats } from '../context/useThreats';

const severityColor = (sev) => {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical') return 'var(--neon-red)';
  if (s === 'high') return '#facc15';
  if (s === 'low') return 'var(--text-muted)';
  return 'var(--neon-blue)';
};

const AlertDetails = () => {
  const { id } = useParams();
  const { alerts = [] } = useThreats();

  const alert = useMemo(() => {
    const rows = Array.isArray(alerts) ? alerts : [];
    return rows.find((t) => String(t?.id || '') === String(id || '')) || null;
  }, [alerts, id]);

  return (
    <div className="page-container">
      <div className="flex-center" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="neon-text text-red flex-center" style={{ margin: 0 }}>
          <Bell size={24} style={{ marginRight: '12px' }} />
          ALERT DETAILS
        </h2>

        <Link
          to="/alerts"
          className="cyber-button flex-center"
          style={{ textDecoration: 'none', padding: '10px 14px' }}
        >
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Back to Alerts
        </Link>
      </div>

      {!alert ? (
        <div className="glass-card mt-4" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ color: 'var(--text-muted)' }}>
            Alert not found (it may have expired from the live feed).
          </div>
          <div className="mt-4">
            <Link to="/alerts" style={{ color: 'var(--neon-blue)', textDecoration: 'none', fontWeight: 700 }}>
              Go back to Alerts
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-card mt-4" style={{ borderLeft: `4px solid ${severityColor(alert.severity)}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>ID</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{alert.id || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Timestamp</div>
                <div>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Source IP</div>
                <div className="text-red" style={{ fontFamily: 'monospace', fontWeight: 800 }}>{alert.sourceIp || alert.ip || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Destination IP</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{alert.destinationIp || '—'}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Threat Type</div>
                <div style={{ fontWeight: 800 }}>{alert.threatType || alert.type || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Severity</div>
                <div style={{ fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: severityColor(alert.severity) }}>
                  {alert.severity || '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Status</div>
                <div style={{ fontWeight: 800 }}>{alert.status || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Risk Score</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{alert.riskScore ?? '—'}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Country</div>
                <div style={{ fontWeight: 800 }}>{alert.countryCode ? `${alert.countryCode} · ${alert.country || '—'}` : alert.country || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Affected Systems</div>
                <div style={{ fontWeight: 800 }}>{alert.affectedSystems || '—'}</div>
              </div>
            </div>
          </div>

          <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Auto Responses
              </div>
              {Array.isArray(alert.autoResponses) && alert.autoResponses.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alert.autoResponses.map((r, idx) => (
                    <div key={idx} style={{ borderLeft: '3px solid rgba(0,240,255,0.35)', paddingLeft: 10 }}>
                      {r}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray">—</div>
              )}
            </div>

            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Meta
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {JSON.stringify(alert.meta || {}, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Logs
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {(Array.isArray(alert.logs) ? alert.logs : []).join('\n') || '—'}
              </pre>
            </div>

            <div className="glass-card">
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 10 }}>
                Suggested Mitigations
              </div>
              {Array.isArray(alert.mitigations) && alert.mitigations.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alert.mitigations.map((m, idx) => (
                    <div key={idx} style={{ borderLeft: '3px solid rgba(0,240,255,0.35)', paddingLeft: 10 }}>
                      {m}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray">—</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertDetails;
