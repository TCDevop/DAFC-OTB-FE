'use client';
import { useAppContext } from '@/contexts/AppContext';
import DevTicketScreen from '@/screens/DevTicketScreen';

export default function DevTicketsPage() {
  const { darkMode } = useAppContext();
  return <DevTicketScreen darkMode={darkMode} />;
}
