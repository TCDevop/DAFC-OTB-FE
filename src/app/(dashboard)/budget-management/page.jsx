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
    sharedGroupBrand, setSharedGroupBrand,
    sharedBrand, setSharedBrand,
    setAllocationData,
  } = useAppContext();
  const { budgets } = useBudget();

  const handleAllocate = (budgetData) => {
    setAllocationData(budgetData);
    router.push('/planning');
  };

  return (
    <BudgetManagementScreen
      budgets={budgets}
      selectedYear={sharedYear}
      setSelectedYear={setSharedYear}
      selectedGroupBrand={sharedGroupBrand}
      setSelectedGroupBrand={setSharedGroupBrand}
      selectedBrand={sharedBrand}
      setSelectedBrand={setSharedBrand}
      onAllocate={handleAllocate}
      darkMode={darkMode}
    />
  );
}
