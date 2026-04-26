import axios from 'axios';

const explicitBase = import.meta.env?.VITE_API_BASE_URL;
const backendOrigin = import.meta.env?.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:5000';
const isDev = Boolean(import.meta.env?.DEV);

const normalizeBaseURL = () => {
  // In development, force absolute backend URL to avoid Vite proxy ECONNREFUSED flakiness.
  if (isDev) {
    if (!explicitBase) return `${backendOrigin}/api`;
    const raw = String(explicitBase).trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    // Treat relative values like "/api" as backend-relative in dev.
    return `${backendOrigin}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }

  return explicitBase || '/api';
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
