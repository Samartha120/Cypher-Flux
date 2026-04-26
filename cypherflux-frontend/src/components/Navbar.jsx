import React from 'react';
import { ShieldAlert, Bell, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="navbar glass-card" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '10px 30px',
      borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
      height: '70px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(5, 10, 25, 0.8)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <ShieldAlert size={28} className="neon-text" />
        <span style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.2rem', color: '#fff' }}>CONTROL CENTER</span>
      </div>

      <div className="navbar-center" style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '500px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0, 240, 255, 0.5)' }} />
          <input 
            type="text" 
            placeholder="Search system resources..." 
            style={{ 
              width: '100%', 
              padding: '10px 15px 10px 45px', 
              background: 'rgba(0, 0, 0, 0.3)', 
              border: '1px solid rgba(0, 240, 255, 0.2)', 
              borderRadius: '4px',
              color: '#fff',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(0, 240, 255, 0.6)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(0, 240, 255, 0.2)'}
          />
        </div>
      </div>

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={22} color="var(--neon-blue)" />
          <span style={{ 
            position: 'absolute', 
            top: '-5px', 
            right: '-5px', 
            background: 'var(--neon-red)', 
            color: '#fff', 
            fontSize: '10px', 
            padding: '2px 5px', 
            borderRadius: '10px',
            boxShadow: '0 0 5px var(--neon-red)'
          }}>3</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ textAlign: 'right', display: 'none' }}>
            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{user?.username || 'Guest'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>System Admin</div>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'rgba(0, 240, 255, 0.1)', 
            border: '1px solid var(--neon-blue)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <User size={20} color="var(--neon-blue)" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
