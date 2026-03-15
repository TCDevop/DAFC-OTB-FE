'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, ShieldCheck, KeySquare, ArrowLeft, LogOut, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { id: 'users',       label: 'Users',       path: '/admin/users',       icon: Users },
  { id: 'roles',       label: 'Roles',       path: '/admin/roles',       icon: Crown },
  { id: 'permissions', label: 'Permissions', path: '/admin/permissions', icon: KeySquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const isAdmin = user?.permissions?.includes('*');

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="h-screen flex items-center justify-center bg-[hsl(40,25%,96%)]">
        <div className="w-6 h-6 border-2 border-[#D7B797] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'hsl(40,25%,96%)' }}>
      {/* ── Admin Sidebar ── */}
      <div
        className="w-[220px] shrink-0 h-screen flex flex-col border-r"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%)',
          borderColor: '#D1D5DB',
        }}
      >
        {/* Header */}
        <div
          className="h-11 flex items-center px-3 gap-2 shrink-0"
          style={{
            borderBottom: '1px solid #D1D5DB',
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.12) 100%)',
          }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(160,120,75,0.15) 0%, rgba(160,120,75,0.28) 100%)' }}
          >
            <ShieldCheck size={13} className="text-[#6B4D30]" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold font-['Montserrat'] tracking-widest text-[#8A6340] leading-none">
              ADMIN PANEL
            </div>
            <div className="text-[9px] font-['JetBrains_Mono'] text-[#BBBBBB] leading-none mt-0.5">
              DAFC OTB System
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, path, icon: Icon }) => {
            const isActive = pathname === path || pathname.startsWith(path + '/');
            return (
              <button
                key={id}
                onClick={() => router.push(path)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150 text-left"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(215,183,151,0.08) 0%, rgba(215,183,151,0.18) 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(215,183,151,0.2)',
                } : undefined}
              >
                <Icon
                  size={14}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-150 ${isActive ? 'text-[#6B4D30]' : 'text-gray-500'}`}
                  style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(215,183,151,0.4))' } : undefined}
                />
                <span
                  className={`text-[12px] font-['Montserrat'] transition-colors duration-150 ${
                    isActive ? 'text-[#6B4D30] font-bold' : 'text-gray-600 font-medium'
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #D7B797 0%, #C49A6C 100%)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 space-y-1" style={{ borderTop: '1px solid #D1D5DB' }}>
          <button
            onClick={() => window.close()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-gray-600 hover:bg-[rgba(160,120,75,0.08)] hover:text-[#6B4D30]"
          >
            <ArrowLeft size={13} />
            <span className="text-[11px] font-medium font-['Montserrat']">Back to App</span>
          </button>

          {/* User info strip */}
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
            style={{ background: 'rgba(160,120,75,0.04)', border: '1px solid rgba(215,183,151,0.2)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-['Montserrat'] shrink-0"
              style={{ border: '1.5px solid #8A6340', color: '#8A6340' }}
            >
              {user?.name?.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold font-['Montserrat'] truncate text-[#0A0A0A]">{user?.name}</div>
              <div className="text-[9px] font-['JetBrains_Mono'] text-[#999999] truncate">{user?.email}</div>
            </div>
            <button
              onClick={() => { logout(); }}
              className="p-1 rounded-md hover:bg-red-50 text-[#BBBBBB] hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="h-11 shrink-0 flex items-center px-5 gap-3 border-b"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.06) 100%)',
            borderColor: '#D1D5DB',
          }}
        >
          <ShieldCheck size={14} className="text-[#6B4D30]" />
          <span className="text-xs font-bold font-['Montserrat'] text-[#3D2E22] tracking-wide">
            {NAV_ITEMS.find(n => pathname.startsWith(n.path))?.label ?? 'Admin'}
          </span>
          <span className="text-[10px] font-['JetBrains_Mono'] text-[#BBBBBB]">/ Administration</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
