'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Empty State Component
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Inbox, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const EmptyState = ({
  darkMode = true,
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction
}) => {
  const { t } = useLanguage();
  const resolvedTitle = title || t('components.emptyTitle');
  const resolvedMessage = message || t('components.emptyMessage');
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${
      darkMode ? 'text-slate-300' : 'text-slate-700'
    }`}>
      <div className={`p-6 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} mb-4`}>
        <Icon size={40} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{resolvedTitle}</h3>
      <p className={`text-sm text-center max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {resolvedMessage}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-4 py-2 bg-[#D7B797] hover:bg-[#c9a27a] text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
