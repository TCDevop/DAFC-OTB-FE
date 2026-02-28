'use client';
// ═══════════════════════════════════════════════════════════════════════════
// Loading Spinner Component
// ═══════════════════════════════════════════════════════════════════════════
import { useLanguage } from '@/contexts/LanguageContext';

const LoadingSpinner = ({ size = 'md', message }: any) => {
  const { t } = useLanguage();
  const resolvedMessage = message !== undefined ? message : t('components.loadingMessage');
  const sizes: any = {
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
        <p className={`mt-4 text-sm text-slate-500`}>
          {resolvedMessage}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
