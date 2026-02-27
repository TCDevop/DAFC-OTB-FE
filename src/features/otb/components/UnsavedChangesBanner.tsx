'use client';

import { useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnsavedChangesBannerProps {
  isDirty: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  saving?: boolean;
  darkMode?: boolean;
}

const UnsavedChangesBanner = ({
  isDirty,
  onSaveDraft,
  onDiscard,
  saving = false,
  darkMode = false,
}: UnsavedChangesBannerProps) => {
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isDirty) return null;

  return (
    <>
      {/* Fixed bottom banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between border-t backdrop-blur-sm ${
          darkMode
            ? 'bg-[#1A1A1A]/95 border-[#E3B341]/30'
            : 'bg-white/95 border-[#E3B341]/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#E3B341] shrink-0" />
          <span
            className={`text-xs font-medium ${
              darkMode ? 'text-[#E3B341]' : 'text-[#6B4D30]'
            }`}
          >
            {t('planning.youHaveUnsavedChanges')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              darkMode
                ? 'text-[#999] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]'
                : 'text-[#666] hover:text-[#F85149] hover:bg-red-50'
            }`}
          >
            {t('planning.discard')}
          </button>
          <button
            onClick={onSaveDraft}
            disabled={saving}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              darkMode
                ? 'bg-[rgba(18,119,73,0.2)] text-[#2A9E6A] hover:bg-[rgba(18,119,73,0.3)]'
                : 'bg-[rgba(18,119,73,0.12)] text-[#127749] hover:bg-[rgba(18,119,73,0.2)]'
            }`}
          >
            {saving ? (
              <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Save size={12} />
            )}
            <span className="hidden md:inline">{t('planning.saveDraft')}</span>
          </button>
        </div>
      </div>

      {/* Confirm discard dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm mx-4 rounded-xl border shadow-2xl p-5 ${
              darkMode
                ? 'bg-[#1A1A1A] border-[#2E2E2E]'
                : 'bg-white border-[#C4B5A5]'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-[#F85149]" />
              <h3
                className={`font-semibold font-['Montserrat'] ${
                  darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'
                }`}
              >
                {t('planning.discardChanges')}
              </h3>
            </div>
            <p
              className={`text-sm mb-4 ${
                darkMode ? 'text-[#999]' : 'text-[#666]'
              }`}
            >
              {t('planning.discardChangesDesc')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  darkMode
                    ? 'text-[#999] hover:bg-[rgba(215,183,151,0.08)]'
                    : 'text-[#666] hover:bg-[rgba(160,120,75,0.12)]'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDiscard();
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F85149] text-white hover:bg-[#F85149]/90 transition-colors"
              >
                {t('planning.discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnsavedChangesBanner;
