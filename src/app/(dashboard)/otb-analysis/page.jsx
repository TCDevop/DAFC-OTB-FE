'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import OTBAnalysisScreen from '@/screens/OTBAnalysisScreen';

export default function OTBAnalysisPage() {
  const router = useRouter();
  const { darkMode, otbAnalysisContext, setSkuProposalContext } = useAppContext();

  const handleOpenSkuProposal = (context) => {
    setSkuProposalContext(context);
    router.push('/proposal');
  };

  return (
    <OTBAnalysisScreen
      otbContext={otbAnalysisContext}
      onOpenSkuProposal={handleOpenSkuProposal}
      darkMode={darkMode}
    />
  );
}
