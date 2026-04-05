import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Radar, Activity, Bell, FileText, Ban, Power } from 'lucide-react';

const Sidebar = () => {
  const { logout } = useAuth();
  
  return (
    <div className="sidebar glass-card">
      <div className="sidebar-header">
        <h2 className="neon-text">CIPHERFLUX</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/scan" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Radar size={20} /> Network Scan
        </NavLink>
        <NavLink to="/monitor" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Activity size={20} /> Traffic Monitor
        </NavLink>
        <NavLink to="/alerts" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Bell size={20} /> Alerts
        </NavLink>
        <NavLink to="/logs" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <FileText size={20} /> System Logs
        </NavLink>
        <NavLink to="/blocked" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Ban size={20} /> Blocked IPs
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn">
          <Power size={20} /> Terminate Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
