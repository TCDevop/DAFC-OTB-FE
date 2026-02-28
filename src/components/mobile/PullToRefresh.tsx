// src/components/mobile/PullToRefresh.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// PULL TO REFRESH COMPONENT
// Native-like pull to refresh gesture
// ═══════════════════════════════════════════════════════════════════════════════

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  className = '',
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  const checkIfAtTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;

    // Check if scrolled to top — also check the parent #main-scroll element
    // because container.scrollTop may always be 0 when actual scroll happens
    // in a parent element
    if (container.scrollTop > 0) return false;
    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll && mainScroll.scrollTop > 0) return false;
    return true;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    isAtTop.current = checkIfAtTop();
    if (!isAtTop.current) return;

    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing, checkIfAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isPulling || !isAtTop.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0) {
      // Apply resistance
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, maxPull);
      setPullDistance(distance);

      // Prevent scroll
      if (distance > 0) {
        e.preventDefault();
      }
    }
  }, [disabled, isRefreshing, isPulling, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep some pull distance during refresh

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh]);

  // Attach touch listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 180;
  const opacity = Math.min(pullProgress * 1.5, 1);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          top: -48,
          transform: `translateY(${pullDistance}px)`,
          opacity,
          transition: isPulling ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          {isRefreshing ? (
            <svg
              className="w-5 h-5 text-amber-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-amber-500"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isPulling ? 'none' : 'transform 0.3s ease',
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
