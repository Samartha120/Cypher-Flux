import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldAlert, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const OTP_LENGTH = 6;
const INITIAL_SECONDS = 30;

const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { sendOtp, verifyOtp } = useAuth();

  const initialUsername = useMemo(() => {
    return state?.username || localStorage.getItem('pendingUsername') || '';
  }, [state?.username]);

  const [username, setUsername] = useState(initialUsername);
  const [digits, setDigits] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputsRef = useRef([]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem('pendingUsername', username);
  }, [username]);

  useEffect(() => {
    setSecondsLeft(INITIAL_SECONDS);
  }, [username]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const otp = digits.join('');

  const focusIndex = (idx) => {
    const el = inputsRef.current[idx];
    if (el) el.focus();
  };

  const onChangeDigit = (idx, value) => {
    setError('');
    setSuccess('');

    const clean = (value || '').replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);

    if (clean && idx < OTP_LENGTH - 1) {
      focusIndex(idx + 1);
    }
  };

  const onKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      focusIndex(idx - 1);
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => text[i] || '');
    setDigits(next);
    focusIndex(Math.min(text.length, OTP_LENGTH - 1));
  };

  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username) {
      setError('Username is required.');
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(username, otp);
    setLoading(false);

    if (res.success) {
      setSuccess('SYSTEM ACCESS GRANTED');
      setTimeout(() => navigate('/dashboard'), 300);
    } else {
      setError(res.msg || 'Verification failed');
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');

    if (!username) {
      setError('Username is required to resend.');
      return;
    }

    setResending(true);
    const res = await sendOtp(username);
    setResending(false);

    if (res.success) {
      setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
      setSecondsLeft(INITIAL_SECONDS);
      focusIndex(0);
      setSuccess('NEW CODE DISPATCHED');
    } else {
      setError(res.msg || 'Failed to resend');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="cyber-grid"></div>

      <div className="glass-card login-card verify-mode">
        <div className="brand glitched">
          <ShieldAlert size={54} className="neon-text glow-pulse" />
          <h1 data-text="CypherFlux">CypherFlux</h1>
          <p className="subtitle">VERIFICATION CODE REQUIRED</p>
        </div>

        {error && <div className="error-msg glitch-error">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleVerify} className="verify-form">
          <p className="verify-instructions">
            Enter the 6-digit code sent to your Agent ID.
          </p>

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

          <div className="otp-row" onPaste={onPaste}>
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                className="otp-box"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => onChangeDigit(idx, e.target.value)}
                onKeyDown={(e) => onKeyDown(idx, e)}
                aria-label={`OTP digit ${idx + 1}`}
              />
            ))}
          </div>

          <div className="otp-meta">
            <div className="otp-timer">EXPIRES IN: <span className="neon-text">{formatTime(secondsLeft)}</span></div>
            <button type="button" className="otp-resend" onClick={handleResend} disabled={resending}>
              <RotateCcw size={16} style={{ marginRight: '8px' }} />
              {resending ? 'RESENDING...' : 'RESEND CODE'}
            </button>
          </div>

          <button type="submit" className="cyber-button pulse-btn" disabled={loading}>
            <Fingerprint size={18} style={{ marginRight: '8px' }} />
            {loading ? 'VERIFYING...' : 'CONFIRM ACCESS'}
          </button>

          <div className="toggle-mode mt-4 text-center">
            <span onClick={() => navigate('/login')} className="text-link">Back to login</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
