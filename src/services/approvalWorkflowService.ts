import api from './api';
import { extract } from './serviceUtils';

export const approvalWorkflowService = {
  // List users available as approvers
  async getApproverUsers() {
    const response: any = await api.get('/approval-workflow/users');
    return extract(response);
  },

  // List all workflows (optionally filtered by groupBrandId)
  async getAll(groupBrandId: any = null) {
    const params: any = groupBrandId ? { groupBrandId } : {};
    const response: any = await api.get('/approval-workflow', { params });
    return extract(response);
  },

  // Get workflow by ID with levels
  async getOne(id: any) {
    const response: any = await api.get(`/approval-workflow/${id}`);
    return extract(response);
  },

  // Get workflows for a group brand
  async getByGroupBrand(groupBrandId: any) {
    const response: any = await api.get(`/approval-workflow/group-brand/${groupBrandId}`);
    return extract(response);
  },

  // Create a new approval workflow
  async create(data: { groupBrandId: string; workflowName: string; levels?: any[] }) {
    const response: any = await api.post('/approval-workflow', data);
    return extract(response);
  },

  // Add a level to a workflow
  async addLevel(workflowId: any, data: { levelOrder: number; levelName: string; approverUserId: string; isRequired: boolean }) {
    const response: any = await api.post(`/approval-workflow/${workflowId}/levels`, data);
    return extract(response);
  },

  // Update a workflow level
  async updateLevel(levelId: any, data: any) {
    const response: any = await api.patch(`/approval-workflow/levels/${levelId}`, data);
    return extract(response);
  },

  // Delete a workflow level
  async deleteLevel(levelId: any) {
    const response: any = await api.delete(`/approval-workflow/levels/${levelId}`);
    return extract(response);
  },

  // Delete a workflow
  async delete(id: any) {
    const response: any = await api.delete(`/approval-workflow/${id}`);
    return extract(response);
  },

  // Reorder workflow levels
  async reorderLevels(workflowId: any, levelIds: string[]) {
    const response: any = await api.post(`/approval-workflow/${workflowId}/reorder`, { levelIds });
    return extract(response);
  },
};

export default approvalWorkflowService;
