import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { csvHeader, generateThreatEvent, threatToCsvRow } from '../utils/threatSim';
import { useAuth } from './AuthContext';

const ThreatContext = createContext(null);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const ThreatProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  const blockedIpsRef = useRef([]);

  const setBlockedIpsAndRef = (updater) => {
    setBlockedIps((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      blockedIpsRef.current = Array.isArray(next) ? next : [];
      return next;
    });
  };

  const isBlockAll = (list = blockedIpsRef.current) =>
    Array.isArray(list) &&
    list.some((b) => {
      const v = String(b?.ip || '').trim();
      return v === '0.0.0.0/0' || v === '0.0.0.0';
    });

  const isIpBlocked = (ip, list = blockedIpsRef.current) => {
    if (!ip) return false;
    if (isBlockAll(list)) return true;
    return Array.isArray(list) && list.some((b) => String(b?.ip) === String(ip));
  };

  const mergeBlockedIps = (prev, incoming) => {
    const list = [];
    const seen = new Set();
    const add = (entry) => {
      const key = String(entry?.ip || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(entry);
    };

    (Array.isArray(incoming) ? incoming : []).forEach(add);
    (Array.isArray(prev) ? prev : []).forEach(add);
    return list.slice(0, 50);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchBlockedIps = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      try {
        const res = await api.get('/blocked');
        if (cancelled) return;
        const normalized = (Array.isArray(res.data) ? res.data : []).map((b) => ({
          id: b.id,
          ip: b.ip,
          reason: b.reason,
          blockedAt: b.timestamp,
          sourceAlertId: null,
        }));
        setBlockedIpsAndRef((prev) => mergeBlockedIps(prev, normalized));
      } catch {
        // Ignore: backend might be offline; keep local-only blocks.
      }
    };

    if (isAuthenticated) fetchBlockedIps();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const pushAlert = (alert) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  const updateAlert = (id, patch) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const blockIp = (ip, reason = 'Analyst action', sourceAlertId = null) => {
    if (!ip) return;

    const normalizedIp = String(ip).trim() === '0.0.0.0' ? '0.0.0.0/0' : ip;

    setBlockedIpsAndRef((prev) => {
      if (prev.some((b) => b.ip === normalizedIp)) return prev;
      const entry = {
        id: `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ip: normalizedIp,
        reason,
        blockedAt: new Date().toISOString(),
        sourceAlertId,
      };
      return [entry, ...prev].slice(0, 50);
    });

    setAlerts((prev) =>
      prev.map((a) => {
        if (String(normalizedIp).trim() === '0.0.0.0/0') return { ...a, status: 'Blocked' };
        return String(a.sourceIp) === String(normalizedIp) ? { ...a, status: 'Blocked' } : a;
      })
    );
  };

  const clearBlockedIps = () => {
    blockedIpsRef.current = [];
    setBlockedIps([]);
  };

  const markInvestigating = (id) => updateAlert(id, { status: 'Investigating' });
  const markActive = (id) => updateAlert(id, { status: 'Active' });

  const promoteSeverity = (id, newSeverity) => {
    const sev = String(newSeverity || '').toLowerCase();
    if (!['critical', 'high', 'medium', 'low'].includes(sev)) return;
    updateAlert(id, { severity: sev });
  };

  const clearAlerts = () => setAlerts([]);

  useEffect(() => {
    if (!autoRefresh) return;

    // Generate alerts intermittently; sometimes none, sometimes bursts.
    intervalRef.current = setInterval(() => {
      const roll = Math.random();
      if (roll < 0.55) return;

      const burst = roll > 0.92 ? randomInt(2, 3) : 1;
      for (let i = 0; i < burst; i += 1) {
        const next = generateThreatEvent();
        const src = next?.sourceIp || next?.ip;
        if (isIpBlocked(src)) {
          next.status = 'Blocked';
        }
        pushAlert(next);
      }
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  const exportAlertsCsv = (rows) => {
    const list = Array.isArray(rows) ? rows : alerts;
    const csv = [csvHeader, ...list.map(threatToCsvRow)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cypherflux-threat-logs-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const value = useMemo(
    () => ({
      alerts,
      blockedIps,
      autoRefresh,
      setAutoRefresh,
      pushAlert,
      updateAlert,
      clearAlerts,
      blockIp,
      clearBlockedIps,
      markInvestigating,
      markActive,
      promoteSeverity,
      isIpBlocked,
      isBlockAll,
      exportAlertsCsv,
    }),
    [alerts, blockedIps, autoRefresh]
  );

  return <ThreatContext.Provider value={value}>{children}</ThreatContext.Provider>;
};

export const useThreats = () => {
  const ctx = useContext(ThreatContext);
  if (!ctx) throw new Error('useThreats must be used within a ThreatProvider');
  return ctx;
};
