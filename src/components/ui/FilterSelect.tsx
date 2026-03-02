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
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  icon: Icon,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const isDefault = value === 'all' || value === '' || !selectedOption;
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
      {label && (
        <label className="block text-[10px] uppercase tracking-[0.06em] font-bold mb-0.5 text-[#8A6340]">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((p) => !p)}
        onKeyDown={disabled ? undefined : handleKeyDown}
        disabled={disabled}
        className={`
          w-full px-2 py-1 flex items-center justify-between gap-1.5
          text-xs font-medium
          border rounded-md
          cursor-pointer
          transition-all duration-200
          outline-none
          ${isOpen
            ? 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30]'
            : !isDefault
              ? 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]'
              : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
          }
        `}
      >
        <span className="truncate min-w-0 flex items-center gap-1.5">
          {Icon && <Icon size={12} className="shrink-0 text-[#666666]" />}
          {displayLabel}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-1 z-[9999]
            min-w-full w-max
            rounded-lg overflow-hidden
            border
            bg-white border-[#C4B5A5]
            animate-slideDown
          `}
          style={{
            boxShadow: '0 8px 32px rgba(107,77,48,0.08), 0 2px 8px rgba(107,77,48,0.06)',
          }}
        >
          <div className="filter-select-scroll max-h-[240px] overflow-y-auto py-0.5">
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={`${option.value}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between gap-2.5 px-3 py-[5px]
                    text-sm transition-all duration-150
                    ${isSelected
                      ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                      : 'text-[#0A0A0A] hover:bg-[rgba(160,120,75,0.18)]'
                    }
                  `}
                >
                  <span className={`flex-1 text-left truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                    {option.label}
                  </span>

                  {isSelected && (
                    <Check
                      size={14}
                      className="shrink-0 text-[#127749]"
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
