import axios from 'axios';

const explicitBase = import.meta.env?.VITE_API_BASE_URL;
const backendOriginEnv = import.meta.env?.VITE_BACKEND_ORIGIN;
const devBackendOriginFallback = 'http://127.0.0.1:5000';
const isDev = Boolean(import.meta.env?.DEV);

const normalizeBaseURL = () => {
  const explicit = explicitBase ? String(explicitBase).trim() : '';

  // In development, force absolute backend URL to avoid Vite proxy ECONNREFUSED flakiness.
  if (isDev) {
    const backendOrigin = (backendOriginEnv && String(backendOriginEnv).trim()) || devBackendOriginFallback;
    if (!explicit) return `${backendOrigin}/api`;
    if (/^https?:\/\//i.test(explicit)) return explicit;
    // Treat relative values like "/api" as backend-relative in dev.
    return `${backendOrigin}${explicit.startsWith('/') ? explicit : `/${explicit}`}`;
  }

  // Production (Render): you usually deploy frontend and backend on different hosts.
  // Prefer an explicit base (full URL to /api). If only an origin is provided, append /api.
  if (explicit) return explicit;
  if (backendOriginEnv && String(backendOriginEnv).trim()) {
    const origin = String(backendOriginEnv).trim().replace(/\/$/, '');
    return `${origin}/api`;
  }

  // Fallback for same-origin deployments (e.g., reverse proxy):
  return '/api';
};

const baseURL = normalizeBaseURL();
export const API_BASE_URL = baseURL;

const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
