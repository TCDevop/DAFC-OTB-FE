'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useBudget } from '@/hooks';
import BudgetManagementScreen from '@/screens/BudgetManagementScreen';

export default function BudgetManagementPage() {
  const router = useRouter();
  const {
    darkMode,
    sharedYear, setSharedYear,
    setAllocationData,
  } = useAppContext();
  const { budgets } = useBudget();

  const handleAllocate = (budgetData: any) => {
    setAllocationData(budgetData);
    router.push('/planning');
  };

  return (
    <BudgetManagementScreen
      budgets={budgets}
      selectedYear={sharedYear}
      setSelectedYear={setSharedYear}
      onAllocate={handleAllocate}
      darkMode={darkMode}
    />
  );
}
