'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import TicketDetailPage from '@/screens/TicketDetailPage';

export default function TicketDetailRoute() {
  const router = useRouter();
  const { darkMode } = useAppContext();
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedTicket');
    if (stored) {
      setTicket(JSON.parse(stored));
    }
  }, []);

  const handleBack = () => {
    sessionStorage.removeItem('selectedTicket');
    router.push('/tickets');
  };

  return (
    <TicketDetailPage
      darkMode={darkMode}
      ticket={ticket}
      onBack={handleBack}
    />
  );
}
