'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/features/auth';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  // Show branded loading screen instead of black screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
        <p className="text-sm text-[#666666] font-['Montserrat']">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
        <p className="text-sm text-[#666666] font-['Montserrat']">Redirecting...</p>
      </div>
    );
  }

  return <LoginScreen />;
}
