import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { Activity, Eye, ShieldAlert, ShieldCheck, MapPin, Globe, History, X, Server, AlertTriangle, Clock, Bug, ShieldOff } from 'lucide-react';
import { ipToCountry, getRandomTargetDevice } from '../utils/threatSim';
import { motion, AnimatePresence } from 'framer-motion';
import { useThreats } from '../context/useThreats';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomIp = () => {
  const a = randomInt(11, 223);
  const b = randomInt(0, 255);
  const c = randomInt(0, 255);
  const d = randomInt(1, 254);
  return `${a}.${b}.${c}.${d}`;
};

const statusForRequests = (requests) => {
  if (requests > 200) return 'blocked';
  if (requests > 100) return 'suspicious';
  return 'normal';
};

const THREAT_DESCRIPTIONS = [
  'Multiple failed SSH login attempts detected.',
  'Suspicious SQL patterns found in URL parameters.',
  'Unusually large packet payload size from single source.',
  'Rapid scanning of high-range ports (reconnaissance).',
  'Automated bot-agent detected in header strings.',
  'Cross-Site Scripting (XSS) payload detected in form data.',
  'Attempted access to sensitive system files (/etc/passwd).',
  'Volume based amplification attempt (UDP flood).',
];

const threatTypeForRequests = (requests) => {
  if (requests > 250) return 'DDoS Mitigation Protocol Active';
  if (requests > 180) return 'Unauthorized API Enumeration';
  if (requests > 100) return 'Credential Stuffing Detected';
  return 'Legitimate Traffic Stream';
};

const Monitor = () => {
  const { blockIp, unblockIp, isIpBlocked, addAuditLog } = useThreats();
  const [traffic, setTraffic] = useState([]);
  const [apiTraffic, setApiTraffic] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const seededRef = useRef(false);
  const simIntervalRef = useRef(null);
  const apiIntervalRef = useRef(null);
  const [selectedIp, setSelectedIp] = useState(null);

  const mergedTraffic = useMemo(() => {
    // Merge API traffic with simulated traffic for a richer view
    const apiList = Array.isArray(apiTraffic) ? apiTraffic : [];
    const simList = Array.isArray(traffic) ? traffic : [];
    
    // Create a combined map keyed by IP
    const combinedMap = new Map();
    
    // Add simulated traffic first
    simList.forEach(row => {
      if (row.ip) combinedMap.set(row.ip, row);
    });
    
    // Overlay API traffic (real traffic takes precedence for the same IP)
    apiList.forEach(row => {
      if (row.ip) {
        const existing = combinedMap.get(row.ip);
        combinedMap.set(row.ip, {
          ...existing,
          ...row,
          requests: Math.max(Number(row.requests || 0), Number(existing?.requests || 0))
        });
      }
    });

    const list = Array.from(combinedMap.values());

    return list
      .map((row) => {
        const ip = row?.ip;
        const requests = Number(row?.requests ?? 0);
        const isBlocked = isIpBlocked(ip);
        const status = isBlocked ? 'blocked' : statusForRequests(requests);
        
        const alertCount = row?.alertCount || (requests > 100 ? Math.floor(requests / 10) : 0);

        return {
          ip,
          requests,
          status,
          alertCount,
          threatType: isBlocked ? 'Malicious Source - Permanent Block' : threatTypeForRequests(requests),
          activity: row?.activity || (status !== 'normal' ? THREAT_DESCRIPTIONS[randomInt(0, THREAT_DESCRIPTIONS.length - 1)] : 'Normal browsing activity.'),
          target: row?.target || getRandomTargetDevice(),
          startTime: row?.startTime || new Date(Date.now() - randomInt(10000, 300000)).toISOString(),
          _seed: row?._seed ?? Math.random().toString(16).slice(2),
        };
      })
      .filter((r) => !!r.ip)
      .sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0))
      .slice(0, 20);
  }, [apiAvailable, apiTraffic, traffic, isIpBlocked]);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      const initial = Array.from({ length: 15 }, () => {
        const requests = randomInt(5, 90);
        const ip = randomIp();
        return {
          ip,
          requests,
          alertCount: 0,
          status: statusForRequests(requests),
          target: getRandomTargetDevice(),
          startTime: new Date(Date.now() - randomInt(60000, 600000)).toISOString(),
          _seed: Math.random().toString(16).slice(2),
        };
      });
      setTraffic(initial);
    }

    simIntervalRef.current = setInterval(() => {
      setTraffic((prev) => {
        const next = prev.map((row) => {
          const base = Number(row.requests ?? 0);
          const isBlocked = isIpBlocked(row.ip);
          
          // Blocked IPs should have very low/no request counts after blocking
          if (isBlocked) {
            return { ...row, requests: Math.max(0, base - randomInt(5, 15)) };
          }

          const decay = Math.max(0, Math.floor(base * (Math.random() * 0.12)));
          const normal = randomInt(0, 14);
          const spike = Math.random() > 0.93 ? randomInt(60, 180) : 0;
          const requests = Math.min(320, Math.max(0, base - decay + normal + spike));
          
          let alertCount = Number(row.alertCount || 0);
          if (requests > 150 && Math.random() > 0.7) alertCount += 1;

          return { ...row, requests, alertCount };
        });

        if (next.length < 22 && Math.random() > 0.75) {
          const requests = randomInt(2, 45);
          next.push({ 
            ip: randomIp(), 
            requests, 
            alertCount: 0,
            target: getRandomTargetDevice(),
            startTime: new Date().toISOString(),
            _seed: Math.random().toString(16).slice(2) 
          });
        }

        const filtered = next.filter((r) => (r.requests ?? 0) > 0 || Math.random() > 0.3);
        return filtered.slice(0, 20);
      });
    }, 1000);

    const fetchTraffic = async () => {
      try {
        const res = await api.get('/monitor');
        const data = Array.isArray(res?.data) ? res.data : [];
        setApiTraffic(data);
        setApiAvailable(true);
      } catch {
        setApiTraffic([]);
        setApiAvailable(false);
      }
    };
    fetchTraffic();
    apiIntervalRef.current = setInterval(fetchTraffic, 3000);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (apiIntervalRef.current) clearInterval(apiIntervalRef.current);
    };
  }, [isIpBlocked]);

  const handleView = (ip, geo) => {
    const row = mergedTraffic.find(t => t.ip === ip);
    if (row) {
      setSelectedIp({ ...row, geo });
      addAuditLog(`Entering Forensic View for source IP: ${ip}`, 'info', 'MONITOR', `PID: ${Math.floor(Math.random()*9000)+1000} | VIEW: ACTIVE`);
    }
  };

  const handleBlock = (ip) => {
    blockIp(ip, 'Permanent Security Block - Threat Identified');
    addAuditLog(`SECURITY ACTION: IP ${ip} permanently banned from system.`, 'error', 'FIREWALL', `RULE: DROP_ALL | SRC: ${ip}`);
    if (selectedIp?.ip === ip) {
      setSelectedIp(prev => ({ ...prev, status: 'blocked', threatType: 'Malicious Source - Permanent Block' }));
    }
  };

  const handleUnblock = (ip) => {
    unblockIp(ip);
    addAuditLog(`SECURITY ACTION: Access restored for IP ${ip}.`, 'success', 'FIREWALL', `RULE: ACCEPT | SRC: ${ip}`);
    // Reset local traffic requests so it doesn't immediately re-trigger the heuristic 'blocked' status
    setTraffic((prev) => 
      prev.map((row) => row.ip === ip ? { ...row, requests: randomInt(5, 20) } : row)
    );
    if (selectedIp?.ip === ip) {
      setSelectedIp(prev => ({ ...prev, status: 'normal', requests: 15, threatType: 'Legitimate Traffic Stream' }));
    }
  };

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
              <th style={{textAlign: 'left'}}>Source IP</th>
              <th style={{textAlign: 'left'}}>Geolocation</th>
              <th style={{textAlign: 'center'}}>Alerts</th>
              <th style={{textAlign: 'center'}}>Request Count</th>
              <th style={{textAlign: 'center'}}>Status</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mergedTraffic.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No traffic detected recently</td></tr>
            ) : mergedTraffic.map((t) => {
              const geo = ipToCountry(t.ip);
              return (
              <tr key={t?.ip || t?._seed}>
                <td style={{textAlign: 'left', fontFamily: 'monospace', fontWeight: '600'}}>
                  {t?.ip || '—'}
                </td>
                <td style={{textAlign: 'left'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <img 
                      src={`https://flagcdn.com/16x12/${geo.code.toLowerCase()}.png`} 
                      alt={geo.code} 
                      style={{borderRadius: '2px', boxShadow: '0 0 4px rgba(0,0,0,0.5)'}}
                    />
                    <span style={{fontSize: '0.85rem'}}>{geo.name}</span>
                  </div>
                </td>
                <td style={{textAlign: 'center'}}>
                  {t.alertCount > 0 ? (
                    <motion.span 
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      key={t.alertCount}
                      style={{
                        padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 0, 60, 0.15)',
                        color: 'var(--neon-red)', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--neon-red)'
                      }}
                    >
                      {t.alertCount}
                    </motion.span>
                  ) : (
                    <span style={{color: 'var(--text-muted)', fontSize: '0.75rem'}}>0</span>
                  )}
                </td>
                <td style={{textAlign: 'center'}}>
                  <div className="text-glow" style={{
                    display: 'inline-block', minWidth: '40px', padding: '2px 8px', 
                    background: 'rgba(0, 240, 255, 0.05)', borderRadius: '4px',
                    fontWeight: 'bold', fontSize: '1rem'
                  }}>
                    {Number(t?.requests ?? 0)}
                  </div>
                </td>
                <td style={{textAlign: 'center'}}>
                  {t.status === 'blocked' ? (
                    <span className="text-red flex-center" style={{ gap: '4px', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      <ShieldOff size={12}/> BLOCKED
                    </span>
                  ) : t.status === 'suspicious' ? (
                    <span className="blink flex-center" style={{ color: '#facc15', gap: '4px', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      <Activity size={12}/> SUSPICIOUS
                    </span>
                  ) : (
                    <span className="text-green flex-center" style={{ gap: '4px', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      <ShieldCheck size={12}/> NORMAL
                    </span>
                  )}
                </td>
                <td style={{textAlign: 'right'}}>
                  <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                    {t.status === 'blocked' ? (
                      <button 
                        className="cyber-button" 
                        style={{
                          padding: '4px 10px', fontSize: '0.65rem', display: 'inline-flex', 
                          alignItems: 'center', gap: '4px', background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid var(--neon-green)', color: 'var(--neon-green)',
                          borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                          textTransform: 'uppercase', fontWeight: 'bold'
                        }}
                        onClick={() => handleUnblock(t.ip)}
                      >
                        <ShieldCheck size={12}/> Unblock
                      </button>
                    ) : null}
                    <button 
                      className="cyber-button" 
                      style={{
                        padding: '4px 14px', fontSize: '0.7rem', display: 'inline-flex', 
                        alignItems: 'center', gap: '6px', background: 'transparent',
                        border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)',
                        borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                        textTransform: 'uppercase', fontWeight: 'bold'
                      }}
                      onClick={() => handleView(t.ip, geo)}
                    >
                      <Eye size={12}/> View
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedIp && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 10000
          }} onClick={() => setSelectedIp(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="glass-card" 
              style={{
                width: '600px', maxWidth: '95vw', padding: '32px',
                border: selectedIp.status === 'blocked' ? '1px solid var(--neon-red)' : '1px solid var(--neon-blue)', 
                position: 'relative',
                boxShadow: selectedIp.status === 'blocked' ? '0 0 40px rgba(255, 0, 60, 0.15)' : '0 0 40px rgba(0, 240, 255, 0.15)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                style={{position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}
                onClick={() => setSelectedIp(null)}
              >
                <X size={24}/>
              </button>

              <h3 className="neon-text" style={{margin: '0 0 24px 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px', color: selectedIp.status === 'blocked' ? 'var(--neon-red)' : ''}}>
                {selectedIp.status === 'blocked' ? <ShieldOff size={24}/> : <Globe size={24}/>}
                IP INTELLIGENCE PANEL {selectedIp.status === 'blocked' ? '(SOURCE RESTRICTED)' : ''}
              </h3>

              <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px'}}>
                <div className="info-group">
                  <label style={{color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px'}}>Source Identifier</label>
                  <div style={{fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', color: 'white'}}>{selectedIp.ip}</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px'}}>
                    <MapPin size={14} className="text-blue"/>
                    {selectedIp.geo.name} ({selectedIp.geo.code})
                  </div>
                </div>

                <div className="info-group">
                  <label style={{color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px'}}>Primary Target</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', color: '#facc15'}}>
                    <Server size={18}/> {selectedIp.target}
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                  <Bug size={18} style={{color: selectedIp.status === 'normal' ? 'var(--neon-green)' : 'var(--neon-red)'}}/>
                  <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: 'white', textTransform: 'uppercase'}}>{selectedIp.threatType}</span>
                </div>
                <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic'}}>
                  &quot;{selectedIp.activity}&quot;
                </p>
              </div>

              <div style={{marginBottom: '32px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h4 style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <History size={16}/> Behavioral Traffic Pattern
                  </h4>
                  <span style={{fontSize: '0.75rem', color: 'var(--neon-blue)', fontWeight: 'bold'}}>{selectedIp.requests} REQ/SEC</span>
                </div>
                <div style={{height: '100px', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                  {Array.from({length: 40}).map((_, i) => {
                    const isRecent = i > 34;
                    const isDdos = selectedIp.threatType.includes('DDoS');
                    const isScan = selectedIp.threatType.includes('Scanning');
                    
                    let h;
                    if (isRecent) {
                      h = (selectedIp.requests / 320) * 100;
                    } else if (isDdos) {
                      h = Math.random() > 0.6 ? 90 : 20;
                    } else if (isScan) {
                      h = 40 + Math.random() * 20;
                    } else {
                      h = 5 + Math.random() * 15;
                    }

                    return (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, h)}%` }}
                        style={{
                          flex: 1, 
                          background: selectedIp.status === 'blocked' ? 'var(--neon-red)' : selectedIp.status === 'suspicious' ? '#facc15' : 'var(--neon-green)',
                          opacity: 0.1 + (i / 40) * 0.9,
                          borderRadius: '1px',
                        }}
                      ></motion.div>
                    );
                  })}
                </div>
              </div>

              <div style={{display: 'flex', gap: '16px'}}>
                <button 
                  className="cyber-button" 
                  style={{
                    flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                  }} 
                  onClick={() => setSelectedIp(null)}
                >
                  Return to Monitor
                </button>
                {selectedIp.status !== 'blocked' ? (
                  <button 
                    className="cyber-button" 
                    style={{
                      flex: 1, padding: '12px', background: 'rgba(255,0,60,0.1)', 
                      border: '1px solid var(--neon-red)', color: 'var(--neon-red)',
                      fontWeight: '800'
                    }}
                    onClick={() => handleBlock(selectedIp.ip)}
                  >
                    DEPLOY PERMANENT BLOCK
                  </button>
                ) : (
                  <button 
                    className="cyber-button" 
                    style={{
                      flex: 1, padding: '12px', background: 'rgba(34, 197, 94, 0.1)', 
                      border: '1px solid var(--neon-green)', color: 'var(--neon-green)',
                      fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                    onClick={() => handleUnblock(selectedIp.ip)}
                  >
                    <ShieldCheck size={18}/> RESTORE SYSTEM ACCESS
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Monitor;
