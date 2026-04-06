import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="glass-card" style={{
      marginTop: 'auto',
      padding: '20px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid rgba(0, 240, 255, 0.2)',
      borderBottom: 'none', borderLeft: 'none', borderRight: 'none',
      borderRadius: '0',
      fontSize: '0.85rem'
    }}>
      {/* Left Block */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 className="neon-text" style={{ margin: 0, letterSpacing: '2px' }}>CYPHERFLUX SOC</h3>
        <span style={{ color: 'var(--text-muted)' }}>Real-Time Threat Intelligence & Network Defense</span>
      </div>

      {/* Center Block */}
      <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)' }}>
        <span style={{ cursor: 'pointer' }} className="hover:text-cyan-400">Dashboard</span>
        <span style={{ cursor: 'pointer' }} className="hover:text-cyan-400">Network Scan</span>
        <span style={{ cursor: 'pointer' }} className="hover:text-cyan-400">Logs</span>
        <span style={{ cursor: 'pointer' }} className="hover:text-cyan-400">Settings</span>
      </div>

      {/* Right Block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>SYSTEM SECURE</span>
          <div style={{ width: '8px', height: '8px', background: 'var(--neon-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--neon-green)' }} className="pulse"></div>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>Monitoring Active | Sync: {time}</span>
        <span style={{ color: '#555', fontSize: '0.7rem', marginTop: '5px' }}>© 2026 CypherFlux. v1.0.0 (Demo Build)</span>
      </div>
    </footer>
  );
};

export default Footer;
