import React, { useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThreats } from '../context/ThreatContext';
import api from '../services/api';

const playAlertBeep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close?.();
    }, 180);
  } catch {
    // Ignore audio errors
  }
};

const AlertPopup = () => {
  const { alerts, isIpBlocked, isBlockAll } = useThreats();
  const lastIdRef = useRef(null);
  const lastStoredIdRef = useRef(null);

  useEffect(() => {
    const latest = alerts?.[0];
    if (!latest) return;

    // Prevent popping a toast on first mount.
    if (lastIdRef.current === null) {
      lastIdRef.current = latest.id;
      return;
    }

    const sev = String(latest.severity || '').toLowerCase();
    if (sev !== 'critical') {
      lastIdRef.current = latest.id;
      return;
    }

    const src = latest.sourceIp || latest.ip;
    const blocked = latest.status === 'Blocked' || isBlockAll() || isIpBlocked(src);
    if (blocked) {
      lastIdRef.current = latest.id;
      return;
    }

    if (latest.id !== lastIdRef.current) {
      const soundEnabled = localStorage.getItem('cfx_alert_sound') !== 'off';
      if (soundEnabled) playAlertBeep();

      toast.error(
        <div>
          <strong>SYSTEM COMPROMISE DETECTED</strong><br />
          <span style={{ fontSize: '0.8rem' }}>Source: {latest.sourceIp || latest.ip}</span><br />
          <span style={{ fontSize: '0.8rem', color: '#facc15' }}>Vector: {latest.threatType || latest.type}</span><br />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Severity: {String(latest.severity).toUpperCase()}</span>
        </div>,
        {
          position: 'bottom-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: 'dark',
        }
      );

      // Persist this CRITICAL threat popup into the DB notifications table.
      // Fire-and-forget; avoid duplicates per alert id.
      if (latest.id && lastStoredIdRef.current !== latest.id) {
        lastStoredIdRef.current = latest.id;
        const srcIp = latest.sourceIp || latest.ip;
        const vector = latest.threatType || latest.type;
        api
          .post('/notifications', {
            event_type: 'threat.critical',
            title: 'SYSTEM COMPROMISE DETECTED',
            message: `Source: ${srcIp || '—'} | Vector: ${vector || '—'}`,
            severity: 'critical',
            source_ip: srcIp || null,
          })
          .catch(() => {
            // Ignore network errors
          });
      }

      lastIdRef.current = latest.id;
    }
  }, [alerts]);

  return <ToastContainer toastStyle={{ background: 'rgba(0,15,30,0.9)', border: '1px solid var(--neon-red)', color: '#fff', fontFamily: 'monospace' }} />;
};

export default AlertPopup;
