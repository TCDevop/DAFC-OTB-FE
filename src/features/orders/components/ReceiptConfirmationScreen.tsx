'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Package, Search, X, RefreshCw, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ErrorMessage, EmptyState } from '@/components/ui';
import { MobileList, PullToRefresh } from '@/components/mobile';
import { orderService } from '@/services';
import { formatCurrency } from '@/utils';
import ReceiptTicketDetail from './ReceiptTicketDetail';

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
const ReceiptConfirmationScreen = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getAll({ status: 'CONFIRMED' });
      const ticketList = Array.isArray(response) ? response : [];

      const mapped = ticketList.map((tk: any) => ({
        id: tk.id,
        ticketCode: tk.ticket_code || `TKT-${String(tk.id).padStart(5, '0')}`,
        budgetName: tk.budget?.name || '-',
        brandName: tk.budget?.brand_name || tk.budget?.name || '-',
        fy: tk.budget?.fiscal_year ?? '-',
        seasonGroup: tk.season_group?.name || '-',
        season: tk.season?.name || '-',
        createdBy: tk.creator?.name || 'System',
        createdOn: formatDate(tk.created_at),
        skuCount: tk.orderSkuCount || 0,
        totalUnits: tk.orderTotalUnits || 0,
        totalAmount: tk.orderTotalAmount || 0,
        data: tk,
      }));

      mapped.sort((a: any, b: any) => {
        const da = a.data?.created_at ? new Date(a.data.created_at).getTime() : 0;
        const db = b.data?.created_at ? new Date(b.data.created_at).getTime() : 0;
        return db - da;
      });

      setTickets(mapped);
    } catch (err: any) {
      console.error('Failed to fetch receipts:', err);
      setError(t('receiptConfirm.failedToLoad'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTickets();
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    if (!searchTerm) return tickets;
    const term = searchTerm.toLowerCase();
    return tickets.filter((tk: any) =>
      (tk.ticketCode || '').toLowerCase().includes(term) ||
      (tk.budgetName || '').toLowerCase().includes(term) ||
      (tk.brandName || '').toLowerCase().includes(term) ||
      (tk.seasonGroup || '').toLowerCase().includes(term) ||
      (tk.season || '').toLowerCase().includes(term) ||
      String(tk.fy).includes(term)
    );
  }, [tickets, searchTerm]);

  // ── Detail view ──
  if (selectedTicket) {
    return (
      <ReceiptTicketDetail
        ticket={selectedTicket}
        onBack={() => setSelectedTicket(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-0 overflow-hidden">
      {/* ===== PAGE TITLE ===== */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div>
          <h1 className="text-sm font-semibold font-['Montserrat'] text-gray-800">
            {t('receiptConfirm.title')}
          </h1>
          <p className="text-[10px] text-gray-700">
            {t('receiptConfirm.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.search') + '...'}
              className="pl-7 pr-6 py-1.5 text-xs rounded-md border w-40 md:w-52 focus:outline-none focus:ring-1 transition-all bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 p-0.5 rounded text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={fetchTickets}
            className="p-1.5 rounded-md border border-gray-300 transition-all hover:bg-gray-50 text-gray-500"
            title={t('common.refresh')}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ===== TABLE CONTENT ===== */}
      {loading ? (
        <div className="border rounded-lg p-12 flex flex-col items-center justify-center bg-white border-gray-300 text-gray-700">
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-sm">{t('receiptConfirm.loadingReceipts')}</span>
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTickets} />
      ) : isMobile ? (
        /* ── Mobile Card View ── */
        <PullToRefresh onRefresh={fetchTickets}>
          <MobileList
            items={filtered.map((ticket) => ({
              id: String(ticket.id),
              title: ticket.ticketCode,
              subtitle: `${ticket.brandName} • ${ticket.seasonGroup} • ${ticket.season}`,
              status: {
                text: 'Confirmed',
                variant: 'success' as any,
              },
              details: [
                { label: 'SKUs', value: String(ticket.skuCount) },
                { label: 'Units', value: String(ticket.totalUnits) },
                { label: 'Amount', value: formatCurrency(ticket.totalAmount) },
                { label: t('budget.createdBy'), value: ticket.createdBy },
                { label: t('budget.createdOn'), value: ticket.createdOn },
              ],
            }))}
            onItemPress={(item) => {
              const ticket = filtered.find((t: any) => String(t.id) === item.id);
              if (ticket) setSelectedTicket(ticket);
            }}
            expandable
            emptyMessage={t('receiptConfirm.noReceipts')}
          />
        </PullToRefresh>
      ) : (
        /* ── Desktop Table ── */
        <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col bg-white border-gray-300">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#E8DDD1]">
                <tr>
                  {[
                    'Ticket',
                    t('ticket.budgetNameLabel'),
                    t('ticket.seasonGroupLabel'),
                    t('ticket.seasonLabel'),
                    'SKUs',
                    'Units',
                    'Amount',
                    t('budget.createdBy'),
                    t('budget.createdOn'),
                    '',
                  ].map((header: any, idx: any) => (
                    <th
                      key={`h-${idx}`}
                      className={`px-4 py-2 text-left font-semibold text-xs uppercase tracking-wider text-[#4A3728] ${idx === 9 ? 'text-center' : ''}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((ticket: any) => (
                  <tr
                    key={ticket.id}
                    className="transition-all duration-150 border-l-2 border-transparent hover:bg-[rgba(215,183,151,0.15)] hover:border-l-[#D7B797]"
                  >
                    <td className="px-4 py-3 font-['JetBrains_Mono'] font-medium text-gray-800">
                      {ticket.ticketCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {ticket.budgetName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.seasonGroup}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.season}
                    </td>
                    <td className="px-4 py-3 font-['JetBrains_Mono'] text-gray-800">
                      {ticket.skuCount}
                    </td>
                    <td className="px-4 py-3 font-['JetBrains_Mono'] text-gray-800">
                      {ticket.totalUnits}
                    </td>
                    <td className="px-4 py-3 font-['JetBrains_Mono'] text-[#6B4D30] font-medium">
                      {formatCurrency(ticket.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.createdBy}
                    </td>
                    <td className="px-4 py-3 font-['JetBrains_Mono'] text-gray-700">
                      {ticket.createdOn}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center justify-center p-1.5 rounded-md transition-all bg-[rgba(215,183,151,0.15)] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.3)]"
                        title={t('common.viewDetails')}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={Package}
              title={searchTerm ? t('ticket.noMatchingTickets') : t('receiptConfirm.noReceipts')}
              message={searchTerm ? t('ticket.tryAdjustingSearch') : (t('receiptConfirm.noReceiptsDesc') || 'No confirmed orders found')}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptConfirmationScreen;
