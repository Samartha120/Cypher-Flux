import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import AlertPopup from './components/AlertPopup';
import { useAuth } from './context/AuthContext';
import { useThreats } from './context/useThreats';
import './styles/dashboard.css';

function App() {
  const { isAuthenticated } = useAuth();
  const { addAuditLog } = useThreats();
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard';

  // Global Activity Tracking
  useEffect(() => {
    if (!isAuthenticated) return;
    const path = location.pathname.toUpperCase();
    addAuditLog(`USER_NAVIGATION: Entered module ${path}`, 'info', 'NAV', `SOURCE: APP_ROUTER | PATH: ${location.pathname}`);
  }, [location.pathname, isAuthenticated, addAuditLog]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleClick = (e) => {
      const target = e.target;
      const text = target.innerText || target.getAttribute('aria-label') || target.tagName;
      if (['BUTTON', 'A', 'INPUT'].includes(target.tagName) || target.closest('button')) {
        addAuditLog(`USER_INTERACTION: Interaction with ${target.tagName}`, 'debug', 'UI', `ELEMENT: ${text.slice(0, 20)} | CLASS: ${target.className}`);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isAuthenticated, addAuditLog]);

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      {isAuthenticated && <Sidebar />}
      <div 
        className={`main-content ${!isAuthenticated ? 'full-width' : ''}`} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          flex: 1,
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: '1', overflowY: 'auto' }}>
          <AppRoutes />
        </div>
        {isAuthenticated && isDashboard && <Footer />}
      </div>
      {isAuthenticated && <AlertPopup />}
    </div>
  );
}

export default App;
