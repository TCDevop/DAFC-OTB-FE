'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useBudget, usePlanning } from '@/hooks';
import BudgetAllocateScreen from '@/screens/BudgetAllocateScreen';

export default function PlanningPage() {
  const router = useRouter();
  const {
    darkMode,
    allocationData,
    setAllocationData,
    setOtbAnalysisContext,
  } = useAppContext();
  const { budgets } = useBudget();
  const { plannings, getPlanningStatus, handleOpenPlanningDetail } = usePlanning();

  const handleOpenOtbAnalysis = (payload) => {
    setOtbAnalysisContext(payload || null);
    router.push('/otb-analysis');
  };

  return (
    <BudgetAllocateScreen
      budgets={budgets}
      plannings={plannings}
      getPlanningStatus={getPlanningStatus}
      handleOpenPlanningDetail={handleOpenPlanningDetail}
      onOpenOtbAnalysis={handleOpenOtbAnalysis}
      allocationData={allocationData}
      onAllocationDataUsed={() => setAllocationData(null)}
      availableBudgets={budgets}
      darkMode={darkMode}
    />
  );
}
