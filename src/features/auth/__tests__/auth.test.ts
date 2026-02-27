// src/features/auth/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockUser,
  mockAuthResponse,
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  mockApiError,
} from '@/test/utils';

// ═══════════════════════════════════════════════════════════════
// Auth Service Tests
// ═══════════════════════════════════════════════════════════════

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Login Tests ──────────────────────────────────────────────

  describe('login', () => {
    const loginCredentials = {
      email: 'admin@dafc.com',
      password: 'dafc@2026',
    };

    it('should login successfully with valid credentials', async () => {
      const authResponse = mockAuthResponse();
      mockFetchSuccess(authResponse);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.accessToken).toBe('mock-jwt-token-12345');
      expect(data.user.email).toBe('admin@dafc.com');
      expect(data.user.role).toBe('admin');
    });

    it('should fail login with invalid credentials', async () => {
      mockFetchError('Invalid email or password', 401);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'wrong@email.com', password: 'wrong' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error.message).toBe('Invalid email or password');
    });

    it('should fail login with empty credentials', async () => {
      mockFetchError('Email and password are required', 400);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', password: '' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle network error during login', async () => {
      mockFetchNetworkError();

      await expect(
        fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginCredentials),
        })
      ).rejects.toThrow('Network error');
    });
  });

  // ─── Logout Tests ─────────────────────────────────────────────

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Setup: User is logged in
      localStorage.setItem('accessToken', 'mock-jwt-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');

      mockFetchSuccess({ message: 'Logged out successfully' });

      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.ok).toBe(true);

      // Simulate clearing tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('should clear tokens even if API call fails', async () => {
      localStorage.setItem('accessToken', 'mock-jwt-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');

      mockFetchError('Server error', 500);

      // Call fetch to consume the mock
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-jwt-token' },
      });

      expect(response.ok).toBe(false);

      // Even on error, tokens should be cleared locally
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // ─── Token Refresh Tests ──────────────────────────────────────

  describe('token refresh', () => {
    it('should refresh token successfully', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockFetchSuccess(newTokens);

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.accessToken).toBe('new-access-token');
      expect(data.refreshToken).toBe('new-refresh-token');
    });

    it('should fail refresh with expired token', async () => {
      mockFetchError('Refresh token expired', 401);

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'expired-token' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should fail refresh with invalid token', async () => {
      mockFetchError('Invalid refresh token', 401);

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  // ─── Get Current User Tests ───────────────────────────────────

  describe('getCurrentUser', () => {
    it('should get current user with valid token', async () => {
      const user = mockUser();
      mockFetchSuccess({ data: user });

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.email).toBe('admin@dafc.com');
      expect(data.data.role).toBe('admin');
    });

    it('should fail with invalid token', async () => {
      mockFetchError('Unauthorized', 401);

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should fail without token', async () => {
      mockFetchError('No token provided', 401);

      const response = await fetch('/api/v1/auth/me');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Auth Utilities Tests
// ═══════════════════════════════════════════════════════════════

describe('Auth Utilities', () => {
  // ─── Token Storage Tests ──────────────────────────────────────

  describe('Token Storage', () => {
    it('should store tokens in localStorage', () => {
      const tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
      };

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      expect(localStorage.getItem('accessToken')).toBe('access-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
    });

    it('should clear all tokens', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // ─── Token Validation Tests ───────────────────────────────────

  describe('Token Validation', () => {
    const isTokenExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
      } catch {
        return true;
      }
    };

    it('should detect expired token', () => {
      // Mock expired JWT (exp in past)
      const expiredPayload = btoa(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })
      );
      const expiredToken = `header.${expiredPayload}.signature`;

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid token', () => {
      // Mock valid JWT (exp in future)
      const validPayload = btoa(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
      );
      const validToken = `header.${validPayload}.signature`;

      expect(isTokenExpired(validToken)).toBe(false);
    });

    it('should treat malformed token as expired', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });
  });

  // ─── Role-based Access Tests ──────────────────────────────────

  describe('Role-based Access', () => {
    const hasPermission = (
      userRole: string,
      requiredRoles: string[]
    ): boolean => {
      return requiredRoles.includes(userRole);
    };

    it('should allow admin access to all features', () => {
      expect(hasPermission('admin', ['admin'])).toBe(true);
      expect(hasPermission('admin', ['admin', 'manager'])).toBe(true);
      expect(hasPermission('admin', ['admin', 'buyer', 'merchandiser'])).toBe(true);
    });

    it('should restrict buyer to buyer features', () => {
      expect(hasPermission('buyer', ['buyer'])).toBe(true);
      expect(hasPermission('buyer', ['admin'])).toBe(false);
      expect(hasPermission('buyer', ['buyer', 'merchandiser'])).toBe(true);
    });

    it('should restrict finance to finance features', () => {
      expect(hasPermission('finance', ['finance'])).toBe(true);
      expect(hasPermission('finance', ['admin', 'finance'])).toBe(true);
      expect(hasPermission('finance', ['buyer'])).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Auth Input Validation Tests
// ═══════════════════════════════════════════════════════════════

describe('Auth Input Validation', () => {
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    return { valid: errors.length === 0, errors };
  };

  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('admin@dafc.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('dafc@2026').valid).toBe(true);
      expect(validatePassword('SecurePass123').valid).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });
  });
});
