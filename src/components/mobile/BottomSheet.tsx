// src/components/mobile/BottomSheet.tsx
'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM SHEET COMPONENT
// Draggable filter sheet with smooth animations
// ═══════════════════════════════════════════════════════════════════════════════

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  closeOnBackdrop?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  height = 'auto',
  showHandle = true,
  closeOnBackdrop = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Lock body scroll when open (iOS-safe: use position: fixed)
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    currentY.current = 0;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || !sheetRef.current) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY.current;

    // Only allow dragging down
    if (deltaY > 0) {
      currentY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;

    isDragging.current = false;

    // Close if dragged more than 100px
    if (currentY.current > 100) {
      onClose();
    } else {
      sheetRef.current.style.transform = '';
    }

    currentY.current = 0;
  }, [onClose]);

  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  };

  if (!isOpen) return null;

  const sheetContent = (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]
          transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-[101]
          bg-white
          rounded-t-[28px]
          ${heightClasses[height]}
          shadow-2xl
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          cursor-grab active:cursor-grabbing touch-none
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag Handle (visual indicator) */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
            <h2
              id="bottom-sheet-title"
              className="text-[20px] font-bold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`
          px-5 py-4 overflow-y-auto
          ${height === 'auto' ? 'max-h-[60vh]' : 'flex-1'}
        `}>
          {children}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className="px-5 pb-8 pt-4 border-t border-gray-100 space-y-3 safe-area-bottom">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={`
                  w-full h-14 rounded-2xl
                  text-[17px] font-semibold
                  transition-all duration-150
                  active:scale-[0.98]
                  ${primaryAction.disabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30'
                  }
                `}
              >
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="
                  w-full h-12 rounded-2xl
                  bg-gray-100
                  text-gray-700
                  text-[15px] font-medium
                  active:scale-[0.98]
                  transition-all duration-150
                "
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  // Use portal to render at document body level
  if (typeof document !== 'undefined') {
    return createPortal(sheetContent, document.body);
  }

  return sheetContent;
};

// ─── Filter Bottom Sheet ────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSection {
  key: string;
  label: string;
  icon?: string;
  type: 'single' | 'multi';
  options: FilterOption[];
}

export interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSection[];
  values: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onApply: () => void;
  onReset: () => void;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  filters,
  values,
  onChange,
  onApply,
  onReset,
}) => {
  const activeCount = Object.values(values).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined
  ).length;

  const handleSingleSelect = (key: string, value: string) => {
    onChange(key, values[key] === value ? '' : value);
  };

  const handleMultiSelect = (key: string, value: string) => {
    const current = (values[key] as string[]) || [];
    if (current.includes(value)) {
      onChange(key, current.filter((v) => v !== value));
    } else {
      onChange(key, [...current, value]);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      primaryAction={{
        label: `Apply Filters${activeCount > 0 ? ` (${activeCount})` : ''}`,
        onClick: () => {
          onApply();
          onClose();
        },
      }}
      secondaryAction={{
        label: 'Reset All',
        onClick: () => {
          onReset();
          onClose();
        },
      }}
    >
      <div className="space-y-6">
        {filters.map((filter) => (
          <div key={filter.key}>
            <label className="text-[13px] font-medium text-gray-500 mb-2 block">
              {filter.icon && <span className="mr-1">{filter.icon}</span>}
              {filter.label}
            </label>

            {filter.type === 'single' ? (
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => {
                  const isSelected = values[filter.key] === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSingleSelect(filter.key, option.value)}
                      className={`
                        px-4 h-10 rounded-xl text-[14px] font-medium
                        transition-all duration-200
                        ${isSelected
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                          : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filter.options.map((option) => {
                  const selected = (values[filter.key] as string[]) || [];
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultiSelect(filter.key, option.value)}
                      className={`
                        h-11 rounded-xl text-[14px] font-medium
                        flex items-center justify-center gap-2
                        transition-all duration-200
                        ${isSelected
                          ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                          : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};

export default BottomSheet;
