import React, { useState, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import AlertPopup from './components/AlertPopup';
import { useAuth } from './context/AuthContext';
import { useLocation } from 'react-router-dom';
import './styles/dashboard.css';

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard';

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
