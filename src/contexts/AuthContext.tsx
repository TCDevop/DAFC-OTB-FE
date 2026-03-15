'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Auth Context - Login State + Protected Routes
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';
import { clearCache } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: any;
  permissions?: string[];
  avatar?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginStatus: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  canApprove: (level?: number) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState('');

  // Check if user is already logged in on mount + handle Microsoft redirect response
  useEffect(() => {
    const checkAuth = async () => {
      // Handle Microsoft redirect — extract code from URL and exchange via backend
      if (window.location.pathname.includes('/auth/microsoft/callback')) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const msError = params.get('error');

        if (msError) {
          console.error('Microsoft auth error:', params.get('error_description'));
          window.location.replace('/');
          return;
        }

        if (code) {
          try {
            setLoginStatus('Authenticating...');
            const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
            const { user: userData } = await authService.loginWithMicrosoft(code, redirectUri);
            setLoginStatus('');
            setUser(userData);
            setLoading(false);
            window.location.replace('/');
            return;
          } catch (err: any) {
            console.error('Microsoft auth failed:', err);
            window.location.replace('/');
            return;
          }
        }
      }

      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Auth check failed:', err);
          authService.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function (with retry callback for cold-start feedback)
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoginStatus('');
    setLoading(true);
    try {
      const { user: userData } = await authService.login(email, password, (attempt) => {
        setLoginStatus(`Server is starting... (attempt ${attempt + 1})`);
      });
      setLoginStatus('');
      setUser(userData);
      return userData;
    } catch (err: any) {
      setLoginStatus('');
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isNetwork = err.code === 'ERR_NETWORK' || !err.response;
      const message = (isTimeout || isNetwork)
        ? 'Server is starting, please try again...'
        : err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login with Microsoft (Azure AD) — redirect to Microsoft auth page
  const loginWithMicrosoft = useCallback(async () => {
    setError(null);
    setLoginStatus('Connecting to Microsoft...');
    const { getMicrosoftAuthUrl } = await import('../services/msalConfig');
    const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
    window.location.href = getMicrosoftAuthUrl(redirectUri);
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    await authService.logout();
    clearCache();
    setUser(null);
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions: string[]) => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);

  // Check if user can approve (L1 or L2)
  const canApprove = useCallback((level = 1) => {
    const l1Permissions = ['budget:approve_l1', 'planning:approve_l1', 'proposal:approve_l1'];
    const l2Permissions = ['budget:approve_l2', 'planning:approve_l2', 'proposal:approve_l2'];

    if (user?.permissions?.includes('*')) return true;

    if (level === 1) {
      return hasAnyPermission(l1Permissions);
    }
    return hasAnyPermission(l2Permissions);
  }, [user, hasAnyPermission]);

  const value = {
    user,
    loading,
    error,
    loginStatus,
    isAuthenticated: !!user,
    login,
    loginWithMicrosoft,
    logout,
    hasPermission,
    hasAnyPermission,
    canApprove,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
