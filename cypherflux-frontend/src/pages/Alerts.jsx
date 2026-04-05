import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell } from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/alerts');
        setAlerts(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <h2 className="neon-text text-red flex-center">
        <Bell size={24} style={{marginRight: '12px'}}/> 
        THREAT ALERTS
      </h2>
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Source IP</th>
              <th>Threat Type</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign: 'center'}}>System secure. No active alerts.</td></tr>
            ) : alerts.map((t, i) => (
              <tr key={i} className="alert-row">
                <td>{t.id}</td>
                <td>{new Date(t.timestamp).toLocaleString()}</td>
                <td className="text-red">{t.ip}</td>
                <td>{t.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Alerts;
