// ═══════════════════════════════════════════════════════════════════════════
// Proposal Service - SKU Products + Store Allocation
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { approvalHelper } from './approvalHelper';
import { extract, normalizeList } from './serviceUtils';

/** Wrap an async API call with consistent extract + error logging.
 *  Silently swallows AbortError / CancelError so callers don't see noise. */
const withErrorLog = async <T>(tag: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    // Don't log or rethrow if the request was intentionally cancelled
    if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
      throw err; // rethrow silently (no console.error)
    }
    console.error(`[proposalService.${tag}]`, err?.response?.status, err?.message);
    throw err;
  }
};

export const proposalService = {
  // ─── HEADERS ────────────────────────────────────────────────────────────

  getAll: (filters: Record<string, any> = {}, opts?: { signal?: AbortSignal }) =>
    withErrorLog('getAll', async () => normalizeList(extract(await api.get('/proposals', { params: filters, signal: opts?.signal })))),

  getOne: (id: string, opts?: { signal?: AbortSignal }) =>
    withErrorLog('getOne', async () => extract(await api.get(`/proposals/${id}`, { signal: opts?.signal }))),

  getStatistics: (budgetId?: string | null) =>
    withErrorLog('getStatistics', async () => extract(await api.get('/proposals/statistics', { params: budgetId ? { budgetId } : {} }))),

  create: (data: any) =>
    withErrorLog('create', async () => extract(await api.post('/proposals', data))),

  update: (id: string, data: any) =>
    withErrorLog('update', async () => extract(await api.put(`/proposals/${id}`, data))),

  delete: (id: string) =>
    withErrorLog('delete', async () => (await api.delete(`/proposals/${id}`)).data),

  submit: (id: string) =>
    withErrorLog('submit', async () => extract(await api.post(`/proposals/${id}/submit`))),

  saveFullProposal: (headerId: string, data: any) =>
    withErrorLog('saveFullProposal', async () => extract(await api.put(`/proposals/${headerId}/save-full`, data))),

  copyProposal: (headerId: string) =>
    withErrorLog('copyProposal', async () => extract(await api.post(`/proposals/${headerId}/copy`))),

  getHistorical: async (params: { fiscalYear: number; seasonGroupName: string; seasonName: string; brandId: string }) => {
    try {
      return extract(await api.get('/proposals/historical', { params }));
    } catch (err: any) {
      console.error('[proposalService.getHistorical]', err?.response?.status, err?.message);
      return null;
    }
  },

  // ─── SKU PROPOSAL ITEMS ────────────────────────────────────────────────

  addProduct: (proposalId: string, productData: any) =>
    withErrorLog('addProduct', async () => extract(await api.post(`/proposals/${proposalId}/products`, productData))),

  bulkAddProducts: (proposalId: string, products: any[]) =>
    withErrorLog('bulkAddProducts', async () => extract(await api.post(`/proposals/${proposalId}/products/bulk`, { products }))),

  updateProduct: (_proposalId: string, productId: string, data: any) =>
    withErrorLog('updateProduct', async () => extract(await api.patch(`/proposals/items/${productId}`, data))),

  removeProduct: (_proposalId: string, productId: string) =>
    withErrorLog('removeProduct', async () => (await api.delete(`/proposals/items/${productId}`)).data),

  // ─── ALLOCATIONS ───────────────────────────────────────────────────────

  createAllocations: (data: any) =>
    withErrorLog('createAllocations', async () => extract(await api.post('/proposals/allocations', data))),

  // ─── SIZING HEADERS ───────────────────────────────────────────────────

  getSizingHeadersByProposalHeader: (proposalHeaderId: string) =>
    withErrorLog('getSizingHeaders', async () => extract(await api.get(`/proposals/${proposalHeaderId}/sizing-headers`))),

  updateSizingHeader: (headerId: string, data: any) =>
    withErrorLog('updateSizingHeader', async () => extract(await api.patch(`/proposals/sizing-headers/${headerId}`, data))),

  // ─── APPROVAL (delegated) ─────────────────────────────────────────────

  approveL1: (id: string, comment?: string) => approvalHelper.approveL1('proposal', id, comment),
  approveL2: (id: string, comment?: string) => approvalHelper.approveL2('proposal', id, comment),
  rejectL1: (id: string, comment?: string) => approvalHelper.rejectL1('proposal', id, comment),
  rejectL2: (id: string, comment?: string) => approvalHelper.rejectL2('proposal', id, comment),
};

export default proposalService;
