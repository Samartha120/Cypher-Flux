import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else if (res.requiresVerification && res.email) {
      navigate('/verify', { state: { email: res.email } });
    } else {
      setError(res.msg);
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      {/* Background Matrix/Grid Overlay */}
      <div className="cyber-grid"></div>
      
      <div className="glass-card login-card">
        
        <div className="brand glitched">
          <ShieldAlert size={54} className="neon-text" />
          <h1 data-text="CipherFlux">CipherFlux</h1>
          <p className="subtitle">
            SECURE ACCESS TERMINAL
          </p>
        </div>

        {error && <div className="error-msg glitch-error">{error}</div>}
        <form onSubmit={handleLogin} className="fade-in">
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Agent ID (Email)" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              autoComplete="email"
            />
          </div>
            <div className="input-group password-group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Passcode" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="eye-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button type="submit" className="cyber-button w-100" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'INITIALIZE LINK'}
            </button>
            
            <div className="toggle-mode mt-4 text-center">
              <span className="text-muted">No clearance? <strong onClick={() => navigate('/signup')} className="text-link text-glow">Sign Up</strong></span>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
