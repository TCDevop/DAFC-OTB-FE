// ═══════════════════════════════════════════════════════════════════════════
// Budget Service - CRUD + Approval Workflow
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { approvalHelper } from './approvalHelper';
import { extract, normalizeList } from './serviceUtils';

export const budgetService = {
  // Get all budgets with filters
  async getAll(filters: any = {}) {
    try {
      const response = await api.get('/budgets', { params: filters });
      return normalizeList(extract(response));
    } catch (err: any) {
      console.error('[budgetService.getAll]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get single budget by ID
  async getOne(id: string) {
    try {
      const response = await api.get(`/budgets/${id}`);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.getOne]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get budget statistics
  async getStatistics(filters?: { fiscalYear?: number }) {
    try {
      const params: Record<string, any> = {};
      if (filters?.fiscalYear) params.fiscalYear = filters.fiscalYear;
      const response = await api.get('/budgets/statistics', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.getStatistics]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Create new budget
  async create(data: any) {
    try {
      const response = await api.post('/budgets', data);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.create]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Update budget (DRAFT only)
  async update(id: string, data: any) {
    try {
      const response = await api.put(`/budgets/${id}`, data);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.update]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Submit budget for approval
  async submit(id: string) {
    try {
      const response = await api.post(`/budgets/${id}/submit`);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.submit]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Approval methods (delegated to approvalHelper)
  approveL1: (id: string, comment?: string) => approvalHelper.approveL1('budget', id, comment),
  approveL2: (id: string, comment?: string) => approvalHelper.approveL2('budget', id, comment),
  rejectL1: (id: string, comment?: string) => approvalHelper.rejectL1('budget', id, comment),
  rejectL2: (id: string, comment?: string) => approvalHelper.rejectL2('budget', id, comment),

  // Delete budget (DRAFT only, no linked planning)
  async delete(id: string) {
    try {
      const response = await api.delete(`/budgets/${id}`);
      return response.data;
    } catch (err: any) {
      console.error('[budgetService.delete]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Set allocation version as final (unsets all others for same brand+budget)
  async setFinalAllocateVersion(headerId: string) {
    try {
      const response = await api.patch(`/budgets/allocations/${headerId}/set-final`);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.setFinalAllocateVersion]', headerId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Save (overwrite) existing allocate header rows
  async saveAllocation(headerId: string, allocations: { storeId: string; seasonGroupId: string; seasonId: string; budgetAmount: number }[]) {
    try {
      const response = await api.put(`/budgets/allocations/${headerId}`, { allocations });
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.saveAllocation]', headerId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Save as new allocate header version for a brand
  async saveAsNewAllocation(budgetId: string, brandId: string, allocations: { storeId: string; seasonGroupId: string; seasonId: string; budgetAmount: number }[]) {
    try {
      const response = await api.post(`/budgets/${budgetId}/allocations`, { brandId, allocations });
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.saveAsNewAllocation]', budgetId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Archive budget (APPROVED only)
  async archive(id: string) {
    try {
      const response = await api.patch(`/budgets/${id}/archive`);
      return extract(response);
    } catch (err: any) {
      console.error('[budgetService.archive]', id, err?.response?.status, err?.message);
      throw err;
    }
  }
};

export default budgetService;
