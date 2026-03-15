// ═══════════════════════════════════════════════════════════════════════════
// DAFC OTB API - Axios Instance with JWT Interceptor + GET Cache
// ═══════════════════════════════════════════════════════════════════════════
import axios from 'axios';

// Read from window.__ENV__ (runtime, set by server layout.tsx) or fallback to build-time var
const API_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__ENV__?.API_URL) ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://buddytoolbeuat-dwa6f8bpbvctcxer.southeastasia-01.azurewebsites.net/api/v1';

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

// Create axios instance — withCredentials sends httpOnly cookies automatically
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - cache check (token sent via httpOnly cookie automatically)
api.interceptors.request.use(
  (config: any) => {
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
  (error: any) => Promise.reject(error)
);

// Response interceptor - handle 401 & auto refresh + cache store
api.interceptors.response.use(
  (response: any) => {
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
  async (error: any) => {
    const originalRequest = error.config;

    // If 401 and not already retried — attempt silent refresh via httpOnly cookie
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        cache.clear();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }

    // VAL-14: Auto-retry on network errors (GET only, max 2 retries)
    if (
      !error.response &&
      (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') &&
      originalRequest.method === 'get' &&
      (originalRequest._retryCount || 0) < 2
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      // Wait 1s before retry (2s on 2nd retry)
      await new Promise(r => setTimeout(r, originalRequest._retryCount * 1000));
      return api(originalRequest);
    }

    // VAL-13: Extract user-friendly error message with fallback
    if (error.response?.data?.message) {
      error.userMessage = error.response.data.message;
    } else if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timed out. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      error.userMessage = 'Network error. Please check your connection.';
    } else {
      error.userMessage = 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  }
);

// Invalidate cache for a specific URL pattern (call after mutations)
export const invalidateCache = (urlPattern: string) => {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
};

// Clear entire cache
export const clearCache = () => cache.clear();

export default api;
