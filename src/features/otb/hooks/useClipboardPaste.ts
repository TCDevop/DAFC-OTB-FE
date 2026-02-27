'use client';

import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { parseSmartInput } from '../../../utils';

interface PasteResult {
  values: number[];
  rowCount: number;
}

/**
 * Handles pasting tab-separated values (Excel) into allocation cells.
 * When a [data-alloc-cell] input is focused and user pastes, the values
 * are distributed across consecutive cells starting from the focused one.
 */
export function useClipboardPaste(
  onPasteValues: (startIndex: number, values: number[]) => void,
  enabled = true,
) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!enabledRef.current) return;

      // Only handle paste when an allocation cell is focused
      const active = document.activeElement;
      if (!active || !(active as HTMLElement).hasAttribute('data-alloc-cell')) return;

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      // Parse tab/newline separated values (Excel copy format)
      const rawValues: string[] = [];
      text.split(/[\n\r]+/).forEach((line) => {
        line.split(/\t/).forEach((cell) => {
          const trimmed = cell.trim();
          if (trimmed) rawValues.push(trimmed);
        });
      });

      if (rawValues.length <= 1) return; // Single value — let browser handle normally

      e.preventDefault(); // Block default paste behavior

      const cells = Array.from(document.querySelectorAll<HTMLInputElement>('[data-alloc-cell]'));
      const startIdx = cells.indexOf(active as HTMLInputElement);
      if (startIdx < 0) return;

      const parsed: number[] = [];
      rawValues.forEach((raw) => {
        const val = parseSmartInput(raw);
        parsed.push(val !== null ? val : 0);
      });

      onPasteValues(startIdx, parsed);
      toast.success(`Pasted ${parsed.length} values`);
    },
    [onPasteValues],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);
}

export default useClipboardPaste;
