import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { Activity } from 'lucide-react';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomIp = () => {
  const a = randomInt(11, 223);
  const b = randomInt(0, 255);
  const c = randomInt(0, 255);
  const d = randomInt(1, 254);
  return `${a}.${b}.${c}.${d}`;
};

const statusForRequests = (requests) => {
  if (requests > 200) return 'attack';
  if (requests > 100) return 'suspicious';
  return 'normal';
};

const Monitor = () => {
  const [traffic, setTraffic] = useState([]);
  const [apiTraffic, setApiTraffic] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [summary, setSummary] = useState(null);
  const seededRef = useRef(false);
  const simIntervalRef = useRef(null);
  const apiIntervalRef = useRef(null);

  const mergedTraffic = useMemo(() => {
    const base = apiAvailable ? apiTraffic : traffic;
    const list = Array.isArray(base) ? base : [];
    return list
      .map((row) => {
        const ip = row?.ip;
        const requests = Number(row?.requests ?? 0);
        return {
          ip,
          requests,
          status: row?.status || statusForRequests(requests),
          riskScore: Number(row?.riskScore ?? 0),
          detectionSource: row?.detectionSource || 'Traffic Monitor',
          lastSeen: row?.lastSeen || null,
          _seed: row?._seed ?? Math.random().toString(16).slice(2),
        };
      })
      .filter((r) => !!r.ip)
      .sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0))
      .slice(0, 18);
  }, [apiAvailable, apiTraffic, traffic]);

  useEffect(() => {
    // Seed simulation once
    if (!seededRef.current) {
      seededRef.current = true;
      const initial = Array.from({ length: 10 }, () => {
        const requests = randomInt(5, 90);
        return {
          ip: randomIp(),
          requests,
          status: statusForRequests(requests),
          _seed: Math.random().toString(16).slice(2),
        };
      });
      setTraffic(initial);
    }

    // Real-time simulation: update every second with spikes/decay
    simIntervalRef.current = setInterval(() => {
      setTraffic((prev) => {
        const next = prev.map((row) => {
          const base = Number(row.requests ?? 0);
          const decay = Math.max(0, Math.floor(base * (Math.random() * 0.12)));
          const normal = randomInt(0, 14);
          const spike = Math.random() > 0.93 ? randomInt(60, 180) : 0;
          const requests = Math.min(320, Math.max(0, base - decay + normal + spike));
          return { ...row, requests, status: statusForRequests(requests) };
        });

        // Occasionally introduce a new IP
        if (next.length < 18 && Math.random() > 0.82) {
          const requests = randomInt(2, 45);
          next.push({ ip: randomIp(), requests, status: statusForRequests(requests), _seed: Math.random().toString(16).slice(2) });
        }

        // Drop cold IPs
        const filtered = next.filter((r) => (r.requests ?? 0) > 0 || Math.random() > 0.4);
        return filtered.slice(0, 18);
      });
    }, 1000);

    // API overlay: poll every 3s; if backend is running, it will replace matching IPs
    const fetchTraffic = async () => {
      try {
        const res = await api.get('/monitor');
        const payload = res?.data || {};
        const data = Array.isArray(payload?.items) ? payload.items : [];
        setApiTraffic(data);
        setSummary(payload?.summary || null);
        setApiAvailable(true);
      } catch {
        setApiTraffic([]);
        setSummary(null);
        setApiAvailable(false);
      }
    };
    fetchTraffic();
    apiIntervalRef.current = setInterval(fetchTraffic, 3000);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (apiIntervalRef.current) clearInterval(apiIntervalRef.current);
    };
  }, []);

  return (
    <div className="page-container">
      <h2 className="neon-text flex-center">
        <Activity size={24} style={{marginRight: '12px'}}/> 
        LIVE TRAFFIC MONITOR
      </h2>
      {apiAvailable && summary ? (
        <div className="glass-card mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Active IPs</div>
            <div className="text-glow" style={{ fontSize: '1.2rem', fontWeight: 800 }}>{summary.activeIps ?? 0}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Suspicious</div>
            <div style={{ color: '#facc15', fontSize: '1.2rem', fontWeight: 800 }}>{summary.suspiciousIps ?? 0}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Attack</div>
            <div className="text-red" style={{ fontSize: '1.2rem', fontWeight: 800 }}>{summary.attackIps ?? 0}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Update</div>
            <div style={{ fontWeight: 700 }}>{summary.updatedAt ? new Date(summary.updatedAt).toLocaleTimeString() : '—'}</div>
          </div>
        </div>
      ) : null}
      <div className="glass-card mt-4 table-container">
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Source IP</th>
              <th>Request Count (Current Window)</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Source</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {mergedTraffic.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No traffic detected recently</td></tr>
            ) : mergedTraffic.map((t) => (
              <tr key={t?.ip || t?._seed}>
                <td className={t.status === 'attack' ? 'text-red' : t.status === 'suspicious' ? '' : ''}>
                  {t?.ip || '—'}
                </td>
                <td className="text-glow">{Number(t?.requests ?? 0)}</td>
                <td>
                  {t.status === 'attack' ? (
                    <span className="text-red" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>ATTACK</span>
                  ) : t.status === 'suspicious' ? (
                    <span className="blink" style={{ color: '#facc15', letterSpacing: '1px', textTransform: 'uppercase' }}>SUSPICIOUS</span>
                  ) : (
                    <span className="text-green" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>NORMAL</span>
                  )}
                </td>
                <td>{Number(t?.riskScore ?? 0)}</td>
                <td>{t?.detectionSource || 'Traffic Monitor'}</td>
                <td>{t?.lastSeen ? new Date(t.lastSeen).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Monitor;
