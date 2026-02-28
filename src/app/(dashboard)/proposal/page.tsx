'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { SKUProposalScreen, ProposalDetailPage } from '@/features/otb';
import ProposalTicketReview from '@/features/otb/components/ProposalTicketReview';

export default function ProposalPage() {
  const router = useRouter();
  const { skuProposalContext, setSkuProposalContext } = useAppContext();

  const [showDetail, setShowDetail] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  const handleCreateProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setShowDetail(true);
  };

  const handleEditProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedProposal(null);
  };

  const handleSaveProposal = (_data: any) => {
    handleCloseDetail();
  };

  const handleSubmitTicket = (data: any) => {
    setReviewData(data);
  };

  // Review screen
  if (reviewData) {
    return (
      <ProposalTicketReview
        reviewData={reviewData}
        onBack={() => setReviewData(null)}
        onSubmitted={() => {
          setReviewData(null);
          router.push('/tickets');
        }}
      />
    );
  }

  if (showDetail) {
    return (
      <ProposalDetailPage
        proposal={selectedProposal}
        onBack={handleCloseDetail}
        onSave={handleSaveProposal}
      />
    );
  }

  return (
    <SKUProposalScreen
      onCreateProposal={handleCreateProposal}
      onEditProposal={handleEditProposal}
      onSubmitTicket={handleSubmitTicket}
      skuContext={skuProposalContext}
      onContextUsed={() => setSkuProposalContext(null)}
    />
  );
}
