'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import TicketScreen from '@/screens/TicketScreen';

export default function TicketsPage() {
  const router = useRouter();
  const { darkMode } = useAppContext();

  const handleOpenTicketDetail = (ticket) => {
    sessionStorage.setItem('selectedTicket', JSON.stringify(ticket));
    router.push(`/tickets/${ticket.id || ticket._id || 'detail'}`);
  };

  return (
    <TicketScreen
      onOpenTicketDetail={handleOpenTicketDetail}
      darkMode={darkMode}
    />
  );
}
