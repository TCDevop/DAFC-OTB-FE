// ═══════════════════════════════════════════════════════════════════════════
// Notification Service - Fetches user notifications from API
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract } from './serviceUtils';

export interface Notification {
  id: string;
  type: 'approval' | 'status_change' | 'pending_action';
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  createdAt: string;
  read: boolean;
}

const ALERT_TYPE_MAP: Record<string, Notification['type']> = {
  over_budget: 'status_change',
  approaching_limit: 'status_change',
  under_utilized: 'pending_action',
  store_concentration: 'status_change',
};

function mapAlert(alert: any): Notification {
  return {
    id: `${alert.budgetId}-${alert.alertType}`,
    type: ALERT_TYPE_MAP[alert.alertType] ?? 'status_change',
    entityType: 'budget',
    entityId: String(alert.budgetId),
    title: alert.title,
    message: alert.message,
    severity: alert.severity === 'critical' ? 'error' : alert.severity,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export const notificationService = {
  async getAll(limit = 20): Promise<Notification[]> {
    try {
      const response = await api.get('/ai/alerts');
      const alerts: any[] = extract(response) || [];
      return alerts.slice(0, limit).map(mapAlert);
    } catch (err: any) {
      // Network error means the endpoint doesn't exist yet — fail silently
      if (err?.message !== 'Network Error') {
        console.warn('[notificationService.getAll]', err?.response?.status, err?.message);
      }
      return [];
    }
  },
};
