import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/alerts.css';

const AlertPopup = () => {
  const [alert, setAlert] = useState(null);
  const [lastId, setLastId] = useState(null);

  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const res = await api.get('/alerts');
        if (res.data.length > 0) {
          const latest = res.data[0];
          if (latest.id !== lastId && lastId !== null) {
            setAlert(latest);
            setTimeout(() => setAlert(null), 5000); // Hide after 5 seconds
          }
          setLastId(latest.id);
        }
      } catch (err) {}
    };

    const interval = setInterval(pollAlerts, 5000);
    return () => clearInterval(interval);
  }, [lastId]);

  if (!alert) return null;

  return (
    <div className="alert-popup glass-card">
      <span className="alert-icon">⚠️</span>
      <div className="alert-content">
        <h4>THREAT DETECTED</h4>
        <p>High traffic / {alert.type} from <strong className="text-red">{alert.ip}</strong></p>
      </div>
    </div>
  );
};

export default AlertPopup;
