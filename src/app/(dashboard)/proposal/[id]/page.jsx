'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import ProposalDetailPage from '@/screens/ProposalDetailPage';

export default function ProposalDetailRoute() {
  const router = useRouter();
  const params = useParams();
  const { darkMode } = useAppContext();
  const [proposal, setProposal] = useState(null);

  useEffect(() => {
    // Try to get proposal data from sessionStorage
    const stored = sessionStorage.getItem('selectedProposal');
    if (stored) {
      setProposal(JSON.parse(stored));
    }
  }, [params.id]);

  const handleBack = () => {
    sessionStorage.removeItem('selectedProposal');
    router.push('/proposal');
  };

  const handleSave = (data) => {
    console.log('Saving proposal:', data);
    handleBack();
  };

  return (
    <ProposalDetailPage
      proposal={proposal}
      onBack={handleBack}
      onSave={handleSave}
      darkMode={darkMode}
    />
  );
}
