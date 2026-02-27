'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'otb_draft_';
const DEBOUNCE_MS = 2000; // Save to localStorage every 2s max

interface DraftData {
  allocationValues: Record<string, any>;
  seasonTotalValues: Record<string, any>;
  brandTotalValues: Record<string, any>;
  savedAt: string;
  budgetId: string;
}

interface SessionRecoveryState {
  hasDraft: boolean;
  draftInfo: { savedAt: string; changeCount: number } | null;
}

// ─── Generic version (UX-21) ────────────────────────────────────────────────
// Works with any serialisable data type. Caller supplies a storage key and an
// optional function to count "fields changed" (used in the recovery banner).

interface GenericDraft<T> {
  payload: T;
  savedAt: string;
}

/**
 * Generic session-recovery hook.
 * @param key   sessionStorage / localStorage key (pass null to disable)
 * @param opts  optional `countFields` to derive a change-count from the payload
 */
export function useSessionRecoveryGeneric<T>(
  key: string | null,
  opts?: { countFields?: (data: T) => number },
) {
  const [recovery, setRecovery] = useState<SessionRecoveryState>({
    hasDraft: false,
    draftInfo: null,
  });
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = key ? `${STORAGE_PREFIX}${key}` : null;

  // Check for existing draft on mount / key change
  useEffect(() => {
    if (!storageKey) {
      setRecovery({ hasDraft: false, draftInfo: null });
      return;
    }
    setDismissed(false);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data: GenericDraft<T> = JSON.parse(raw);
        const changeCount = opts?.countFields
          ? opts.countFields(data.payload)
          : 1; // default: "1 draft" if anything is stored
        if (changeCount > 0) {
          setRecovery({
            hasDraft: true,
            draftInfo: { savedAt: data.savedAt, changeCount },
          });
        } else {
          setRecovery({ hasDraft: false, draftInfo: null });
        }
      }
    } catch {
      setRecovery({ hasDraft: false, draftInfo: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save draft (debounced)
  const saveDraft = useCallback(
    (payload: T) => {
      if (!storageKey) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const data: GenericDraft<T> = {
            payload,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          // localStorage might be full — ignore silently
        }
      }, DEBOUNCE_MS);
    },
    [storageKey],
  );

  // Recover draft
  const recoverDraft = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data: GenericDraft<T> = JSON.parse(raw);
        localStorage.removeItem(storageKey);
        setRecovery({ hasDraft: false, draftInfo: null });
        setDismissed(true);
        return data.payload;
      }
    } catch { /* ignore */ }
    return null;
  }, [storageKey]);

  // Dismiss banner without recovering
  const dismissDraft = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    setRecovery({ hasDraft: false, draftInfo: null });
    setDismissed(true);
  }, [storageKey]);

  // Clear draft (e.g. after successful save)
  const clearDraft = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    setRecovery({ hasDraft: false, draftInfo: null });
  }, [storageKey]);

  return {
    hasDraft: recovery.hasDraft && !dismissed,
    draftInfo: recovery.draftInfo,
    saveDraft,
    recoverDraft,
    dismissDraft,
    clearDraft,
  };
}

// ─── Budget-allocation-specific version (original API, unchanged) ───────────

export function useSessionRecovery(budgetId: string | null) {
  const [recovery, setRecovery] = useState<SessionRecoveryState>({
    hasDraft: false,
    draftInfo: null,
  });
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = budgetId ? `${STORAGE_PREFIX}${budgetId}` : null;

  // Check for existing draft on mount / budgetId change
  useEffect(() => {
    if (!storageKey) {
      setRecovery({ hasDraft: false, draftInfo: null });
      return;
    }
    setDismissed(false);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data: DraftData = JSON.parse(raw);
        const changeCount =
          Object.keys(data.allocationValues || {}).length +
          Object.keys(data.seasonTotalValues || {}).length +
          Object.keys(data.brandTotalValues || {}).length;

        if (changeCount > 0) {
          setRecovery({
            hasDraft: true,
            draftInfo: { savedAt: data.savedAt, changeCount },
          });
        } else {
          setRecovery({ hasDraft: false, draftInfo: null });
        }
      }
    } catch {
      setRecovery({ hasDraft: false, draftInfo: null });
    }
  }, [storageKey]);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(
    (allocationValues: Record<string, any>, seasonTotalValues: Record<string, any>, brandTotalValues: Record<string, any>) => {
      if (!storageKey) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const data: DraftData = {
            allocationValues,
            seasonTotalValues,
            brandTotalValues,
            savedAt: new Date().toISOString(),
            budgetId: budgetId!,
          };
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          // localStorage might be full — ignore silently
        }
      }, DEBOUNCE_MS);
    },
    [storageKey, budgetId],
  );

  // Recover draft data
  const recoverDraft = useCallback((): DraftData | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data: DraftData = JSON.parse(raw);
        localStorage.removeItem(storageKey);
        setRecovery({ hasDraft: false, draftInfo: null });
        setDismissed(true);
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [storageKey]);

  // Dismiss recovery banner without recovering
  const dismissDraft = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    setRecovery({ hasDraft: false, draftInfo: null });
    setDismissed(true);
  }, [storageKey]);

  // Clear draft after successful API save
  const clearDraft = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    setRecovery({ hasDraft: false, draftInfo: null });
  }, [storageKey]);

  return {
    hasDraft: recovery.hasDraft && !dismissed,
    draftInfo: recovery.draftInfo,
    saveDraft,
    recoverDraft,
    dismissDraft,
    clearDraft,
  };
}

export default useSessionRecovery;
