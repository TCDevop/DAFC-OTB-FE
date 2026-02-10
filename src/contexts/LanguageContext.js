'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '@/locales/en';
import vi from '@/locales/vi';

const translations = { en, vi };
const LanguageContext = createContext(null);

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? params[key] : `{{${key}}}`;
  });
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('vi');

  // Load persisted language on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-language');
    if (saved && translations[saved]) {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    } else {
      document.documentElement.lang = 'vi';
    }
  }, []);

  const setLanguage = useCallback((code) => {
    if (!translations[code]) return;
    setLanguageState(code);
    localStorage.setItem('app-language', code);
    document.documentElement.lang = code;
  }, []);

  const t = useCallback((key, params) => {
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

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
