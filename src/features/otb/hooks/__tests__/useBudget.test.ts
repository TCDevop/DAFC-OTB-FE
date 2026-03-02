import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  mockBrands,
  mockStores,
  mockSeasons,
  mockApiBudget,
} from '../../../../test/mock-services';

// ─── Hoisted Mocks (accessible inside vi.mock factories) ────────

const { mockBudgetService, mockMasterDataService } = vi.hoisted(() => {
  const budgetSvc = {
    getAll: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue({}),
    getStatistics: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    submit: vi.fn().mockResolvedValue({}),
    approveL1: vi.fn().mockResolvedValue({}),
    approveL2: vi.fn().mockResolvedValue({}),
    rejectL1: vi.fn().mockResolvedValue({}),
    rejectL2: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const masterSvc = {
    getBrands: vi.fn().mockResolvedValue([]),
    getStores: vi.fn().mockResolvedValue([]),
    getCollections: vi.fn().mockResolvedValue([]),
    getGenders: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getSeasons: vi.fn().mockResolvedValue([]),
    getSkuCatalog: vi.fn().mockResolvedValue([]),
    getSubCategories: vi.fn().mockResolvedValue([]),
  };
  return { mockBudgetService: budgetSvc, mockMasterDataService: masterSvc };
});

vi.mock('../../../../services', () => ({
  budgetService: mockBudgetService,
  masterDataService: mockMasterDataService,
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('../../../../utils/constants', () => ({
  STORES: [
    { id: 'rex', code: 'REX', name: 'REX' },
    { id: 'ttp', code: 'TTP', name: 'TTP' },
  ],
  CURRENT_YEAR: 2025,
}));

import { useBudget } from '../useBudget';

// ─── Tests ──────────────────────────────────────────────────────

describe('useBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMasterDataService.getBrands.mockResolvedValue(mockBrands);
    mockMasterDataService.getStores.mockResolvedValue(mockStores);
    mockMasterDataService.getSeasons.mockResolvedValue(mockSeasons);
    mockBudgetService.getAll.mockResolvedValue([mockApiBudget()]);
  });

  // ── Initialization ──────────────────────────────────────────

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBudget());
    expect(result.current.selectedYear).toBe(2025);
    expect(result.current.budgets).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.showBudgetForm).toBe(false);
  });

  it('should fetch master data on mount', async () => {
    renderHook(() => useBudget());

    await waitFor(() => {
      expect(mockMasterDataService.getBrands).toHaveBeenCalledTimes(1);
      expect(mockMasterDataService.getStores).toHaveBeenCalledTimes(1);
      expect(mockMasterDataService.getSeasons).toHaveBeenCalledTimes(1);
    });
  });

  it('should set brands from API', async () => {
    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.brands).toEqual(mockBrands);
    });
  });

  it('should filter stores to REX and TTP', async () => {
    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.stores).toHaveLength(2);
      expect(result.current.stores.every((s: any) =>
        ['REX', 'TTP'].includes(s.code)
      )).toBe(true);
    });
  });

  // ── fetchBudgets ────────────────────────────────────────────

  it('should fetch budgets on mount', async () => {
    renderHook(() => useBudget());

    await waitFor(() => {
      expect(mockBudgetService.getAll).toHaveBeenCalledWith({ fiscalYear: 2025 });
    });
  });

  it('should transform API budget response', async () => {
    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.budgets).toHaveLength(1);
      const budget = result.current.budgets[0];
      expect(budget.id).toBe('budget-1');
      expect(budget.budgetCode).toBe('BUD-FER-SS-2025');
      expect(budget.totalBudget).toBe(1000000000);
      expect(budget.status).toBe('draft');
      expect(budget.details).toHaveLength(2);
    });
  });

  it('should set error state when fetchBudgets fails', async () => {
    mockBudgetService.getAll.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  // ── handleStoreAllocationChange ─────────────────────────────

  it('should update store allocation amount', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      result.current.setBudgetFormData({
        comment: '',
        storeAllocations: [
          { storeId: 'store-rex', storeName: 'REX', storeCode: 'REX', budgetAmount: 0 },
          { storeId: 'store-ttp', storeName: 'TTP', storeCode: 'TTP', budgetAmount: 0 },
        ],
      });
    });

    act(() => {
      result.current.handleStoreAllocationChange('store-rex', '500000000');
    });

    const rexAlloc = result.current.budgetFormData.storeAllocations.find(
      (sa: any) => sa.storeId === 'store-rex'
    );
    expect(rexAlloc.budgetAmount).toBe(500000000);
  });

  it('should handle invalid allocation value as 0', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      result.current.setBudgetFormData({
        comment: '',
        storeAllocations: [
          { storeId: 'store-rex', storeName: 'REX', storeCode: 'REX', budgetAmount: 100 },
        ],
      });
    });

    act(() => {
      result.current.handleStoreAllocationChange('store-rex', 'abc');
    });

    const alloc = result.current.budgetFormData.storeAllocations[0];
    expect(alloc.budgetAmount).toBe(0);
  });

  // ── calculateTotalBudget ────────────────────────────────────

  it('should sum all store allocations', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      result.current.setBudgetFormData({
        comment: '',
        storeAllocations: [
          { storeId: 'store-rex', storeName: 'REX', storeCode: 'REX', budgetAmount: 600000000 },
          { storeId: 'store-ttp', storeName: 'TTP', storeCode: 'TTP', budgetAmount: 400000000 },
        ],
      });
    });

    expect(result.current.calculateTotalBudget()).toBe(1000000000);
  });

  it('should return 0 when no allocations', () => {
    const { result } = renderHook(() => useBudget());
    expect(result.current.calculateTotalBudget()).toBe(0);
  });

  // ── handleSaveBudget ────────────────────────────────────────

  it('should create new budget when no existing budget', async () => {
    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.stores).toHaveLength(2);
    });

    await act(async () => {
      result.current.handleCellClick(
        { id: 'brand-1', name: 'Ferragamo' },
        { id: 'FW-Pre', seasonGroupId: 'FW', seasonType: 'Pre' }
      );
    });

    act(() => {
      result.current.handleStoreAllocationChange('store-rex', '500000000');
    });

    await act(async () => {
      await result.current.handleSaveBudget();
    });

    expect(mockBudgetService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBrandId: 'brand-1',
        seasonGroupId: 'FW',
        seasonType: 'Pre',
        fiscalYear: 2025,
      })
    );
  });

  it('should update existing budget', async () => {
    const { result } = renderHook(() => useBudget());

    await waitFor(() => {
      expect(result.current.budgets).toHaveLength(1);
    });

    await act(async () => {
      result.current.handleCellClick(
        { id: 'brand-1', name: 'Ferragamo' },
        { id: 'SS-Pre', seasonGroupId: 'SS', seasonType: 'Pre' }
      );
    });

    await act(async () => {
      await result.current.handleSaveBudget();
    });

    expect(mockBudgetService.update).toHaveBeenCalledWith(
      'budget-1',
      expect.objectContaining({
        comment: 'Test budget',
      })
    );
  });

  // ── submitBudget ────────────────────────────────────────────

  it('should call budgetService.submit and refresh', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.submitBudget('budget-1');
    });

    expect(mockBudgetService.submit).toHaveBeenCalledWith('budget-1');
    expect(mockBudgetService.getAll).toHaveBeenCalled();
  });

  it('should set error when submit fails', async () => {
    mockBudgetService.submit.mockRejectedValueOnce(new Error('Submit failed'));

    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.submitBudget('budget-1');
    });

    expect(result.current.error).toBe('Submit failed');
  });

  // ── approveBudget ───────────────────────────────────────────

  it('should call approveL1 for level 1 APPROVED', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.approveBudget('budget-1', 1, 'APPROVED', 'Looks good');
    });

    expect(mockBudgetService.approveL1).toHaveBeenCalledWith('budget-1', 'Looks good');
  });

  it('should call rejectL1 for level 1 REJECTED', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.approveBudget('budget-1', 1, 'REJECTED', 'Need changes');
    });

    expect(mockBudgetService.rejectL1).toHaveBeenCalledWith('budget-1', 'Need changes');
  });

  it('should call approveL2 for level 2 APPROVED', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.approveBudget('budget-1', 2, 'APPROVED');
    });

    expect(mockBudgetService.approveL2).toHaveBeenCalledWith('budget-1', undefined);
  });

  it('should call rejectL2 for level 2 REJECTED', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.approveBudget('budget-1', 2, 'REJECTED', 'Rejected');
    });

    expect(mockBudgetService.rejectL2).toHaveBeenCalledWith('budget-1', 'Rejected');
  });
});
