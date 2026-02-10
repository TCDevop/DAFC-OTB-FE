'use client';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import MasterDataScreen from '@/screens/MasterDataScreen';

export default function MasterDataPage() {
  const params = useParams();
  const { darkMode } = useAppContext();
  return <MasterDataScreen type={params.type} darkMode={darkMode} />;
}
