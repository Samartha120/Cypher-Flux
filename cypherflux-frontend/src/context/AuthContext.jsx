import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, msg: "Invalid credentials" };
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.requires_verification && data?.email) {
        localStorage.setItem('pendingEmail', data.email);
        return { success: false, requiresVerification: true, email: data.email, msg: data?.msg || 'Verification required' };
      }
      return { success: false, msg: data?.msg || "Login failed - Connection Error" };
    }
  };

  const signup = async (email, password, confirmPassword) => {
    try {
      const response = await api.post('/signup', { email, password, confirm_password: confirmPassword });
      if (response.data?.email) {
        localStorage.setItem('pendingEmail', response.data.email);
      }
      return { success: true, email: response.data?.email || email };
    } catch (err) {
      const data = err.response?.data;
      return { success: false, msg: data?.msg || "Signup failed", errors: data?.errors };
    }
  };

  const sendOtp = async (email) => {
    try {
      const response = await api.post('/send-otp', { email });
      if (response.data?.email) {
        localStorage.setItem('pendingEmail', response.data.email);
      }
      return { success: true };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to resend code' };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await api.post('/verify-otp', { email, otp });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.removeItem('pendingEmail');
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, msg: "Invalid Verification Code" };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || "Verification failed" };
    }
  }

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore network errors; local logout still clears session.
    }
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, signup, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
