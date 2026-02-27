'use client';
import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, X } from 'lucide-react';

const SWIPE_THRESHOLD = 80;

export default function SwipeAction({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Approve',
  leftLabel = 'Reject',
  rightColor = '#127749',
  leftColor = '#F85149',
  darkMode = true,
  disabled = false,
}: any) {
  const x = useMotionValue(0);
  const constraintsRef = useRef<any>(null);
  const [swiping, setSwiping] = useState<any>(null);

  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (disabled) return;
    if (info.offset.x > SWIPE_THRESHOLD && onSwipeRight) {
      setSwiping('right');
      onSwipeRight();
      setTimeout(() => setSwiping(null), 300);
    } else if (info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft) {
      setSwiping('left');
      onSwipeLeft();
      setTimeout(() => setSwiping(null), 300);
    }
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-xl">
      {/* Right action (swipe right = approve) */}
      {onSwipeRight && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center px-5 rounded-l-xl"
          style={{ backgroundColor: rightColor, opacity: rightOpacity }}
        >
          <div className="flex items-center gap-2 text-white">
            <Check size={20} />
            <span className="text-sm font-semibold font-['Montserrat']">{rightLabel}</span>
          </div>
        </motion.div>
      )}

      {/* Left action (swipe left = reject) */}
      {onSwipeLeft && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center px-5 rounded-r-xl"
          style={{ backgroundColor: leftColor, opacity: leftOpacity }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-semibold font-['Montserrat']">{leftLabel}</span>
            <X size={20} />
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        className="relative z-10"
        style={{ x }}
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: onSwipeLeft ? -150 : 0, right: onSwipeRight ? 150 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
