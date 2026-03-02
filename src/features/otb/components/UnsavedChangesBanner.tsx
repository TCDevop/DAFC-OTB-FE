'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnsavedChangesBannerProps {
  isDirty: boolean;
}

const UnsavedChangesBanner = ({ isDirty }: UnsavedChangesBannerProps) => {
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isDirty) return null;

  return (
    <>
      {/* Fixed bottom banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between border-t backdrop-blur-sm bg-white/95 border-[#E3B341]/40`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#E3B341] shrink-0" />
          <span className="text-xs font-medium text-[#6B4D30]">
            {t('planning.youHaveUnsavedChanges')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors text-[#666] hover:text-[#F85149] hover:bg-red-50"
          >
            {t('planning.discard')}
          </button>
        </div>
      </div>

      {/* Confirm discard dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm mx-4 rounded-xl border shadow-2xl p-5 animate-scalePop bg-white border-[#C4B5A5]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-[#F85149]" />
              <h3 className="font-semibold font-['Montserrat'] text-[#0A0A0A]">
                {t('planning.discardChanges')}
              </h3>
            </div>
            <p className="text-sm mb-4 text-[#666]">
              {t('planning.discardChangesDesc')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors text-[#666] hover:bg-[rgba(160,120,75,0.12)]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  window.location.reload();
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
