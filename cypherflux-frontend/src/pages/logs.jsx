import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const safeBtoa = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(String(str))));
  } catch {
    return btoa(String(str));
  }
};

const safeAtob = (b64) => {
  try {
    return decodeURIComponent(escape(atob(String(b64))));
  } catch {
    try {
      return atob(String(b64));
    } catch {
      return String(b64);
    }
  }
};

const sampleMessages = [
  'Suspicious request burst detected',
  'Port scan signature observed on perimeter',
  'Failed authentication attempts exceeded threshold',
  'Outbound beaconing pattern flagged by heuristic',
  'Anomalous DNS query volume detected',
  'WAF rule triggered: injection attempt blocked',
];

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const seededRef = useRef(false);
  const simIntervalRef = useRef(null);
  const apiIntervalRef = useRef(null);

  useEffect(() => {
    // Seed simulation once
    if (!seededRef.current) {
      seededRef.current = true;
      const seed = Array.from({ length: 8 }, (_, idx) => {
        const msg = sampleMessages[randomInt(0, sampleMessages.length - 1)];
        const encrypted = safeBtoa(msg);
        return {
          id: `sim-${Date.now()}-${idx}`,
          timestamp: new Date(Date.now() - (8 - idx) * 1200).toISOString(),
          encrypted_payload: encrypted,
          decrypted_message: safeAtob(encrypted),
        };
      }).reverse();
      setLogs(seed);
    }

    // Real-time simulation: add a log every ~2.5 seconds
    simIntervalRef.current = setInterval(() => {
      setLogs((prev) => {
        const msg = sampleMessages[randomInt(0, sampleMessages.length - 1)];
        const encrypted = safeBtoa(msg);
        const entry = {
          id: `sim-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: new Date().toISOString(),
          encrypted_payload: encrypted,
          decrypted_message: safeAtob(encrypted),
        };
        return [entry, ...prev].slice(0, 50);
      });
    }, 2500);

    // API overlay: poll every 4s; if backend is running it will populate apiLogs
    const fetchLogs = async () => {
      try {
        const res = await api.get('/logs');
        const data = Array.isArray(res?.data) ? res.data : [];
        setApiLogs(data);
        setApiAvailable(true);
      } catch {
        setApiLogs([]);
        setApiAvailable(false);
      }
    };
    fetchLogs();
    apiIntervalRef.current = setInterval(fetchLogs, 4000);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (apiIntervalRef.current) clearInterval(apiIntervalRef.current);
    };
  }, []);

  const mergedLogs = useMemo(() => {
    const formattedApi = (Array.isArray(apiLogs) ? apiLogs : []).map((l) => {
      const encrypted = l?.encrypted_data || l?.encrypted_payload || safeBtoa(l?.message || l?.decrypted_data || '');
      const decrypted = l?.decrypted_data || l?.decrypted_message || safeAtob(encrypted);
      return {
        id: l?.id || `api-${l?.timestamp || ''}-${Math.random().toString(16).slice(2)}`,
        timestamp: l?.timestamp,
        encrypted_payload: encrypted,
        decrypted_message: decrypted,
      };
    });

    // Prefer API logs when they exist, but keep the simulated feed visible.
    // This avoids a blank page when the backend is reachable yet has no log rows yet.
    const list = formattedApi.length > 0 ? [...formattedApi, ...logs] : logs;
    return list.slice(0, 50);
  }, [apiAvailable, apiLogs, logs]);

  const formatTimestamp = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  };

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mergedLogs.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign: 'center'}}>No logs found.</td></tr>
            ) : mergedLogs.map((l) => (
              <tr key={l?.id || `${l?.timestamp || ''}-${l?.encrypted_payload || ''}`}
              >
                <td>{formatTimestamp(l?.timestamp)}</td>
                <td className="obfuscated-text text-gray">{l?.encrypted_payload || '—'}</td>
                <td className="text-green">{l?.decrypted_message || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  {l?.id ? (
                    <Link
                      to={`/logs/view/${encodeURIComponent(String(l.id))}`}
                      state={{ log: l }}
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

export default Logs;
