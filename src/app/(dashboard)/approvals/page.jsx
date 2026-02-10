'use client';
import { useAppContext } from '@/contexts/AppContext';
import ApprovalsScreen from '@/screens/ApprovalsScreen';

export default function ApprovalsPage() {
  const { darkMode } = useAppContext();
  return <ApprovalsScreen darkMode={darkMode} />;
}
