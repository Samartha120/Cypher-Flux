import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Server, Radiotower, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeDevices: 0,
    openPorts: 0,
    alertsCount: 0,
    blockedIps: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [alerts, blocked] = await Promise.all([
          api.get('/alerts'),
          api.get('/blocked')
        ]);
        setStats({
          activeDevices: 3, // Mocked for scanner summary
          openPorts: 12,
          alertsCount: alerts.data.length,
          blockedIps: blocked.data.length
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="page-container">
      <h2 className="neon-text">SYSTEM OMNIVIEW</h2>
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <Server size={32} className="card-icon blue-glow" />
          <div className="stat-info">
            <h3>ACTIVE DEVICES</h3>
            <p className="stat-val">{stats.activeDevices}</p>
          </div>
        </div>
        <div className="glass-card stat-card">
          <Radiotower size={32} className="card-icon green-glow" />
          <div className="stat-info">
            <h3>OPEN PORTS</h3>
            <p className="stat-val">{stats.openPorts}</p>
          </div>
        </div>
        <div className="glass-card stat-card">
          <AlertTriangle size={32} className="card-icon yellow-glow" />
          <div className="stat-info">
            <h3>TOTAL ALERTS</h3>
            <p className="stat-val">{stats.alertsCount}</p>
          </div>
        </div>
        <div className="glass-card stat-card">
          <Shield size={32} className="card-icon red-glow" />
          <div className="stat-info">
            <h3>BLOCKED IPs</h3>
            <p className="stat-val">{stats.blockedIps}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
