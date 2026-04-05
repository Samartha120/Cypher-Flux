import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/logs');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="page-container">
      <h2 className="neon-text flex-center">
        <FileText size={24} style={{marginRight: '12px'}}/> 
        DECRYPTED SYSTEM LOGS
      </h2>
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Encrypted Payload (Simulated)</th>
              <th>Decrypted Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>No logs found.</td></tr>
            ) : logs.map((l, i) => (
              <tr key={i}>
                <td>{new Date(l.timestamp).toLocaleString()}</td>
                <td className="obfuscated-text text-gray">{l.message}</td>
                <td className="text-green">{l.decrypted_data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Logs;
