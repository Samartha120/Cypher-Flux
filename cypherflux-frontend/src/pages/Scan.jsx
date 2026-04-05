import React, { useState } from 'react';
import api from '../services/api';
import { Search } from 'lucide-react';

const Scan = () => {
  const [target, setTarget] = useState('127.0.0.1');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await api.post('/scan', { target });
      setResults(res.data.devices);
    } catch (err) {
      console.error(err);
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
          placeholder="Target IP / Subnet"
        />
        <button onClick={handleScan} disabled={loading} className="cyber-button flex-center">
          <Search size={18} style={{marginRight: '8px'}}/> 
          {loading ? 'SCANNING...' : 'EXECUTE SCAN'}
        </button>
      </div>

      <div className="results-container mt-4">
        {results.map((device, idx) => (
          <div key={idx} className="glass-card mb-2 list-item">
            <span><strong>IP:</strong> {device.ip}</span>
            <span><strong>Hostname:</strong> {device.hostname}</span>
            <span className={`status ${device.state === 'up' ? 'text-green' : 'text-red'}`}>
              <strong>State:</strong> {device.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scan;
