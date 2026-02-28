// ═══════════════════════════════════════════════════════════════════════════
// Auth Service - Login, Logout, Profile
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

const isBrowser = typeof window !== 'undefined';

// Login timeout: 120s to handle Render free-tier cold starts (can take 50-60s+)
const LOGIN_TIMEOUT = 120000;
const MAX_LOGIN_RETRIES = 2;

export const authService = {
  // Login with email and password (with auto-retry for cold starts)
  async login(email: string, password: string, onRetry?: (attempt: number) => void) {
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_LOGIN_RETRIES; attempt++) {
      try {
        if (attempt > 0 && onRetry) {
          onRetry(attempt);
        }
        const response: any = await api.post('/auth/login', { email, password }, {
          timeout: LOGIN_TIMEOUT,
        });
        const { accessToken, refreshToken, user } = response.data.data || response.data;

        if (isBrowser) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }

        return { accessToken, refreshToken, user };
      } catch (err: any) {
        lastError = err;
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
        const isNetworkError = err.code === 'ERR_NETWORK' || !err.response;

        // Only retry on timeout or network errors (server waking up)
        if ((isTimeout || isNetworkError) && attempt < MAX_LOGIN_RETRIES) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  },

  // Logout - notify backend + clear tokens
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — token may already be expired
    }
    if (isBrowser) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  // Get current user profile
  async getProfile() {
    const response: any = await api.get('/auth/me');
    return response.data.data || response.data;
  },

  // Refresh token
  async refresh() {
    const refreshToken = isBrowser ? localStorage.getItem('refreshToken') : null;
    const response: any = await api.post('/auth/refresh', { refreshToken });
    const data = response.data.data || response.data;

    if (isBrowser) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
  },

  // Update current user profile
  async updateProfile(data: { name?: string; phone?: string; department?: string }) {
    const response: any = await api.put('/auth/me', data);
    return response.data.data || response.data;
  },

  // Login with Microsoft (Azure AD) — send MS access token to backend
  async loginWithMicrosoft(msAccessToken: string) {
    const response: any = await api.post('/auth/microsoft', { accessToken: msAccessToken }, {
      timeout: LOGIN_TIMEOUT,
    });
    const { accessToken, refreshToken, user } = response.data.data || response.data;

    if (isBrowser) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }

    return { accessToken, refreshToken, user };
  },

  // Check if user is authenticated
  isAuthenticated() {
    return isBrowser ? !!localStorage.getItem('accessToken') : false;
  },

  // Get stored access token
  getToken() {
    return isBrowser ? localStorage.getItem('accessToken') : null;
  }
};

export default authService;
