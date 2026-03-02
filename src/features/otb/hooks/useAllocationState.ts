'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// useAllocationState — manages allocation values, dirty tracking,
// validation for BudgetAllocateScreen
// ═══════════════════════════════════════════════════════════════════════════

/** VAL-01: Maximum percentage of total budget any single brand can consume */
export const BRAND_BUDGET_CAP_PCT = 0.8;

export interface ValidationIssue {
  type: 'error' | 'warning';
  key: string;
  message: string;
  params?: Record<string, string>;
}

interface AllocationSnapshot {
  allocationValues: Record<string, any>;
  seasonTotalValues: Record<string, any>;
  brandTotalValues: Record<string, any>;
  allocationComments: Record<string, string>;
}

const emptySnapshot: AllocationSnapshot = {
  allocationValues: {},
  seasonTotalValues: {},
  brandTotalValues: {},
  allocationComments: {},
};

const snapshotsEqual = (a: AllocationSnapshot, b: AllocationSnapshot) =>
  JSON.stringify(a) === JSON.stringify(b);

export function useAllocationState(t: (key: string, params?: any) => string) {
  // ── Editable state ────────────────────────────────────────────────────
  const [allocationValues, setAllocationValues] = useState<Record<string, any>>({});
  const [seasonTotalValues, setSeasonTotalValues] = useState<Record<string, any>>({});
  const [brandTotalValues, setBrandTotalValues] = useState<Record<string, any>>({});
  const [allocationComments, setAllocationComments] = useState<Record<string, string>>({});

  // ── Clean snapshot (point-in-time saved state) ────────────────────────
  const [cleanSnapshot, setCleanSnapshot] = useState<AllocationSnapshot>(emptySnapshot);

  // ── Current snapshot helper ───────────────────────────────────────────
  const currentSnapshot = useMemo<AllocationSnapshot>(
    () => ({ allocationValues, seasonTotalValues, brandTotalValues, allocationComments }),
    [allocationValues, seasonTotalValues, brandTotalValues, allocationComments],
  );

  // ── Dirty tracking ───────────────────────────────────────────────────
  const isDirty = useMemo(
    () => !snapshotsEqual(currentSnapshot, cleanSnapshot),
    [currentSnapshot, cleanSnapshot],
  );

  // ── Allocation change handlers ────────────────────────────────────────
  const handleAllocationChange = useCallback(
    (brandId: any, seasonGroup: any, subSeason: any, field: any, value: any) => {
      const key = `${brandId}-${seasonGroup}-${subSeason}`;
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
      setAllocationValues((prev: any) => ({
        ...prev,
        [key]: { ...prev[key], [field]: numValue },
      }));
    },
    [],
  );

  const handleSeasonTotalChange = useCallback(
    (brandId: any, seasonGroup: any, field: any, value: any) => {
      const key = `${brandId}-${seasonGroup}`;
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
      setSeasonTotalValues((prev: any) => ({
        ...prev,
        [key]: { ...prev[key], [field]: numValue },
      }));
    },
    [],
  );

  const handleBrandTotalChange = useCallback(
    (brandId: any, field: any, value: any) => {
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
      setBrandTotalValues((prev: any) => ({
        ...prev,
        [brandId]: { ...prev[brandId], [field]: numValue },
      }));
    },
    [],
  );

  const handleCommentChange = useCallback(
    (brandId: any, seasonGroup: any, subSeason: any, comment: string) => {
      const key = `${brandId}-${seasonGroup}-${subSeason}`;
      setAllocationComments((prev) => ({ ...prev, [key]: comment }));
    },
    [],
  );

  // ── Beforeunload warning when dirty ───────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Validation ────────────────────────────────────────────────────────
  const validate = useCallback(
    (totalBudget: number, totalAllocated: number, brandNames?: Record<string, string>): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];

      // Check over-budget
      if (totalBudget > 0 && totalAllocated > totalBudget) {
        const overAmount = totalAllocated - totalBudget;
        issues.push({
          type: 'error',
          key: 'overBudget',
          message: 'planning.errorOverBudget',
          params: { amount: overAmount.toLocaleString() },
        });
      }

      // Check negative values
      Object.entries(allocationValues).forEach(([key, storeValues]) => {
        if (storeValues && typeof storeValues === 'object') {
          Object.entries(storeValues).forEach(([field, val]) => {
            if (typeof val === 'number' && val < 0) {
              issues.push({
                type: 'error',
                key: `negative-${key}-${field}`,
                message: 'planning.errorNegativeValue',
                params: { field: `${key} / ${field}` },
              });
            }
          });
        }
      });

      // VAL-01: Per-brand budget cap — warn if any single brand exceeds BRAND_BUDGET_CAP_PCT
      if (totalBudget > 0) {
        const brandTotals: Record<string, number> = {};
        Object.entries(allocationValues).forEach(([key, storeValues]) => {
          const brandId = key.split('-')[0];
          if (!brandId) return;
          if (storeValues && typeof storeValues === 'object') {
            Object.values(storeValues).forEach((val) => {
              if (typeof val === 'number' && val > 0) {
                brandTotals[brandId] = (brandTotals[brandId] || 0) + val;
              }
            });
          }
        });

        const capPct = Math.round(BRAND_BUDGET_CAP_PCT * 100);
        Object.entries(brandTotals).forEach(([brandId, total]) => {
          const pct = Math.round((total / totalBudget) * 100);
          if (pct > capPct) {
            const brandLabel = brandNames?.[brandId] || brandId;
            issues.push({
              type: 'warning',
              key: `brandCap-${brandId}`,
              message: 'planning.brandBudgetCapWarning',
              params: { brand: brandLabel, pct: String(pct), cap: String(capPct) },
            });
          }
        });
      }

      // Check under-allocation warning
      if (totalBudget > 0 && totalAllocated > 0) {
        const pct = Math.round((totalAllocated / totalBudget) * 100);
        if (pct < 80) {
          issues.push({
            type: 'warning',
            key: 'underAllocation',
            message: 'planning.warningUnderAllocation',
            params: { pct: String(pct) },
          });
        }
      }

      // No allocation at all
      if (totalBudget > 0 && totalAllocated === 0 && Object.keys(allocationValues).length === 0) {
        issues.push({
          type: 'warning',
          key: 'noAllocation',
          message: 'planning.warningNoAllocation',
        });
      }

      return issues;
    },
    [allocationValues],
  );

  // ── Discard changes ───────────────────────────────────────────────────
  const discardChanges = useCallback(() => {
    setAllocationValues(cleanSnapshot.allocationValues);
    setSeasonTotalValues(cleanSnapshot.seasonTotalValues);
    setBrandTotalValues(cleanSnapshot.brandTotalValues);
    setAllocationComments(cleanSnapshot.allocationComments);
  }, [cleanSnapshot]);

  // ── Mark current state as clean (after external save) ─────────────────
  const markClean = useCallback(() => {
    setCleanSnapshot({ allocationValues, seasonTotalValues, brandTotalValues, allocationComments });
  }, [allocationValues, seasonTotalValues, brandTotalValues, allocationComments]);

  return {
    // State
    allocationValues,
    setAllocationValues,
    seasonTotalValues,
    setSeasonTotalValues,
    brandTotalValues,
    setBrandTotalValues,
    allocationComments,
    setAllocationComments,
    // Handlers
    handleAllocationChange,
    handleSeasonTotalChange,
    handleBrandTotalChange,
    handleCommentChange,
    // Dirty
    isDirty,
    discardChanges,
    markClean,
    // Validation
    validate,
  };
}

export default useAllocationState;
