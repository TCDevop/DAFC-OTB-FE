'use client';
import { useAppContext } from '@/contexts/AppContext';
import OrderConfirmationScreen from '@/screens/OrderConfirmationScreen';

export default function OrderConfirmationPage() {
  const { darkMode } = useAppContext();
  return <OrderConfirmationScreen darkMode={darkMode} />;
}
