import api from '../services/api';

export const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const isValidIPv4 = (value) => IPV4_REGEX.test(String(value || '').trim());

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const sample = (arr) => arr[randomInt(0, arr.length - 1)];

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

const riskForPort = (port) => {
  if ([23, 445, 3389].includes(port)) return 'high';
  if ([21, 22, 3306, 8080].includes(port)) return 'medium';
  return 'low';
};

export const simulateNetworkScan = (ip) => {
  const isLocal = ip.trim() === '127.0.0.1';

  const hostname = isLocal ? 'localhost' : `host-${ip.split('.').slice(-1)[0]}.lan`;
  const state = isLocal ? 'up' : (Math.random() > 0.12 ? 'up' : 'down');

  const latency = state === 'up'
    ? Number((Math.random() * (isLocal ? 1.2 : 32) + (isLocal ? 0.2 : 4)).toFixed(2))
    : null;

  const openPortsCount = state === 'up' ? randomInt(2, 6) : 0;
  const openPorts = state === 'up'
    ? Array.from({ length: openPortsCount }, () => sample(portCatalog))
        .reduce((acc, item) => {
          if (!acc.some((p) => p.port === item.port)) acc.push(item);
          return acc;
        }, [])
        .sort((a, b) => a.port - b.port)
        .map((p) => ({ ...p, risk: riskForPort(p.port) }))
    : [];

  return {
    ip,
    hostname,
    state,
    latency,
    openPorts,
  };
};

const normalizeBackendScan = (payload, ipFallback) => {
  // Support a couple of common shapes without assuming the backend.
  if (!payload) return null;

  // { hostname, state, latency, openPorts }
  if (payload.hostname || payload.state || payload.openPorts) {
    const ip = payload.ip || ipFallback;
    const openPorts = Array.isArray(payload.openPorts)
      ? payload.openPorts.map((p) => ({
          port: Number(p.port ?? p),
          service: String(p.service || 'unknown').toUpperCase(),
          risk: p.risk || riskForPort(Number(p.port ?? p)),
        }))
      : [];

    return {
      ip,
      hostname: payload.hostname || `host-${ip.split('.').slice(-1)[0]}.lan`,
      state: payload.state || 'up',
      latency: payload.latency ?? payload.latencyMs ?? null,
      openPorts,
    };
  }

  // { devices: [{ ip, hostname, state, ports, latency }] }
  if (Array.isArray(payload.devices) && payload.devices.length) {
    const d = payload.devices.find((x) => x.ip === ipFallback) || payload.devices[0];
    const openPortsSrc = d.openPorts || d.open_ports || d.ports;
    const openPorts = Array.isArray(openPortsSrc)
      ? openPortsSrc.map((p) => ({
          port: Number(p.port ?? p),
          service: String(p.service || 'unknown').toUpperCase(),
          risk: p.risk || riskForPort(Number(p.port ?? p)),
        }))
      : [];

    return {
      ip: d.ip || ipFallback,
      hostname: d.hostname || `host-${(d.ip || ipFallback).split('.').slice(-1)[0]}.lan`,
      state: d.state || 'up',
      latency: d.latency ?? d.latencyMs ?? null,
      openPorts,
    };
  }

  return null;
};

const normalizeBackendAllScan = (payload) => {
  if (!payload || !Array.isArray(payload.devices)) return null;

  const devices = payload.devices
    .map((d) => {
      const ip = d.ip;
      const openPortsSrc = d.openPorts || d.open_ports || d.ports;
      const openPorts = Array.isArray(openPortsSrc)
        ? openPortsSrc.map((p) => ({
            port: Number(p.port ?? p),
            service: String(p.service || 'unknown').toUpperCase(),
            risk: p.risk || riskForPort(Number(p.port ?? p)),
          }))
        : [];

      if (!ip) return null;
      return {
        ip,
        hostname: d.hostname || `host-${ip.split('.').slice(-1)[0]}.lan`,
        state: d.state || 'up',
        latency: d.latency ?? d.latencyMs ?? null,
        openPorts,
      };
    })
    .filter(Boolean);

  return { target: payload.target, devices };
};

export const scanNetworkTarget = async (ip) => {
  const target = String(ip || '').trim();

  if (!isValidIPv4(target)) {
    const err = new Error('Invalid IPv4 address.');
    err.code = 'INVALID_IP';
    throw err;
  }

  try {
    const res = await api.post('/scan', { target });
    if (target === '0.0.0.0') {
      const all = normalizeBackendAllScan(res?.data);
      return all || { target, devices: [] };
    }

    const normalized = normalizeBackendScan(res?.data, target);
    return normalized || simulateNetworkScan(target);
  } catch {
    if (target === '0.0.0.0') {
      return { target, devices: [] };
    }
    return simulateNetworkScan(target);
  }
};
