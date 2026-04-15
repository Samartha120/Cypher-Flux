# CypherFlux — Data Sources & Real-Time Pipeline Map

This document maps each UI module/feature to its data source(s): frontend state, backend API endpoints, and backend storage/services.

## Conventions

- **API base URL (frontend):** `VITE_API_BASE_URL` or default `http://localhost:5000/api`
  - Config: `cypherflux-frontend/src/services/api.js`
- **Auth token (frontend):** `localStorage.getItem('token')` attached as `Authorization: Bearer <token>`
  - Config: `cypherflux-frontend/src/services/api.js`

---
python app.py
## 1) Authentication (Login/Signup/OTP)

**Frontend**
- Token storage + client-side auth state
  - `cypherflux-frontend/src/context/AuthContext.jsx`

**Backend API**
- `POST /api/login` → issues JWT access token
- `POST /api/signup` → creates user + triggers OTP send
- `POST /api/send-otp` → resend OTP
- `POST /api/verify-otp` → verifies OTP + issues JWT

**Backend storage/services**
- Users + OTP + token blocklist
  - `cypherflux-backend/app/models/user_model.py`
  - `cypherflux-backend/app/models/otp_model.py`
  - `cypherflux-backend/app/models/token_blocklist_model.py`
- Email
  - `cypherflux-backend/app/services/email/email_service.py`

---

## 2) Live Traffic Monitor (Traffic Monitor page)

**Frontend module**
- UI component: `cypherflux-frontend/src/pages/Monitor.jsx`

**Real data (primary when backend reachable)**
- `GET /api/monitor`
  - Route: `cypherflux-backend/app/routes/monitor_routes.py`
  - Returns: list of `{ ip, requests }`

**How real traffic is captured**
- Global middleware increments per-IP counters on every request
  - `cypherflux-backend/app/middleware/auth_middleware.py` (`@app.before_request`)
  - Uses in-memory sliding window counter:
    - `cypherflux-backend/app/services/monitor/traffic_monitor.py`
    - Window size: 60 seconds (resets counts after 60s)

**Status classification (frontend)**
- `Normal` if requests ≤ 100
- `Suspicious` if requests > 100
- `Blocked` if requests > 200
  - Implemented in: `cypherflux-frontend/src/pages/Monitor.jsx`

**Simulation fallback (only if backend unreachable)**
- `setInterval(1s)` generates/upgrades random IP entries
  - Implemented in: `cypherflux-frontend/src/pages/Monitor.jsx`

---

## 3) Decrypted System Logs (System Logs page)

**Frontend module**
- UI component: `cypherflux-frontend/src/pages/logs.jsx`

**Real data (primary when backend reachable)**
- `GET /api/logs`
  - Route: `cypherflux-backend/app/routes/log_routes.py`
  - Returns: list of `{ id, timestamp, encrypted_data, message, decrypted_data }`

**Where log entries come from (real pipeline)**
- Global middleware writes request/security events into DB (rate-limited)
  - `cypherflux-backend/app/middleware/auth_middleware.py`
  - Writes rows into `logs` table via:
    - Model: `cypherflux-backend/app/models/log_model.py`
    - DB: `cypherflux-backend/app/models/db.py`

**Decryption logic (backend)**
- Backend decrypts before returning to the UI using Caesar cipher
  - `cypherflux-backend/app/services/encryption/classical_cypher.py`
  - Applied in: `cypherflux-backend/app/routes/log_routes.py`

**Simulation fallback (only if backend unreachable)**
- `setInterval(~2.5s)` generates base64-like encrypted payload + decoded message
  - Implemented in: `cypherflux-frontend/src/pages/logs.jsx`

---

## 4) Firewall Blocks (Blocked IPs page)

**Frontend module**
- UI component: `cypherflux-frontend/src/pages/BlockedIps.jsx`

**Backend API (JWT required)**
- `GET /api/blocked` → list blocks
- `POST /api/blocked` → create block
- `DELETE /api/blocked` → purge blocks
  - Route: `cypherflux-backend/app/routes/block_routes.py`

**Backend storage + enforcement**
- Storage:
  - Model: `cypherflux-backend/app/models/block_model.py`
- Enforcement:
  - Middleware blocks requests if IP exists in DB
  - `cypherflux-backend/app/middleware/auth_middleware.py`

---

## 5) Network Scan (Network Scan page)

**Frontend module**
- UI component: `cypherflux-frontend/src/pages/Scan.jsx`
- Scan client:
  - `cypherflux-frontend/src/utils/networkScan.js`
  - Validates IPv4 via regex

**Real data (when token present + backend reachable)**
- `POST /api/scan` (JWT required)
  - Route: `cypherflux-backend/app/routes/scan_routes.py`
  - Scanner service:
    - `cypherflux-backend/app/services/scanner/nmap_Scanner.py`
  - Response shape used by frontend normalizer:
    - `{ target, devices: [...] }`

**Simulation fallback**
- If backend fails (network/auth), frontend simulates:
  - hostname, state (up/down), open ports, latency
  - `cypherflux-frontend/src/utils/networkScan.js`

---

## 6) Threat Alerts (Alerts page + Toast popups)

**Frontend modules (current primary source)**
- Generator + state: `cypherflux-frontend/src/context/ThreatContext.jsx`
  - Uses `setInterval` to push alerts into state
- Alerts table: `cypherflux-frontend/src/pages/Alerts.jsx`
- Toast notifications: `cypherflux-frontend/src/components/AlertPopup.jsx`

**Backend API (available, not currently the UI primary)**
- `GET /api/alerts` (JWT required)
  - Route: `cypherflux-backend/app/routes/alert_routes.py`
  - Storage model:
    - `cypherflux-backend/app/models/alert_model.py`

---

## 7) Dashboard Cards + Charts

**Frontend modules**
- Dashboard view: `cypherflux-frontend/src/pages/Dashboard.jsx`
- Metric cards: `cypherflux-frontend/src/components/Card.jsx`

**Real API data used by the dashboard**
- Active devices (derived from traffic monitor list)
  - `GET /api/monitor`
- Blocked IPs (first page load)
  - `GET /api/blocked` (JWT required)

**Local/simulated data used by the dashboard**
- Open Ports card: local array defined in `Dashboard.jsx`
- Charts: simulated time-series updated via `setInterval` in `Dashboard.jsx`
- Alerts count: from `ThreatContext` (simulated generator)

---

## 8) Detection/Test Hook

**Backend API**
- `POST /api/detect` (no JWT)
  - Route: `cypherflux-backend/app/routes/detect_routes.py`
  - Purpose: simulate traffic from an IP and run detection logic

---

## Notes on “Real Data” Guarantees

- **Traffic monitor is real** when the backend is receiving requests, because every request increments the server-side monitor counter.
- **System logs are real** when the backend is running, because request/security events are persisted to the DB by middleware.
- Some dashboard visuals are intentionally simulated (charts/ports/alerts) unless you switch them to backend-backed endpoints.
