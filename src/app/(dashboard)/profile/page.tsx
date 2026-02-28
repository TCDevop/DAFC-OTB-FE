'use client';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileScreen } from '@/features/profile';

export default function ProfilePage() {
  const { user } = useAuth();
  return <ProfileScreen user={user} />;
}
