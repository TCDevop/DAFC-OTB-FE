'use client';
import { useAppContext } from '@/contexts/AppContext';
import HomeScreen from '@/screens/HomeScreen';

export default function HomePage() {
  const { darkMode } = useAppContext();
  return <HomeScreen darkMode={darkMode} />;
}
