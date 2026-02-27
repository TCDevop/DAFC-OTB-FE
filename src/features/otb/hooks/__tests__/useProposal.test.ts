import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  mockApiProposal,
  mockSkuCatalog,
} from '../../../../test/mock-services';

// ─── Hoisted Mocks ──────────────────────────────────────────────

const { mockProposalService, mockMasterDataService } = vi.hoisted(() => {
  const proposalSvc = {
    getAll: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue({}),
    getStatistics: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    addProduct: vi.fn().mockResolvedValue({}),
    bulkAddProducts: vi.fn().mockResolvedValue({}),
    updateProduct: vi.fn().mockResolvedValue({}),
    removeProduct: vi.fn().mockResolvedValue({}),
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
  return { mockProposalService: proposalSvc, mockMasterDataService: masterSvc };
});

vi.mock('../../../../services', () => ({
  proposalService: mockProposalService,
  masterDataService: mockMasterDataService,
}));

import { useProposal } from '../useProposal';

// ─── Tests ──────────────────────────────────────────────────────

describe('useProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProposalService.getAll.mockResolvedValue([mockApiProposal()]);
    mockProposalService.getOne.mockResolvedValue(mockApiProposal());
    mockMasterDataService.getSkuCatalog.mockResolvedValue(mockSkuCatalog);
  });

  // ── Initialization ──────────────────────────────────────────

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useProposal());
    expect(result.current.proposals).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.showProposalDetail).toBe(false);
    expect(result.current.selectedProposal).toBeNull();
    expect(result.current.skuCatalog).toEqual([]);
  });

  // ── fetchProposals ──────────────────────────────────────────

  it('should fetch proposals and transform response', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.fetchProposals();
    });

    expect(result.current.proposals).toHaveLength(1);
    const proposal = result.current.proposals[0];
    expect(proposal.id).toBe('proposal-1');
    expect(proposal.status).toBe('draft');
    expect(proposal.totalValue).toBe(500000000);
    expect(proposal.products).toHaveLength(1);
  });

  it('should handle array response (no .data wrapper)', async () => {
    mockProposalService.getAll.mockResolvedValueOnce([mockApiProposal()]);

    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.fetchProposals();
    });

    expect(result.current.proposals).toHaveLength(1);
  });

  it('should pass budgetId filter to getAll', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.fetchProposals('budget-1');
    });

    expect(mockProposalService.getAll).toHaveBeenCalledWith({ budgetId: 'budget-1' });
  });

  it('should set error state on fetch failure', async () => {
    mockProposalService.getAll.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.fetchProposals();
    });

    expect(result.current.error).toBe('Network error');
  });

  // ── fetchSkuCatalog ─────────────────────────────────────────

  it('should fetch SKU catalog', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.fetchSkuCatalog({ gender: 'Female' });
    });

    expect(mockMasterDataService.getSkuCatalog).toHaveBeenCalledWith({ gender: 'Female' });
    expect(result.current.skuCatalog).toEqual(mockSkuCatalog);
  });

  // ── createProposal ─────────────────────────────────────────

  it('should create proposal and refresh list', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.createProposal({ budgetId: 'budget-1', ticketName: 'New' });
    });

    expect(mockProposalService.create).toHaveBeenCalledWith({
      budgetId: 'budget-1',
      ticketName: 'New',
    });
    expect(mockProposalService.getAll).toHaveBeenCalled();
  });

  // ── addProduct ──────────────────────────────────────────────

  it('should add product and refresh', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.addProduct('proposal-1', { skuId: 'sku-1', orderQty: 10 });
    });

    expect(mockProposalService.addProduct).toHaveBeenCalledWith('proposal-1', {
      skuId: 'sku-1',
      orderQty: 10,
    });
  });

  // ── bulkAddProducts ─────────────────────────────────────────

  it('should bulk add products', async () => {
    const products = [{ skuId: 'sku-1' }, { skuId: 'sku-2' }];
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.bulkAddProducts('proposal-1', products);
    });

    expect(mockProposalService.bulkAddProducts).toHaveBeenCalledWith('proposal-1', products);
  });

  // ── updateProduct ───────────────────────────────────────────

  it('should update product', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.updateProduct('proposal-1', 'prod-1', { orderQty: 25 });
    });

    expect(mockProposalService.updateProduct).toHaveBeenCalledWith('proposal-1', 'prod-1', {
      orderQty: 25,
    });
  });

  // ── removeProduct ───────────────────────────────────────────

  it('should remove product', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.removeProduct('proposal-1', 'prod-1');
    });

    expect(mockProposalService.removeProduct).toHaveBeenCalledWith('proposal-1', 'prod-1');
  });

  // ── submitProposal ──────────────────────────────────────────

  it('should submit proposal and refresh', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.submitProposal('proposal-1');
    });

    expect(mockProposalService.submit).toHaveBeenCalledWith('proposal-1');
    expect(mockProposalService.getAll).toHaveBeenCalled();
  });

  // ── approveProposal ─────────────────────────────────────────

  it('should call approveL1 for level 1 APPROVED', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.approveProposal('proposal-1', 1, 'APPROVED', 'Good');
    });

    expect(mockProposalService.approveL1).toHaveBeenCalledWith('proposal-1', 'Good');
  });

  it('should call rejectL2 for level 2 REJECTED', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.approveProposal('proposal-1', 2, 'REJECTED', 'Bad');
    });

    expect(mockProposalService.rejectL2).toHaveBeenCalledWith('proposal-1', 'Bad');
  });

  it('should call approveL2 for level 2 APPROVED', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.approveProposal('proposal-1', 2, 'APPROVED');
    });

    expect(mockProposalService.approveL2).toHaveBeenCalledWith('proposal-1', undefined);
  });

  // ── deleteProposal ──────────────────────────────────────────

  it('should delete proposal and refresh', async () => {
    const { result } = renderHook(() => useProposal());

    await act(async () => {
      await result.current.deleteProposal('proposal-1');
    });

    expect(mockProposalService.delete).toHaveBeenCalledWith('proposal-1');
    expect(mockProposalService.getAll).toHaveBeenCalled();
  });
});
