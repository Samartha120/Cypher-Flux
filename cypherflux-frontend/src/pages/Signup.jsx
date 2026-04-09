import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, User, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const passwordScore = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score; // 0..5
};

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const score = useMemo(() => passwordScore(password), [password]);
  const strengthLabel = useMemo(() => {
    if (score <= 1) return 'WEAK';
    if (score === 2) return 'FAIR';
    if (score === 3) return 'GOOD';
    if (score === 4) return 'STRONG';
    return 'ELITE';
  }, [score]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passcodes do not match.');
      return;
    }

    setLoading(true);
    const res = await signup(username, email, password, confirmPassword);
    setLoading(false);

    if (res.success) {
      navigate('/verify', { state: { username: res.username || username } });
      return;
    }

    if (res.errors?.length) {
      setError(res.errors.join(' '));
    } else {
      setError(res.msg || 'Signup failed');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="cyber-grid"></div>

      <div className="glass-card login-card">
        <div className="brand glitched">
          <ShieldAlert size={54} className="neon-text" />
          <h1 data-text="CypherFlux">CypherFlux</h1>
          <p className="subtitle">NEW AGENT REGISTRATION</p>
        </div>

        {error && <div className="error-msg glitch-error">{error}</div>}

        <form onSubmit={handleSignup} className="fade-in">
          <div className="input-group">
            <input
              type="text"
              placeholder="Agent ID (Username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <input
              type="email"
              placeholder="Recovery Email (OTP delivery)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group password-group">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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

          <div className="password-strength">
            <div className="password-strength__bar">
              <div
                className={`password-strength__fill score-${score}`}
                style={{ width: `${(score / 5) * 100}%` }}
              />
            </div>
            <div className="password-strength__label">STRENGTH: <span className="neon-text">{strengthLabel}</span></div>
          </div>

          <div className="input-group password-group">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Passcode"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex="-1"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="cyber-button w-100" disabled={loading}>
            {loading ? 'REGISTERING...' : 'REQUEST CLEARANCE'}
          </button>

          <div className="toggle-mode mt-4 text-center">
            <span className="text-muted">Already registered? <strong onClick={() => navigate('/login')} className="text-link text-glow">Login Here</strong></span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
