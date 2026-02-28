'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { proposalService } from '@/services';
import { ProposalDetailPage } from '@/features/otb';

export default function ProposalDetailRoute() {
  const router = useRouter();
  const params = useParams();
  const { registerSave, unregisterSave } = useAppContext();
  const [proposal, setProposal] = useState<any>(null);
  const saveRef = { current: null as any };

  useEffect(() => {
    // Try to get proposal data from sessionStorage first
    const stored = sessionStorage.getItem('selectedProposal');
    if (stored) {
      setProposal(JSON.parse(stored));
    } else if (params.id) {
      // Fallback: fetch from API (e.g. navigating from Approvals)
      proposalService.getOne(params.id as string)
        .then((data: any) => setProposal(data))
        .catch(() => {});
    }
  }, [params.id]);

  const handleBack = () => {
    sessionStorage.removeItem('selectedProposal');
    router.back();
  };

  const handleSave = useCallback((_data?: any) => {
    handleBack();
  }, []);

  // Register save handler for AppHeader Save button
  useEffect(() => {
    registerSave(handleSave);
    return () => unregisterSave();
  }, [registerSave, unregisterSave, handleSave]);

  return (
    <ProposalDetailPage
      proposal={proposal}
      onBack={handleBack}
      onSave={handleSave}
      entityId={params.id as string}
    />
  );
}
