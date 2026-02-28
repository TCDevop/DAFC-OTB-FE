// src/hooks/useMobile.ts
'use client';

import { useState, useCallback } from 'react';

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
