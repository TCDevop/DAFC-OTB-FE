'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { OTBAnalysisScreen } from '@/features/otb';

export default function OTBAnalysisPage() {
  const router = useRouter();
  const { otbAnalysisContext, setSkuProposalContext } = useAppContext();

  const handleOpenSkuProposal = (context: any) => {
    setSkuProposalContext(context);
    router.push('/proposal');
  };

  return (
    <OTBAnalysisScreen
      otbContext={otbAnalysisContext}
      onOpenSkuProposal={handleOpenSkuProposal}
    />
  );
}
