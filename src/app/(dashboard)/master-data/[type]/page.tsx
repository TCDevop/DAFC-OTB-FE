'use client';
import { useParams } from 'next/navigation';
import { MasterDataScreen } from '@/features/master-data';

export default function MasterDataPage() {
  const params = useParams();
  return <MasterDataScreen type={params.type as string} />;
}
