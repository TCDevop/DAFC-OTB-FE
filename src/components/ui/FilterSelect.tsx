'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const isDefault = value === 'all' || value === '' || !selectedOption;
  // Show placeholder (filter name) when default, otherwise show selected value
  const displayLabel = isDefault ? placeholder : selectedOption?.label || placeholder;

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen((p) => !p);
      }
    },
    []
  );

  return (
    <div ref={containerRef} className={`relative group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((p) => !p)}
        onKeyDown={disabled ? undefined : handleKeyDown}
        disabled={disabled}
        className={`
          max-w-[180px] w-full flex items-center gap-1.5
          pl-3 pr-2.5 py-[7px]
          text-sm font-medium
          border rounded-lg
          transition-all duration-200
          outline-none
          ${isOpen
            ? 'bg-[rgba(215,183,151,0.06)] border-[#D7B797]/60 shadow-[0_0_0_1px_rgba(215,183,151,0.15)]'
            : !isDefault
              ? 'bg-[rgba(215,183,151,0.04)] border-[rgba(215,183,151,0.3)] hover:border-[rgba(215,183,151,0.5)]'
              : 'bg-white border-[#D4CCC2] hover:border-[#B8A998] hover:bg-[#FDFCFB]'
          }
        `}
      >
        {label && (
          <span
            className={`text-[10px] uppercase tracking-[0.08em] font-semibold shrink-0 transition-colors duration-200 ${
              isOpen
                ? 'text-[#6B4D30]'
                : 'text-[#999999] group-hover:text-[#666666]'
            }`}
          >
            {label}
          </span>
        )}
        <span
          className={`truncate text-left leading-tight flex-1 ${
            !isDefault
              ? 'text-[#1A1A1A]'
              : 'text-[#888888]'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180' : ''
          } ${
            isOpen
              ? 'text-[#6B4D30]'
              : 'text-[#AAAAAA]'
          }`}
        />
      </button>

      {/* Golden accent line — visible on open */}
      <div
        className={`absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(90deg, transparent, #B8996E, transparent)',
        }}
      />

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-1.5 z-[9999]
            min-w-full w-max
            rounded-lg overflow-hidden
            border
            bg-white border-[#D4CCC2]
          `}
          style={{
            boxShadow: '0 8px 32px rgba(107,77,48,0.08), 0 2px 8px rgba(107,77,48,0.06), inset 0 1px 0 rgba(215,183,151,0.15)',
          }}
        >
          {/* Golden top accent */}
          <div
            className="h-[1.5px]"
            style={{
              background: 'linear-gradient(90deg, transparent 5%, rgba(184,153,112,0.4) 50%, transparent 95%)',
            }}
          />

          <div className="filter-select-scroll max-h-[240px] overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-[6px]
                    text-sm transition-all duration-150
                    relative
                    ${isSelected
                      ? 'bg-[rgba(215,183,151,0.1)] text-[#6B4D30]'
                      : 'text-[#444444] hover:bg-[rgba(215,183,151,0.06)] hover:text-[#1A1A1A]'
                    }
                  `}
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'h-4 opacity-100'
                        : 'h-0 opacity-0'
                    }`}
                    style={{
                      background: '#8B6E4E',
                    }}
                  />

                  <span className={`flex-1 text-left truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                    {option.label}
                  </span>

                  {isSelected && (
                    <Check
                      size={13}
                      strokeWidth={2.5}
                      className={`shrink-0 text-[#6B4D30]`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(FilterSelect);
