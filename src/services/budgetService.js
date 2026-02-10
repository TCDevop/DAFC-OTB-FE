// ═══════════════════════════════════════════════════════════════════════════
// Budget Service - CRUD + Approval Workflow
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

export const budgetService = {
  // Get all budgets with filters
  async getAll(filters = {}) {
    const response = await api.get('/budgets', { params: filters });
    return response.data;
  },

  // Get single budget by ID
  async getOne(id) {
    const response = await api.get(`/budgets/${id}`);
    return response.data.data || response.data;
  },

  // Get budget statistics
  async getStatistics() {
    const response = await api.get('/budgets/statistics');
    return response.data.data || response.data;
  },

  // Create new budget
  async create(data) {
    const response = await api.post('/budgets', data);
    return response.data.data || response.data;
  },

  // Update budget (DRAFT only)
  async update(id, data) {
    const response = await api.put(`/budgets/${id}`, data);
    return response.data.data || response.data;
  },

  // Submit budget for approval
  async submit(id) {
    const response = await api.post(`/budgets/${id}/submit`);
    return response.data.data || response.data;
  },

  // Approve Level 1
  async approveL1(id, comment = '') {
    const response = await api.post(`/budgets/${id}/approve/level1`, {
      action: 'APPROVED',
      comment
    });
    return response.data.data || response.data;
  },

  // Approve Level 2
  async approveL2(id, comment = '') {
    const response = await api.post(`/budgets/${id}/approve/level2`, {
      action: 'APPROVED',
      comment
    });
    return response.data.data || response.data;
  },

  // Reject Level 1
  async rejectL1(id, comment = '') {
    const response = await api.post(`/budgets/${id}/approve/level1`, {
      action: 'REJECTED',
      comment
    });
    return response.data.data || response.data;
  },

  // Reject Level 2
  async rejectL2(id, comment = '') {
    const response = await api.post(`/budgets/${id}/approve/level2`, {
      action: 'REJECTED',
      comment
    });
    return response.data.data || response.data;
  },

  // Delete budget (DRAFT only, no linked planning)
  async delete(id) {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  }
};

export default budgetService;
