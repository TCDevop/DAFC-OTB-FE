// src/features/budget/__tests__/budget.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockBudget,
  mockBudgetDetail,
  mockGroupBrand,
  mockPaginatedResponse,
  mockFetchSuccess,
  mockFetchError,
} from '@/test/utils';

// ═══════════════════════════════════════════════════════════════
// Budget Calculation Tests
// ═══════════════════════════════════════════════════════════════

describe('Budget Calculations', () => {
  // ─── Budget Allocation Calculation ────────────────────────────

  describe('calculateBudgetAllocation', () => {
    const calculateBudgetAllocation = (
      totalBudget: number,
      storeCount: number
    ): number => {
      if (storeCount === 0) return 0;
      return totalBudget / storeCount;
    };

    it('should allocate budget evenly across stores', () => {
      const totalBudget = 1000000000; // 1B
      const storeCount = 5;

      const allocation = calculateBudgetAllocation(totalBudget, storeCount);

      expect(allocation).toBe(200000000); // 200M each
    });

    it('should handle uneven division', () => {
      const totalBudget = 1000000000;
      const storeCount = 3;

      const allocation = calculateBudgetAllocation(totalBudget, storeCount);

      expect(allocation).toBeCloseTo(333333333.33, 0);
    });

    it('should return 0 for zero stores', () => {
      const allocation = calculateBudgetAllocation(1000000000, 0);

      expect(allocation).toBe(0);
    });

    it('should handle zero budget', () => {
      const allocation = calculateBudgetAllocation(0, 5);

      expect(allocation).toBe(0);
    });
  });

  // ─── Committed Percentage Calculation ─────────────────────────

  describe('calculateCommittedPercentage', () => {
    const calculateCommittedPercentage = (
      committed: number,
      total: number
    ): number => {
      if (total === 0) return 0;
      return Math.round((committed / total) * 100);
    };

    it('should calculate percentage correctly', () => {
      expect(calculateCommittedPercentage(650000000, 1000000000)).toBe(65);
      expect(calculateCommittedPercentage(500000000, 1000000000)).toBe(50);
      expect(calculateCommittedPercentage(1000000000, 1000000000)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(calculateCommittedPercentage(100, 0)).toBe(0);
    });

    it('should handle zero committed', () => {
      expect(calculateCommittedPercentage(0, 1000000000)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateCommittedPercentage(333333333, 1000000000)).toBe(33);
      expect(calculateCommittedPercentage(666666666, 1000000000)).toBe(67);
    });
  });

  // ─── Remaining Budget Calculation ─────────────────────────────

  describe('calculateRemainingBudget', () => {
    const calculateRemainingBudget = (
      total: number,
      committed: number
    ): number => {
      return Math.max(0, total - committed);
    };

    it('should calculate remaining budget correctly', () => {
      expect(calculateRemainingBudget(1000000000, 650000000)).toBe(350000000);
      expect(calculateRemainingBudget(1000000000, 0)).toBe(1000000000);
      expect(calculateRemainingBudget(1000000000, 1000000000)).toBe(0);
    });

    it('should not return negative values', () => {
      expect(calculateRemainingBudget(1000000000, 1200000000)).toBe(0);
    });
  });

  // ─── Budget Detail Total Calculation ──────────────────────────

  describe('calculateBudgetDetailTotal', () => {
    const calculateBudgetDetailTotal = (details: Array<{ rexAmount: number; ttpAmount: number }>) => {
      return details.reduce(
        (acc, detail) => ({
          rex: acc.rex + detail.rexAmount,
          ttp: acc.ttp + detail.ttpAmount,
          total: acc.total + detail.rexAmount + detail.ttpAmount,
        }),
        { rex: 0, ttp: 0, total: 0 }
      );
    };

    it('should sum all detail amounts correctly', () => {
      const details = [
        { rexAmount: 500000000, ttpAmount: 300000000 },
        { rexAmount: 200000000, ttpAmount: 150000000 },
        { rexAmount: 100000000, ttpAmount: 50000000 },
      ];

      const totals = calculateBudgetDetailTotal(details);

      expect(totals.rex).toBe(800000000);
      expect(totals.ttp).toBe(500000000);
      expect(totals.total).toBe(1300000000);
    });

    it('should return zeros for empty details', () => {
      const totals = calculateBudgetDetailTotal([]);

      expect(totals.rex).toBe(0);
      expect(totals.ttp).toBe(0);
      expect(totals.total).toBe(0);
    });
  });

  // ─── Season Mix Calculation ───────────────────────────────────

  describe('calculateSeasonMix', () => {
    const calculateSeasonMix = (
      ssAmount: number,
      fwAmount: number
    ): { ss: number; fw: number } => {
      const total = ssAmount + fwAmount;
      if (total === 0) return { ss: 0, fw: 0 };
      return {
        ss: Math.round((ssAmount / total) * 100),
        fw: Math.round((fwAmount / total) * 100),
      };
    };

    it('should calculate season mix correctly', () => {
      const mix = calculateSeasonMix(600000000, 400000000);

      expect(mix.ss).toBe(60);
      expect(mix.fw).toBe(40);
    });

    it('should handle 100% one season', () => {
      expect(calculateSeasonMix(1000000000, 0)).toEqual({ ss: 100, fw: 0 });
      expect(calculateSeasonMix(0, 1000000000)).toEqual({ ss: 0, fw: 100 });
    });

    it('should handle zero total', () => {
      expect(calculateSeasonMix(0, 0)).toEqual({ ss: 0, fw: 0 });
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Budget API Tests
// ═══════════════════════════════════════════════════════════════

describe('Budget API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Fetch Budgets ────────────────────────────────────────────

  describe('fetchBudgets', () => {
    it('should fetch paginated budgets', async () => {
      const budgets = [
        mockBudget({ id: 'budget-1', name: 'BUD-FER-SS-2025' }),
        mockBudget({ id: 'budget-2', name: 'BUD-PRA-FW-2025' }),
        mockBudget({ id: 'budget-3', name: 'BUD-GUC-SS-2025' }),
      ];

      mockFetchSuccess(mockPaginatedResponse(budgets, 25));

      const response = await fetch('/api/v1/budgets?page=1&pageSize=20');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.meta.total).toBe(25);
      expect(data.meta.totalPages).toBe(2);
    });

    it('should fetch budgets with filters', async () => {
      const approvedBudgets = [
        mockBudget({ id: 'budget-1', status: 'approved' }),
      ];

      mockFetchSuccess(mockPaginatedResponse(approvedBudgets));

      const response = await fetch(
        '/api/v1/budgets?status=approved&brandId=brand-1&fiscalYear=2025'
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('approved');
    });

    it('should handle empty results', async () => {
      mockFetchSuccess(mockPaginatedResponse([]));

      const response = await fetch('/api/v1/budgets?status=rejected');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.meta.total).toBe(0);
    });
  });

  // ─── Get Budget by ID ─────────────────────────────────────────

  describe('getBudgetById', () => {
    it('should fetch single budget with details', async () => {
      const budget = mockBudget({
        id: 'budget-1',
        details: [mockBudgetDetail(), mockBudgetDetail({ id: 'detail-2' })],
      });

      mockFetchSuccess({ data: budget });

      const response = await fetch('/api/v1/budgets/budget-1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.id).toBe('budget-1');
      expect(data.data.name).toBe('BUD-FER-SS-2025');
    });

    it('should return 404 for non-existent budget', async () => {
      mockFetchError('Budget not found', 404);

      const response = await fetch('/api/v1/budgets/non-existent');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  // ─── Create Budget ────────────────────────────────────────────

  describe('createBudget', () => {
    it('should create budget successfully', async () => {
      const newBudget = {
        name: 'BUD-NEW-SS-2026',
        brandId: 'brand-1',
        fiscalYear: 2026,
        totalBudget: 500000000,
        seasonGroup: 'SS',
        season: 'Pre',
      };

      const createdBudget = mockBudget({
        id: 'budget-new',
        ...newBudget,
        status: 'draft',
      });

      mockFetchSuccess({ data: createdBudget });

      const response = await fetch('/api/v1/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.id).toBe('budget-new');
      expect(data.data.status).toBe('draft');
    });

    it('should fail with missing required fields', async () => {
      mockFetchError('Name is required', 400);

      const response = await fetch('/api/v1/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: 'brand-1' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should fail with duplicate budget name', async () => {
      mockFetchError('Budget with this name already exists', 409);

      const response = await fetch('/api/v1/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'BUD-FER-SS-2025',
          brandId: 'brand-1',
          fiscalYear: 2025,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
    });
  });

  // ─── Update Budget ────────────────────────────────────────────

  describe('updateBudget', () => {
    it('should update budget successfully', async () => {
      const updatedBudget = mockBudget({
        id: 'budget-1',
        totalBudget: 1200000000,
      });

      mockFetchSuccess({ data: updatedBudget });

      const response = await fetch('/api/v1/budgets/budget-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: 1200000000 }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.totalBudget).toBe(1200000000);
    });

    it('should not update approved budget', async () => {
      mockFetchError('Cannot modify approved budget', 403);

      const response = await fetch('/api/v1/budgets/approved-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: 1200000000 }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  // ─── Delete Budget ────────────────────────────────────────────

  describe('deleteBudget', () => {
    it('should delete draft budget successfully', async () => {
      mockFetchSuccess({ message: 'Budget deleted successfully' });

      const response = await fetch('/api/v1/budgets/budget-1', {
        method: 'DELETE',
      });

      expect(response.ok).toBe(true);
    });

    it('should not delete non-draft budget', async () => {
      mockFetchError('Can only delete draft budgets', 403);

      const response = await fetch('/api/v1/budgets/submitted-budget', {
        method: 'DELETE',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  // ─── Submit Budget for Approval ───────────────────────────────

  describe('submitBudget', () => {
    it('should submit budget for approval', async () => {
      const submittedBudget = mockBudget({
        id: 'budget-1',
        status: 'submitted',
      });

      mockFetchSuccess({ data: submittedBudget });

      const response = await fetch('/api/v1/budgets/budget-1/submit', {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('submitted');
    });

    it('should fail if budget has no details', async () => {
      mockFetchError('Budget must have at least one detail before submission', 400);

      const response = await fetch('/api/v1/budgets/empty-budget/submit', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should fail if already submitted', async () => {
      mockFetchError('Budget is already submitted', 400);

      const response = await fetch('/api/v1/budgets/submitted-budget/submit', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Budget Filter Tests
// ═══════════════════════════════════════════════════════════════

describe('Budget Filters', () => {
  const filterBudgets = (
    budgets: Array<{
      fiscalYear: number;
      brandId: string;
      status: string;
      name: string;
    }>,
    filters: {
      fiscalYear?: number;
      brandId?: string;
      status?: string;
      search?: string;
    }
  ) => {
    return budgets.filter((budget) => {
      if (filters.fiscalYear && budget.fiscalYear !== filters.fiscalYear) {
        return false;
      }
      if (filters.brandId && budget.brandId !== filters.brandId) {
        return false;
      }
      if (filters.status && budget.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!budget.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
  };

  const sampleBudgets = [
    { fiscalYear: 2025, brandId: 'brand-1', status: 'draft', name: 'BUD-FER-SS-2025' },
    { fiscalYear: 2025, brandId: 'brand-2', status: 'approved', name: 'BUD-PRA-SS-2025' },
    { fiscalYear: 2026, brandId: 'brand-1', status: 'draft', name: 'BUD-FER-FW-2026' },
    { fiscalYear: 2026, brandId: 'brand-3', status: 'submitted', name: 'BUD-GUC-SS-2026' },
  ];

  it('should filter by fiscal year', () => {
    const filtered = filterBudgets(sampleBudgets, { fiscalYear: 2025 });
    expect(filtered).toHaveLength(2);
  });

  it('should filter by brand', () => {
    const filtered = filterBudgets(sampleBudgets, { brandId: 'brand-1' });
    expect(filtered).toHaveLength(2);
  });

  it('should filter by status', () => {
    const filtered = filterBudgets(sampleBudgets, { status: 'draft' });
    expect(filtered).toHaveLength(2);
  });

  it('should filter by search term', () => {
    const filtered = filterBudgets(sampleBudgets, { search: 'FER' });
    expect(filtered).toHaveLength(2);
  });

  it('should combine multiple filters', () => {
    const filtered = filterBudgets(sampleBudgets, {
      fiscalYear: 2025,
      brandId: 'brand-1',
      status: 'draft',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('BUD-FER-SS-2025');
  });

  it('should return all budgets with no filters', () => {
    const filtered = filterBudgets(sampleBudgets, {});
    expect(filtered).toHaveLength(4);
  });

  it('should return empty for non-matching filters', () => {
    const filtered = filterBudgets(sampleBudgets, {
      fiscalYear: 2024,
    });
    expect(filtered).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Budget Validation Tests
// ═══════════════════════════════════════════════════════════════

describe('Budget Validation', () => {
  const validateBudget = (budget: {
    name?: string;
    totalBudget?: number;
    brandId?: string;
    fiscalYear?: number;
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!budget.name || budget.name.trim() === '') {
      errors.push('Name is required');
    }

    if (budget.totalBudget === undefined || budget.totalBudget < 0) {
      errors.push('Total budget must be a positive number');
    }

    if (!budget.brandId) {
      errors.push('Brand is required');
    }

    if (!budget.fiscalYear || budget.fiscalYear < 2020 || budget.fiscalYear > 2030) {
      errors.push('Fiscal year must be between 2020 and 2030');
    }

    return { valid: errors.length === 0, errors };
  };

  it('should pass validation for valid budget', () => {
    const result = validateBudget({
      name: 'BUD-FER-SS-2025',
      totalBudget: 1000000000,
      brandId: 'brand-1',
      fiscalYear: 2025,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for missing name', () => {
    const result = validateBudget({
      totalBudget: 1000000000,
      brandId: 'brand-1',
      fiscalYear: 2025,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  it('should fail validation for negative budget', () => {
    const result = validateBudget({
      name: 'Test Budget',
      totalBudget: -100,
      brandId: 'brand-1',
      fiscalYear: 2025,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Total budget must be a positive number');
  });

  it('should fail validation for invalid fiscal year', () => {
    const result = validateBudget({
      name: 'Test Budget',
      totalBudget: 1000000000,
      brandId: 'brand-1',
      fiscalYear: 2015,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Fiscal year must be between 2020 and 2030');
  });

  it('should collect all validation errors', () => {
    const result = validateBudget({});

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });
});
