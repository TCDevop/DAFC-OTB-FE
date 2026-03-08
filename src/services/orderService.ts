// ═══════════════════════════════════════════════════════════════════════════
// Order Service - Order Confirmation CRUD
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract } from './serviceUtils';

export const orderService = {
  // List tickets with confirmed orders (for Receipt page)
  async getAll(filters?: { status?: string }) {
    try {
      const params: any = {};
      if (filters?.status) params.status = filters.status;
      const response = await api.get('/orders', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.getAll]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get order rows by ticket ID
  async getByTicketId(ticketId: string) {
    try {
      const response = await api.get(`/orders/ticket/${ticketId}`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.getByTicketId]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Save all order rows for a ticket (full replace)
  async save(ticketId: string, rows: Record<string, any>[]) {
    try {
      const response = await api.post('/orders', { ticketId, rows });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.save]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Update specific order rows
  async updateRows(ticketId: string, rows: Record<string, any>[]) {
    try {
      const response = await api.put(`/orders/ticket/${ticketId}`, { rows });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.updateRows]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Confirm order
  async confirmOrder(ticketId: string) {
    try {
      const response = await api.patch(`/orders/ticket/${ticketId}/confirm`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.confirmOrder]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Cancel order
  async cancelOrder(ticketId: string) {
    try {
      const response = await api.patch(`/orders/ticket/${ticketId}/cancel`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.cancelOrder]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // ── Receipt endpoints ──

  // Get merged order + receipt data by ticket ID
  async getReceiptByTicketId(ticketId: string) {
    try {
      const response = await api.get(`/receipts/ticket/${ticketId}`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.getReceiptByTicketId]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Save receipt rows (upsert)
  async saveReceipt(ticketId: string, rows: Record<string, any>[]) {
    try {
      const response = await api.post('/receipts', { ticketId, rows });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.saveReceipt]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Update specific receipt rows
  async updateReceiptRows(ticketId: string, rows: Record<string, any>[]) {
    try {
      const response = await api.put(`/receipts/ticket/${ticketId}`, { rows });
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.updateReceiptRows]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },

  // Confirm receipt for a ticket
  async confirmReceipt(ticketId: string) {
    try {
      const response = await api.patch(`/receipts/ticket/${ticketId}/confirm`);
      return extract(response);
    } catch (err: any) {
      console.error('[orderService.confirmReceipt]', ticketId, err?.response?.status, err?.message);
      throw err;
    }
  },
};

export default orderService;
