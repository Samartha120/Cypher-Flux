import api from './api';

const DataService = {
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getAlerts: async (params) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  getLogs: async (params) => {
    const response = await api.get('/logs', { params });
    return response.data;
  },

  getMonitorData: async () => {
    const response = await api.get('/monitor/traffic');
    return response.data;
  },

  getBlockedIps: async () => {
    const response = await api.get('/blocked-ips');
    return response.data;
  },

  startScan: async (target) => {
    const response = await api.post('/scan/start', { target });
    return response.data;
  },

  getScanResults: async (scanId) => {
    const response = await api.get(`/scan/results/${scanId}`);
    return response.data;
  }
};

export default DataService;
