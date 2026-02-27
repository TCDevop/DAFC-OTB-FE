// src/hooks/useMobile.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE DETECTION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseMobileOptions {
  breakpoint?: number;
  defaultValue?: boolean;
}

export const useIsMobile = (options: UseMobileOptions = {}): boolean => {
  const { breakpoint = 768, defaultValue = false } = options;
  const [isMobile, setIsMobile] = useState(defaultValue);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SWIPE GESTURE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwipeDirection {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface UseSwipeResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  offset: { x: number; y: number };
  direction: SwipeDirection;
  isSwiping: boolean;
}

export const useSwipe = (options: UseSwipeOptions = {}): UseSwipeResult => {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [direction, setDirection] = useState<SwipeDirection>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const startPos = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(true);
    setDirection({ left: false, right: false, up: false, down: false });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;

    setOffset({ x: deltaX, y: deltaY });

    setDirection({
      left: deltaX < -threshold,
      right: deltaX > threshold,
      up: deltaY < -threshold,
      down: deltaY > threshold,
    });
  }, [isSwiping, threshold]);

  const onTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    const { x, y } = offset;

    // Determine primary direction
    const isHorizontal = Math.abs(x) > Math.abs(y);

    if (isHorizontal) {
      if (x < -threshold) {
        onSwipeLeft?.();
      } else if (x > threshold) {
        onSwipeRight?.();
      }
    } else {
      if (y < -threshold) {
        onSwipeUp?.();
      } else if (y > threshold) {
        onSwipeDown?.();
      }
    }

    setIsSwiping(false);
    setOffset({ x: 0, y: 0 });
    setDirection({ left: false, right: false, up: false, down: false });
  }, [isSwiping, offset, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    offset,
    direction,
    isSwiping,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM SHEET HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseBottomSheetResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useBottomSheet = (initialState = false): UseBottomSheetResult => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCROLL LOCK HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (locked) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [locked]);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PULL TO REFRESH HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export interface UsePullToRefreshResult {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export const usePullToRefresh = (
  options: UsePullToRefreshOptions
): UsePullToRefreshResult => {
  const { onRefresh, threshold = 80, maxPull = 120 } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      const distance = Math.min(deltaY * 0.5, maxPull);
      setPullDistance(distance);
    }
  }, [isPulling, isRefreshing, maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(60);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK HOOK (for devices that support it)
// ═══════════════════════════════════════════════════════════════════════════════

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export const useHaptic = () => {
  const trigger = useCallback((type: HapticType = 'light') => {
    // Check if the Vibration API is available
    if ('vibrate' in navigator) {
      const patterns: Record<HapticType, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        selection: 5,
        success: [10, 50, 10],
        warning: [10, 100, 10],
        error: [30, 100, 30, 100, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  return { trigger };
};

export default useIsMobile;
