# Cypher-Flux Frontend (Vite + React)

The frontend is a Vite + React app.

## Render deployment

### Option A: Blueprint
If you deploy via Render Blueprint, use the repository-level `render.yaml`.

### Option B: Manual setup
Create either:

- **Static Site**
  - Root directory: `cypherflux-frontend`
  - Build command: `npm ci && npm run build`
  - Publish directory: `dist`

or

- **Web Service (Node)**
  - Root directory: `cypherflux-frontend`
  - Build command: `npm ci && npm run build`
  - Start command: `npx serve@14.2.0 -s dist -l $PORT`

### Environment variables (important)
Vite reads these at build time (so after setting them, redeploy the frontend):

- `VITE_BACKEND_ORIGIN` = `https://<your-backend-service>.onrender.com`
  - The app will call `${VITE_BACKEND_ORIGIN}/api/...`

(Alternative)
- `VITE_API_BASE_URL` = `https://<your-backend-service>.onrender.com/api`
