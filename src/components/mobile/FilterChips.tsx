// src/components/mobile/FilterChips.tsx
'use client';

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER CHIPS COMPONENT
// Compact filter display with active states
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilterChip {
  key: string;
  label: string;
  value?: string;
  icon?: string;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  activeValues: Record<string, string | string[]>;
  onChipPress: (key: string) => void;
  onMorePress: () => void;
  moreLabel?: string;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  activeValues,
  onChipPress,
  onMorePress,
  moreLabel = 'More',
  className = '',
}) => {
  const getChipLabel = (chip: FilterChip): string => {
    const value = activeValues[chip.key];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return chip.label;
    }
    if (Array.isArray(value)) {
      return value.length === 1 ? value[0] : `${chip.label} (${value.length})`;
    }
    return value;
  };

  const isActive = (key: string): boolean => {
    const value = activeValues[key];
    return !!(value && (!Array.isArray(value) || value.length > 0));
  };

  const activeCount = Object.values(activeValues).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined
  ).length;

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 ${className}`}>
      {chips.map((chip) => {
        const active = isActive(chip.key);
        return (
          <button
            key={chip.key}
            onClick={() => onChipPress(chip.key)}
            className={`
              flex items-center gap-1.5 px-3 h-11 rounded-xl
              text-[13px] font-medium whitespace-nowrap
              transition-all duration-200
              flex-shrink-0
              ${active
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-gray-100 text-gray-700'
              }
            `}
          >
            {chip.icon && <span>{chip.icon}</span>}
            <span>{getChipLabel(chip)}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${active ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        );
      })}

      {/* More button */}
      <button
        onClick={onMorePress}
        className="
          flex items-center gap-1.5 px-3 h-9 rounded-xl
          bg-gray-100
          text-gray-700
          text-[13px] font-medium whitespace-nowrap
          flex-shrink-0
          transition-all duration-200
        "
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        {moreLabel}
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export interface FloatingActionButtonProps {
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'extended';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  variant = 'primary',
  size = 'default',
  className = '',
}) => {
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
    'bottom-left': 'left-4',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/40',
    secondary: 'bg-white text-gray-900 shadow-xl border border-gray-200',
  };

  const defaultIcon = (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 ${positionClasses[position]}
        ${size === 'extended' ? 'px-6 h-14 rounded-full' : 'w-14 h-14 rounded-2xl'}
        ${variantClasses[variant]}
        flex items-center justify-center gap-2
        z-50
        transition-all duration-200
        active:scale-95
        safe-area-bottom
        ${className}
      `}
      style={{
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
      }}
    >
      {icon || defaultIcon}
      {label && size === 'extended' && (
        <span className="text-[15px] font-semibold">{label}</span>
      )}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH BAR MOBILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  autoFocus = false,
  className = '',
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="
          w-full h-11 pl-10 pr-10
          bg-gray-100
          rounded-xl
          text-[15px] text-gray-900
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-amber-500/50
          transition-all duration-200
        "
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center"
        >
          <svg
            className="w-3 h-3 text-gray-600"
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
      )}
    </form>
  );
};

export default FilterChips;
