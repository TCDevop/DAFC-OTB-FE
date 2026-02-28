'use client';
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';

const SNAP_POINTS: any = { quarter: 0.25, half: 0.5, full: 0.9 };

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoint = 'full',
  showHandle = true,
}: any) {
  const sheetHeight = typeof window !== 'undefined'
    ? window.innerHeight * SNAP_POINTS[snapPoint]
    : 500;

  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, sheetHeight], [1, 0]);
  const dragControls = useDragControls();

  const handleDragEnd = useCallback((_: any, info: any) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ opacity }}
          />

          {/* Sheet */}
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-2xl overflow-hidden flex flex-col bg-white`}
            style={{
              maxHeight: `${SNAP_POINTS[snapPoint] * 100}vh`,
              y,
              boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div
                className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e: any) => dragControls.start(e)}
              >
                <div className={`w-10 h-1 rounded-full bg-gray-300`} />
              </div>
            )}

            {/* Title */}
            {title && (
              <div className={`px-5 pb-3 border-b border-gray-200`}>
                <h3 className={`text-base font-semibold font-['Montserrat'] text-gray-900`}>
                  {title}
                </h3>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
