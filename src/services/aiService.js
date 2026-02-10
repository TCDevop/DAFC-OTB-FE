// ═══════════════════════════════════════════════════════════════════════════
// AI Service - Size Curve Optimizer + Budget Variance Alerts
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

export const aiService = {
  // ── Size Curve Optimizer ─────────────────────────────────────────────

  async getSizeCurve(category, storeId, totalOrderQty = 100) {
    const response = await api.get(`/ai/size-curve/${encodeURIComponent(category)}/${storeId}`, {
      params: { totalOrderQty },
    });
    return response.data.data || response.data;
  },

  async calculateSizeCurve(data) {
    const response = await api.post('/ai/size-curve/calculate', data);
    return response.data.data || response.data;
  },

  async compareSizeCurve(skuId, storeId, userSizing) {
    const response = await api.post('/ai/size-curve/compare', {
      skuId,
      storeId,
      userSizing,
    });
    return response.data.data || response.data;
  },

  // ── Budget Variance Alerts ───────────────────────────────────────────

  async getBudgetAlerts(options = {}) {
    const params = {};
    if (options.budgetId) params.budgetId = options.budgetId;
    if (options.unreadOnly) params.unreadOnly = 'true';
    const response = await api.get('/ai/alerts', { params });
    return response.data.data || response.data;
  },

  async markAlertRead(alertId) {
    const response = await api.patch(`/ai/alerts/${alertId}/read`);
    return response.data.data || response.data;
  },

  async dismissAlert(alertId) {
    const response = await api.patch(`/ai/alerts/${alertId}/dismiss`);
    return response.data.data || response.data;
  },

  async triggerAlertCheck() {
    const response = await api.post('/ai/alerts/check');
    return response.data;
  },

  // ── OTB Auto-Allocation ────────────────────────────────────────────

  async generateAllocation(input) {
    const response = await api.post('/ai/allocation/generate', input);
    return response.data.data || response.data;
  },

  async getAllocationRecommendations(budgetDetailId) {
    const response = await api.get(`/ai/allocation/${budgetDetailId}`);
    return response.data.data || response.data;
  },

  async applyAllocationRecommendations(budgetDetailId, dimensionType = null) {
    const url = dimensionType
      ? `/ai/allocation/${budgetDetailId}/apply?dimensionType=${dimensionType}`
      : `/ai/allocation/${budgetDetailId}/apply`;
    const response = await api.post(url);
    return response.data.data || response.data;
  },

  async compareAllocation(budgetDetailId, userAllocation) {
    const response = await api.post('/ai/allocation/compare', {
      budgetDetailId,
      userAllocation,
    });
    return response.data.data || response.data;
  },

  // ── Risk Scoring ─────────────────────────────────────────────────────

  async assessRisk(entityType, entityId) {
    const response = await api.post(`/ai/risk/assess/${entityType}/${entityId}`);
    return response.data;
  },

  async getRiskAssessment(entityType, entityId) {
    const response = await api.get(`/ai/risk/${entityType}/${entityId}`);
    return response.data;
  },

  async refreshRiskAssessment(entityType, entityId) {
    const response = await api.post(`/ai/risk/${entityType}/${entityId}/refresh`);
    return response.data;
  },

  // ── SKU Recommender ──────────────────────────────────────────────────

  async generateSkuRecommendations(input) {
    const response = await api.post('/ai/sku-recommend/generate', input);
    return response.data.data || response.data;
  },

  async getSkuRecommendations(budgetDetailId, category = null) {
    const url = category
      ? `/ai/sku-recommend/${budgetDetailId}?category=${encodeURIComponent(category)}`
      : `/ai/sku-recommend/${budgetDetailId}`;
    const response = await api.get(url);
    return response.data.data || response.data;
  },

  async updateSkuRecommendationStatus(recommendationId, status) {
    const response = await api.patch(`/ai/sku-recommend/${recommendationId}/status`, { status });
    return response.data.data || response.data;
  },

  async addSelectedSkusToProposal(budgetDetailId, proposalId) {
    const response = await api.post(`/ai/sku-recommend/${budgetDetailId}/add-to-proposal/${proposalId}`);
    return response.data.data || response.data;
  },
};
