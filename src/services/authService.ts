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
        if (attempt > 0 && onRetry) onRetry(attempt);
        const response: any = await api.post('/auth/login', { email, password }, { timeout: LOGIN_TIMEOUT });
        const data = response.data.data || response.data;
        // Tokens are set as httpOnly cookies by the backend — no localStorage needed
        if (isBrowser) sessionStorage.setItem('authenticated', '1');
        return { user: data.user };
      } catch (err: any) {
        lastError = err;
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
        const isNetworkError = err.code === 'ERR_NETWORK' || !err.response;
        if ((isTimeout || isNetworkError) && attempt < MAX_LOGIN_RETRIES) continue;
        throw err;
      }
    }

    throw lastError;
  },

  // Logout — clear server-side httpOnly cookies
  async logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    if (isBrowser) sessionStorage.removeItem('authenticated');
  },

  // Get current user profile
  async getProfile() {
    const response: any = await api.get('/auth/me');
    return response.data.data || response.data;
  },

  // Login with Microsoft (Azure AD) — send MS access token to backend
  async loginWithMicrosoft(msAccessToken: string) {
    const response: any = await api.post('/auth/microsoft', { accessToken: msAccessToken }, { timeout: LOGIN_TIMEOUT });
    const data = response.data.data || response.data;
    if (isBrowser) sessionStorage.setItem('authenticated', '1');
    return { user: data.user };
  },

  // Check if user is authenticated (lightweight flag — actual auth validated by /auth/me)
  isAuthenticated() {
    return isBrowser ? sessionStorage.getItem('authenticated') === '1' : false;
  },
};

export default authService;
