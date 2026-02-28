'use client';
import { useRouter } from 'next/navigation';
import { TicketScreen } from '@/features/tickets';

export default function TicketsPage() {
  const router = useRouter();

  const handleOpenTicketDetail = (ticket: any) => {
    sessionStorage.setItem('selectedTicket', JSON.stringify(ticket));
    router.push(`/tickets/${ticket.id || ticket._id || 'detail'}`);
  };

  return (
    <TicketScreen
      onOpenTicketDetail={handleOpenTicketDetail}
    />
  );
}
