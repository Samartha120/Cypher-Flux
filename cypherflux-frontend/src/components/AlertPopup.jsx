import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AlertPopup = () => {
  const [lastId, setLastId] = useState(null);

  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const res = await api.get('/alerts');
        if (res.data.length > 0) {
          const latest = res.data[0];
          // If we have a new alert that we haven't seen before
          if (latest.id !== lastId && lastId !== null) {
            toast.error(
                <div>
                    <strong>SYSTEM COMPROMISE DETECTED</strong><br/>
                    <span style={{fontSize: '0.8rem'}}>Source: {latest.ip}</span><br/>
                    <span style={{fontSize: '0.8rem', color: '#facc15'}}>Vector: {latest.type}</span>
                </div>, 
                {
                    position: "bottom-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "dark",
                }
            );
          }
          setLastId(latest.id);
        }
      } catch (err) {
        // Ignore silent polling network drops
      }
    };

    const interval = setInterval(pollAlerts, 5000);
    return () => clearInterval(interval);
  }, [lastId]);

  return <ToastContainer toastStyle={{ background: 'rgba(0,15,30,0.9)', border: '1px solid var(--neon-red)', color: '#fff', fontFamily: 'monospace' }} />;
};

export default AlertPopup;
