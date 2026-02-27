import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock for axios instance ─────────────────────────────

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../api', () => ({
  default: mockApi,
  invalidateCache: vi.fn(),
  clearCache: vi.fn(),
}));

// Import services AFTER mocking api
import { budgetService } from '../budgetService';
import { planningService } from '../planningService';
import { proposalService } from '../proposalService';
import { approvalService } from '../approvalService';
import { authService } from '../authService';
import { masterDataService } from '../masterDataService';

// ─── Helper ──────────────────────────────────────────────────────

const wrapResponse = (data: any) => ({ data: { data } });
const wrapResponseFlat = (data: any) => ({ data });

// ─── Budget Service ──────────────────────────────────────────────

describe('budgetService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll should call GET /budgets with filters', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponseFlat({ data: [] }));
    await budgetService.getAll({ fiscalYear: 2025 });
    expect(mockApi.get).toHaveBeenCalledWith('/budgets', { params: { fiscalYear: 2025 } });
  });

  it('getOne should call GET /budgets/:id', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponse({ id: '1' }));
    const result = await budgetService.getOne('1');
    expect(mockApi.get).toHaveBeenCalledWith('/budgets/1');
    expect(result).toEqual({ id: '1' });
  });

  it('create should call POST /budgets', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({ id: '1' }));
    const result = await budgetService.create({ name: 'test' });
    expect(mockApi.post).toHaveBeenCalledWith('/budgets', { name: 'test' });
    expect(result).toEqual({ id: '1' });
  });

  it('update should call PUT /budgets/:id', async () => {
    mockApi.put.mockResolvedValueOnce(wrapResponse({ id: '1', name: 'updated' }));
    await budgetService.update('1', { name: 'updated' });
    expect(mockApi.put).toHaveBeenCalledWith('/budgets/1', { name: 'updated' });
  });

  it('submit should call POST /budgets/:id/submit', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({ status: 'SUBMITTED' }));
    await budgetService.submit('1');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/1/submit');
  });

  it('approveL1 should POST with APPROVED action', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await budgetService.approveL1('1', 'Looks good');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/1/approve/level1', {
      action: 'APPROVED',
      comment: 'Looks good',
    });
  });

  it('approveL2 should POST with APPROVED action', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await budgetService.approveL2('1');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/1/approve/level2', {
      action: 'APPROVED',
      comment: '',
    });
  });

  it('rejectL1 should POST with REJECTED action', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await budgetService.rejectL1('1', 'Bad');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/1/approve/level1', {
      action: 'REJECTED',
      comment: 'Bad',
    });
  });

  it('rejectL2 should POST with REJECTED action', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await budgetService.rejectL2('1', 'Bad');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/1/approve/level2', {
      action: 'REJECTED',
      comment: 'Bad',
    });
  });

  it('delete should call DELETE /budgets/:id', async () => {
    mockApi.delete.mockResolvedValueOnce(wrapResponseFlat({ success: true }));
    await budgetService.delete('1');
    expect(mockApi.delete).toHaveBeenCalledWith('/budgets/1');
  });
});

// ─── Planning Service ────────────────────────────────────────────

describe('planningService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll should call GET /planning', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponseFlat({ data: [] }));
    await planningService.getAll({ budgetId: 'b1' });
    expect(mockApi.get).toHaveBeenCalledWith('/planning', { params: { budgetId: 'b1' } });
  });

  it('copy should call POST /planning/:id/copy', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({ id: '2' }));
    const result = await planningService.copy('1');
    expect(mockApi.post).toHaveBeenCalledWith('/planning/1/copy');
    expect(result).toEqual({ id: '2' });
  });

  it('finalize should call POST /planning/:id/final', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({ isFinal: true }));
    const result = await planningService.finalize('1');
    expect(mockApi.post).toHaveBeenCalledWith('/planning/1/final');
    expect(result).toEqual({ isFinal: true });
  });

  it('updateDetail should call PATCH', async () => {
    mockApi.patch.mockResolvedValueOnce(wrapResponse({}));
    await planningService.updateDetail('p1', 'd1', { userBuyPct: 0.7 });
    expect(mockApi.patch).toHaveBeenCalledWith('/planning/p1/details/d1', { userBuyPct: 0.7 });
  });
});

// ─── Proposal Service ────────────────────────────────────────────

describe('proposalService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addProduct should POST to /proposals/:id/products', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await proposalService.addProduct('p1', { skuId: 'sku-1' });
    expect(mockApi.post).toHaveBeenCalledWith('/proposals/p1/products', { skuId: 'sku-1' });
  });

  it('bulkAddProducts should POST with products array', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await proposalService.bulkAddProducts('p1', [{ skuId: 'sku-1' }]);
    expect(mockApi.post).toHaveBeenCalledWith('/proposals/p1/products/bulk', {
      products: [{ skuId: 'sku-1' }],
    });
  });

  it('updateProduct should PATCH', async () => {
    mockApi.patch.mockResolvedValueOnce(wrapResponse({}));
    await proposalService.updateProduct('p1', 'prod-1', { orderQty: 20 });
    expect(mockApi.patch).toHaveBeenCalledWith('/proposals/p1/products/prod-1', { orderQty: 20 });
  });

  it('removeProduct should DELETE', async () => {
    mockApi.delete.mockResolvedValueOnce(wrapResponseFlat({ success: true }));
    await proposalService.removeProduct('p1', 'prod-1');
    expect(mockApi.delete).toHaveBeenCalledWith('/proposals/p1/products/prod-1');
  });
});

// ─── Approval Service ────────────────────────────────────────────

describe('approvalService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPending should aggregate from budgets, planning, proposals', async () => {
    mockApi.get.mockResolvedValue(wrapResponseFlat({
      data: [{ id: '1', status: 'SUBMITTED', updatedAt: '2026-01-01' }],
    }));

    const pending = await approvalService.getPending();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(mockApi.get).toHaveBeenCalled();
  });

  it('approve should dispatch to correct budget service for L1', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await approvalService.approve('budget', 'b1', 1, 'OK');
    expect(mockApi.post).toHaveBeenCalledWith('/budgets/b1/approve/level1', {
      action: 'APPROVED',
      comment: 'OK',
    });
  });

  it('approve should dispatch to planning service for L2', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await approvalService.approve('planning', 'p1', 2, 'OK');
    expect(mockApi.post).toHaveBeenCalledWith('/planning/p1/approve/level2', {
      action: 'APPROVED',
      comment: 'OK',
    });
  });

  it('reject should dispatch to proposal service', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({}));
    await approvalService.reject('proposal', 'pr1', 1, 'Not good');
    expect(mockApi.post).toHaveBeenCalledWith('/proposals/pr1/approve/level1', {
      action: 'REJECTED',
      comment: 'Not good',
    });
  });

  it('approve should throw for unknown entity type', async () => {
    await expect(approvalService.approve('unknown', '1', 1)).rejects.toThrow(
      'Unknown entity type: unknown'
    );
  });

  it('reject should throw for unknown entity type', async () => {
    await expect(approvalService.reject('unknown', '1', 1)).rejects.toThrow(
      'Unknown entity type: unknown'
    );
  });
});

// ─── Auth Service ────────────────────────────────────────────────

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('login should store tokens and return user', async () => {
    mockApi.post.mockResolvedValueOnce(wrapResponse({
      accessToken: 'jwt-123',
      refreshToken: 'refresh-123',
      user: { id: '1', name: 'Admin' },
    }));

    const result = await authService.login('admin@dafc.com', 'password');

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@dafc.com',
      password: 'password',
    }, { timeout: 120000 });

    expect(result.accessToken).toBe('jwt-123');
    expect(result.user.name).toBe('Admin');
    expect(localStorage.getItem('accessToken')).toBe('jwt-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-123');
  });

  it('login should retry on timeout', async () => {
    const timeoutError = new Error('timeout');
    (timeoutError as any).code = 'ECONNABORTED';

    mockApi.post
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(wrapResponse({
        accessToken: 'jwt-123',
        refreshToken: 'refresh-123',
        user: { id: '1' },
      }));

    const onRetry = vi.fn();
    const result = await authService.login('admin@dafc.com', 'password', onRetry);

    expect(onRetry).toHaveBeenCalledWith(1);
    expect(result.accessToken).toBe('jwt-123');
  });

  it('login should throw after max retries on persistent timeout', async () => {
    const timeoutError = new Error('timeout');
    (timeoutError as any).code = 'ECONNABORTED';

    mockApi.post
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError);

    await expect(authService.login('admin@dafc.com', 'password')).rejects.toThrow();
  });

  it('logout should clear tokens', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    await authService.logout();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('isAuthenticated should return true when token exists', () => {
    localStorage.setItem('accessToken', 'token');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated should return false when no token', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('getProfile should call GET /auth/me', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponse({ id: '1', name: 'Admin' }));
    const result = await authService.getProfile();
    expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual({ id: '1', name: 'Admin' });
  });
});

// ─── Master Data Service ─────────────────────────────────────────

describe('masterDataService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getBrands should call GET /master/brands', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponse([{ id: '1', name: 'Ferragamo' }]));
    const result = await masterDataService.getBrands();
    expect(mockApi.get).toHaveBeenCalledWith('/master/brands');
    expect(result).toEqual([{ id: '1', name: 'Ferragamo' }]);
  });

  it('getStores should call GET /master/stores', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponse([{ id: '1', name: 'REX' }]));
    const result = await masterDataService.getStores();
    expect(mockApi.get).toHaveBeenCalledWith('/master/stores');
    expect(result).toEqual([{ id: '1', name: 'REX' }]);
  });

  it('getSkuCatalog should pass params', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponseFlat({ data: [] }));
    await masterDataService.getSkuCatalog({ gender: 'Female' });
    expect(mockApi.get).toHaveBeenCalledWith('/master/sku-catalog', { params: { gender: 'Female' } });
  });

  it('getSubCategories should flatten category hierarchy', async () => {
    mockApi.get.mockResolvedValueOnce(wrapResponse([
      {
        id: 'c1', name: 'RTW', code: 'RTW',
        subCategories: [{ id: 's1', name: 'Outerwear' }],
      },
    ]));

    const result = await masterDataService.getSubCategories();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Outerwear');
    expect(result[0].parent.name).toBe('RTW');
  });
});
