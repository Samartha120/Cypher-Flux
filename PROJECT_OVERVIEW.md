# Cypher-Flux: System Architecture & Functional Documentation

This document provides a comprehensive overview of the **Cypher-Flux** project, detailing its architectural design, core functionalities, current workflow, and strategic future goals.

---

## 🏗️ System Architecture

Cypher-Flux is built as a modern, high-performance Security Operations Center (SOC) dashboard. It follows a decoupled **Client-Server** architecture with real-time synchronization capabilities.

### 1. Frontend (The Command Center)
*   **Technology Stack**: React.js, Vite, Tailwind CSS, Framer Motion.
*   **Design Philosophy**: Premium glassmorphism UI, dark-mode optimized, responsive, and high-fidelity micro-interactions.
*   **State Management**: React Context API (`AuthContext`, etc.) for global session and system states.
*   **Real-time Layer**: Socket.io-client for receiving live security alerts and metric updates without page refreshes.

### 2. Backend (The Intelligence Engine)
*   **Technology Stack**: Python, Flask, Flask-Restful.
*   **Authentication**: JWT (JSON Web Tokens) with access/refresh token rotation and server-side blocklisting.
*   **Database ORM**: SQLAlchemy for structured data management.
*   **Task Scheduling**: `APScheduler` manages background maintenance (log cleanup, batch writes).

### 3. Data & Persistence
*   **Primary Database**: PostgreSQL (Production) / SQLite (Development).
*   **In-Memory Strategy**: Real-time traffic data is processed in-memory to ensure low-latency dashboard updates before being batched into the database.
*   **Security Layer**: Multi-recipient OTP verification system for secure onboarding.

---

## 🛠️ Functional Modules & Their Uses

| Functionality | Description & Use Case |
| :--- | :--- |
| **Real-time Dashboard** | Provides a "Bird's Eye View" of the system. Displays the **Flux Score** (overall health), active threat levels, and device status. |
| **Threat Detection** | Monitors incoming traffic patterns and identifies anomalies (DDoS, SQLi, Brute Force) using pre-defined security rules. |
| **Alert Management** | Categorizes security events by severity (Critical, High, Medium, Low). Includes a batch-processing system to prevent database bottlenecks during "Alert Storms." |
| **Live Monitor** | A high-frequency visualization of network traffic, allowing security analysts to see live packet flows and connection attempts. |
| **IP Blocking/Response** | An active defense mechanism. Allows administrators to blacklist malicious IPs instantly, which is then enforced across the network. |
| **Audit Logs** | Maintains a tamper-evident record of all system events and administrative actions for forensic analysis. |
| **Notification Center** | A centralized hub for system-level alerts, configuration changes, and non-critical status updates. |

---

## 🔄 Current Project Workflow

1.  **Ingestion**: The backend monitors network interfaces or receives log streams from external sources.
2.  **Analysis**: The detection engine processes these streams in real-time. If a threat is detected, an `Alert` object is created.
3.  **Aggregation**: To ensure performance, high-frequency alerts are batched in-memory and flushed to the database every 10 seconds.
4.  **Broadcasting**: Once a critical event is registered, the **Socket.io** manager broadcasts the event to all connected frontend clients.
5.  **Visualization**: The frontend receives the event and triggers a non-blocking `AlertPopup`. The **Flux Score** on the dashboard is recalculated dynamically.
6.  **Action**: The security analyst reviews the alert and can choose to "Block IP," "Dismiss," or "Investigate," which triggers the corresponding backend service.

---

## 🚀 Future Goals

*   **AI/ML Integration**: Transition from rule-based detection to machine-learning models that can predict "Zero-Day" attacks based on behavioral heuristics.
*   **Automated Playbooks**: Implement "Auto-Response" logic where the system can automatically block IPs or isolate nodes if a threat exceeds a specific confidence threshold.
*   **Deployment Scaling**: Containerization using Docker and orchestration with Kubernetes for large-scale enterprise deployments.
*   **3D Threat Map**: An advanced visualization layer using Three.js to show global threat vectors on a 3D globe.
*   **External Integrations**: Plugins for Slack, Discord, and Email to notify security teams of critical breaches instantly.

---

## 📊 Data Sources & Simulation

> [!IMPORTANT]
> **Current Data State**: Mock/Simulated
> Currently, Cypher-Flux does not ingest live network packets from a physical interface. Instead, it uses a high-fidelity **Simulation Engine** to demonstrate the platform's capabilities.

*   **Randomized Event Generation**: Threat events (DDoS, Brute Force, Port Scanning) are randomly generated using a heuristic simulation engine (`threatSim.js`).
*   **Realistic Metadata**: Each simulated event includes randomized but realistic metadata, such as:
    *   Public & Private IP addresses.
    *   Geo-location mapping (Country/Region).
    *   Risk scores based on severity.
    *   Detailed forensic logs and attack timelines.
*   **Purpose**: This allows users and developers to experience the full SOC workflow (detection, alerting, response) without needing a live, high-traffic environment.


---

## 📂 Project Structure Overview

```text
Cypher-Flux/
├── cypherflux-frontend/       # React (Vite) Application
│   ├── src/components/       # Reusable UI (Sidebar, Popups)
│   ├── src/pages/            # View logic (Dashboard, Alerts, Monitor)
│   └── src/context/          # Auth & Socket state providers
└── cypherflux-backend/        # Python Flask API
    ├── app/routes/           # API Endpoints (Auth, Detect, Alerts)
    ├── app/models/           # DB Schemas (User, Alert, Block)
    ├── app/services/         # Business logic (Detection, Email, Batching)
    └── app/realtime/         # Socket.io event management
```

---
**Cypher-Flux** is currently in its active development phase, focusing on perfecting the real-time pipeline and ensuring the UI provides the most professional experience possible for security professionals.
