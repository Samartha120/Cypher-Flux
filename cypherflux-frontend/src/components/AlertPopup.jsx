/**
 * AlertPopup.jsx  — Redesigned
 * ─────────────────────────────
 * Custom portal-based popup system. Replaces react-toastify entirely.
 *
 * Placement : bottom-right, above footer (z-index: 9500)
 * Stacking  : max 3 visible; new alerts push older ones up
 * Collapse  : when queue > 3, shows "N more alerts" pill that expands on click
 * Animation : slides in from bottom-right, fades out smoothly
 * Icons     : Lucide only — no emoji
 * Smart     : deduplication, per-severity rate limiting, DB persistence
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Flame, AlertTriangle, Activity, ShieldCheck, X, ChevronDown,
} from 'lucide-react';
import { useThreats } from '../context/ThreatContext';
import api from '../services/api';

// ─── Audio (critical only) ────────────────────────────────────────────────────

const playAlertBeep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx  = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type            = 'square';
    osc.frequency.value = 880;
    gain.gain.value     = 0.025;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close?.(); }, 160);
  } catch { /* silent */ }
};

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_CONFIG = {
  critical: {
    color:     'var(--neon-red)',
    bg:        'rgba(15, 23, 42, 0.92)',
    border:    'rgba(255, 0, 60, 0.28)',
    glow:      'rgba(0, 0, 0, 0.0)',
    label:     'CRITICAL',
    autoClose: 8000,
    sound:     true,
    Icon:      Flame,
    pulse:     false,
  },
  high: {
    color:     '#facc15',
    bg:        'rgba(15, 23, 42, 0.92)',
    border:    'rgba(250, 204, 21, 0.22)',
    glow:      'rgba(0, 0, 0, 0.0)',
    label:     'HIGH',
    autoClose: 6000,
    sound:     false,
    Icon:      AlertTriangle,
    pulse:     false,
  },
  medium: {
    color:     'var(--neon-blue)',
    bg:        'rgba(15, 23, 42, 0.92)',
    border:    'rgba(0, 240, 255, 0.20)',
    glow:      'rgba(0, 0, 0, 0.0)',
    label:     'MEDIUM',
    autoClose: 4000,
    sound:     false,
    Icon:      Activity,
    pulse:     false,
  },
  low: {
    color:     'var(--text-muted)',
    bg:        'rgba(15, 23, 42, 0.92)',
    border:    'rgba(148, 163, 184, 0.16)',
    glow:      'rgba(0, 0, 0, 0.0)',
    label:     'LOW',
    autoClose: 3000,
    sound:     false,
    Icon:      ShieldCheck,
    pulse:     false,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normSev = (sev) => {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical' || s === 'crit') return 'critical';
  if (s === 'high'     || s === 'warning') return 'high';
  if (s === 'medium'   || s === 'normal')  return 'medium';
  if (s === 'low'      || s === 'info')    return 'low';
  return 'medium';
};

let _uid = 0;
const nextId = () => ++_uid;

// ─── Rate limiter: max 4 popups per severity per 8 s ─────────────────────────
const _rateWindow = 8000;
const _rateMax    = 4;
const _rateTimes  = { critical: [], high: [], medium: [], low: [] };

const isRateOk = (sev) => {
  const now    = Date.now();
  const bucket = _rateTimes[sev] || [];
  const recent = bucket.filter((t) => now - t < _rateWindow);
  _rateTimes[sev] = recent;
  if (sev === 'low'    && recent.length >= 2) return false;  // stricter for LOW
  if (recent.length   >= _rateMax)            return false;
  _rateTimes[sev].push(now);
  return true;
};

// ─── CSS injected once ───────────────────────────────────────────────────────

const POPUP_STYLE = `
@keyframes cfxSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes cfxSlideOut {
  from { opacity: 1; transform: translateY(0)    scale(1);    }
  to   { opacity: 0; transform: translateY(12px) scale(0.96); }
}
@keyframes cfxIconPulse {
  0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
  50%       { filter: drop-shadow(0 0 6px currentColor); }
}

.cfx-popup-wrap {
  position: fixed;
  bottom: 24px;
  right: 20px;
  z-index: 9500;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  max-width: 300px;
  pointer-events: none;
}

.cfx-popup {
  pointer-events: auto;
  border-radius: 10px;
  padding: 11px 14px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-family: 'Inter', 'JetBrains Mono', monospace;
  font-size: 0.73rem;
  line-height: 1.45;
  animation: cfxSlideIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.cfx-popup.cfx-exit {
  animation: cfxSlideOut 0.18s ease forwards;
}

.cfx-popup--critical {
  animation: cfxSlideIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards;
}

.cfx-popup__icon--pulse {
  animation: cfxIconPulse 1.8s ease-in-out infinite;
}

.cfx-popup__header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}

.cfx-popup__label {
  font-weight: 800;
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex: 1;
}

.cfx-popup__close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 1px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.55;
  transition: opacity 0.15s;
  color: inherit;
  margin-left: auto;
}
.cfx-popup__close:hover { opacity: 1; }

.cfx-popup__vector {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfx-popup__src {
  color: rgba(200,215,230,0.65);
  font-size: 0.68rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.cfx-popup__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 0 0 10px 10px;
  transform-origin: left;
}

.cfx-collapsed {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,0,60,0.25);
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(14px);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: monospace;
  color: var(--neon-red);
  letter-spacing: 0.04em;
  animation: cfxSlideIn 0.22s ease forwards;
  transition: background 0.15s;
}
.cfx-collapsed:hover { background: rgba(15, 23, 42, 0.95); }
`;

let styleInjected = false;
const injectStyle = () => {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = POPUP_STYLE;
  document.head.appendChild(el);
};

// ─── Single popup card ────────────────────────────────────────────────────────

const PopupCard = ({ item, onDismiss }) => {
  const cfg        = SEV_CONFIG[item.sev] || SEV_CONFIG.medium;
  const { Icon }   = cfg;
  const [exit, setExit] = useState(false);
  const progressRef     = useRef(null);
  const timerRef        = useRef(null);

  const dismiss = useCallback(() => {
    if (exit) return;
    setExit(true);
    setTimeout(() => onDismiss(item.uid), 200);
  }, [exit, item.uid, onDismiss]);

  // Animate progress bar
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    const dur = cfg.autoClose;
    el.style.transition = `transform ${dur}ms linear`;
    el.style.transform  = 'scaleX(1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = 'scaleX(0)';
      });
    });
    timerRef.current = setTimeout(dismiss, dur);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div
      className={`cfx-popup${item.sev === 'critical' ? ' cfx-popup--critical' : ''}${exit ? ' cfx-exit' : ''}`}
      style={{
        background:  cfg.bg,
        border:      `1px solid ${cfg.border}`,
        color:       '#e8edf2',
        boxShadow:   '0 8px 26px rgba(0,0,0,0.55)',
      }}
    >
      <div className="cfx-popup__header">
        <Icon
          size={13}
          className={cfg.pulse ? 'cfx-popup__icon--pulse' : ''}
          style={{ color: cfg.color, flexShrink: 0 }}
        />
        <span className="cfx-popup__label" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <button className="cfx-popup__close" onClick={dismiss} style={{ color: cfg.color }}>
          <X size={12} />
        </button>
      </div>

      <div className="cfx-popup__vector" style={{ color: '#dde6f0' }}>
        {item.vector}
      </div>
      <div className="cfx-popup__src">
        {item.src}
      </div>

      {/* Auto-dismiss progress bar */}
      <div
        ref={progressRef}
        className="cfx-popup__progress"
        style={{ background: cfg.color, transform: 'scaleX(1)' }}
      />
    </div>
  );
};

// ─── Collapse pill ────────────────────────────────────────────────────────────

const CollapsedPill = ({ count, onClick }) => (
  <div className="cfx-collapsed" onClick={onClick}>
    <Flame size={13} />
    {count} more alert{count !== 1 ? 's' : ''} queued
    <ChevronDown size={12} style={{ opacity: 0.7 }} />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const MAX_VISIBLE   = 3;

const AlertPopup = () => {
  const { alerts, isIpBlocked, isBlockAll } = useThreats();

  const lastIdRef      = useRef(null);
  const storedIdsRef   = useRef(new Set());
  const [popups, setPopups]     = useState([]);        // { uid, sev, vector, src }
  const [collapsed, setCollapsed] = useState(false);   // collapse mode

  injectStyle();

  const dismiss = useCallback((uid) => {
    setPopups((prev) => prev.filter((p) => p.uid !== uid));
  }, []);

  // Push a new popup item into the queue
  const enqueue = useCallback((item) => {
    setPopups((prev) => {
      // Deduplicate: same vector + src within last 3
      const isDup = prev.slice(0, 3).some(
        (p) => p.vector === item.vector && p.src === item.src
      );
      if (isDup) return prev;
      return [item, ...prev].slice(0, 6); // hard cap at 6 in memory
    });
  }, []);

  useEffect(() => {
    const latest = alerts?.[0];
    if (!latest) return;

    if (lastIdRef.current === null) {
      lastIdRef.current = latest.id;
      return;
    }
    if (latest.id === lastIdRef.current) return;
    lastIdRef.current = latest.id;

    const sev = normSev(latest.severity);
    const cfg = SEV_CONFIG[sev] || SEV_CONFIG.medium;

    const src = latest.sourceIp || latest.ip;
    if (latest.status === 'Blocked' || isBlockAll() || isIpBlocked(src)) return;

    if (cfg.sound && localStorage.getItem('cfx_alert_sound') !== 'off') {
      playAlertBeep();
    }

    if (isRateOk(sev)) {
      enqueue({
        uid:    nextId(),
        sev,
        vector: latest.threatType || latest.type || 'Unknown Threat',
        src:    src || '—',
      });
    }

    // DB persistence (all severities, fire-and-forget)
    if (latest.id && !storedIdsRef.current.has(latest.id)) {
      storedIdsRef.current.add(latest.id);
      if (storedIdsRef.current.size > 100) {
        storedIdsRef.current.delete([...storedIdsRef.current][0]);
      }
      const vector = latest.threatType || latest.type;
      api.post('/notifications', {
        event_type: `threat.${sev}`,
        title:      `${cfg.label} — ${vector || 'Security Alert'}`,
        message:    `Source: ${src || '—'} | Vector: ${vector || '—'}`,
        severity:   sev,
        source_ip:  src || null,
      }).catch(() => {});
    }
  }, [alerts, enqueue]);

  const visible  = popups.slice(0, MAX_VISIBLE);
  const overflow = popups.length - MAX_VISIBLE;

  return createPortal(
    <div className="cfx-popup-wrap">
      {/* Overflow pill (bottom of stack = visually bottom-right) */}
      {overflow > 0 && !collapsed && (
        <CollapsedPill count={overflow} onClick={() => setCollapsed(true)} />
      )}

      {/* Visible cards */}
      {(collapsed ? popups : visible).map((item) => (
        <PopupCard key={item.uid} item={item} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
};

export default AlertPopup;
