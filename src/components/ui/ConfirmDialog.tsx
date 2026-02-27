'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  darkMode?: boolean;
  promptPlaceholder?: string;
  promptRequired?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  darkMode = true,
  promptPlaceholder,
  promptRequired,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const hasPrompt = !!promptPlaceholder || !!promptRequired;
  const canConfirm = !promptRequired || inputValue === promptRequired;

  useEffect(() => {
    if (!open) { setInputValue(''); return; }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const dm = darkMode;
  const isDanger = variant === 'danger';

  const iconBg = isDanger
    ? (dm ? 'bg-[rgba(248,81,73,0.12)]' : 'bg-red-50')
    : (dm ? 'bg-[rgba(215,183,151,0.12)]' : 'bg-amber-50');
  const iconColor = isDanger
    ? (dm ? 'text-[#FF7B72]' : 'text-red-500')
    : (dm ? 'text-[#D7B797]' : 'text-amber-500');
  const confirmBtnCls = isDanger
    ? (dm
        ? 'bg-[#F85149] hover:bg-[#da4540] text-white'
        : 'bg-red-600 hover:bg-red-700 text-white')
    : (dm
        ? 'bg-[#D7B797] hover:bg-[#C9A787] text-[#1A1A1A]'
        : 'bg-[#6B4D30] hover:bg-[#5A3E25] text-white');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-sm mx-4 rounded-2xl border overflow-hidden ${
          dm ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.3)]'
        }`}
        style={{ boxShadow: dm
          ? '0 25px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(215,183,151,0.06)'
          : '0 25px 60px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(215,183,151,0.08)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${
            dm ? 'hover:bg-[rgba(255,255,255,0.08)]' : 'hover:bg-gray-100'
          }`}
        >
          <X size={16} className={dm ? 'text-[#666]' : 'text-gray-400'} />
        </button>

        {/* Content */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>
            <AlertTriangle size={22} className={iconColor} />
          </div>
          {title && (
            <h3 className={`text-base font-bold font-['Montserrat'] mb-1.5 ${dm ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm leading-relaxed ${dm ? 'text-[#999]' : 'text-gray-600'}`}>
            {message}
          </p>

          {/* Prompt input */}
          {hasPrompt && (
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) onConfirm(inputValue); }}
              placeholder={promptPlaceholder || (promptRequired ? `Type "${promptRequired}" to confirm` : '')}
              className={`mt-3 w-full px-3 py-2 text-sm rounded-lg border text-center focus:outline-none focus:ring-1 ${
                dm
                  ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#555] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                  : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
              }`}
            />
          )}
        </div>

        {/* Actions */}
        <div className={`px-6 pb-5 flex gap-3`}>
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              dm
                ? 'border-[#2E2E2E] text-[#999] hover:bg-[rgba(255,255,255,0.05)]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hasPrompt ? inputValue : undefined)}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${confirmBtnCls} ${
              !canConfirm ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
