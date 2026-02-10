'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Auth Context - Login State + Protected Routes
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
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

  // Login function
  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { user: userData } = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions) => {
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
    isAuthenticated: !!user,
    login,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
