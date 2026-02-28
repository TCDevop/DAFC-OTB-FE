'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { budgetService } from '@/services';

// ═══════════════════════════════════════════════════════════════════════════
// useBudgetAllocateSave
// Handles Save and Save-as-New for budget allocations.
//
// Save      → PUT  /budgets/allocations/:headerId   (overwrite existing rows)
// SaveAsNew → POST /budgets/:budgetId/allocations   (create new header version)
//
// ID lookup priority for (seasonGroupId, seasonId):
//   1. allocateHeaders.budget_allocates  — existing DB rows already have IDs
//   2. seasonGroups master data          — covers cells not yet in DB
// ═══════════════════════════════════════════════════════════════════════════

interface Store {
  id: string;    // store code lowercase — key used in allocationValues
  dbId: number;  // DB numeric id — sent to API
}

interface Season {
  id: number;
  name: string;
}

interface SeasonGroup {
  id: number;
  name: string;
  seasons?: Season[];
}

interface Brand {
  id: any;
}

interface UseBudgetAllocateSaveOptions {
  budgetId: any;
  displayBrands: Brand[];
  allocateHeaders: any[];    // full headers with budget_allocates (store/season_group/season)
  brandVersionMap: Record<string, any>;   // brand.id (string key) → headerId
  allocationValues: Record<string, any>;  // "brandId-sgName-seasonName" → { storeCode: amount }
  stores: Store[];
  seasonGroups: SeasonGroup[];            // master season groups with seasons (for new rows)
  onSaved?: (results: any[]) => void;
}

// Find headerId for a brand — tolerates string/number key mismatch
function findHeaderId(brandVersionMap: Record<string, any>, brandId: any): any {
  const direct = brandVersionMap[String(brandId)];
  if (direct !== undefined) return direct;
  const numId = Number(brandId);
  for (const k of Object.keys(brandVersionMap)) {
    if (Number(k) === numId) return brandVersionMap[k];
  }
  return undefined;
}

// Build a "sgName|||seasonName" → { sgId, seasonId } lookup map.
// Merges existing DB rows (allocateHeaders) and master data (seasonGroups) so that
// both already-saved cells and brand-new cells can be included in the save payload.
function buildNameToIdMap(
  header: any,
  seasonGroups: SeasonGroup[],
): Map<string, { sgId: string; seasonId: string }> {
  // Key separator that won't appear in normal names
  const SEP = '|||';
  const map = new Map<string, { sgId: string; seasonId: string }>();

  // 1. From existing header records (most authoritative — IDs come directly from DB)
  (header?.budget_allocates ?? []).forEach((a: any) => {
    const sgName: string = a.season_group?.name ?? String(a.season_group_id);
    const seasonName: string = a.season?.name ?? String(a.season_id);
    map.set(`${sgName}${SEP}${seasonName}`, {
      sgId: String(a.season_group_id),
      seasonId: String(a.season_id),
    });
  });

  // 2. From seasonGroups master data (covers cells not yet in DB)
  for (const sg of seasonGroups) {
    for (const season of sg.seasons ?? []) {
      const k = `${sg.name}${SEP}${season.name}`;
      if (!map.has(k)) {
        map.set(k, { sgId: String(sg.id), seasonId: String(season.id) });
      }
    }
  }

  return map;
}

export function useBudgetAllocateSave({
  budgetId,
  displayBrands,
  allocateHeaders,
  brandVersionMap,
  allocationValues,
  stores,
  seasonGroups,
  onSaved,
}: UseBudgetAllocateSaveOptions) {
  const [saving, setSaving] = useState(false);

  // Convert allocationValues for a brand into the API payload.
  // Uses nameToIdMap to resolve season IDs for both existing and new cells.
  const buildAllocations = useCallback(
    (brandId: any, headerId: any) => {
      const header = allocateHeaders.find((h: any) =>
        h.id === headerId || Number(h.id) === Number(headerId)
      );

      const nameToId = buildNameToIdMap(header, seasonGroups);

      const allocations: {
        storeId: string;
        seasonGroupId: string;
        seasonId: string;
        budgetAmount: number;
      }[] = [];

      const prefix = `${brandId}-`;

      for (const [allocKey, storeValues] of Object.entries(allocationValues)) {
        if (!allocKey.startsWith(prefix)) continue;
        if (!storeValues || typeof storeValues !== 'object') continue;

        // allocKey = "brandId-sgName-seasonName"
        // Strip brandId prefix to get "sgName-seasonName"
        const sgAndSeason = allocKey.slice(prefix.length);

        // Find the matching entry in nameToId map
        // We try each season group name as a possible prefix
        let ids: { sgId: string; seasonId: string } | undefined;

        // Try direct lookup by iterating nameToId (handles multi-word season group names)
        for (const [nameKey, idPair] of nameToId.entries()) {
          const [sgName, seasonName] = nameKey.split('|||');
          if (sgAndSeason === `${sgName}-${seasonName}`) {
            ids = idPair;
            break;
          }
        }

        if (!ids) {
          console.warn('[useBudgetAllocateSave] no IDs found for allocKey', allocKey);
          continue;
        }

        for (const store of stores) {
          const amount = storeValues[store.id];
          // Include cells explicitly set by user (even 0); skip undefined (never touched)
          if (typeof amount === 'number') {
            allocations.push({
              storeId: String(store.dbId),
              seasonGroupId: ids.sgId,
              seasonId: ids.seasonId,
              budgetAmount: amount,
            });
          }
        }
      }

      return allocations;
    },
    [allocateHeaders, allocationValues, stores, seasonGroups],
  );

  const save = useCallback(async () => {
    if (!budgetId || displayBrands.length === 0) {
      toast('No budget or brands selected', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      const results: any[] = [];
      let skipped = 0;

      for (const brand of displayBrands) {
        const headerId = findHeaderId(brandVersionMap, brand.id);

        // Build allocations — pass headerId (may be undefined for new brands)
        const allocations = buildAllocations(brand.id, headerId ?? null);
        if (allocations.length === 0) {
          console.warn('[useBudgetAllocateSave] no allocations for brand', brand.id);
          skipped++;
          continue;
        }

        if (headerId) {
          // Existing header → PUT (overwrite)
          const result = await budgetService.saveAllocation(String(headerId), allocations);
          results.push(result);
        } else {
          // No existing header → POST (create new allocate header)
          const result = await budgetService.saveAsNewAllocation(
            String(budgetId),
            String(brand.id),
            allocations,
          );
          results.push(result);
        }
      }

      if (results.length === 0) {
        toast('No allocation data to save. Enter values in the table first.', { icon: 'ℹ️', duration: 4000 });
      } else {
        toast.success(`Saved ${results.length} brand${results.length > 1 ? 's' : ''} successfully`);
        onSaved?.(results);
      }
    } catch (err: any) {
      console.error('[useBudgetAllocateSave] save error', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save allocation');
    } finally {
      setSaving(false);
    }
  }, [budgetId, displayBrands, brandVersionMap, allocateHeaders, seasonGroups, buildAllocations, stores, allocationValues, onSaved]);

  const saveAsNew = useCallback(async () => {
    if (!budgetId || displayBrands.length === 0) {
      toast('No budget or brands selected', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      const results: any[] = [];

      for (const brand of displayBrands) {
        const headerId =
          findHeaderId(brandVersionMap, brand.id) ??
          allocateHeaders.find((h: any) => Number(h.brand_id ?? h.brandId) === Number(brand.id))?.id;

        const allocations = buildAllocations(brand.id, headerId ?? null);

        if (allocations.length === 0) {
          console.warn('[useBudgetAllocateSave] saveAsNew: no allocations for brand', brand.id);
          continue;
        }

        const result = await budgetService.saveAsNewAllocation(
          String(budgetId),
          String(brand.id),
          allocations,
        );
        results.push(result);
      }

      if (results.length === 0) {
        toast('No allocation data to save as new version. Enter values first.', { icon: 'ℹ️', duration: 4000 });
      } else {
        toast.success(`Saved as new version for ${results.length} brand${results.length > 1 ? 's' : ''}`);
        onSaved?.(results);
      }
    } catch (err: any) {
      console.error('[useBudgetAllocateSave] saveAsNew error', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save as new version');
    } finally {
      setSaving(false);
    }
  }, [budgetId, displayBrands, brandVersionMap, allocateHeaders, seasonGroups, buildAllocations, onSaved]);

  return { save, saveAsNew, saving };
}
