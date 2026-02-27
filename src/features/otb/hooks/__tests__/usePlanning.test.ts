import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  mockCollections,
  mockGenders,
  mockCategories,
  mockApiPlanning,
} from '../../../../test/mock-services';

// ─── Hoisted Mocks ──────────────────────────────────────────────

const { mockPlanningService, mockMasterDataService } = vi.hoisted(() => {
  const planningSvc = {
    getAll: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateDetail: vi.fn().mockResolvedValue({}),
    copy: vi.fn().mockResolvedValue({}),
    submit: vi.fn().mockResolvedValue({}),
    approveL1: vi.fn().mockResolvedValue({}),
    approveL2: vi.fn().mockResolvedValue({}),
    rejectL1: vi.fn().mockResolvedValue({}),
    rejectL2: vi.fn().mockResolvedValue({}),
    finalize: vi.fn().mockResolvedValue({}),
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
  return { mockPlanningService: planningSvc, mockMasterDataService: masterSvc };
});

vi.mock('../../../../services', () => ({
  planningService: mockPlanningService,
  masterDataService: mockMasterDataService,
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

import { usePlanning } from '../usePlanning';

// ─── Tests ──────────────────────────────────────────────────────

describe('usePlanning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMasterDataService.getCollections.mockResolvedValue(mockCollections);
    mockMasterDataService.getGenders.mockResolvedValue(mockGenders);
    mockMasterDataService.getCategories.mockResolvedValue(mockCategories);
    mockPlanningService.getAll.mockResolvedValue([mockApiPlanning()]);
    mockPlanningService.getOne.mockResolvedValue({ data: mockApiPlanning() });
  });

  // ── Initialization ──────────────────────────────────────────

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePlanning());
    expect(result.current.plannings).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.showPlanningDetail).toBe(false);
  });

  it('should fetch collections, genders, categories on mount', async () => {
    renderHook(() => usePlanning());

    await waitFor(() => {
      expect(mockMasterDataService.getCollections).toHaveBeenCalledTimes(1);
      expect(mockMasterDataService.getGenders).toHaveBeenCalledTimes(1);
      expect(mockMasterDataService.getCategories).toHaveBeenCalledTimes(1);
    });
  });

  it('should set collections from API', async () => {
    const { result } = renderHook(() => usePlanning());
    await waitFor(() => {
      expect(result.current.collections).toEqual(mockCollections);
    });
  });

  it('should set genders from API', async () => {
    const { result } = renderHook(() => usePlanning());
    await waitFor(() => {
      expect(result.current.genders).toEqual(mockGenders);
    });
  });

  it('should set categories from API', async () => {
    const { result } = renderHook(() => usePlanning());
    await waitFor(() => {
      expect(result.current.categories).toEqual(mockCategories);
    });
  });

  // ── fetchPlannings ──────────────────────────────────────────

  it('should fetch plannings and transform response', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.refreshPlannings();
    });

    expect(result.current.plannings).toHaveLength(1);
    const planning = result.current.plannings[0];
    expect(planning.id).toBe('planning-1');
    expect(planning.status).toBe('draft');
  });

  it('should transform planning details with percentage conversion', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.refreshPlannings();
    });

    const detail = result.current.plannings[0].details[0];
    expect(detail.lastSeasonSalesPct).toBe(50);
    expect(detail.systemBuyPct).toBe(50);
    expect(detail.userBuyPct).toBe(50);
  });

  it('should set error when fetch fails', async () => {
    mockPlanningService.getAll.mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.refreshPlannings();
    });

    expect(result.current.error).toBe('Fetch failed');
  });

  // ── handleUpdatePlanningDetail ──────────────────────────────

  it('should update userBuyPct and recalculate otbValue', async () => {
    const { result } = renderHook(() => usePlanning());

    await waitFor(() => {
      expect(result.current.collections).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleOpenPlanningDetail(
        { id: 'detail-new', budgetAmount: '1000000000' },
        { id: 'budget-1' }
      );
    });

    const firstDetail = result.current.planningDetailData[0];

    act(() => {
      result.current.handleUpdatePlanningDetail(firstDetail.id, 'userBuyPct', '70');
    });

    const updated = result.current.planningDetailData.find(
      (d: any) => d.id === firstDetail.id
    );
    expect(updated.userBuyPct).toBe(70);
    expect(updated.otbValue).toBe(700000000);
  });

  it('should calculate variancePct when userBuyPct changes', async () => {
    const { result } = renderHook(() => usePlanning());

    await waitFor(() => {
      expect(result.current.collections).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleOpenPlanningDetail(
        { id: 'detail-new', budgetAmount: '1000000000' },
        { id: 'budget-1' }
      );
    });

    const firstDetail = result.current.planningDetailData[0];

    act(() => {
      result.current.handleUpdatePlanningDetail(firstDetail.id, 'userBuyPct', '70');
    });

    const updated = result.current.planningDetailData.find(
      (d: any) => d.id === firstDetail.id
    );
    expect(updated.varianceVsLastSeasonPct).toBe(20);
  });

  // ── handleSavePlanning ──────────────────────────────────────

  it('should create new planning when no currentPlanningId', async () => {
    const { result } = renderHook(() => usePlanning());

    await waitFor(() => {
      expect(result.current.collections).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleOpenPlanningDetail(
        { id: 'detail-new', budgetAmount: '1000000000' },
        { id: 'budget-1' }
      );
    });

    await act(async () => {
      await result.current.handleSavePlanning();
    });

    expect(mockPlanningService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetDetailId: 'detail-new',
        versionName: 'Version 1',
      })
    );
  });

  it('should convert percentages to decimals for API', async () => {
    const { result } = renderHook(() => usePlanning());

    await waitFor(() => {
      expect(result.current.collections).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleOpenPlanningDetail(
        { id: 'detail-new', budgetAmount: '1000000000' },
        { id: 'budget-1' }
      );
    });

    await act(async () => {
      await result.current.handleSavePlanning();
    });

    const callArgs = mockPlanningService.create.mock.calls[0][0];
    const firstDetail = callArgs.details[0];
    expect(firstDetail.userBuyPct).toBe(0.5);
    expect(firstDetail.systemBuyPct).toBe(0.5);
  });

  // ── submitPlanning ──────────────────────────────────────────

  it('should call planningService.submit', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.submitPlanning('planning-1');
    });

    expect(mockPlanningService.submit).toHaveBeenCalledWith('planning-1');
  });

  // ── approvePlanning ─────────────────────────────────────────

  it('should call approveL1 for level 1 APPROVED', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.approvePlanning('planning-1', 1, 'APPROVED', 'OK');
    });

    expect(mockPlanningService.approveL1).toHaveBeenCalledWith('planning-1', 'OK');
  });

  it('should call rejectL2 for level 2 REJECTED', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.approvePlanning('planning-1', 2, 'REJECTED', 'No');
    });

    expect(mockPlanningService.rejectL2).toHaveBeenCalledWith('planning-1', 'No');
  });

  // ── copyPlanning ────────────────────────────────────────────

  it('should call planningService.copy and refresh', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.copyPlanning('planning-1');
    });

    expect(mockPlanningService.copy).toHaveBeenCalledWith('planning-1');
    expect(mockPlanningService.getAll).toHaveBeenCalled();
  });

  // ── markPlanningFinal ───────────────────────────────────────

  it('should call planningService.finalize and refresh', async () => {
    const { result } = renderHook(() => usePlanning());

    await act(async () => {
      await result.current.markPlanningFinal('planning-1');
    });

    expect(mockPlanningService.finalize).toHaveBeenCalledWith('planning-1');
    expect(mockPlanningService.getAll).toHaveBeenCalled();
  });
});
