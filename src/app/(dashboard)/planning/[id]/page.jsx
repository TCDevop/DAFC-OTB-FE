'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { usePlanning } from '@/hooks';
import PlanningDetailPage from '@/screens/PlanningDetailPage';

export default function PlanningDetailRoute() {
  const router = useRouter();
  const { darkMode } = useAppContext();
  const { selectedBudgetDetail, planningDetailData, handleSavePlanning, closePlanningDetail } = usePlanning();

  const handleBack = () => {
    closePlanningDetail();
    router.push('/planning');
  };

  return (
    <PlanningDetailPage
      selectedBudgetDetail={selectedBudgetDetail}
      planningDetailData={planningDetailData}
      onBack={handleBack}
      onSave={handleSavePlanning}
      darkMode={darkMode}
    />
  );
}
