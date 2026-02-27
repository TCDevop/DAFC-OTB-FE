import api from './api';

export const approvalWorkflowService = {
  async getAll(brandId: any = null) {
    const params: any = brandId ? { brandId } : {};
    const response: any = await api.get('/approval-workflow', { params });
    return response.data.data || response.data;
  },

  async getByBrand(brandId: any) {
    const response: any = await api.get(`/approval-workflow/brand/${brandId}`);
    return response.data.data || response.data;
  },

  async getAvailableRoles() {
    const response: any = await api.get('/approval-workflow/roles');
    return response.data.data || response.data;
  },

  async create(data: any) {
    const response: any = await api.post('/approval-workflow', data);
    return response.data.data || response.data;
  },

  async update(id: any, data: any) {
    const response: any = await api.patch(`/approval-workflow/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: any) {
    const response: any = await api.delete(`/approval-workflow/${id}`);
    return response.data;
  },

  async reorderSteps(brandId: any, stepIds: any) {
    const response: any = await api.post(`/approval-workflow/brand/${brandId}/reorder`, { stepIds });
    return response.data.data || response.data;
  },
};

export default approvalWorkflowService;
