import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Loader from '../components/Loader';
import { scanNetworkTarget } from '../utils/networkScan';

const Scan = () => {
  const [target, setTarget] = useState('127.0.0.1');
  const [result, setResult] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScan = async () => {
    try {
      setError('');
      setLoading(true);
      setResult(null);
      setResults(null);

      const scan = await scanNetworkTarget(target);
      if (scan && Array.isArray(scan.devices)) {
        setResults(scan);
      } else {
        setResult(scan);
      }
    } catch (err) {
      setError(err?.code === 'INVALID_IP' ? 'Invalid IPv4 address. Example: 192.168.1.10' : 'Scan failed.');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <h2 className="neon-text">NETWORK RECONNAISSANCE</h2>
      <div className="glass-card scan-controls">
        <input 
          type="text" 
          value={target} 
          onChange={e => setTarget(e.target.value)} 
          className="cyber-input"
          placeholder="Target IPv4 (e.g. 127.0.0.1) or 0.0.0.0 (scan all)"
        />
        <button onClick={handleScan} disabled={loading} className="cyber-button flex-center">
          <Search size={18} style={{marginRight: '8px'}}/> 
          {loading ? 'SCANNING...' : 'EXECUTE SCAN'}
        </button>
      </div>

      {error ? (
        <div className="glass-card mt-4" style={{ border: '1px solid var(--neon-red)' }}>
          <div className="text-red" style={{ letterSpacing: '1px' }}>{error}</div>
        </div>
      ) : null}

      {loading ? (
        <div className="glass-card mt-4">
          <Loader label="Scanning target..." />
        </div>
      ) : null}

      <div className="results-container mt-4">
        {results ? (
          <>
            <div className="glass-card mb-2" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span><strong>Target:</strong> {results.target || '0.0.0.0'}</span>
              <span className="text-gray"><strong>Devices:</strong> {results.devices.length}</span>
            </div>

            <div className="glass-card">
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Discovered Devices
              </h3>

              {results.devices.length === 0 ? (
                <div className="text-gray">
                  No devices returned. If you are using the backend scanner, ensure Nmap is installed and the backend is running.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {results.devices.map((d) => (
                    <div key={d.ip} className="glass-card" style={{ padding: 14, border: '1px solid rgba(0, 240, 255, 0.12)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--neon-blue)' }}>{d.ip}</div>
                          <div className="text-gray" style={{ fontSize: '0.85rem' }}>{d.hostname || '—'}</div>
                        </div>
                        <div className={d.state === 'up' ? 'text-green' : 'text-red'} style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>
                          {d.state || '—'}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-gray" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                          Open Ports
                        </div>
                        {Array.isArray(d.openPorts) && d.openPorts.length ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {d.openPorts.slice(0, 10).map((p) => (
                              <span
                                key={`${d.ip}:${p.port}`}
                                style={{
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  padding: '6px 8px',
                                  borderRadius: 10,
                                  background: 'rgba(0,0,0,0.25)',
                                  fontFamily: 'monospace',
                                }}
                                title={p.service}
                              >
                                {p.port}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray">No open ports reported (host discovery scan).</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {result ? (
          <>
            <div className="glass-card mb-2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="list-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span><strong>IP:</strong> {result.ip}</span>
                <span><strong>Hostname:</strong> {result.hostname}</span>
                <span className={`${result.state === 'up' ? 'text-green' : 'text-red'}`}>
                  <strong>State:</strong> {result.state}
                </span>
                <span className="text-gray">
                  <strong>Latency:</strong> {result.latency === null ? '—' : `${result.latency} ms`}
                </span>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Open Ports</h3>
              {result.openPorts.length === 0 ? (
                <div className="text-gray">No open ports detected.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {result.openPorts.map((p) => (
                    <div key={p.port} className="glass-card" style={{ padding: '12px', border: '1px solid rgba(0, 240, 255, 0.12)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div>
                          <div style={{ color: 'var(--neon-blue)', fontWeight: 800 }}>:{p.port}</div>
                          <div className="text-gray" style={{ fontSize: '0.85rem' }}>{p.service}</div>
                        </div>
                        <div style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem', color: p.risk === 'high' ? 'var(--neon-red)' : p.risk === 'medium' ? '#facc15' : 'var(--neon-green)' }}>
                          {p.risk}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Scan;
