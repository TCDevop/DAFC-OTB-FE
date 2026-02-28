'use client';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsScreen } from '@/features/settings';

export default function SettingsPage() {
  const { user } = useAuth();
  return <SettingsScreen user={user} />;
}
