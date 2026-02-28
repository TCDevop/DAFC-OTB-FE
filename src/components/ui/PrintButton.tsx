'use client';
import React from 'react';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// UX-20: Simple print button that triggers window.print()
export default function PrintButton({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const btnClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';

  return (
    <button
      onClick={() => window.print()}
      className={`no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${btnClass} ${className}`}
      title={t('common.print')}
    >
      <Printer size={14} />
      <span className="hidden sm:inline">{t('common.print')}</span>
    </button>
  );
}
