// ═══════════════════════════════════════════════════════════════════════════
// DAFC OTB API - Axios Instance with JWT Interceptor + GET Cache
// ═══════════════════════════════════════════════════════════════════════════
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Bearer token + cache check
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Cache only GET requests
    if (config.method === 'get') {
      const cacheKey = config.url + JSON.stringify(config.params || {});
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (cached)',
            headers: {},
            config,
            _cached: true,
          });
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 & auto refresh + cache store
api.interceptors.response.use(
  (response) => {
    // Store successful GET responses in cache
    if (response.config.method === 'get' && !response._cached) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Invalidate cache for a specific URL pattern (call after mutations)
export const invalidateCache = (urlPattern) => {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
};

// Clear entire cache
export const clearCache = () => cache.clear();

export default api;
