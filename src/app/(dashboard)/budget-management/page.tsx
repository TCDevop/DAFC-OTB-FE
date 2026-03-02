'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { BudgetManagementScreen } from '@/features/otb';

export default function BudgetManagementPage() {
  const router = useRouter();
  const { sharedYear, setSharedYear, setAllocationData } = useAppContext();

  const handleAllocate = (budgetData: any) => {
    setAllocationData(budgetData);
    router.push('/planning');
  };

  return (
    <BudgetManagementScreen
      selectedYear={sharedYear}
      setSelectedYear={setSharedYear}
      onAllocate={handleAllocate}
    />
  );
}
