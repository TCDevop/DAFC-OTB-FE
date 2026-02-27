'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import TicketDetailPage from '@/screens/TicketDetailPage';

export default function TicketDetailRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { darkMode } = useAppContext();
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
      darkMode={darkMode}
      ticket={ticket}
      onBack={handleBack}
      showApprovalActions={showApprovalActions}
    />
  );
}
