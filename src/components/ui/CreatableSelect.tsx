'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

interface CreatableSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCreateOption?: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

function CreatableSelect({
  value,
  options,
  onChange,
  onCreateOption,
  placeholder = 'Select or type...',
  label,
  className = '',
  disabled = false,
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered options based on input
  const filtered = inputValue
    ? options.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  const showCreateOption =
    inputValue.trim() &&
    !options.some((o) => o.toLowerCase() === inputValue.trim().toLowerCase());

  // Position dropdown relative to trigger
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 160),
    });
  }, [isOpen]);

  // Click outside to close (check both container and portal dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
      setInputValue('');
    },
    [onChange]
  );

  const handleCreate = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onCreateOption?.(trimmed);
    onChange(trimmed);
    setIsOpen(false);
    setInputValue('');
  }, [inputValue, onChange, onCreateOption]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setInputValue('');
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (showCreateOption) {
          handleCreate();
        } else if (filtered.length === 1) {
          handleSelect(filtered[0]);
        }
      }
    },
    [showCreateOption, handleCreate, filtered, handleSelect]
  );

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const bg = 'bg-white';
  const border = 'border-[#D4CCC2]';
  const text = 'text-[#1A1A1A]';
  const textMuted = 'text-[#888888]';
  const hoverBg = 'hover:bg-[rgba(215,183,151,0.08)]';
  const dropBg = 'bg-white';
  const dropBorder = 'border-[#D4CCC2]';
  const accentText = 'text-[#6B4D30]';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div
          className={`text-[10px] uppercase tracking-[0.12em] font-semibold mb-1.5 font-['Montserrat'] text-[#999999]`}
        >
          {label}
        </div>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-[7px] text-sm font-medium border rounded-lg transition-colors duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${bg} ${border} ${hoverBg}`}
      >
        <span className={`truncate text-left ${value ? text : textMuted}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className={`p-0.5 rounded hover:bg-[rgba(248,81,73,0.15)] cursor-pointer ${textMuted}`}
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''} ${textMuted}`}
          />
        </div>
      </button>

      {/* Dropdown — rendered via portal to escape overflow:clip containers */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[9999] rounded-lg overflow-hidden border ${dropBg} ${dropBorder}`}
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            minWidth: dropdownPos.width,
            width: 'max-content',
            boxShadow: '0 8px 32px rgba(107,77,48,0.08), 0 2px 8px rgba(107,77,48,0.06)',
          }}
        >
          {/* Search input */}
          <div className={`px-2 py-1.5 border-b border-[#E8E0D8]`}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-2 py-1 text-sm rounded outline-none bg-[#FAFAF8] text-[#1A1A1A] placeholder-[#AAAAAA]`}
            />
          </div>

          {/* Options list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.map((option) => {
              const isSelected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full flex items-center gap-2.5 px-3 py-[6px] text-sm transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[rgba(215,183,151,0.1)] text-[#6B4D30]'
                      : 'text-[#444444] hover:bg-[rgba(215,183,151,0.06)] hover:text-[#1A1A1A]'
                  }`}
                >
                  <span className={`flex-1 text-left truncate ${isSelected ? 'font-semibold' : ''}`}>
                    {option}
                  </span>
                  {isSelected && <Check size={13} strokeWidth={2.5} className={accentText} />}
                </button>
              );
            })}

            {/* Create new option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className={`w-full flex items-center gap-2 px-3 py-[6px] text-sm font-medium transition-colors duration-150 text-[#127749] hover:bg-[rgba(18,119,73,0.06)]`}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Create &quot;{inputValue.trim()}&quot;</span>
              </button>
            )}

            {filtered.length === 0 && !showCreateOption && (
              <div className={`px-3 py-3 text-center text-xs ${textMuted}`}>No options found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default React.memo(CreatableSelect);
