import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Server, RadioTower, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    activeDevices: 3,
    openPorts: 12,
    alertsCount: 0,
    blockedIps: 0
  });

  // Time-series simulation states
  const [trafficData, setTrafficData] = useState([]);
  const [threatData, setThreatData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);

  useEffect(() => {
    // Initial fetch for static stats
    const fetchInitial = async () => {
      try {
        const [alertsRes, blockedRes] = await Promise.all([
          api.get('/alerts'),
          api.get('/blocked')
        ]);
        setStats(prev => ({
          ...prev,
          alertsCount: alertsRes.data.length,
          blockedIps: blockedRes.data.length
        }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitial();

    // Setup initial empty timeline
    const now = new Date();
    const initTraffic = Array.from({length: 20}, (_, i) => ({
      time: new Date(now.getTime() - (20-i)*3000).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
      requests: Math.floor(Math.random() * 50) + 10
    }));
    
    const initThreats = [
      { category: 'HTTP', normal: 400, suspicious: 24 },
      { category: 'SSH', normal: 300, suspicious: 139 },
      { category: 'FTP', normal: 200, suspicious: 8 },
      { category: 'DNS', normal: 278, suspicious: 39 },
      { category: 'TCP', normal: 189, suspicious: 48 },
    ];

    const initAlerts = Array.from({length: 15}, (_, i) => ({
      time: new Date(now.getTime() - (15-i)*5000).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
      count: Math.floor(Math.random() * 5)
    }));

    setTrafficData(initTraffic);
    setThreatData(initThreats);
    setAlertsData(initAlerts);

    // Live Polling Simulation Interval
    const interval = setInterval(() => {
      const currentTime = new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'});
      
      setTrafficData(prev => {
        const newData = [...prev.slice(1), { time: currentTime, requests: Math.floor(Math.random() * 100) + 20 }];
        return newData;
      });

      setAlertsData(prev => {
        const newData = [...prev.slice(1), { time: currentTime, count: Math.floor(Math.random() * 3) }];
        return newData;
      });

      setThreatData(prev => {
        return prev.map(item => ({
          ...item,
          normal: item.normal + Math.floor(Math.random() * 10),
          suspicious: item.suspicious + (Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0)
        }));
      });
      
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(0,10,20,0.9)', border: '1px solid var(--neon-blue)', padding: '10px', borderRadius: '4px' }}>
          <p style={{ color: 'var(--neon-blue)', margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || '#fff', margin: '5px 0 0 0' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container" style={{ paddingBottom: '80px' }}>
      <h2 className="neon-text" style={{ letterSpacing: '2px' }}>GLOBAL COMMAND DASHBOARD</h2>
      
      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="glass-card stat-card" style={{ borderTop: '3px solid var(--neon-blue)' }}>
          <Server size={32} className="card-icon blue-glow" />
          <div className="stat-info">
            <h3>ACTIVE DEVICES</h3>
            <p className="stat-val">{stats.activeDevices}</p>
          </div>
        </div>
        <div className="glass-card stat-card" style={{ borderTop: '3px solid var(--neon-green)' }}>
          <RadioTower size={32} className="card-icon green-glow" />
          <div className="stat-info">
            <h3>OPEN PORTS</h3>
            <p className="stat-val">{stats.openPorts}</p>
          </div>
        </div>
        <div className="glass-card stat-card" style={{ borderTop: '3px solid #facc15' }}>
          <AlertTriangle size={32} className="card-icon yellow-glow" />
          <div className="stat-info">
            <h3>TOTAL ALERTS</h3>
            <p className="stat-val">{stats.alertsCount}</p>
          </div>
        </div>
        <div className="glass-card stat-card" style={{ borderTop: '3px solid var(--neon-red)' }}>
          <Shield size={32} className="card-icon red-glow" />
          <div className="stat-info">
            <h3>BLOCKED IPs</h3>
            <p className="stat-val">{stats.blockedIps}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* LINE CHART: Traffic Monitoring */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Network Traffic Velocity</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="requests" name="Req/sec" stroke="var(--neon-blue)" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'var(--neon-blue)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AREA CHART: Alerts Timeline */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Security Event Timeline</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={alertsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="count" name="Alerts Generated" stroke="#facc15" fill="rgba(250, 204, 21, 0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART: Threat Detection Ratio */}
        <div className="glass-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Threat Classification Engine</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={threatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Legend />
                <Bar dataKey="normal" name="Normal Traffic" stackId="a" fill="var(--neon-green)" />
                <Bar dataKey="suspicious" name="Suspicious Vectors" stackId="a" fill="var(--neon-red)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
