// ═══════════════════════════════════════════════════════════════════════════
// Approval Service - Pending Items + Approval History
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { budgetService } from './budgetService';
import { planningService } from './planningService';
import { proposalService } from './proposalService';

export const approvalService = {
  // Get all pending approvals for current user
  // NOTE: If backend doesn't have /approvals/pending endpoint,
  // we aggregate from budgets, planning, proposals with SUBMITTED/LEVEL1_APPROVED status
  async getPending() {
    try {
      // Try direct endpoint first
      const response = await api.get('/approvals/pending');
      return response.data.data || response.data;
    } catch (error) {
      // Fallback: aggregate from individual modules
      const [budgets, plannings, proposals] = await Promise.all([
        budgetService.getAll({ status: 'SUBMITTED' }).catch(() => ({ data: [] })),
        budgetService.getAll({ status: 'LEVEL1_APPROVED' }).catch(() => ({ data: [] })),
        planningService.getAll({ status: 'SUBMITTED' }).catch(() => ({ data: [] })),
        planningService.getAll({ status: 'LEVEL1_APPROVED' }).catch(() => ({ data: [] })),
        proposalService.getAll({ status: 'SUBMITTED' }).catch(() => ({ data: [] })),
        proposalService.getAll({ status: 'LEVEL1_APPROVED' }).catch(() => ({ data: [] })),
      ]);

      const pending = [];

      // Add budgets
      [...(budgets.data || [])].forEach(b => {
        pending.push({
          entityType: 'budget',
          entityId: b.id,
          level: b.status === 'SUBMITTED' ? 1 : 2,
          data: b,
          submittedAt: b.updatedAt
        });
      });

      // Add plannings
      [...(plannings.data || [])].forEach(p => {
        pending.push({
          entityType: 'planning',
          entityId: p.id,
          level: p.status === 'SUBMITTED' ? 1 : 2,
          data: p,
          submittedAt: p.updatedAt
        });
      });

      // Add proposals
      [...(proposals.data || [])].forEach(p => {
        pending.push({
          entityType: 'proposal',
          entityId: p.id,
          level: p.status === 'SUBMITTED' ? 1 : 2,
          data: p,
          submittedAt: p.updatedAt
        });
      });

      return pending;
    }
  },

  // Approve an item
  async approve(entityType, entityId, level, comment = '') {
    switch (entityType) {
      case 'budget':
        return level === 1
          ? budgetService.approveL1(entityId, comment)
          : budgetService.approveL2(entityId, comment);
      case 'planning':
        return level === 1
          ? planningService.approveL1(entityId, comment)
          : planningService.approveL2(entityId, comment);
      case 'proposal':
        return level === 1
          ? proposalService.approveL1(entityId, comment)
          : proposalService.approveL2(entityId, comment);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  },

  // Reject an item
  async reject(entityType, entityId, level, comment = '') {
    switch (entityType) {
      case 'budget':
        return level === 1
          ? budgetService.rejectL1(entityId, comment)
          : budgetService.rejectL2(entityId, comment);
      case 'planning':
        return level === 1
          ? planningService.rejectL1(entityId, comment)
          : planningService.rejectL2(entityId, comment);
      case 'proposal':
        return level === 1
          ? proposalService.rejectL1(entityId, comment)
          : proposalService.rejectL2(entityId, comment);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  },

  // Get approval history for an item
  async getHistory(entityType, entityId) {
    try {
      const response = await api.get(`/approvals/${entityType}/${entityId}/history`);
      return response.data.data || response.data;
    } catch (error) {
      // Fallback: get from the entity itself
      let entity;
      switch (entityType) {
        case 'budget':
          entity = await budgetService.getOne(entityId);
          break;
        case 'planning':
          entity = await planningService.getOne(entityId);
          break;
        case 'proposal':
          entity = await proposalService.getOne(entityId);
          break;
        default:
          return [];
      }
      return entity.approvals || [];
    }
  }
};

export default approvalService;
