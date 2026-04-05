import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ban } from 'lucide-react';

const BlockedIPs = () => {
  const [blocks, setBlocks] = useState([]);

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

  return (
    <div className="page-container">
      <h2 className="neon-text text-red flex-center">
        <Ban size={24} style={{marginRight: '12px'}}/> 
        FIREWALL BLOCKS
      </h2>
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Blocked IP Address</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign: 'center'}}>No manually blocked IPs.</td></tr>
            ) : blocks.map((b, i) => (
              <tr key={i}>
                <td>{b.id}</td>
                <td>{new Date(b.timestamp).toLocaleString()}</td>
                <td className="text-red font-bold">{b.ip}</td>
                <td>{b.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlockedIPs;
