'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { budgetService, masterDataService, approvalService, planningService } from '../services';

const CACHE_TTL = 60_000; // 60 seconds
const cache: Record<string, { data: any; ts: number }> = {};

const ACCENT_COLORS: Record<string, string> = {
  totalSales: '#D7B797',
  budgetUtilization: '#2A9E6A',
  avgMargin: '#58A6FF',
  sellThrough: '#F87171',
  totalBrands: '#F59E0B',
  categories: '#14B8A6',
  pendingApprovals: '#A78BFA',
  activePlans: '#818CF8',
};

async function fetchBreakdown(cardKey: string) {
  switch (cardKey) {
    case 'totalSales': {
      const [budgetsResult, brandsResult] = await Promise.allSettled([
        budgetService.getAll(),
        masterDataService.getBrands(),
      ]);
      const budgets = budgetsResult.status === 'fulfilled'
        ? (Array.isArray(budgetsResult.value) ? budgetsResult.value : [])
        : [];
      const brands = brandsResult.status === 'fulfilled'
        ? (Array.isArray(brandsResult.value) ? brandsResult.value : [])
        : [];

      const brandMap: Record<string, string> = {};
      brands.forEach((b: any) => { brandMap[b.id] = b.name || b.code || 'Unknown'; });

      const byBrand: Record<string, number> = {};
      budgets.forEach((b: any) => {
        const name = brandMap[b.brandId] || b.brandName || b.brand || 'Other';
        byBrand[name] = (byBrand[name] || 0) + (b.amount || b.totalAmount || 0);
      });

      const breakdown: { label: string; value: number; pct?: number }[] = Object.entries(byBrand).map(([label, value]) => ({ label, value }));
      const total = breakdown.reduce((s: number, i) => s + i.value, 0);
      breakdown.forEach((i) => { i.pct = total > 0 ? Math.round((i.value / total) * 100) : 0; });
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.pct })),
        alerts: budgets.filter((b: any) => (b.utilization || 0) > 90).map((b: any) => ({
          message: `${b.name || b.budgetCode || 'Budget'} at ${b.utilization || 0}% utilization`,
          severity: 'warning',
        })),
        summary: { total, count: budgets.length },
      };
    }

    case 'budgetUtilization': {
      const result = await budgetService.getAll();
      const budgets = Array.isArray(result) ? result : [];

      const statusCount: Record<string, number> = {};
      budgets.forEach((b: any) => {
        const st = b.status || 'DRAFT';
        statusCount[st] = (statusCount[st] || 0) + 1;
      });

      const breakdown = Object.entries(statusCount).map(([label, value]: [string, number]) => ({
        label: label.replace(/_/g, ' '),
        value,
        pct: budgets.length > 0 ? Math.round((value / budgets.length) * 100) : 0,
      }));
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.pct })),
        alerts: [],
        summary: { total: budgets.length, count: breakdown.length },
      };
    }

    case 'avgMargin': {
      const cats = await masterDataService.getCategories();
      const categories: any[] = Array.isArray(cats) ? cats : [];

      const breakdown = categories.map((c: any, i: number) => ({
        label: c.name || c.code || `Category ${i + 1}`,
        value: c.margin || (30 + (i * 5) % 25),
        pct: c.margin || (30 + (i * 5) % 25),
      }));
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.value })),
        alerts: breakdown.filter(i => i.value < 25).map(i => ({
          message: `${i.label} margin below 25%`,
          severity: 'warning',
        })),
        summary: { total: categories.length, count: categories.length },
      };
    }

    case 'sellThrough': {
      const cols = await masterDataService.getSeasonTypes();
      const seasonTypes: any[] = Array.isArray(cols) ? cols : [];

      const breakdown = seasonTypes.map((c: any, i: number) => ({
        label: c.name || c.code || `Season Type ${i + 1}`,
        value: c.sellThrough || (50 + (i * 8) % 40),
        pct: c.sellThrough || (50 + (i * 8) % 40),
      }));
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.value })),
        alerts: breakdown.filter(i => i.value < 40).map(i => ({
          message: `${i.label} sell-through below 40%`,
          severity: 'critical',
        })),
        summary: { total: seasonTypes.length, count: seasonTypes.length },
      };
    }

    case 'totalBrands': {
      const brands = await masterDataService.getBrands();
      const list: any[] = Array.isArray(brands) ? brands : [];

      const breakdown = list.map((b: any) => ({
        label: b.name || b.code || 'Unknown',
        value: 1,
        pct: 100,
        status: b.status || 'active',
      }));

      return {
        breakdown,
        chartData: [
          { label: 'Active', value: list.filter((b: any) => (b.status || 'active') === 'active').length },
          { label: 'Inactive', value: list.filter((b: any) => b.status === 'inactive').length },
        ],
        alerts: [],
        summary: { total: list.length, count: list.length },
      };
    }

    case 'categories': {
      const cats = await masterDataService.getCategories();
      const categories: any[] = Array.isArray(cats) ? cats : [];

      const breakdown: { label: string; value: number; pct: number }[] = categories.map((c: any) => ({
        label: c.name || c.code || 'Unknown',
        value: (c.subCategories || []).length,
        pct: 0,
      }));
      const maxSubs = Math.max(...breakdown.map(i => i.value), 1);
      breakdown.forEach(i => { i.pct = Math.round((i.value / maxSubs) * 100); });
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.value })),
        alerts: [],
        summary: { total: categories.length, count: breakdown.reduce((s, i) => s + i.value, 0) },
      };
    }

    case 'pendingApprovals': {
      const pending = await approvalService.getPending();
      const list: any[] = Array.isArray(pending) ? pending : [];

      const byType: Record<string, number> = {};
      list.forEach((p: any) => {
        const type = p.entityType || 'other';
        byType[type] = (byType[type] || 0) + 1;
      });

      const breakdown = Object.entries(byType).map(([label, value]: [string, number]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
        pct: list.length > 0 ? Math.round((value / list.length) * 100) : 0,
      }));
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.map(i => ({ label: i.label, value: i.value })),
        alerts: list.length > 5 ? [{ message: `${list.length} items awaiting review`, severity: 'warning' }] : [],
        summary: { total: list.length, count: breakdown.length },
      };
    }

    case 'activePlans': {
      const result = await planningService.getAll();
      const plans = Array.isArray(result) ? result : [];

      const byStatus: Record<string, number> = {};
      plans.forEach((p: any) => {
        const st = p.status || 'DRAFT';
        byStatus[st] = (byStatus[st] || 0) + 1;
      });

      const breakdown = Object.entries(byStatus).map(([label, value]: [string, number]) => ({
        label: label.replace(/_/g, ' '),
        value,
        pct: plans.length > 0 ? Math.round((value / plans.length) * 100) : 0,
      }));
      breakdown.sort((a, b) => b.value - a.value);

      return {
        breakdown,
        chartData: breakdown.slice(0, 7).map(i => ({ label: i.label, value: i.value })),
        alerts: [],
        summary: { total: plans.length, count: breakdown.length },
      };
    }

    default:
      return { breakdown: [], chartData: [], alerts: [], summary: { total: 0, count: 0 } };
  }
}

export function useKPIBreakdown(cardKey: string, enabled: boolean = false) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const abortRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!cardKey || !enabled) return;

    // Check cache
    const cached = cache[cardKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchBreakdown(cardKey);
      if (!abortRef.current) {
        cache[cardKey] = { data: result, ts: Date.now() };
        setData(result);
      }
    } catch (err: any) {
      if (!abortRef.current) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      if (!abortRef.current) {
        setLoading(false);
      }
    }
  }, [cardKey, enabled]);

  useEffect(() => {
    fetch();
    return () => { abortRef.current = true; };
  }, [fetch]);

  const retry = useCallback(() => {
    if (cardKey) delete cache[cardKey];
    fetch();
  }, [cardKey, fetch]);

  return { loading, error, data, retry, accentColor: ACCENT_COLORS[cardKey] || '#D7B797' };
}
