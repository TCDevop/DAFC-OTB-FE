'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import SKUProposalScreen from '@/screens/SKUProposalScreen';
import ProposalDetailPage from '@/screens/ProposalDetailPage';

export default function ProposalPage() {
  const router = useRouter();
  const { darkMode, skuProposalContext, setSkuProposalContext } = useAppContext();

  const [showDetail, setShowDetail] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const handleCreateProposal = (proposal) => {
    setSelectedProposal(proposal);
    setShowDetail(true);
  };

  const handleEditProposal = (proposal) => {
    setSelectedProposal(proposal);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedProposal(null);
  };

  const handleSaveProposal = (data) => {
    console.log('Saving proposal:', data);
    handleCloseDetail();
  };

  if (showDetail) {
    return (
      <ProposalDetailPage
        proposal={selectedProposal}
        onBack={handleCloseDetail}
        onSave={handleSaveProposal}
        darkMode={darkMode}
      />
    );
  }

  return (
    <SKUProposalScreen
      onCreateProposal={handleCreateProposal}
      onEditProposal={handleEditProposal}
      skuContext={skuProposalContext}
      onContextUsed={() => setSkuProposalContext(null)}
      darkMode={darkMode}
    />
  );
}
