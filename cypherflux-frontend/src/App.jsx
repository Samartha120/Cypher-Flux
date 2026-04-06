import React, { useState, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import AlertPopup from './components/AlertPopup';
import { useAuth } from './context/AuthContext';
import './styles/dashboard.css';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      {isAuthenticated && <Sidebar />}
      <div className={`main-content ${!isAuthenticated ? 'full-width' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: '1' }}>
          <AppRoutes />
        </div>
        {isAuthenticated && <Footer />}
      </div>
      {isAuthenticated && <AlertPopup />}
    </div>
  );
}

export default App;
