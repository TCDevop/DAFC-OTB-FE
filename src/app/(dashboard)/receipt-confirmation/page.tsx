'use client';
import { useAppContext } from '@/contexts/AppContext';
import ReceiptConfirmationScreen from '@/screens/ReceiptConfirmationScreen';

export default function ReceiptConfirmationPage() {
  const { darkMode } = useAppContext();
  return <ReceiptConfirmationScreen darkMode={darkMode} />;
}
