'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Package, Search, X, RefreshCw, Eye, Receipt
} from 'lucide-react';
import { ticketService, orderService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ErrorMessage, EmptyState } from '@/components/ui';
import { MobileList, PullToRefresh } from '@/components/mobile';
import OrderTicketDetail from './OrderTicketDetail';

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
const OrderConfirmationScreen = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [confirmedTicketIds, setConfirmedTicketIds] = useState<Set<string>>(new Set());

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
      // Fetch approved tickets with server-side status filter and reasonable page size
      // status filter reduces data transfer; pageSize 100 is sufficient for order management
      const res = await ticketService.getAll({ status: 'APPROVED', pageSize: 100, page: 1 });
      const ticketList = Array.isArray(res) ? res : (res?.data || []);

      // Map and filter only approved tickets
      const mapped = ticketList
        .filter((tk: any) => ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(tk.status?.toUpperCase()))
        .map((tk: any) => ({
          id: tk.id,
          fy: tk.budget?.fiscal_year ?? '-',
          budgetName: tk.budget?.name || '-',
          seasonGroup: tk.season_group?.name || '-',
          season: tk.season?.name || '-',
          createdBy: tk.creator?.name || 'System',
          createdOn: formatDate(tk.created_at),
          status: tk.status,
          totalBudget: Number(tk.budget?.amount) || 0,
          data: tk,
        }));

      mapped.sort((a: any, b: any) => {
        const da = a.data?.created_at ? new Date(a.data.created_at).getTime() : 0;
        const db = b.data?.created_at ? new Date(b.data.created_at).getTime() : 0;
        return db - da;
      });

      setTickets(mapped);

      // Fetch confirmed orders to know which tickets have confirmed orders
      try {
        const confirmedOrders = await orderService.getAll({ status: 'CONFIRMED' });
        const confirmedList = Array.isArray(confirmedOrders) ? confirmedOrders : [];
        const ids = new Set<string>(confirmedList.map((o: any) => String(o.ticket_id || o.id)));
        setConfirmedTicketIds(ids);
      } catch { /* ignore */ }
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
      setError(t('orderConfirm.failedToLoad'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTickets();
  }, [isAuthenticated]);

  // Auto-open detail when navigated from Tickets page
  useEffect(() => {
    const stored = sessionStorage.getItem('autoOpenOrderTicket');
    if (stored) {
      try {
        const ticket = JSON.parse(stored);
        setSelectedTicket(ticket);
      } catch { /* ignore */ }
      sessionStorage.removeItem('autoOpenOrderTicket');
    }
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return tickets;
    const term = searchTerm.toLowerCase();
    return tickets.filter((tk: any) =>
      (tk.budgetName || '').toLowerCase().includes(term) ||
      (tk.seasonGroup || '').toLowerCase().includes(term) ||
      (tk.season || '').toLowerCase().includes(term) ||
      String(tk.fy).includes(term)
    );
  }, [tickets, searchTerm]);

  const getStatusStyle = (status: any) => {
    const s = status?.toUpperCase();
    if (['LEVEL2_APPROVED', 'APPROVED'].includes(s)) return 'bg-green-100 text-green-700';
    if (s === 'FINAL') return 'bg-green-200 text-green-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getDisplayStatus = (status: any) => {
    const s = status?.toUpperCase();
    if (['LEVEL2_APPROVED', 'APPROVED'].includes(s)) return t('ticket.statusApproved');
    if (s === 'FINAL') return t('ticket.statusFinal');
    return status || 'Unknown';
  };

  // ── Detail view ──
  if (selectedTicket) {
    return (
      <OrderTicketDetail
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
            {t('orderConfirm.title')}
          </h1>
          <p className="text-[10px] text-gray-700">
            {t('orderConfirm.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Box */}
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
          <span className="text-sm">{t('orderConfirm.loadingOrders')}</span>
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTickets} />
      ) : isMobile ? (
        /* ── Mobile Card View ── */
        <PullToRefresh onRefresh={fetchTickets}>
          <MobileList
            items={filtered.map((ticket) => ({
              id: String(ticket.id),
              title: ticket.budgetName,
              subtitle: `FY${ticket.fy} • ${ticket.seasonGroup} • ${ticket.season}`,
              status: {
                text: getDisplayStatus(ticket.status),
                variant: 'success' as any,
              },
              details: [
                { label: t('budget.createdBy'), value: ticket.createdBy },
                { label: t('budget.createdOn'), value: ticket.createdOn },
              ],
            }))}
            onItemPress={(item) => {
              const ticket = filtered.find((t: any) => String(t.id) === item.id);
              if (ticket && setSelectedTicket) setSelectedTicket(ticket);
            }}
            expandable
            emptyMessage={t('orderConfirm.noOrders')}
          />
        </PullToRefresh>
      ) : (
        /* ── Desktop Table (same as TicketScreen) ── */
        <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col bg-white border-gray-300">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#E8DDD1]">
                <tr>
                  {['FY', t('ticket.budgetNameLabel'), t('ticket.seasonGroupLabel'), t('ticket.seasonLabel'), t('budget.createdBy'), t('budget.createdOn'), t('common.status'), 'Actions'].map((header: any, idx: any) => (
                    <th
                      key={`h-${idx}`}
                      className={`px-4 py-2 text-left font-semibold text-xs uppercase tracking-wider text-[#4A3728] ${idx >= 6 ? 'text-center' : ''}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((ticket: any) => {
                  const isConfirmed = confirmedTicketIds.has(String(ticket.id));
                  return (
                  <tr
                    key={ticket.id}
                    className="transition-all duration-150 border-l-2 border-transparent hover:bg-[rgba(215,183,151,0.15)] hover:border-l-[#D7B797]"
                  >
                    <td className="px-4 py-3 font-['JetBrains_Mono'] font-medium text-gray-800">
                      {ticket.fy}
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
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.createdBy}
                    </td>
                    <td className="px-4 py-3 font-['JetBrains_Mono'] text-gray-700">
                      {ticket.createdOn}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusStyle(ticket.status)}`}>
                        {getDisplayStatus(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedTicket?.(ticket)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md transition-all bg-[rgba(215,183,151,0.15)] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.3)]"
                          title="View Order"
                        >
                          <Eye size={14} />
                        </button>
                        {isConfirmed && (
                          <button
                            onClick={() => {
                              sessionStorage.setItem('autoOpenReceiptTicket', JSON.stringify(ticket));
                              router.push('/receipt-confirmation');
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded-md transition-all bg-[rgba(42,158,106,0.1)] text-[#2A9E6A] hover:bg-[rgba(42,158,106,0.2)]"
                            title="View Receipt"
                          >
                            <Receipt size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={Package}
              title={searchTerm ? t('ticket.noMatchingTickets') : t('orderConfirm.noOrders')}
              message={searchTerm ? t('ticket.tryAdjustingSearch') : t('orderConfirm.noOrdersDesc')}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderConfirmationScreen;
