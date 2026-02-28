// ═══════════════════════════════════════════════════════════════════════════
// Approval Helper - Centralized Approval Operations
// Eliminates 12 duplicate approval methods across budget/planning/proposal
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract } from './serviceUtils';

export type EntityType = 'budget' | 'planning' | 'proposal';
type ApprovalAction = 'APPROVED' | 'REJECTED';

const ENDPOINTS: Record<EntityType, string> = {
  budget: '/budgets',
  planning: '/planning',
  proposal: '/proposals',
};

const executeApproval = async (
  entity: EntityType,
  id: string,
  level: 'level1' | 'level2',
  action: ApprovalAction,
  comment: string = ''
) => {
  const endpoint = `${ENDPOINTS[entity]}/${id}/approve/${level}`;
  try {
    const response = await api.post(endpoint, { action, comment });
    return extract(response);
  } catch (err: any) {
    console.error(`[approvalHelper.${action.toLowerCase()}.${level}]`, entity, id, err?.response?.status, err?.message);
    throw err;
  }
};

export const approvalHelper = {
  approveL1: (entity: EntityType, id: string, comment: string = '') =>
    executeApproval(entity, id, 'level1', 'APPROVED', comment),

  approveL2: (entity: EntityType, id: string, comment: string = '') =>
    executeApproval(entity, id, 'level2', 'APPROVED', comment),

  rejectL1: (entity: EntityType, id: string, comment: string = '') =>
    executeApproval(entity, id, 'level1', 'REJECTED', comment),

  rejectL2: (entity: EntityType, id: string, comment: string = '') =>
    executeApproval(entity, id, 'level2', 'REJECTED', comment),
};

export default approvalHelper;
