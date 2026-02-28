// ═══════════════════════════════════════════════════════════════════════════
// Order & Receipt Service - Confirmation + Discrepancy API
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract } from './serviceUtils';

export const orderService = {
  // Confirm an order
  async confirmOrder(orderId: string) {
    try {
      const response = await api.patch(`/orders/${orderId}/confirm`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.confirmOrder]', orderId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Cancel an order
  async cancelOrder(orderId: string) {
    try {
      const response = await api.patch(`/orders/${orderId}/cancel`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.cancelOrder]', orderId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Confirm a receipt (all items received)
  async confirmReceipt(receiptId: string, data?: any) {
    try {
      const response = await api.patch(`/receipts/${receiptId}/confirm`, data);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.confirmReceipt]', receiptId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Flag a receipt discrepancy
  async flagDiscrepancy(receiptId: string, note: string) {
    try {
      const response = await api.patch(`/receipts/${receiptId}/discrepancy`, { note });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.flagDiscrepancy]', receiptId, err?.response?.status, err?.message);
      throw err;
    }
  },
};

export default orderService;
