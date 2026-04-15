import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { csvHeader, generateThreatEvent, threatToCsvRow } from '../utils/threatSim';
import { useAuth } from './AuthContext';

const ThreatContext = createContext(null);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const normalizeBlockEntry = (entry, fallback = {}) => {
  const ip = String(entry?.ip || fallback?.ip || '').trim();
  return {
    id: entry?.id ?? fallback?.id ?? `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ip,
    reason: entry?.reason || fallback?.reason || 'Manual block',
    attackType: entry?.attackType || entry?.attack_type || fallback?.attackType || null,
    details: entry?.details || fallback?.details || null,
    detectionSource: entry?.detectionSource || entry?.detection_source || fallback?.detectionSource || 'Blocked IPs',
    severity: entry?.severity || fallback?.severity || 'medium',
    riskScore: Number(entry?.riskScore ?? entry?.risk_score ?? fallback?.riskScore ?? 0),
    actionType: entry?.actionType || entry?.action_type || fallback?.actionType || 'manual',
    sourceAlertId: entry?.sourceAlertId ?? entry?.source_alert_id ?? fallback?.sourceAlertId ?? null,
    requestCount: Number(entry?.requestCount ?? entry?.request_count ?? fallback?.requestCount ?? 0) || null,
    lastPath: entry?.lastPath || entry?.last_path || fallback?.lastPath || null,
    lastMethod: entry?.lastMethod || entry?.last_method || fallback?.lastMethod || null,
    blockedAt: entry?.blockedAt || entry?.timestamp || fallback?.blockedAt || new Date().toISOString(),
    timestamp: entry?.timestamp || entry?.blockedAt || fallback?.timestamp || new Date().toISOString(),
  };
};

export const ThreatProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  const blockedIpsRef = useRef([]);

  const normAlertIp = (a) => String(a?.sourceIp || a?.ip || '').trim();
  const normAlertType = (a) => String(a?.threatType || a?.type || '').trim();

  const severityRank = (sev) => {
    const s = String(sev || '').toLowerCase();
    if (s === 'critical') return 4;
    if (s === 'high') return 3;
    if (s === 'medium') return 2;
    if (s === 'low') return 1;
    return 2;
  };

  const mergeAlertIntoList = (prevList, incoming) => {
    const list = Array.isArray(prevList) ? [...prevList] : [];
    const ip = normAlertIp(incoming);
    const type = normAlertType(incoming);
    if (!ip || !type) return list;

    const idx = list.findIndex((a) => normAlertIp(a) === ip && normAlertType(a) === type);
    if (idx === -1) {
      return [
        {
          ...incoming,
          sourceIp: incoming?.sourceIp || incoming?.ip,
          threatType: incoming?.threatType || incoming?.type,
          count: Number(incoming?.count || 1),
        },
        ...list,
      ].slice(0, 120);
    }

    const existing = list[idx];
    const nextCount = Number(existing?.count || 1) + Number(incoming?.count || 1);
    const existingRisk = Number(existing?.riskScore);
    const incomingRisk = Number(incoming?.riskScore);
    const merged = {
      ...existing,
      ...incoming,
      id: existing?.id ?? incoming?.id,
      count: nextCount,
      timestamp: incoming?.timestamp || existing?.timestamp,
      severity:
        severityRank(incoming?.severity) > severityRank(existing?.severity)
          ? incoming?.severity
          : existing?.severity,
      riskScore:
        Number.isFinite(existingRisk) && Number.isFinite(incomingRisk)
          ? Math.max(existingRisk, incomingRisk)
          : Number.isFinite(existingRisk)
            ? existingRisk
            : incomingRisk,
    };

    list.splice(idx, 1);
    return [merged, ...list].slice(0, 120);
  };

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
    const seen = new Map();
    const add = (entry) => {
      const key = String(entry?.ip || '').trim();
      if (!key) return;
      const normalized = normalizeBlockEntry(entry);
      if (!seen.has(key)) {
        seen.set(key, normalized);
        list.push(normalized);
        return;
      }
      const idx = list.findIndex((item) => String(item?.ip || '').trim() === key);
      if (idx === -1) return;
      list[idx] = {
        ...list[idx],
        ...normalized,
        riskScore: Math.max(Number(list[idx]?.riskScore || 0), Number(normalized?.riskScore || 0)),
      };
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
        const normalized = (Array.isArray(res.data) ? res.data : []).map((b) => normalizeBlockEntry(b));
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
    setAlerts((prev) => mergeAlertIntoList(prev, alert));
  };

  const updateAlert = (id, patch) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const blockIp = (ip, reasonOrOptions = 'Analyst action', sourceAlertId = null) => {
    if (!ip) return;

    const normalizedIp = String(ip).trim() === '0.0.0.0' ? '0.0.0.0/0' : ip;
    const options = typeof reasonOrOptions === 'object' && reasonOrOptions !== null
      ? reasonOrOptions
      : { reason: reasonOrOptions, sourceAlertId };
    const entry = normalizeBlockEntry({
      ...options,
      ip: normalizedIp,
      sourceAlertId: options?.sourceAlertId ?? sourceAlertId,
    });

    setBlockedIpsAndRef((prev) => mergeBlockedIps([entry], prev));

    setAlerts((prev) =>
      (Array.isArray(prev) ? prev : []).map((a) => {
        if (String(normalizedIp).trim() === '0.0.0.0/0') return { ...a, status: 'Blocked' };
        const src = String(a?.sourceIp || a?.ip || '');
        return src === String(normalizedIp) ? { ...a, status: 'Blocked' } : a;
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
      normalizeBlockEntry,
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
