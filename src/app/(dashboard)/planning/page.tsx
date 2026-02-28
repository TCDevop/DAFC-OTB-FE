'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useBudget, usePlanning } from '@/hooks';
import { BudgetAllocateScreen } from '@/features/otb';

export default function PlanningPage() {
  const router = useRouter();
  const {
    allocationData,
    setAllocationData,
    setOtbAnalysisContext,
  } = useAppContext();
  const { budgets } = useBudget();
  const { plannings, getPlanningStatus, handleOpenPlanningDetail } = usePlanning();

  const handleOpenOtbAnalysis = (payload: any) => {
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
      onNavigateBack={() => router.push('/budget-management')}
      allocationData={allocationData}
      onAllocationDataUsed={() => setAllocationData(null)}
      availableBudgets={budgets}
    />
  );
}
