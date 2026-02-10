'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import SettingsScreen from '@/screens/SettingsScreen';

export default function SettingsPage() {
  const { user } = useAuth();
  const { darkMode, setDarkMode } = useAppContext();
  return <SettingsScreen darkMode={darkMode} setDarkMode={setDarkMode} user={user} />;
}
