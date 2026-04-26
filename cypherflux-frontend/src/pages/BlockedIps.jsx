import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThreats } from '../context/useThreats';

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
      await api.post('/blocked', { ip: newIp, reason: reason || 'Manual block' });

      const normalized = String(newIp || '').trim() === '0.0.0.0' ? '0.0.0.0/0' : newIp;
      blockIp(normalized, reason || 'Manual block');

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
              <th>ID</th>
              <th>Timestamp</th>
              <th>Blocked IP Address</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign: 'center'}}>No manually blocked IPs.</td></tr>
            ) : blocks.map((b, i) => (
              <tr key={i}>
                <td>{b.id}</td>
                <td>{new Date(b.timestamp).toLocaleString()}</td>
                <td className="text-red font-bold">{b.ip}</td>
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
    </div>
  );
};

export default BlockedIPs;
