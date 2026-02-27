'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import ProfileScreen from '@/screens/ProfileScreen';

export default function ProfilePage() {
  const { user } = useAuth();
  const { darkMode } = useAppContext();
  return <ProfileScreen user={user} darkMode={darkMode} />;
}
