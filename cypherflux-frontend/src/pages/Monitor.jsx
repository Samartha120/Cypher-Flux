import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity } from 'lucide-react';

const Monitor = () => {
  const [traffic, setTraffic] = useState([]);

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const res = await api.get('/monitor');
        setTraffic(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <h2 className="neon-text flex-center">
        <Activity size={24} style={{marginRight: '12px'}}/> 
        LIVE TRAFFIC MONITOR
      </h2>
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Source IP</th>
              <th>Request Count (Current Window)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {traffic.length === 0 ? (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>No traffic detected recently</td></tr>
            ) : traffic.map((t, i) => (
              <tr key={i}>
                <td>{t.ip}</td>
                <td className="text-glow">{t.requests}</td>
                <td>
                  {t.requests > 50 ? <span className="text-red">WARNING: DOS Threshold</span> : <span className="text-green">NORMAL</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Monitor;
