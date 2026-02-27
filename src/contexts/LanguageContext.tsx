'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '@/locales/en';
import vi from '@/locales/vi';

const translations: Record<string, any> = { en, vi };

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string, params?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, part: string) => acc && acc[part], obj);
}

function interpolate(str: any, params?: Record<string, any>): string {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
    return params[key] !== undefined ? params[key] : `{{${key}}}`;
  });
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState('vi');

  // Load persisted language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-language');
      if (saved && translations[saved]) {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = 'vi';
      }
    } catch {
      // localStorage may throw SecurityError in private browsing mode
      document.documentElement.lang = 'vi';
    }
  }, []);

  const setLanguage = useCallback((code: string) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem('app-language', code);
    } catch {
      // localStorage may throw SecurityError in private browsing mode
    }
    document.documentElement.lang = code;
  }, []);

  const t = useCallback((key: string, params?: any) => {
    // Try current language first
    let value = getNestedValue(translations[language], key);
    // Fallback to English
    if (value === undefined) {
      value = getNestedValue(translations.en, key);
    }
    // Fallback to raw key
    if (value === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation key: "${key}"`);
      }
      return key;
    }
    return interpolate(value, params);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
