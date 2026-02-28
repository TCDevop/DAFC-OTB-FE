'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TicketDetailPage } from '@/features/tickets';

export default function TicketDetailRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ticket, setTicket] = useState<any>(null);
  const showApprovalActions = searchParams.get('source') === 'approvals';

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedTicket');
    if (stored) {
      setTicket(JSON.parse(stored));
    }
  }, []);

  const handleBack = () => {
    sessionStorage.removeItem('selectedTicket');
    router.push(showApprovalActions ? '/approvals' : '/tickets');
  };

  return (
    <TicketDetailPage
      ticket={ticket}
      onBack={handleBack}
      showApprovalActions={showApprovalActions}
    />
  );
}
