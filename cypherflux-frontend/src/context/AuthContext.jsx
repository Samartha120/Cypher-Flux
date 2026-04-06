import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      const decoded = parseJwt(token);
      setUser(decoded ? { username: decoded.username, email: decoded.email } : null);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setIsAuthenticated(true);
        const decoded = parseJwt(response.data.access_token);
        setUser(decoded ? { username: decoded.username, email: decoded.email } : null);
        return { success: true };
      }
      return { success: false, msg: "Invalid credentials" };
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.requires_verification && data?.email) {
        localStorage.setItem('pendingUsername', data.username);
        return { success: false, requiresVerification: true, username: data.username, msg: data?.msg || 'Verification required' };
      }
      return { success: false, msg: data?.msg || "Login failed - Connection Error" };
    }
  };

  const signup = async (username, email, password, confirmPassword) => {
    try {
      const response = await api.post('/signup', { username, email, password, confirm_password: confirmPassword });
      if (response.data?.username) {
        localStorage.setItem('pendingUsername', response.data.username);
      }
      return { success: true, username: response.data?.username || username };
    } catch (err) {
      const data = err.response?.data;
      return { success: false, msg: data?.msg || "Signup failed", errors: data?.errors };
    }
  };

  const sendOtp = async (username) => {
    try {
      const response = await api.post('/send-otp', { username });
      if (response.data?.username) localStorage.setItem('pendingUsername', response.data.username);
      return { success: true };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to resend code' };
    }
  };

  const verifyOtp = async (username, otp) => {
    try {
      const response = await api.post('/verify-otp', { username, otp });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.removeItem('pendingUsername');
        setIsAuthenticated(true);
        const decoded = parseJwt(response.data.access_token);
        setUser(decoded ? { username: decoded.username, email: decoded.email } : null);
        return { success: true };
      }
      return { success: false, msg: "Invalid Verification Code" };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || "Verification failed" };
    }
  }

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return { success: true, msg: response.data?.msg || 'Password updated' };
    } catch (err) {
      const data = err.response?.data;
      return { success: false, msg: data?.msg || 'Password update failed', errors: data?.errors };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore network errors; local logout still clears session.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('pendingUsername');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, sendOtp, verifyOtp, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
