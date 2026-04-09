import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AuthProvider } from './context/AuthContext';
import { ThreatProvider } from './context/ThreatContext';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThreatProvider>
          <App />
        </ThreatProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
