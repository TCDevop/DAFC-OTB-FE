// src/features/planning/__tests__/planning.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockPlanningVersion,
  mockPlanningDetail,
  mockBudget,
  mockPaginatedResponse,
  mockFetchSuccess,
  mockFetchError,
} from '@/test/utils';

// ═══════════════════════════════════════════════════════════════
// Planning Version Tests
// ═══════════════════════════════════════════════════════════════

describe('Planning Version Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Version Ordering ─────────────────────────────────────────

  describe('Version Ordering', () => {
    const VERSION_ORDER = ['V0', 'V1', 'V2', 'V3', 'FINAL'];

    const getVersionIndex = (version: string): number => {
      return VERSION_ORDER.indexOf(version);
    };

    const isVersionNewer = (current: string, previous: string): boolean => {
      return getVersionIndex(current) > getVersionIndex(previous);
    };

    const getNextVersion = (current: string): string | null => {
      const currentIndex = getVersionIndex(current);
      if (currentIndex === -1 || currentIndex >= VERSION_ORDER.length - 1) {
        return null;
      }
      return VERSION_ORDER[currentIndex + 1];
    };

    it('should order versions correctly', () => {
      expect(getVersionIndex('V0')).toBe(0);
      expect(getVersionIndex('V1')).toBe(1);
      expect(getVersionIndex('V2')).toBe(2);
      expect(getVersionIndex('V3')).toBe(3);
      expect(getVersionIndex('FINAL')).toBe(4);
    });

    it('should detect newer version', () => {
      expect(isVersionNewer('V1', 'V0')).toBe(true);
      expect(isVersionNewer('FINAL', 'V3')).toBe(true);
      expect(isVersionNewer('V0', 'V1')).toBe(false);
      expect(isVersionNewer('V1', 'V1')).toBe(false);
    });

    it('should get next version correctly', () => {
      expect(getNextVersion('V0')).toBe('V1');
      expect(getNextVersion('V1')).toBe('V2');
      expect(getNextVersion('V3')).toBe('FINAL');
      expect(getNextVersion('FINAL')).toBeNull();
    });

    it('should return null for invalid version', () => {
      expect(getNextVersion('INVALID')).toBeNull();
    });
  });

  // ─── Fetch Planning Versions ──────────────────────────────────

  describe('fetchPlanningVersions', () => {
    it('should fetch versions for a budget', async () => {
      const versions = [
        mockPlanningVersion({ id: 'v1', version: 'V0' }),
        mockPlanningVersion({ id: 'v2', version: 'V1' }),
        mockPlanningVersion({ id: 'v3', version: 'V2', isFinal: false }),
      ];

      mockFetchSuccess({ data: versions });

      const response = await fetch('/api/v1/planning/versions?budgetId=budget-1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('should fetch only final version', async () => {
      const finalVersion = mockPlanningVersion({
        id: 'v-final',
        version: 'FINAL',
        isFinal: true,
      });

      mockFetchSuccess({ data: [finalVersion] });

      const response = await fetch(
        '/api/v1/planning/versions?budgetId=budget-1&isFinal=true'
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isFinal).toBe(true);
    });
  });

  // ─── Create Planning Version ──────────────────────────────────

  describe('createPlanningVersion', () => {
    it('should create initial V0 version', async () => {
      const newVersion = mockPlanningVersion({
        id: 'new-v0',
        version: 'V0',
        isFinal: false,
      });

      mockFetchSuccess({ data: newVersion });

      const response = await fetch('/api/v1/planning/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: 'budget-1',
          version: 'V0',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.version).toBe('V0');
      expect(data.data.isFinal).toBe(false);
    });

    it('should create new version from existing', async () => {
      const newVersion = mockPlanningVersion({
        id: 'new-v2',
        version: 'V2',
        isFinal: false,
      });

      mockFetchSuccess({ data: newVersion });

      const response = await fetch('/api/v1/planning/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: 'budget-1',
          version: 'V2',
          copyFromVersionId: 'v1-id',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.version).toBe('V2');
    });

    it('should fail to create duplicate version', async () => {
      mockFetchError('Version V1 already exists for this budget', 409);

      const response = await fetch('/api/v1/planning/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: 'budget-1',
          version: 'V1',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
    });
  });

  // ─── Mark Version as Final ────────────────────────────────────

  describe('markVersionAsFinal', () => {
    it('should mark version as final', async () => {
      const finalVersion = mockPlanningVersion({
        id: 'v3',
        version: 'FINAL',
        isFinal: true,
      });

      mockFetchSuccess({ data: finalVersion });

      const response = await fetch('/api/v1/planning/versions/v3/finalize', {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.isFinal).toBe(true);
    });

    it('should fail if version is already final', async () => {
      mockFetchError('Version is already marked as final', 400);

      const response = await fetch('/api/v1/planning/versions/final-v/finalize', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should fail if previous versions not complete', async () => {
      mockFetchError('Cannot finalize: previous versions must be completed first', 400);

      const response = await fetch('/api/v1/planning/versions/v2/finalize', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Planning Detail Tests
// ═══════════════════════════════════════════════════════════════

describe('Planning Details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Fetch Planning Details ───────────────────────────────────

  describe('fetchPlanningDetails', () => {
    it('should fetch details for a version', async () => {
      const details = [
        mockPlanningDetail({ id: 'd1', percentage: 40, amount: 400000000 }),
        mockPlanningDetail({ id: 'd2', percentage: 35, amount: 350000000 }),
        mockPlanningDetail({ id: 'd3', percentage: 25, amount: 250000000 }),
      ];

      mockFetchSuccess({ data: details });

      const response = await fetch(
        '/api/v1/planning/details?planningVersionId=version-1'
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('should fetch details by category', async () => {
      const categoryDetails = [
        mockPlanningDetail({ categoryId: 'cat-1' }),
        mockPlanningDetail({ categoryId: 'cat-1', id: 'd2' }),
      ];

      mockFetchSuccess({ data: categoryDetails });

      const response = await fetch(
        '/api/v1/planning/details?planningVersionId=version-1&categoryId=cat-1'
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });

  // ─── Update Planning Detail ───────────────────────────────────

  describe('updatePlanningDetail', () => {
    it('should update detail percentage and recalculate amount', async () => {
      const updatedDetail = mockPlanningDetail({
        id: 'd1',
        percentage: 50,
        amount: 500000000,
      });

      mockFetchSuccess({ data: updatedDetail });

      const response = await fetch('/api/v1/planning/details/d1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 50 }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.percentage).toBe(50);
    });

    it('should fail if total percentage exceeds 100', async () => {
      mockFetchError('Total percentage cannot exceed 100%', 400);

      const response = await fetch('/api/v1/planning/details/d1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 80 }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should fail for finalized version', async () => {
      mockFetchError('Cannot modify details of finalized version', 403);

      const response = await fetch('/api/v1/planning/details/final-detail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 50 }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  // ─── Bulk Update Planning Details ─────────────────────────────

  describe('bulkUpdatePlanningDetails', () => {
    it('should update multiple details at once', async () => {
      const updatedDetails = [
        mockPlanningDetail({ id: 'd1', percentage: 40 }),
        mockPlanningDetail({ id: 'd2', percentage: 35 }),
        mockPlanningDetail({ id: 'd3', percentage: 25 }),
      ];

      mockFetchSuccess({ data: updatedDetails });

      const response = await fetch('/api/v1/planning/details/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningVersionId: 'version-1',
          details: [
            { id: 'd1', percentage: 40 },
            { id: 'd2', percentage: 35 },
            { id: 'd3', percentage: 25 },
          ],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('should validate total equals 100%', async () => {
      mockFetchError('Total percentage must equal 100%', 400);

      const response = await fetch('/api/v1/planning/details/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningVersionId: 'version-1',
          details: [
            { id: 'd1', percentage: 30 },
            { id: 'd2', percentage: 30 },
            // Missing 40%
          ],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Planning Calculation Tests
// ═══════════════════════════════════════════════════════════════

describe('Planning Calculations', () => {
  // ─── Percentage Allocation ────────────────────────────────────

  describe('Percentage Allocation', () => {
    const calculateAmount = (totalBudget: number, percentage: number): number => {
      return Math.round(totalBudget * (percentage / 100));
    };

    const calculatePercentage = (amount: number, totalBudget: number): number => {
      if (totalBudget === 0) return 0;
      return Math.round((amount / totalBudget) * 100);
    };

    it('should calculate amount from percentage', () => {
      const totalBudget = 1000000000;

      expect(calculateAmount(totalBudget, 60)).toBe(600000000);
      expect(calculateAmount(totalBudget, 25)).toBe(250000000);
      expect(calculateAmount(totalBudget, 15)).toBe(150000000);
    });

    it('should calculate percentage from amount', () => {
      const totalBudget = 1000000000;

      expect(calculatePercentage(600000000, totalBudget)).toBe(60);
      expect(calculatePercentage(250000000, totalBudget)).toBe(25);
    });

    it('should handle zero total budget', () => {
      expect(calculatePercentage(100, 0)).toBe(0);
    });
  });

  // ─── Collection Split ─────────────────────────────────────────

  describe('Collection Split', () => {
    const validateCollectionSplit = (
      seasonal: number,
      carryOver: number
    ): boolean => {
      return seasonal + carryOver === 100;
    };

    const calculateCollectionAmounts = (
      totalBudget: number,
      seasonalPercent: number,
      carryOverPercent: number
    ) => {
      return {
        seasonal: Math.round(totalBudget * (seasonalPercent / 100)),
        carryOver: Math.round(totalBudget * (carryOverPercent / 100)),
        total: totalBudget,
      };
    };

    it('should validate collection split equals 100%', () => {
      expect(validateCollectionSplit(60, 40)).toBe(true);
      expect(validateCollectionSplit(70, 30)).toBe(true);
      expect(validateCollectionSplit(50, 40)).toBe(false);
      expect(validateCollectionSplit(60, 50)).toBe(false);
    });

    it('should calculate collection amounts correctly', () => {
      const result = calculateCollectionAmounts(1000000000, 60, 40);

      expect(result.seasonal).toBe(600000000);
      expect(result.carryOver).toBe(400000000);
      expect(result.seasonal + result.carryOver).toBe(result.total);
    });
  });

  // ─── Gender Split ─────────────────────────────────────────────

  describe('Gender Split', () => {
    const calculateGenderSplit = (
      totalBudget: number,
      malePercent: number,
      femalePercent: number
    ) => {
      if (malePercent + femalePercent !== 100) {
        throw new Error('Gender percentages must equal 100%');
      }
      return {
        male: Math.round(totalBudget * (malePercent / 100)),
        female: Math.round(totalBudget * (femalePercent / 100)),
      };
    };

    it('should calculate gender split correctly', () => {
      const result = calculateGenderSplit(1000000000, 45, 55);

      expect(result.male).toBe(450000000);
      expect(result.female).toBe(550000000);
    });

    it('should throw error for invalid percentages', () => {
      expect(() => calculateGenderSplit(1000000000, 50, 40)).toThrow(
        'Gender percentages must equal 100%'
      );
    });
  });

  // ─── Category Distribution ────────────────────────────────────

  describe('Category Distribution', () => {
    interface CategoryAllocation {
      categoryId: string;
      categoryName: string;
      percentage: number;
      amount: number;
    }

    const validateCategoryDistribution = (
      allocations: CategoryAllocation[]
    ): { valid: boolean; total: number; difference: number } => {
      const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
      return {
        valid: total === 100,
        total,
        difference: 100 - total,
      };
    };

    const distributeBudgetToCategories = (
      totalBudget: number,
      percentages: Array<{ categoryId: string; categoryName: string; percentage: number }>
    ): CategoryAllocation[] => {
      return percentages.map((p) => ({
        ...p,
        amount: Math.round(totalBudget * (p.percentage / 100)),
      }));
    };

    it('should validate category distribution', () => {
      const validAllocations = [
        { categoryId: 'c1', categoryName: 'Footwear', percentage: 40, amount: 0 },
        { categoryId: 'c2', categoryName: 'Bags', percentage: 30, amount: 0 },
        { categoryId: 'c3', categoryName: 'Accessories', percentage: 20, amount: 0 },
        { categoryId: 'c4', categoryName: 'RTW', percentage: 10, amount: 0 },
      ];

      const result = validateCategoryDistribution(validAllocations);

      expect(result.valid).toBe(true);
      expect(result.total).toBe(100);
      expect(result.difference).toBe(0);
    });

    it('should detect invalid distribution', () => {
      const invalidAllocations = [
        { categoryId: 'c1', categoryName: 'Footwear', percentage: 40, amount: 0 },
        { categoryId: 'c2', categoryName: 'Bags', percentage: 30, amount: 0 },
        // Missing 30%
      ];

      const result = validateCategoryDistribution(invalidAllocations);

      expect(result.valid).toBe(false);
      expect(result.total).toBe(70);
      expect(result.difference).toBe(30);
    });

    it('should calculate category amounts', () => {
      const percentages = [
        { categoryId: 'c1', categoryName: 'Footwear', percentage: 40 },
        { categoryId: 'c2', categoryName: 'Bags', percentage: 35 },
        { categoryId: 'c3', categoryName: 'Accessories', percentage: 25 },
      ];

      const allocations = distributeBudgetToCategories(1000000000, percentages);

      expect(allocations[0].amount).toBe(400000000);
      expect(allocations[1].amount).toBe(350000000);
      expect(allocations[2].amount).toBe(250000000);
    });
  });

  // ─── Version Comparison ───────────────────────────────────────

  describe('Version Comparison', () => {
    interface VersionSummary {
      version: string;
      totalPlanned: number;
      collectionSplit: { seasonal: number; carryOver: number };
      genderSplit: { male: number; female: number };
    }

    const compareVersions = (
      v1: VersionSummary,
      v2: VersionSummary
    ) => {
      return {
        totalDifference: v2.totalPlanned - v1.totalPlanned,
        totalPercentChange:
          v1.totalPlanned === 0
            ? 0
            : Math.round(((v2.totalPlanned - v1.totalPlanned) / v1.totalPlanned) * 100),
        seasonalChange: v2.collectionSplit.seasonal - v1.collectionSplit.seasonal,
        genderMaleChange: v2.genderSplit.male - v1.genderSplit.male,
      };
    };

    it('should calculate version differences', () => {
      const v1: VersionSummary = {
        version: 'V1',
        totalPlanned: 1000000000,
        collectionSplit: { seasonal: 60, carryOver: 40 },
        genderSplit: { male: 45, female: 55 },
      };

      const v2: VersionSummary = {
        version: 'V2',
        totalPlanned: 1100000000,
        collectionSplit: { seasonal: 65, carryOver: 35 },
        genderSplit: { male: 50, female: 50 },
      };

      const comparison = compareVersions(v1, v2);

      expect(comparison.totalDifference).toBe(100000000);
      expect(comparison.totalPercentChange).toBe(10);
      expect(comparison.seasonalChange).toBe(5);
      expect(comparison.genderMaleChange).toBe(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Planning Validation Tests
// ═══════════════════════════════════════════════════════════════

describe('Planning Validation', () => {
  // ─── Budget Constraint Validation ─────────────────────────────

  describe('Budget Constraint Validation', () => {
    const validateAgainstBudget = (
      plannedTotal: number,
      approvedBudget: number,
      tolerance: number = 0.01 // 1% tolerance
    ): { valid: boolean; difference: number; percentOver: number } => {
      const difference = plannedTotal - approvedBudget;
      const percentOver =
        approvedBudget === 0 ? 0 : (difference / approvedBudget) * 100;

      return {
        valid: plannedTotal <= approvedBudget * (1 + tolerance),
        difference,
        percentOver,
      };
    };

    it('should pass when planned is within budget', () => {
      const result = validateAgainstBudget(950000000, 1000000000);

      expect(result.valid).toBe(true);
      expect(result.difference).toBe(-50000000);
    });

    it('should pass when planned equals budget', () => {
      const result = validateAgainstBudget(1000000000, 1000000000);

      expect(result.valid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should pass when slightly over (within tolerance)', () => {
      const result = validateAgainstBudget(1005000000, 1000000000); // 0.5% over

      expect(result.valid).toBe(true);
    });

    it('should fail when significantly over budget', () => {
      const result = validateAgainstBudget(1100000000, 1000000000); // 10% over

      expect(result.valid).toBe(false);
      expect(result.percentOver).toBe(10);
    });
  });

  // ─── Planning Completeness Check ──────────────────────────────

  describe('Planning Completeness Check', () => {
    interface PlanningCompleteness {
      hasCollectionSplit: boolean;
      hasGenderSplit: boolean;
      hasCategorySplit: boolean;
      totalPercentage: number;
    }

    const checkPlanningCompleteness = (
      details: Array<{
        collectionId?: string;
        genderId?: string;
        categoryId?: string;
        percentage: number;
      }>
    ): PlanningCompleteness => {
      const hasCollectionSplit = details.some((d) => d.collectionId);
      const hasGenderSplit = details.some((d) => d.genderId);
      const hasCategorySplit = details.some((d) => d.categoryId);
      const totalPercentage = details.reduce((sum, d) => sum + d.percentage, 0);

      return {
        hasCollectionSplit,
        hasGenderSplit,
        hasCategorySplit,
        totalPercentage,
      };
    };

    const isPlanningComplete = (completeness: PlanningCompleteness): boolean => {
      return (
        completeness.hasCollectionSplit &&
        completeness.hasGenderSplit &&
        completeness.hasCategorySplit &&
        completeness.totalPercentage === 100
      );
    };

    it('should detect complete planning', () => {
      const details = [
        { collectionId: 'c1', genderId: 'g1', categoryId: 'cat1', percentage: 60 },
        { collectionId: 'c2', genderId: 'g2', categoryId: 'cat2', percentage: 40 },
      ];

      const completeness = checkPlanningCompleteness(details);

      expect(isPlanningComplete(completeness)).toBe(true);
    });

    it('should detect incomplete planning', () => {
      const details = [
        { collectionId: 'c1', percentage: 60 },
        { collectionId: 'c2', percentage: 40 },
      ];

      const completeness = checkPlanningCompleteness(details);

      expect(completeness.hasGenderSplit).toBe(false);
      expect(completeness.hasCategorySplit).toBe(false);
      expect(isPlanningComplete(completeness)).toBe(false);
    });

    it('should detect incorrect total percentage', () => {
      const details = [
        { collectionId: 'c1', genderId: 'g1', categoryId: 'cat1', percentage: 50 },
        { collectionId: 'c2', genderId: 'g2', categoryId: 'cat2', percentage: 30 },
      ];

      const completeness = checkPlanningCompleteness(details);

      expect(completeness.totalPercentage).toBe(80);
      expect(isPlanningComplete(completeness)).toBe(false);
    });
  });
});
