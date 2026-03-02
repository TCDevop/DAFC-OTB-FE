'use client';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AppProvider } from '@/contexts/AppContext';
import { ErrorBoundary } from '@/components/ui';
import GlobalLoadingOverlay from '@/components/ui/GlobalLoadingOverlay';

export function Providers({ children }: any) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <AppProvider>
            {children}
            <GlobalLoadingOverlay />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                },
                success: {
                  iconTheme: { primary: '#10b981', secondary: '#ffffff' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                },
              }}
            />
          </AppProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
