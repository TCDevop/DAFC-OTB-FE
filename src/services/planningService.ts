// ═══════════════════════════════════════════════════════════════════════════
// Planning Service - Version Management + OTB Calculations
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { approvalHelper } from './approvalHelper';
import { extract, normalizeList } from './serviceUtils';

export const planningService = {
  // Get all planning versions with filters
  async getAll(filters: any = {}) {
    try {
      const response = await api.get('/planning', { params: filters });
      return normalizeList(extract(response));
    } catch (err: any) {
      console.error('[planningService.getAll]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get single planning version by ID
  async getOne(id: string) {
    try {
      const response = await api.get(`/planning/${id}`);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.getOne]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Create new planning version
  async create(data: any) {
    try {
      const response = await api.post('/planning', data);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.create]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Update planning version (DRAFT only)
  async update(id: string, data: any) {
    try {
      const response = await api.put(`/planning/${id}`, data);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.update]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Update single detail
  async updateDetail(planningId: string, detailId: string, data: any) {
    try {
      const response = await api.patch(`/planning/${planningId}/details/${detailId}`, data);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.updateDetail]', planningId, detailId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Copy existing version to new version
  async copy(id: string) {
    try {
      const response = await api.post(`/planning/${id}/copy`);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.copy]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Submit for approval
  async submit(id: string) {
    try {
      const response = await api.post(`/planning/${id}/submit`);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.submit]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Approval methods (delegated to approvalHelper)
  approveL1: (id: string, comment?: string) => approvalHelper.approveL1('planning', id, comment),
  approveL2: (id: string, comment?: string) => approvalHelper.approveL2('planning', id, comment),
  rejectL1: (id: string, comment?: string) => approvalHelper.rejectL1('planning', id, comment),
  rejectL2: (id: string, comment?: string) => approvalHelper.rejectL2('planning', id, comment),

  // Mark as final version
  async finalize(id: string) {
    try {
      const response = await api.post(`/planning/${id}/final`);
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.finalize]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Delete planning (DRAFT only)
  async delete(id: string) {
    try {
      const response = await api.delete(`/planning/${id}`);
      return response.data;
    } catch (err: any) {
      console.error('[planningService.delete]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get historical planning data for year/season/brand comparison
  async getHistorical(params: { fiscalYear: number; seasonGroupName: string; seasonName: string; brandId: string }) {
    try {
      const response = await api.get('/planning/historical', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[planningService.getHistorical]', err?.response?.status, err?.message);
      return null;
    }
  }
};

export default planningService;
