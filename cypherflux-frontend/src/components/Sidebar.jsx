import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Radar, Activity, Bell, FileText, Ban, Power, Settings, ShieldAlert, ChevronDown, User, LogOut } from 'lucide-react';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <div className="sidebar glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header" style={{ padding: '20px', borderBottom: '1px solid rgba(0,240,255,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <ShieldAlert size={32} className="neon-text" />
            <h2 className="neon-text" style={{ margin: 0, letterSpacing: '2px', fontSize: '1.4rem' }}>CYPHERFLUX</h2>
          </div>
          
          {/* User Avatar Section */}
          <div 
            style={{ marginTop: '20px', background: 'rgba(0,15,30,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,240,255,0.1)', cursor: 'pointer', position: 'relative' }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--neon-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Agent</div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.username || 'GUEST'}</div>
              </div>
              <ChevronDown size={16} color="var(--neon-blue)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }} />
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a101f', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '4px', marginTop: '5px', zIndex: 100, overflow: 'hidden' }}>
                <div className="dropdown-item" onClick={() => navigate('/settings')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><User size={16} /> Profile</div>
                <div className="dropdown-item" onClick={() => navigate('/settings')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><Settings size={16} /> Settings</div>
                <div className="dropdown-item" onClick={() => setShowLogoutModal(true)} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-red)' }}><LogOut size={16} /> Logout</div>
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flexGrow: 1, overflowY: 'auto' }}>
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

        <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid rgba(0,240,255,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <NavLink to="/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} style={{ padding: '10px', borderRadius: '4px' }}>
            <Settings size={20} /> Settings
          </NavLink>
          
          <button onClick={() => setShowLogoutModal(true)} className="logout-btn" style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            width: '100%', padding: '12px', background: 'transparent',
            border: '1px solid var(--neon-red)', color: 'var(--neon-red)',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px',
            transition: '0.3s'
          }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,0,60,0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,0,60,0.4)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}>
            <Power size={20} /> Terminate Session
          </button>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,5,15,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ padding: '30px', width: '400px', textAlign: 'center', border: '1px solid var(--neon-red)', boxShadow: '0 0 30px rgba(255,0,60,0.2)' }}>
            <ShieldAlert size={50} color="var(--neon-red)" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ color: '#fff', marginBottom: '15px' }}>TERMINATE SESSION?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Are you sure you want to terminate this secure session and disconnect from the network?</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)', cursor: 'pointer', borderRadius: '4px' }}>CANCEL</button>
              <button onClick={handleLogoutConfirm} style={{ flex: 1, padding: '12px', background: 'var(--neon-red)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', boxShadow: '0 0 15px rgba(255,0,60,0.6)' }}>TERMINATE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
