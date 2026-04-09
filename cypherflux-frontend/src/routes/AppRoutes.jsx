import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/login';
import Signup from '../pages/Signup';
import VerifyOtp from '../pages/VerifyOtp';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Scan from '../pages/Scan';
import Monitor from '../pages/Monitor';
import Alerts from '../pages/Alerts';
import AlertDetails from '../pages/AlertDetails';
import Notifications from '../pages/Notifications';
import NotificationDetails from '../pages/NotificationDetails';
import Logs from '../pages/logs';
import LogDetails from '../pages/LogDetails';
import BlockedIPs from '../pages/BlockedIps';
import BlockDetails from '../pages/BlockDetails';
import Profile from '../pages/Profile';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/verify" element={<PublicRoute><VerifyOtp /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
      <Route path="/monitor" element={<PrivateRoute><Monitor /></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
      <Route path="/alerts/:severity" element={<PrivateRoute><Alerts /></PrivateRoute>} />
      <Route path="/alerts/view/:id" element={<PrivateRoute><AlertDetails /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/notifications/view/:id" element={<PrivateRoute><NotificationDetails /></PrivateRoute>} />
      <Route path="/logs" element={<PrivateRoute><Logs /></PrivateRoute>} />
      <Route path="/logs/view/:id" element={<PrivateRoute><LogDetails /></PrivateRoute>} />
      <Route path="/blocked" element={<PrivateRoute><BlockedIPs /></PrivateRoute>} />
      <Route path="/blocked/view/:id" element={<PrivateRoute><BlockDetails /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

export default AppRoutes;
