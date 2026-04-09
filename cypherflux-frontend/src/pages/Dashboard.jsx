import React, { useMemo, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Shield, Server, RadioTower, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();

  const [liveMode, setLiveMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [stats, setStats] = useState({
    activeDevices: 0,
    openPorts: 0,
    alertsCount: 0,
    blockedIps: 0,
  });

  const prevStatsRef = useRef(stats);
  const [trend, setTrend] = useState({
    activeDevices: 0,
    openPorts: 0,
    alertsCount: 0,
    blockedIps: 0,
  });
  const [flash, setFlash] = useState({
    activeDevices: false,
    openPorts: false,
    alertsCount: false,
    blockedIps: false,
  });

  const statsInFlightRef = useRef(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    if (statsInFlightRef.current) return;
    try {
      statsInFlightRef.current = true;
      setStatsLoading(true);
      const res = await api.get('/dashboard/stats');
      const data = res?.data || {};
      setStats((prev) => ({
        ...prev,
        activeDevices: Number(data.activeDevices || 0),
        openPorts: Number(data.openPorts || 0),
        alertsCount: Number(data.alertsCount || 0),
        blockedIps: Number(data.blockedIps || 0),
      }));
      if (data.lastScanAt) setLastUpdatedAt(data.lastScanAt);
    } catch (err) {
      console.error(err);
    } finally {
      statsInFlightRef.current = false;
      setStatsLoading(false);
    }
  };

  const [details, setDetails] = useState({
    devices: [],
    openPortsByDevice: [],
    alerts: [],
    blockedIps: [],
    lastScanAt: null,
    lastScanTarget: null,
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activePopover, setActivePopover] = useState(null); // 'devices' | 'ports' | 'alerts' | 'blocked'
  const detailsInFlightRef = useRef(false);
  const closeTimerRef = useRef(null);

  const flashTimerRef = useRef(null);
  const audioRef = useRef({ ctx: null });

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current.ctx) audioRef.current.ctx = new AudioCtx();
      const ctx = audioRef.current.ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // ignore audio failures (autoplay policies, unsupported contexts)
    }
  };

  const cancelClosePopover = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClosePopover = () => {
    cancelClosePopover();
    // Small delay so the pointer can traverse the visual gap
    // between the card and the below-positioned panel.
    closeTimerRef.current = setTimeout(() => {
      setActivePopover(null);
      closeTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    if (!activePopover) return;
    if (liveMode) return;
    const id = setInterval(fetchDetails, 3000);
    return () => clearInterval(id);
  }, [activePopover, liveMode]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const prev = prevStatsRef.current || {};
    const next = stats || {};

    const deltas = {
      activeDevices: Number(next.activeDevices || 0) - Number(prev.activeDevices || 0),
      openPorts: Number(next.openPorts || 0) - Number(prev.openPorts || 0),
      alertsCount: Number(next.alertsCount || 0) - Number(prev.alertsCount || 0),
      blockedIps: Number(next.blockedIps || 0) - Number(prev.blockedIps || 0),
    };

    setTrend(deltas);
    const anyChange = Object.values(deltas).some((d) => d !== 0);
    if (anyChange) {
      setFlash({
        activeDevices: deltas.activeDevices !== 0,
        openPorts: deltas.openPorts !== 0,
        alertsCount: deltas.alertsCount !== 0,
        blockedIps: deltas.blockedIps !== 0,
      });

      if (deltas.alertsCount > 0) playBeep();

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setFlash({ activeDevices: false, openPorts: false, alertsCount: false, blockedIps: false });
        flashTimerRef.current = null;
      }, 420);
    }

    prevStatsRef.current = next;
  }, [stats]);

  // Time-series states (drive graphs)
  const [trafficData, setTrafficData] = useState([]);
  const [threatData, setThreatData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);

  // Live simulation state
  const simRef = useRef({
    devices: [],
    alerts: [],
    blockedIps: [],
  });
  const simTimerRef = useRef(null);

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pickOne = (arr) => arr[randomInt(0, arr.length - 1)];

  const randomIp = () => {
    const a = randomInt(11, 223);
    const b = randomInt(0, 255);
    const c = randomInt(0, 255);
    const d = randomInt(1, 254);
    return `${a}.${b}.${c}.${d}`;
  };

  const guessSeverityFromType = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('ddos') || t.includes('dos') || t.includes('port scan')) return 'critical';
    if (t.includes('brute') || t.includes('suspicious') || t.includes('scan')) return 'high';
    return 'medium';
  };

  const portCatalog = [
    { port: 22, service: 'SSH' },
    { port: 80, service: 'HTTP' },
    { port: 443, service: 'HTTPS' },
    { port: 21, service: 'FTP' },
    { port: 53, service: 'DNS' },
    { port: 445, service: 'SMB' },
    { port: 3306, service: 'MySQL' },
    { port: 3389, service: 'RDP' },
    { port: 8080, service: 'HTTP-Proxy' },
  ];

  const uniquePorts = (ports) => {
    const seen = new Set();
    const out = [];
    for (const p of ports || []) {
      const key = String(p?.port ?? p);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  useEffect(() => {
    // Seed graph timelines once
    const now = new Date();
    setTrafficData(
      Array.from({ length: 20 }, (_, i) => ({
        time: new Date(now.getTime() - (20 - i) * 2500).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        requests: randomInt(20, 90),
      }))
    );
    setAlertsData(
      Array.from({ length: 15 }, (_, i) => ({
        time: new Date(now.getTime() - (15 - i) * 2500).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        count: randomInt(0, 3),
      }))
    );
    setThreatData([
      { category: 'HTTP', normal: 400, suspicious: 24 },
      { category: 'SSH', normal: 300, suspicious: 139 },
      { category: 'FTP', normal: 200, suspicious: 8 },
      { category: 'DNS', normal: 278, suspicious: 39 },
      { category: 'TCP', normal: 189, suspicious: 48 },
    ]);
  }, []);

  useEffect(() => {
    // Live mode simulation tick: 2–5 seconds, smart detection.
    if (!liveMode) {
      if (simTimerRef.current) {
        clearTimeout(simTimerRef.current);
        simTimerRef.current = null;
      }
      return;
    }

    // Seed simulation state on first enable.
    if (!simRef.current.devices.length) {
      simRef.current.devices = Array.from({ length: randomInt(3, 5) }, () => {
        const ip = randomIp();
        return {
          ip,
          hostname: `host-${ip.split('.').slice(-1)[0]}.lan`,
          state: 'up',
          openPorts: uniquePorts(Array.from({ length: randomInt(2, 4) }, () => pickOne(portCatalog))),
        };
      });
    }

    const scheduleNext = () => {
      const delay = randomInt(2000, 5000);
      simTimerRef.current = setTimeout(() => {
        const currentTime = new Date();
        const timeLabel = currentTime.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
        setLastUpdatedAt(currentTime.toISOString());

        const sim = simRef.current;
        const devices = Array.isArray(sim.devices) ? [...sim.devices] : [];
        const alerts = Array.isArray(sim.alerts) ? [...sim.alerts] : [];
        const blockedIps = Array.isArray(sim.blockedIps) ? [...sim.blockedIps] : [];

        // Simulate network request velocity (req/sec)
        const spike = Math.random() > 0.9;
        const reqPerSec = spike ? randomInt(170, 320) : randomInt(35, 160);

        // Smart detection: too many requests -> alerts; suspicious IP -> blocked
        if (reqPerSec > 190) {
          const ip = randomIp();
          const type = reqPerSec > 260 ? 'DDoS Burst Detected' : 'Too Many Requests';
          const severity = reqPerSec > 260 ? 'critical' : 'high';
          alerts.unshift({
            id: `sim-a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ip,
            type,
            severity,
            timestamp: currentTime.toISOString(),
          });
          if (reqPerSec > 260) {
            blockedIps.unshift({
              id: `sim-b-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              ip,
              reason: 'Auto-block: DDoS threshold',
              timestamp: currentTime.toISOString(),
            });
          }
        }

        // Smart detection: port scan -> open ports increases
        if (Math.random() > 0.78 && devices.length) {
          const idx = randomInt(0, devices.length - 1);
          const d = { ...devices[idx] };
          const added = uniquePorts([...(d.openPorts || []), pickOne(portCatalog), pickOne(portCatalog)]);
          d.openPorts = added;
          devices[idx] = d;
          const ip = randomIp();
          alerts.unshift({
            id: `sim-a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ip,
            type: 'Port Scan Detected',
            severity: 'critical',
            timestamp: currentTime.toISOString(),
          });
        }

        // Device connect/disconnect (changes active devices)
        if (Math.random() > 0.72) {
          if (devices.length < 8 && Math.random() > 0.5) {
            const ip = randomIp();
            devices.unshift({
              ip,
              hostname: `host-${ip.split('.').slice(-1)[0]}.lan`,
              state: 'up',
              openPorts: uniquePorts(Array.from({ length: randomInt(1, 3) }, () => pickOne(portCatalog))),
            });
          } else {
            const idx = randomInt(0, Math.max(0, devices.length - 1));
            if (devices[idx]) {
              devices[idx] = { ...devices[idx], state: devices[idx].state === 'up' ? 'down' : 'up' };
            }
          }
        }

        // Suspicious IP occasionally gets blocked
        if (Math.random() > 0.86) {
          const ip = randomIp();
          blockedIps.unshift({
            id: `sim-b-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ip,
            reason: 'Auto-block: suspicious reputation',
            timestamp: currentTime.toISOString(),
          });
          alerts.unshift({
            id: `sim-a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ip,
            type: 'Suspicious IP Detected',
            severity: 'high',
            timestamp: currentTime.toISOString(),
          });
        }

        // Trim
        const nextDevices = devices.slice(0, 10);
        const nextAlerts = alerts.slice(0, 60);
        const nextBlocked = blockedIps
          .filter((b, i, arr) => arr.findIndex((x) => x.ip === b.ip) === i)
          .slice(0, 40);

        simRef.current = {
          devices: nextDevices,
          alerts: nextAlerts,
          blockedIps: nextBlocked,
        };

        // Compute derived stats + details (no overlap with graphs; panel consumes these)
        const activeDevices = nextDevices.filter((d) => String(d.state || '').toLowerCase() === 'up').length;
        const openPorts = nextDevices.reduce((sum, d) => sum + (Array.isArray(d.openPorts) ? d.openPorts.length : 0), 0);
        const alertsCount = nextAlerts.length;
        const blockedCount = nextBlocked.length;

        setStats({
          activeDevices,
          openPorts,
          alertsCount,
          blockedIps: blockedCount,
        });

        setDetails((prev) => ({
          devices: nextDevices.map((d) => ({
            ip: d.ip,
            hostname: d.hostname,
            state: d.state,
            openPorts: (Array.isArray(d.openPorts) ? d.openPorts : []).map((p) => ({
              port: Number(p.port),
              service: p.service,
            })),
          })),
          openPortsByDevice: nextDevices.map((d) => ({
            ip: d.ip,
            ports: (Array.isArray(d.openPorts) ? d.openPorts : []).map((p) => ({ port: Number(p.port), service: p.service })),
          })),
          alerts: nextAlerts,
          blockedIps: nextBlocked,
          lastScanAt: currentTime.toISOString(),
          lastScanTarget: prev?.lastScanTarget ?? null,
        }));

        // Update graphs with smooth animation
        setTrafficData((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return [...list.slice(1), { time: timeLabel, requests: reqPerSec }];
        });
        setAlertsData((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const recentCount = Math.min(6, nextAlerts.length);
          const jitter = randomInt(0, 2);
          return [...list.slice(1), { time: timeLabel, count: Math.max(0, Math.floor(recentCount / 3) + jitter) }];
        });
        setThreatData((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) => ({
            ...item,
            normal: item.normal + randomInt(0, 8),
            suspicious: item.suspicious + (reqPerSec > 190 ? randomInt(1, 6) : Math.random() > 0.8 ? randomInt(0, 2) : 0),
          }))
        );

        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (simTimerRef.current) {
        clearTimeout(simTimerRef.current);
        simTimerRef.current = null;
      }
    };
  }, [liveMode]);

  useEffect(() => {
    // When Live Mode is off, poll backend every 3 seconds.
    if (liveMode) return;
    let alive = true;
    const tick = async () => {
      await fetchStats();
      if (!alive) return;
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [liveMode]);

  const fetchDetails = async () => {
    if (detailsInFlightRef.current) return;
    try {
      detailsInFlightRef.current = true;
      setDetailsLoading(true);
      const res = await api.get('/dashboard/details');
      const data = res?.data || {};
      const alerts = (Array.isArray(data.alerts) ? data.alerts : []).map((a) => ({
        ...a,
        severity: a.severity || guessSeverityFromType(a.type),
      }));
      setDetails({
        devices: Array.isArray(data.devices) ? data.devices : [],
        openPortsByDevice: Array.isArray(data.openPortsByDevice) ? data.openPortsByDevice : [],
        alerts,
        blockedIps: Array.isArray(data.blockedIps) ? data.blockedIps : [],
        lastScanAt: data.lastScanAt || null,
        lastScanTarget: data.lastScanTarget || null,
      });
      if (data.lastScanAt) setLastUpdatedAt(data.lastScanAt);
    } catch (err) {
      console.error(err);
      setDetails({
        devices: [],
        openPortsByDevice: [],
        alerts: [],
        blockedIps: [],
        lastScanAt: null,
        lastScanTarget: null,
      });
    } finally {
      setDetailsLoading(false);
      detailsInFlightRef.current = false;
    }
  };

  const openPopover = async (key) => {
    if (activePopover !== key) setActivePopover(key);
    if (!liveMode) {
      await fetchStats();
      await fetchDetails();
    }
  };

  const closePopover = () => {
    cancelClosePopover();
    setActivePopover(null);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'rgba(0,10,20,0.9)',
            border: '1px solid var(--neon-blue)',
            padding: '10px',
            borderRadius: '4px',
          }}
        >
          <p style={{ color: 'var(--neon-blue)', margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || '#fff', margin: '5px 0 0 0' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const VerticalCursor = ({ points, height, left, top, x, width }) => {
    let xPos = null;
    if (points && points.length && points[0]?.x != null) xPos = points[0].x;
    if (xPos == null && x != null && width != null) xPos = x + width / 2;
    if (xPos == null) return null;
    return (
      <line
        x1={xPos}
        x2={xPos}
        y1={top}
        y2={top + height}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
    );
  };

  const lastUpdatedText = useMemo(() => {
    const ts = lastUpdatedAt || details.lastScanAt;
    if (!ts) return 'Last Updated: —';
    try {
      return `Last Updated: ${new Date(ts).toLocaleString()}`;
    } catch {
      return 'Last Updated: —';
    }
  }, [details.lastScanAt, lastUpdatedAt]);

  const alertsBySeverity = useMemo(() => {
    const rows = Array.isArray(details.alerts) ? details.alerts : [];
    const out = { critical: 0, high: 0, medium: 0, other: 0 };
    for (const a of rows) {
      const sev = String(a?.severity || '').toLowerCase();
      if (sev === 'critical') out.critical += 1;
      else if (sev === 'high') out.high += 1;
      else if (sev === 'medium') out.medium += 1;
      else out.other += 1;
    }
    return out;
  }, [details.alerts]);

  const KpiPanel = ({ title, children }) => (
    <motion.div
      className="kpi-panel"
      onMouseEnter={cancelClosePopover}
      onMouseLeave={scheduleClosePopover}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="kpi-panel__header">
        <div className="kpi-panel__title">{title}</div>
        <div className="kpi-panel__meta">{lastUpdatedText}</div>
      </div>
      <div className="kpi-panel__body kpi-panel-scroll">
        {detailsLoading ? (
          <div className="kpi-shimmer" />
        ) : (
          children
        )}
      </div>
    </motion.div>
  );

  const AnimatedValue = ({ value }) => {
    const mv = useMotionValue(Number(value || 0));
    const [display, setDisplay] = useState(Number(value || 0));

    useEffect(() => {
      const controls = animate(mv, Number(value || 0), {
        duration: 0.6,
        ease: 'easeOut',
        onUpdate: (latest) => setDisplay(Math.round(latest)),
      });
      return () => controls.stop();
    }, [mv, value]);

    return <span>{display}</span>;
  };

  const TrendArrow = ({ delta }) => {
    const d = Number(delta || 0);
    if (d === 0) return null;
    if (d > 0) return <span className="kpi-trend kpi-trend--up">↑</span>;
    return <span className="kpi-trend kpi-trend--down">↓</span>;
  };

  return (
    <div className="page-container dashboard-page" style={{ paddingBottom: '80px' }}>
      <h2 className="neon-text" style={{ letterSpacing: '2px' }}>
        GLOBAL COMMAND DASHBOARD
      </h2>

      <div className="glass-card" style={{ padding: '12px 14px', marginTop: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="text-gray" style={{ fontSize: '0.85rem' }}>{lastUpdatedText}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className={`soc-live-toggle ${liveMode ? 'on' : 'off'}`}
              onClick={() => setLiveMode((v) => !v)}
              title="Toggle Live Mode"
            >
              <span className="soc-live-toggle__dot" />
              <span className="soc-live-toggle__label">Live Mode {liveMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              className={`soc-live-toggle ${soundEnabled ? 'on' : 'off'}`}
              onClick={() => setSoundEnabled((v) => !v)}
              title="Toggle Alert Sound"
            >
              <span className="soc-live-toggle__dot" />
              <span className="soc-live-toggle__label">Sound {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="cards-container"
        style={{
          paddingBottom: activePopover ? 280 : 0,
          marginBottom: 28,
        }}
      >
        <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
          <motion.div
            className="glass-card stat-card soc-kpi-card"
            data-sev="medium"
            onMouseEnter={() => {
              cancelClosePopover();
              openPopover('devices');
            }}
            onMouseLeave={scheduleClosePopover}
            whileHover={{ translateY: 6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Server size={32} className="card-icon blue-glow" />
            <div className="stat-info">
              <h3>ACTIVE DEVICES</h3>
              <p className={`stat-val ${flash.activeDevices ? 'kpi-flash' : ''}`}>
                {statsLoading && !liveMode ? <span className="kpi-number-shimmer" /> : <AnimatedValue value={stats.activeDevices} />}
                <TrendArrow delta={trend.activeDevices} />
              </p>
            </div>
          </motion.div>

          <motion.div
            className="glass-card stat-card soc-kpi-card"
            data-sev="medium"
            onMouseEnter={() => {
              cancelClosePopover();
              openPopover('ports');
            }}
            onMouseLeave={scheduleClosePopover}
            whileHover={{ translateY: 6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <RadioTower size={32} className="card-icon green-glow" />
            <div className="stat-info">
              <h3>OPEN PORTS</h3>
              <p className={`stat-val ${flash.openPorts ? 'kpi-flash' : ''}`}>
                {statsLoading && !liveMode ? <span className="kpi-number-shimmer" /> : <AnimatedValue value={stats.openPorts} />}
                <TrendArrow delta={trend.openPorts} />
              </p>
            </div>
          </motion.div>

          <motion.div
            className="glass-card stat-card soc-kpi-card"
            data-sev="high"
            onMouseEnter={() => {
              cancelClosePopover();
              openPopover('alerts');
            }}
            onMouseLeave={scheduleClosePopover}
            whileHover={{ translateY: 6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <AlertTriangle size={32} className="card-icon yellow-glow" />
            <div className="stat-info">
              <h3>TOTAL ALERTS</h3>
              <p className={`stat-val ${flash.alertsCount ? 'kpi-flash' : ''}`}>
                {statsLoading && !liveMode ? <span className="kpi-number-shimmer" /> : <AnimatedValue value={stats.alertsCount} />}
                <TrendArrow delta={trend.alertsCount} />
              </p>
            </div>
          </motion.div>

          <motion.div
            className="glass-card stat-card soc-kpi-card"
            data-sev="critical"
            onMouseEnter={() => {
              cancelClosePopover();
              openPopover('blocked');
            }}
            onMouseLeave={scheduleClosePopover}
            whileHover={{ translateY: 6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Shield size={32} className="card-icon red-glow" />
            <div className="stat-info">
              <h3>BLOCKED IPs</h3>
              <p className={`stat-val ${flash.blockedIps ? 'kpi-flash' : ''}`}>
                {statsLoading && !liveMode ? <span className="kpi-number-shimmer" /> : <AnimatedValue value={stats.blockedIps} />}
                <TrendArrow delta={trend.blockedIps} />
              </p>
            </div>
          </motion.div>
        </div>

        <div className="kpi-panel-host">
          <AnimatePresence mode="wait">
            {activePopover === 'devices' ? (
              <KpiPanel key="devices" title="Active Devices">
                {details.devices.length === 0 ? (
                  <div className="text-gray">No devices yet. Run a scan to populate devices.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {details.devices.map((d) => (
                      <div key={d.ip} className="glass-card" style={{ padding: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--neon-blue)' }}>{d.ip}</div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              background: (d.state || '').toLowerCase() === 'up'
                                ? 'rgba(0,255,136,0.10)'
                                : 'rgba(255,59,59,0.12)',
                              border: (d.state || '').toLowerCase() === 'up'
                                ? '1px solid rgba(0,255,136,0.35)'
                                : '1px solid rgba(255,59,59,0.35)',
                              color: (d.state || '').toLowerCase() === 'up' ? '#00ff88' : '#ff4d4d',
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: (d.state || '').toLowerCase() === 'up' ? '#00ff88' : '#ff4d4d',
                                boxShadow: (d.state || '').toLowerCase() === 'up'
                                  ? '0 0 6px #00ff88'
                                  : '0 0 6px #ff4d4d',
                                animation: (d.state || '').toLowerCase() === 'up' ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
                                display: 'inline-block',
                              }}
                            />
                            {(d.state || '').toLowerCase() === 'up' ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                        <div className="text-gray" style={{ fontSize: '0.8rem', marginTop: 4 }}>{d.hostname || '—'}</div>
                        <div className="text-gray" style={{ fontSize: '0.8rem', marginTop: 6 }}>
                          Open ports: {Array.isArray(d.openPorts) ? d.openPorts.length : 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </KpiPanel>
            ) : null}

            {activePopover === 'ports' ? (
              <KpiPanel key="ports" title="Open Ports">
                {details.openPortsByDevice.length === 0 ? (
                  <div className="text-gray">No scan data yet. Run a scan to list open ports.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {details.openPortsByDevice
                      .filter((x) => Array.isArray(x.ports) && x.ports.length)
                      .map((row) => (
                        <div key={row.ip} className="glass-card" style={{ padding: 10 }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--neon-green)' }}>{row.ip}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {row.ports.slice(0, 40).map((p) => (
                              <span
                                key={`${row.ip}:${p.port}`}
                                style={{
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  padding: '6px 8px',
                                  borderRadius: 10,
                                  background: 'rgba(0,0,0,0.25)',
                                  fontFamily: 'monospace',
                                }}
                                title={p.service}
                              >
                                {p.port}{p.service ? <span className="text-gray" style={{ marginLeft: 6, fontFamily: 'inherit' }}>{String(p.service)}</span> : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </KpiPanel>
            ) : null}

            {activePopover === 'alerts' ? (
              <KpiPanel key="alerts" title="Total Alerts (By Severity)">
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-gray">Critical</span>
                    <span style={{ color: 'var(--neon-red)', fontWeight: 900 }}>{alertsBySeverity.critical}</span>
                  </div>
                  <div className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-gray">High</span>
                    <span style={{ color: '#facc15', fontWeight: 900 }}>{alertsBySeverity.high}</span>
                  </div>
                  <div className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-gray">Medium</span>
                    <span style={{ color: 'var(--neon-blue)', fontWeight: 900 }}>{alertsBySeverity.medium}</span>
                  </div>
                  {alertsBySeverity.other ? (
                    <div className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-gray">Other</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 900 }}>{alertsBySeverity.other}</span>
                    </div>
                  ) : null}
                </div>
              </KpiPanel>
            ) : null}

            {activePopover === 'blocked' ? (
              <KpiPanel key="blocked" title="Blocked IPs">
                {details.blockedIps.length === 0 ? (
                  <div className="text-gray">No blocked IPs.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {details.blockedIps.map((b) => (
                      <div key={b.id} className="glass-card" style={{ padding: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--neon-red)' }}>{b.ip}</div>
                          <div className="text-gray" style={{ fontSize: '0.75rem' }}>
                            {b.timestamp ? new Date(b.timestamp).toLocaleString() : '—'}
                          </div>
                        </div>
                        <div className="text-gray" style={{ fontSize: '0.85rem', marginTop: 6 }}>{b.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </KpiPanel>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="graph-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3
            style={{
              color: 'var(--text-muted)',
              marginBottom: '20px',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
            }}
          >
            Network Traffic Velocity
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={<VerticalCursor />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  name="Req/sec"
                  stroke="var(--neon-blue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--neon-blue)' }}
                  isAnimationActive
                  animationDuration={420}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <h3
            style={{
              color: 'var(--text-muted)',
              marginBottom: '20px',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
            }}
          >
            Security Event Timeline
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={alertsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={<VerticalCursor />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Alerts Generated"
                  stroke="#facc15"
                  fill="rgba(250, 204, 21, 0.2)"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={420}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
          <h3
            style={{
              color: 'var(--text-muted)',
              marginBottom: '20px',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
            }}
          >
            Threat Classification Engine
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={threatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={<VerticalCursor />} />
                <Legend />
                <Bar dataKey="normal" name="Normal Traffic" stackId="a" fill="var(--neon-green)" isAnimationActive animationDuration={420} />
                <Bar dataKey="suspicious" name="Suspicious Vectors" stackId="a" fill="var(--neon-red)" isAnimationActive animationDuration={420} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;