// ═══════════════════════════════════════════════════════════════════════════
// Ticket Service - CRUD + Validation + Snapshot
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract, normalizeList } from './serviceUtils';

export const ticketService = {
  // List tickets with filters and pagination
  async getAll(filters: Record<string, any> = {}) {
    try {
      const response = await api.get('/tickets', { params: filters });
      return normalizeList(extract(response));
    } catch (err: any) {
      console.error('[ticketService.getAll]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get single ticket by ID (includes parsed snapshot)
  async getOne(id: string) {
    try {
      const response = await api.get(`/tickets/${id}`);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.getOne]', id, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Validate budget readiness before ticket creation (4-step check)
  async validate(data: { budgetId: string; seasonGroupId?: string; seasonId?: string }) {
    try {
      const response = await api.post('/tickets/validate', data);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.validate]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Create ticket (runs validation + builds snapshot atomically)
  async create(data: { budgetId: string; seasonGroupId: string; seasonId: string; force?: boolean }) {
    try {
      const response = await api.post('/tickets', data);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.create]', err?.response?.status, err?.message,
        '\n  → serverMessage:', err?.response?.data?.message || 'N/A',
        '\n  → fullResponse:', JSON.stringify(err?.response?.data));
      throw err;
    }
  },

  // Get ticket statistics
  async getStatistics() {
    try {
      const response = await api.get('/tickets/statistics');
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.getStatistics]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Compare ticket with previous rejected version
  async compare(ticketId: string) {
    try {
      const response = await api.get(`/tickets/${ticketId}/compare`);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.compare]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Process approval decision on a ticket
  async processApproval(ticketId: string, data: { approvalWorkflowLevelId: string; isApproved: boolean; comment?: string }) {
    try {
      const response = await api.post(`/tickets/${ticketId}/approve`, data);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.processApproval]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get approval history for a ticket
  async getApprovalHistory(ticketId: string) {
    try {
      const response = await api.get(`/tickets/${ticketId}/history`);
      return extract(response);
    } catch (err: any) {
      console.error('[ticketService.getApprovalHistory]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },
};

export default ticketService;
