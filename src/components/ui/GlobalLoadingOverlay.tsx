'use client';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GlobalLoadingOverlay() {
  const { loading } = useAppContext();
  const { t } = useLanguage();

  const displayMessage = loading.message ?? t('components.loadingMessage');

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {loading.visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-live="assertive"
          aria-busy="true"
          role="status"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Spinner card */}
          <motion.div
            className="relative flex flex-col items-center gap-4 px-8 py-6 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(215, 183, 151, 0.3)',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.2)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{
                border: '3px solid rgba(215, 183, 151, 0.2)',
                borderTopColor: '#D7B797',
              }}
            />
            {displayMessage && (
              <p className="text-sm font-medium text-gray-600 text-center max-w-[200px]">
                {displayMessage}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
