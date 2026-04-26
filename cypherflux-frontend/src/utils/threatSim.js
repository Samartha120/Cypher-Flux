const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickOne = (arr) => arr[randomInt(0, arr.length - 1)];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
];

const THREAT_CATALOG = [
  {
    type: 'Port Scanning Detected',
    severity: 'critical',
    buildMeta: () => {
      const ports = [22, 23, 25, 53, 80, 110, 143, 443, 445, 3389, 8080, 8443];
      const scanned = Array.from({ length: randomInt(5, 9) }, () => pickOne(ports));
      return { ports: [...new Set(scanned)], vector: 'RECON', proto: pickOne(['TCP', 'UDP']) };
    },
  },
  {
    type: 'Brute Force Login Attempts',
    severity: 'high',
    buildMeta: () => ({ attempts: randomInt(35, 220), target: pickOne(['SSH', 'RDP', 'WEB']) }),
  },
  {
    type: 'Suspicious IP Detected',
    severity: 'high',
    buildMeta: () => ({ reputation: pickOne(['malicious', 'unknown', 'botnet']) }),
  },
  {
    type: 'DDoS Burst Detected',
    severity: 'critical',
    buildMeta: () => ({ rps: randomInt(2500, 15000), method: pickOne(['SYN', 'UDP', 'HTTP']) }),
  },
  {
    type: 'Too Many Requests',
    severity: 'medium',
    buildMeta: () => ({ rps: randomInt(450, 2200), path: pickOne(['/login', '/api/auth', '/api/scan', '/api/alerts']) }),
  },
  {
    type: 'Suspicious DNS Query',
    severity: 'medium',
    buildMeta: () => ({ domain: pickOne(['update-secure-check.com', 'cdn-auth-verify.net', 'login-confirm.io']) }),
  },
  // ── LOW severity ──────────────────────────────────────────────────────────
  {
    type: 'Unusual Login Time',
    severity: 'low',
    buildMeta: () => ({ hour: randomInt(1, 5), user: pickOne(['admin', 'sysop', 'devops', 'analyst']) }),
  },
  {
    type: 'Configuration Change Detected',
    severity: 'low',
    buildMeta: () => ({ file: pickOne(['/etc/passwd', '/etc/hosts', 'nginx.conf', 'sshd_config']) }),
  },
  {
    type: 'Failed Authentication Attempt',
    severity: 'low',
    buildMeta: () => ({ attempts: randomInt(1, 5), target: pickOne(['SSH', 'WEB', 'VPN']) }),
  },
];


const randomPublicIp = () => {
  const a = randomInt(11, 223);
  const b = randomInt(0, 255);
  const c = randomInt(0, 255);
  const d = randomInt(1, 254);
  return `${a}.${b}.${c}.${d}`;
};

const randomPrivateIp = () => {
  const block = pickOne(['10', '172', '192']);
  if (block === '10') return `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  if (block === '172') return `172.${randomInt(16, 31)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  return `192.168.${randomInt(0, 255)}.${randomInt(1, 254)}`;
};

export const ipToCountry = (ip) => {
  const parts = String(ip || '0.0.0.0').split('.');
  // Better hash for diversity
  const hash = parts.reduce((acc, part, idx) => acc + (Number(part) * (idx + 1)), 0);
  
  // If localhost, return a truly random country to avoid static visuals when running locally
  if (ip === '127.0.0.1') {
    const randomIdx = (Date.now() + hash) % COUNTRIES.length;
    return COUNTRIES[randomIdx];
  }
  
  return COUNTRIES[hash % COUNTRIES.length];
};

export const getRandomTargetDevice = () => {
  const devices = [
    'Mainframe-SRV-01', 'Database-Cluster-A', 'Edge-Gateway-North', 
    'Secure-Proxy-04', 'Auth-Node-Alpha', 'Storage-SAN-02',
    'Workstation-CEO', 'Finance-Terminal-01', 'Cloud-VPC-Ingress'
  ];
  return devices[randomInt(0, devices.length - 1)];
};

const randomUuid = () => {
  try {
    return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const severityRiskScore = (severity) => {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return randomInt(85, 100);
  if (s === 'high')     return randomInt(60, 84);
  if (s === 'medium')   return randomInt(30, 59);
  if (s === 'low')      return randomInt(5,  29);
  return randomInt(30, 59);
};

const buildLogs = (threat) => {
  const base = [
    `[IDS] Event captured: ${threat.threatType}`,
    `[NET] src=${threat.sourceIp} dst=${threat.destinationIp}`,
    `[GEO] country=${threat.countryCode} (${threat.country})`,
    `[RISK] score=${threat.riskScore} severity=${String(threat.severity).toUpperCase()}`,
  ];

  if (threat.meta?.ports?.length) {
    base.push(`[SCAN] ports=${threat.meta.ports.join(',')}`);
  }
  if (typeof threat.meta?.rps === 'number') {
    base.push(`[HTTP] rps=${threat.meta.rps}`);
  }
  if (typeof threat.meta?.attempts === 'number') {
    base.push(`[AUTH] attempts=${threat.meta.attempts} target=${threat.meta.target}`);
  }

  return base;
};

const buildMitigations = (severity, threatType) => {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') {
    return [
      'Isolate affected host(s) from the network.',
      'Block source IP and apply WAF/Firewall rules.',
      'Collect packet capture and endpoint telemetry.',
      'Rotate exposed credentials and validate MFA.',
      `Investigate root cause for: ${threatType}.`,
    ];
  }
  if (s === 'high') {
    return [
      'Mark as Investigating and collect additional logs.',
      'Rate limit or add temporary access controls.',
      'Correlate IP reputation and previous sightings.',
      `Validate detections for: ${threatType}.`,
    ];
  }
  return [
    'Monitor for recurrence and increase logging temporarily.',
    'Apply rate limiting or CAPTCHA where applicable.',
    `Review and tune detection rule for: ${threatType}.`,
  ];
};

const buildAutoResponses = (severity) => {
  const s = String(severity || '').toLowerCase();
  if (s !== 'critical') return [];
  const responses = ['Firewall Triggered', 'IDS Signature Updated', 'IP Blocked', 'Session Terminated'];
  const count = randomInt(2, 3);
  const picked = Array.from({ length: count }, () => pickOne(responses));
  return [...new Set(picked)];
};

const buildAttackTimeline = (severity, riskScore) => {
  const s = String(severity || '').toLowerCase();
  if (s !== 'critical') return [];
  const points = Array.from({ length: 10 }, (_, i) => {
    const jitter = randomInt(-8, 6);
    const value = Math.min(100, Math.max(40, riskScore - (9 - i) * randomInt(1, 3) + jitter));
    return { t: i, score: value };
  });
  return points;
};

export const generateThreatEvent = () => {
  const pick = pickOne(THREAT_CATALOG);
  const sourceIp = randomPublicIp();
  const destinationIp = randomPrivateIp();
  const country = ipToCountry(sourceIp);
  const timestamp = new Date().toISOString();
  const riskScore = severityRiskScore(pick.severity);

  const threat = {
    id: randomUuid(),
    timestamp,
    sourceIp,
    destinationIp,
    country: country.name,
    countryCode: country.code,
    threatType: pick.type,
    severity: pick.severity,
    status: 'Active',
    riskScore,
    meta: pick.buildMeta(),
    affectedSystems: pick.severity === 'critical' ? randomInt(2, 9) : randomInt(1, 4),
    autoResponses: buildAutoResponses(pick.severity),
    logs: [],
    mitigations: [],
    attackTimeline: [],
  };

  threat.logs = buildLogs(threat);
  threat.mitigations = buildMitigations(threat.severity, threat.threatType);
  threat.attackTimeline = buildAttackTimeline(threat.severity, threat.riskScore);

  return threat;
};

export const threatToCsvRow = (t) => {
  const safe = (v) => {
    const s = v == null ? '' : String(v);
    return `"${s.replaceAll('"', '""')}"`;
  };

  return [
    safe(t.id),
    safe(t.timestamp),
    safe(t.sourceIp),
    safe(t.destinationIp),
    safe(t.country),
    safe(t.threatType),
    safe(String(t.severity).toUpperCase()),
    safe(t.status),
    safe(t.riskScore),
  ].join(',');
};

export const csvHeader =
  'ID,Timestamp,Source IP,Destination IP,Country,Threat Type,Severity,Status,Risk Score';
