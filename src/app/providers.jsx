'use client';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AppProvider, useAppContext } from '@/contexts/AppContext';

function ToasterWithTheme() {
  const { darkMode } = useAppContext();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: darkMode ? '#1e293b' : '#ffffff',
          color: darkMode ? '#f1f5f9' : '#0f172a',
          border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
        },
      }}
    />
  );
}

export function Providers({ children }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppProvider>
          {children}
          <ToasterWithTheme />
        </AppProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
