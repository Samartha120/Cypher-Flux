import React, { createContext, useState, useContext, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const SESSION_START_KEY = 'sessionStart';

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

  const isTokenValid = (token) => {
    const decoded = parseJwt(token);
    const expSeconds = decoded?.exp;
    if (!expSeconds) return false;
    return Date.now() < expSeconds * 1000;
  };

  useEffect(() => {
    const initAuth = () => {
      // Force login on fresh website open: token is session-scoped, not persistent.
      // Also clear any legacy token persisted by older builds.
      localStorage.removeItem('token');

      const token = sessionStorage.getItem('token');
      if (token && isTokenValid(token)) {
        setIsAuthenticated(true);
        const decoded = parseJwt(token);
        setUser(decoded ? { username: decoded.username, email: decoded.email } : null);

        // Ensure session start exists for real-time duration display
        if (!sessionStorage.getItem(SESSION_START_KEY)) {
          sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
        }
      } else {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem(SESSION_START_KEY);
        setIsAuthenticated(false);
        setUser(null);
      }
      
      // Enforce a minimum 1.5s visual loader for the CypherFlux project logo popup
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    };
    initAuth();
  }, []);

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/login', { identifier, password });
      if (response.data.access_token) {
        sessionStorage.setItem('token', response.data.access_token);
        sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
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
        sessionStorage.setItem('token', response.data.access_token);
        sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('pendingUsername');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050a14' }}>
        <ShieldAlert size={80} color="var(--neon-blue)" style={{ marginBottom: '25px', animation: 'pulse 2s infinite', filter: 'drop-shadow(0 0 15px rgba(0,240,255,0.5))' }} />
        <h2 className="neon-text" style={{ letterSpacing: '8px', fontSize: '2rem' }}>CYPHERFLUX</h2>
        <div style={{ width: '200px', height: '2px', background: 'var(--neon-blue)', marginTop: '20px', marginBottom: '20px', animation: 'scanline 2s linear infinite' }}></div>
        <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Initializing Secure Terminal...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, sendOtp, verifyOtp, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
