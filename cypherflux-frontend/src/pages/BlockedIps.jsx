import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThreats } from '../context/ThreatContext';

const severityColor = (severity) => {
  const sev = String(severity || '').toLowerCase();
  if (sev === 'critical') return 'var(--neon-red)';
  if (sev === 'high') return '#f97316';
  if (sev === 'medium') return '#facc15';
  return 'var(--neon-blue)';
};

const BlockedIPs = () => {
  const [blocks, setBlocks] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [reason, setReason] = useState('');
  const { blockIp, clearBlockedIps } = useThreats();

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await api.get('/blocked');
        setBlocks(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBlocks();
  }, []);

  const handleBlock = async () => {
    try {
      const payload = {
        ip: newIp,
        reason: reason || 'Manual block',
        attackType: 'Manual firewall rule',
        details: reason || 'Blocked manually by analyst from the firewall blocks page.',
        detectionSource: 'Blocked IPs',
        severity: 'medium',
        actionType: 'manual',
      };
      const blockRes = await api.post('/blocked', payload);

      const normalized = String(newIp || '').trim() === '0.0.0.0' ? '0.0.0.0/0' : newIp;
      blockIp(normalized, blockRes?.data?.item || payload);

      setNewIp('');
      setReason('');
      const res = await api.get('/blocked');
      setBlocks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurge = async () => {
    try {
      await api.delete('/blocked');
      setBlocks([]);
      clearBlockedIps();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <h2 className="neon-text text-red flex-center">
        <Ban size={24} style={{marginRight: '12px'}}/> 
        FIREWALL BLOCKS
      </h2>
      <div className="glass-card mb-4 mt-4" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={newIp} 
          onChange={e => setNewIp(e.target.value)} 
          placeholder="Enter IP to block" 
          className="cyber-input" 
          style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}
        />
        <input 
          type="text" 
          value={reason} 
          onChange={e => setReason(e.target.value)} 
          placeholder="Reason (Optional)" 
          className="cyber-input" 
          style={{ marginBottom: 0, flex: 2, minWidth: '200px' }}
        />
        <button onClick={handleBlock} className="cyber-button" disabled={!newIp}>Block IP</button>
        <button onClick={handlePurge} className="cyber-button" style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)' }}>Purge All</button>
      </div>
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Blocked IP Address</th>
              <th>Attack Type</th>
              <th>Source</th>
              <th>Severity</th>
              <th>Action</th>
              <th>Risk</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr><td colSpan="9" style={{textAlign: 'center'}}>No blocked IPs recorded.</td></tr>
            ) : blocks.map((b, i) => (
              <tr key={i}>
                <td>{new Date(b.blockedAt || b.timestamp).toLocaleString()}</td>
                <td className="text-red font-bold">{b.ip}</td>
                <td>{b.attackType || 'Manual firewall rule'}</td>
                <td>{b.detectionSource || 'Blocked IPs'}</td>
                <td>
                  <span style={{ color: severityColor(b.severity), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {b.severity || 'medium'}
                  </span>
                </td>
                <td style={{ textTransform: 'uppercase' }}>{b.actionType || 'manual'}</td>
                <td>{Number(b.riskScore || 0)}</td>
                <td>{b.reason}</td>
                <td style={{ textAlign: 'right' }}>
                  {b?.id != null ? (
                    <Link
                      to={`/blocked/view/${encodeURIComponent(String(b.id))}`}
                      state={{ block: b }}
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
      {blocks.length > 0 ? (
        <div className="glass-card mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {blocks.slice(0, 3).map((block) => (
            <div
              key={`summary-${block.id}`}
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: `1px solid ${severityColor(block.severity)}33`,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ color: severityColor(block.severity), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.76rem' }}>
                {block.severity || 'medium'} risk
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', marginTop: '8px', marginBottom: '8px' }}>{block.ip}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{block.attackType || block.reason}</div>
              <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>Source: {block.detectionSource || 'Blocked IPs'}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default BlockedIPs;
