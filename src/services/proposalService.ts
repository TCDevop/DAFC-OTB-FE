// ═══════════════════════════════════════════════════════════════════════════
// Proposal Service - SKU Products + Store Allocation
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { approvalHelper } from './approvalHelper';

const extract = (response: any) => response.data?.data ?? response.data;

const normalizeList = (items: any) => {
  if (!Array.isArray(items)) return items;
  return items.map((item: any) => item.status ? { ...item, status: item.status.toLowerCase() } : item);
};

/** Wrap an async API call with consistent extract + error logging */
const withErrorLog = async <T>(tag: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    console.error(`[proposalService.${tag}]`, err?.response?.status, err?.message);
    throw err;
  }
};

export const proposalService = {
  // ─── HEADERS ────────────────────────────────────────────────────────────

  getAll: (filters: Record<string, any> = {}) =>
    withErrorLog('getAll', async () => normalizeList(extract(await api.get('/proposals', { params: filters })))),

  getOne: (id: string) =>
    withErrorLog('getOne', async () => extract(await api.get(`/proposals/${id}`))),

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

  getSizingHeadersByProposal: (skuProposalId: string) =>
    withErrorLog('getSizingHeaders', async () => extract(await api.get(`/proposals/items/${skuProposalId}/sizing-headers`))),

  updateSizingHeader: (headerId: string, data: any) =>
    withErrorLog('updateSizingHeader', async () => extract(await api.patch(`/proposals/sizing-headers/${headerId}`, data))),

  // ─── APPROVAL (delegated) ─────────────────────────────────────────────

  approveL1: (id: string, comment?: string) => approvalHelper.approveL1('proposal', id, comment),
  approveL2: (id: string, comment?: string) => approvalHelper.approveL2('proposal', id, comment),
  rejectL1: (id: string, comment?: string) => approvalHelper.rejectL1('proposal', id, comment),
  rejectL2: (id: string, comment?: string) => approvalHelper.rejectL2('proposal', id, comment),
};

export default proposalService;
