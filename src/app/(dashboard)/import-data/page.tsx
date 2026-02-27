'use client';
import { useAppContext } from '@/contexts/AppContext';
import ImportDataScreen from '@/screens/ImportDataScreen';

export default function ImportDataPage() {
  const { darkMode } = useAppContext();
  return <ImportDataScreen darkMode={darkMode} />;
}
