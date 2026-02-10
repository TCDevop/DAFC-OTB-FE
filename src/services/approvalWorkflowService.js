import api from './api';

export const approvalWorkflowService = {
  async getAll(brandId = null) {
    const params = brandId ? { brandId } : {};
    const response = await api.get('/approval-workflow', { params });
    return response.data.data || response.data;
  },

  async getByBrand(brandId) {
    const response = await api.get(`/approval-workflow/brand/${brandId}`);
    return response.data.data || response.data;
  },

  async getAvailableRoles() {
    const response = await api.get('/approval-workflow/roles');
    return response.data.data || response.data;
  },

  async create(data) {
    const response = await api.post('/approval-workflow', data);
    return response.data.data || response.data;
  },

  async update(id, data) {
    const response = await api.patch(`/approval-workflow/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id) {
    const response = await api.delete(`/approval-workflow/${id}`);
    return response.data;
  },

  async reorderSteps(brandId, stepIds) {
    const response = await api.post(`/approval-workflow/brand/${brandId}/reorder`, { stepIds });
    return response.data.data || response.data;
  },
};

export default approvalWorkflowService;
