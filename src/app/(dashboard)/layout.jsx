'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useBudget, usePlanning } from '@/hooks';
import { getScreenIdFromPathname } from '@/utils/routeMap';
import AuthGuard from '@/components/AuthGuard';
import { Sidebar } from '@/components/Layout';
import AppHeader from '@/components/Layout/AppHeader';
import { BudgetModal } from '@/components/Common';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode, kpiData } = useAppContext();

  const currentScreen = getScreenIdFromPathname(pathname);

  const {
    selectedYear,
    showBudgetForm,
    selectedCell,
    budgetFormData,
    setBudgetFormData,
    handleStoreAllocationChange,
    calculateTotalBudget,
    handleSaveBudget,
    closeBudgetForm,
  } = useBudget();

  return (
    <AuthGuard>
      <div className={`min-h-screen ${darkMode ? 'dark bg-canvas' : 'light bg-[hsl(40,25%,96%)]'} flex transition-colors duration-normal`}>
        <Sidebar
          currentScreen={currentScreen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={user}
          onLogout={logout}
        />

        <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'text-content' : 'text-content-inverse'}`}>
          <AppHeader
            currentScreen={currentScreen}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            kpiData={kpiData}
          />

          <div className="flex-1 p-6 overflow-y-auto">
            {children}
          </div>
        </div>

        {showBudgetForm && selectedCell && (
          <BudgetModal
            selectedCell={selectedCell}
            selectedYear={selectedYear}
            budgetFormData={budgetFormData}
            setBudgetFormData={setBudgetFormData}
            onClose={closeBudgetForm}
            onSave={handleSaveBudget}
            calculateTotalBudget={calculateTotalBudget}
            handleStoreAllocationChange={handleStoreAllocationChange}
            darkMode={darkMode}
          />
        )}
      </div>
    </AuthGuard>
  );
}
