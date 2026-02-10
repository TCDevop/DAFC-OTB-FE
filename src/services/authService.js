// ═══════════════════════════════════════════════════════════════════════════
// Auth Service - Login, Logout, Profile
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

export const authService = {
  // Login with email and password
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data.data || response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return { accessToken, refreshToken, user };
  },

  // Logout - clear tokens
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  // Get current user profile
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  },

  // Refresh token
  async refresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/auth/refresh', { refreshToken });
    const data = response.data.data || response.data;

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    return data;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },

  // Get stored access token
  getToken() {
    return localStorage.getItem('accessToken');
  }
};

export default authService;
