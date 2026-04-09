import React, { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { useThreats } from '../context/ThreatContext';
import { Link, useParams } from 'react-router-dom';

const Alerts = () => {
  const { alerts = [] } = useThreats();
  const rows = Array.isArray(alerts) ? alerts : [];

  const { severity } = useParams();
  const severityFilter = useMemo(() => {
    const s = String(severity || '').toLowerCase();
    return ['critical', 'high', 'medium', 'low'].includes(s) ? s : null;
  }, [severity]);

  const filteredRows = useMemo(() => {
    if (!severityFilter) return rows;
    return rows.filter((t) => String(t?.severity || '').toLowerCase() === severityFilter);
  }, [rows, severityFilter]);

  const titleSuffix = severityFilter ? ` — ${severityFilter.toUpperCase()}` : '';

  return (
    <div className="page-container">
      <h2 className="neon-text text-red flex-center">
        <Bell size={24} style={{marginRight: '12px'}}/> 
        THREAT ALERTS{titleSuffix}
      </h2>

      <div className="glass-card mt-4" style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-start' }}>
        <Link
          to="/alerts/critical"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: severityFilter === 'critical' ? '1px solid var(--neon-red)' : '1px solid rgba(255,255,255,0.08)',
            color: 'var(--neon-red)',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Critical
        </Link>

        <Link
          to="/alerts/high"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: severityFilter === 'high' ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
            color: '#facc15',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          High
        </Link>

        <Link
          to="/alerts/medium"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: severityFilter === 'medium' ? '1px solid var(--neon-blue)' : '1px solid rgba(255,255,255,0.08)',
            color: 'var(--neon-blue)',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Medium
        </Link>

        <Link
          to="/alerts/low"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: severityFilter === 'low' ? '1px solid var(--text-muted)' : '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-muted)',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Low
        </Link>

        <Link
          to="/alerts"
          style={{
            marginLeft: 'auto',
            padding: '10px 14px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: !severityFilter ? '1px solid var(--text-main)' : '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-main)',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          All
        </Link>
      </div>

      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Source IP</th>
              <th>Threat Type</th>
              <th>Severity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>System secure. No active alerts.</td></tr>
            ) : filteredRows.map((t) => (
              <tr key={t?.id || `${t?.timestamp || ''}-${t?.sourceIp || t?.ip || ''}-${t?.threatType || t?.type || ''}`} className="alert-row">
                <td>{t?.id || '—'}</td>
                <td>{t?.timestamp ? new Date(t.timestamp).toLocaleString() : '—'}</td>
                <td className="text-red">{t?.sourceIp || t?.ip || '—'}</td>
                <td>{t?.threatType || t?.type || '—'}</td>
                <td
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color:
                      String(t?.severity || '').toLowerCase() === 'critical'
                        ? 'var(--neon-red)'
                        : String(t?.severity || '').toLowerCase() === 'high'
                          ? '#facc15'
                          : String(t?.severity || '').toLowerCase() === 'low'
                            ? 'var(--text-muted)'
                            : 'var(--neon-blue)',
                  }}
                >
                  {t?.severity || '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {t?.id ? (
                    <Link
                      to={`/alerts/view/${t.id}`}
                      style={{
                        textDecoration: 'none',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-main)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'rgba(0,0,0,0.25)',
                        display: 'inline-block',
                      }}
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-gray">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Alerts;
