'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile, useNetworkStatus } from '@/hooks';
import { getScreenIdFromPathname } from '@/utils/routeMap';
import AuthGuard from '@/components/AuthGuard';
import { Sidebar } from '@/components/layout';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AppHeader from '@/components/layout/AppHeader';

export default function DashboardLayout({ children }: any) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { kpiData } = useAppContext();

  const currentScreen = getScreenIdFromPathname(pathname);

  const { isMobile } = useIsMobile();
  const { isOnline } = useNetworkStatus();

  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden bg-[hsl(40,25%,96%)] flex transition-colors duration-normal">
        <div className="hidden md:block">
          <Sidebar
            currentScreen={currentScreen}
            user={user}
            onLogout={logout}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden text-content">
          {!isOnline && (
            <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 text-center text-sm font-medium py-1.5 px-4">
              You are offline — changes will sync when reconnected
            </div>
          )}
          <AppHeader
            currentScreen={currentScreen}
            kpiData={kpiData}
            isMobile={isMobile}
            user={user}
            onLogout={logout}
          />

          <div id="main-scroll" className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 pb-[80px]' : 'p-6'}`}>
            {children}
          </div>
        </div>

        {isMobile && (
          <MobileBottomNav
            currentScreen={currentScreen}
          />
        )}
      </div>
    </AuthGuard>
  );
}
