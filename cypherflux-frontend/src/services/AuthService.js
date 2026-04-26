import api from './api';

const AuthService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  verifyOtp: async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    if (response.data.token) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!sessionStorage.getItem('token');
  }
};

export default AuthService;
