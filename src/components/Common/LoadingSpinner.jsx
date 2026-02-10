'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Loading Spinner Component
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const LoadingSpinner = ({ darkMode = true, size = 'md', message }) => {
  const { t } = useLanguage();
  const resolvedMessage = message !== undefined ? message : t('components.loadingMessage');
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`${sizes[size]} rounded-full border-t-[#D7B797] border-r-transparent border-b-transparent border-l-transparent animate-spin`}
        style={{ borderStyle: 'solid' }}
      />
      {resolvedMessage && (
        <p className={`mt-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {resolvedMessage}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
