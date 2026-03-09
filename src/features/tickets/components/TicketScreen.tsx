'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X, LayoutList, LayoutGrid, Ticket, CircleCheckBig, DollarSign, Search, Eye } from 'lucide-react';
import TicketKanbanBoard from './TicketKanbanBoard';
import { ExpandableStatCard, ErrorMessage, EmptyState } from '@/components/ui';
import { MobileList, FilterChips, FloatingActionButton, PullToRefresh, useBottomSheet, FilterBottomSheet } from '@/components/mobile';
import { budgetService, masterDataService, ticketService } from '@/services';
import { invalidateCache } from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

/* =========================
   UTILS
========================= */

// Map API status to display status (uses t function)
const getDisplayStatus = (status: any, t: any) => {
  const statusMap: any = {
    'DRAFT': t ? t('ticket.statusDraft') : 'Draft',
    'SUBMITTED': t ? t('ticket.statusPending') : 'Pending',
    'LEVEL1_APPROVED': t ? t('ticket.statusPendingL2') : 'Pending L2',
    'LEVEL2_APPROVED': t ? t('ticket.statusApproved') : 'Approved',
    'APPROVED': t ? t('ticket.statusApproved') : 'Approved',
    'LEVEL1_REJECTED': t ? t('ticket.statusRejected') : 'Rejected',
    'LEVEL2_REJECTED': t ? t('ticket.statusRejected') : 'Rejected',
    'REJECTED': t ? t('ticket.statusRejected') : 'Rejected',
    'FINAL': t ? t('ticket.statusFinal') : 'Final'
  };
  return statusMap[status?.toUpperCase()] || status || (t ? t('ticket.statusUnknown') : 'Unknown');
};

// (Season groups & seasons loaded from API via masterDataService.getSeasonGroups)

const TicketScreen = ({ onOpenTicketDetail }: any) => {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { isMobile } = useIsMobile();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [showCreatePopup, setShowCreatePopup] = useState<boolean>(false);
  const [newTicket, setNewTicket] = useState<any>({
    budgetName: '',
    seasonGroup: '',
    season: ''
  });
  const [viewMode, setViewModeRaw] = useState<string>(() => {
    try { return sessionStorage.getItem('ticket_view_mode') || 'table'; } catch { return 'table'; }
  });
  const setViewMode = (v: string) => { setViewModeRaw(v); try { sessionStorage.setItem('ticket_view_mode', v); } catch {} };
  const [seasonGroupOptions, setSeasonGroupOptions] = useState<{ id: string; label: string }[]>([]);
  const [seasonOptions, setSeasonOptions] = useState<{ id: string; label: string }[]>([]);
  const [budgetList, setBudgetList] = useState<any[]>([]);
  const [seasonGroupsRaw, setSeasonGroupsRaw] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const { isOpen: filterOpen, open: openFilter, close: closeFilter } = useBottomSheet();
  const [mobileFilters, setMobileFilters] = useState<Record<string, string | string[]>>({});
  const [searchTerm, setSearchTermRaw] = useState<string>(() => {
    try { return sessionStorage.getItem('ticket_search') || ''; } catch { return ''; }
  });
  const setSearchTerm = (v: string) => { setSearchTermRaw(v); try { sessionStorage.setItem('ticket_search', v); } catch {} };

  // Fetch all tickets (budgets, plannings, proposals)
  // Load season groups & seasons from API
  useEffect(() => {
    // Load season groups (with seasons) for dropdowns
    masterDataService.getSeasonGroups().then((res: any) => {
      const data = Array.isArray(res) ? res : [];
      setSeasonGroupsRaw(data);
      setSeasonGroupOptions(data.map((sg: any) => ({ id: sg.name, label: sg.name })));
      const seen = new Set<string>();
      const allSeasons: { id: string; label: string }[] = [];
      data.forEach((sg: any) => {
        (sg.seasons || []).forEach((s: any) => {
          if (!seen.has(s.name)) {
            seen.add(s.name);
            allSeasons.push({ id: s.name, label: s.name });
          }
        });
      });
      setSeasonOptions(allSeasons);
    }).catch(() => {
      setSeasonGroupsRaw([]);
      setSeasonGroupOptions([]);
      setSeasonOptions([]);
    });

    // Load budgets for create ticket popup
    budgetService.getAll().then((res: any) => {
      setBudgetList(Array.isArray(res) ? res : []);
    }).catch(() => setBudgetList([]));
  }, []);

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
      const res = await ticketService.getAll({ pageSize: 1000 });
      const ticketList = Array.isArray(res) ? res : (res?.data || []);

      const mapped = ticketList.map((tk: any) => ({
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
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
      setError(t('ticket.failedToLoadTickets'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    // Always invalidate cache on mount to ensure fresh data
    // (handles navigation back from detail page after approve/reject/create)
    invalidateCache('/tickets');
    fetchTickets();
  }, [isAuthenticated]);

  // Calculate stats
  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const approved = tickets.filter((tk: any) =>
      ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(tk.status?.toUpperCase())
    ).length;
    const pending = tickets.filter((tk: any) =>
      ['SUBMITTED', 'LEVEL1_APPROVED'].includes(tk.status?.toUpperCase())
    ).length;
    const draft = tickets.filter((tk: any) => tk.status?.toUpperCase() === 'DRAFT').length;
    const rejected = tickets.filter((tk: any) =>
      ['LEVEL1_REJECTED', 'LEVEL2_REJECTED', 'REJECTED'].includes(tk.status?.toUpperCase())
    ).length;
    const totalSpending = tickets
      .filter((tk: any) => ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(tk.status?.toUpperCase()))
      .reduce((sum: any, tk: any) => sum + (tk.totalBudget || 0), 0);

    // By status
    const statusBreakdown = [
      { label: 'Approved', value: approved, pct: total > 0 ? Math.round((approved / total) * 100) : 0 },
      { label: 'Pending', value: pending, pct: total > 0 ? Math.round((pending / total) * 100) : 0 },
      { label: 'Draft', value: draft, pct: total > 0 ? Math.round((draft / total) * 100) : 0 },
      { label: 'Rejected', value: rejected, pct: total > 0 ? Math.round((rejected / total) * 100) : 0 },
    ].filter(s => s.value > 0);

    return {
      totalTickets: total,
      approvedTickets: approved,
      pendingTickets: pending,
      draftTickets: draft,
      rejectedTickets: rejected,
      totalSpending,
      approvedPct: total > 0 ? Math.round((approved / total) * 100) : 0,
      statusBreakdown,
    };
  }, [tickets]);

  // Filter tickets by search term
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const q = searchTerm.toLowerCase();
    return tickets.filter((tk: any) =>
      String(tk.fy || '').toLowerCase().includes(q) ||
      (tk.budgetName || '').toLowerCase().includes(q) ||
      (tk.seasonGroup || '').toLowerCase().includes(q) ||
      (tk.season || '').toLowerCase().includes(q) ||
      (tk.createdBy || '').toLowerCase().includes(q) ||
      (tk.createdOn || '').toLowerCase().includes(q) ||
      getDisplayStatus(tk.status, t).toLowerCase().includes(q)
    );
  }, [tickets, searchTerm, t]);

  // Status styles for dark/light mode — keyed by raw status to avoid locale mismatch
  const getStatusStyle = (status: any) => {
    const s = status?.toUpperCase();
    if (['LEVEL2_APPROVED', 'APPROVED'].includes(s)) {
      return 'bg-green-100 text-green-700';
    }
    if (s === 'FINAL') {
      return 'bg-green-200 text-green-800';
    }
    if (s === 'SUBMITTED') {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (s === 'LEVEL1_APPROVED') {
      return 'bg-purple-100 text-purple-700';
    }
    if (['LEVEL1_REJECTED', 'LEVEL2_REJECTED', 'REJECTED'].includes(s)) {
      return 'bg-red-100 text-red-700';
    }
    // Draft / unknown
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-0 overflow-hidden">
      {/* ===== PAGE TITLE ===== */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div>
          <h1 className={`text-sm font-semibold font-['Montserrat'] ${'text-gray-800'}`}>
            {t('ticket.title')}
          </h1>
          <p className={`text-[10px] ${'text-gray-700'}`}>
            {t('ticket.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className={`relative flex items-center`}>
            <Search size={12} className={`absolute left-2.5 ${'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.search') + '...'}
              className={`pl-7 pr-6 py-1.5 text-xs rounded-md border w-40 focus:outline-none focus:ring-1 transition-all ${'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-1.5 p-0.5 rounded ${'text-gray-400 hover:text-gray-600'}`}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-md ${'bg-gray-100 border border-gray-300'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all duration-150 ${
                viewMode === 'table'
                  ?'bg-white text-[#6B4D30] shadow-sm':'text-gray-500 hover:text-gray-700'}`}
              title={t('ticket.tableView')}
            >
              <LayoutList size={13} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-all duration-150 ${
                viewMode === 'kanban'
                  ?'bg-white text-[#6B4D30] shadow-sm':'text-gray-500 hover:text-gray-700'}`}
              title={t('ticket.kanbanView')}
            >
              <LayoutGrid size={13} />
            </button>
          </div>

          <button
            onClick={() => setShowCreatePopup(true)}
            className={`p-1.5 rounded-md transition-all duration-150 ${'bg-[#D7B797] text-[#333333] hover:bg-[#C4A584]'}`}
            title={t('ticket.createTicket')}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ===== KPI HEADER ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 shrink-0">
        <ExpandableStatCard
          title={t('ticket.totalTickets')}
          value={ticketStats.totalTickets}
          icon={Ticket}
          accent="blue"
          breakdown={ticketStats.statusBreakdown}
          expandTitle={t('common.status')}
          badges={[
            { label: 'Pending', value: ticketStats.pendingTickets, color: '#D29922' },
            { label: 'Draft', value: ticketStats.draftTickets, color: '#666666' },
          ]}
        />
        <ExpandableStatCard
          title={t('ticket.approvedTickets')}
          value={ticketStats.approvedTickets}
          icon={CircleCheckBig}
          accent="emerald"
          progress={ticketStats.approvedPct}
          progressLabel={t('ticket.approvedTickets')}
          trendLabel={`${ticketStats.approvedPct}%`}
          trend={ticketStats.approvedPct > 50 ? 1 : -1}
        />
        <ExpandableStatCard
          title={t('ticket.totalSpending')}
          value={formatCurrency(ticketStats.totalSpending)}
          sub={t('ticket.approvedBudgetsOnly')}
          icon={DollarSign}
          accent="gold"
        />
      </div>

      {/* ===== TICKET CONTENT ===== */}
      {loading ? (
        <div className={`border rounded-lg p-12 flex flex-col items-center justify-center ${'bg-white border-gray-300 text-gray-700'}`}>
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-sm">{t('ticket.loadingTickets')}</span>
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTickets} />
      ) : viewMode === 'kanban' ? (
        <TicketKanbanBoard
          tickets={filteredTickets}
          onTicketClick={onOpenTicketDetail}
        />
      ) : (
        <>
        {/* Mobile Card View */}
        {isMobile ? (
          <div>
            {/* Mobile Filter Chips */}
            <div className="mb-3">
              <FilterChips
                chips={[
                  { key: 'seasonGroup', label: mobileFilters.seasonGroup ? String(mobileFilters.seasonGroup) : t('ticket.seasonLabel'), icon: '📅' },
                  { key: 'status', label: mobileFilters.status ? String(mobileFilters.status) : t('common.status'), icon: '📋' },
                ]}
                activeValues={mobileFilters}
                onChipPress={() => openFilter()}
                onMorePress={openFilter}
              />
            </div>

            <PullToRefresh onRefresh={fetchTickets}>
              <MobileList
                items={filteredTickets.map((ticket) => ({
                  id: String(ticket.id),
                  title: ticket.budgetName,
                  subtitle: `FY${ticket.fy} • ${ticket.seasonGroup} • ${ticket.season}`,
                  status: {
                    text: getDisplayStatus(ticket.status, t),
                    variant: (['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(ticket.status?.toUpperCase()) ? 'success' :
                      ['LEVEL1_REJECTED', 'LEVEL2_REJECTED', 'REJECTED'].includes(ticket.status?.toUpperCase()) ? 'error' :
                      ['SUBMITTED', 'LEVEL1_APPROVED'].includes(ticket.status?.toUpperCase()) ? 'warning' : 'default') as any},
                  details: [
                    { label: t('budget.createdBy'), value: ticket.createdBy },
                    { label: t('budget.createdOn'), value: ticket.createdOn },
                  ]}))}
                onItemPress={(item) => {
                  const ticket = filteredTickets.find((t: any) => String(t.id) === item.id);
                  if (ticket) onOpenTicketDetail(ticket);
                }}
                expandable
                emptyMessage={t('ticket.noTicketsFound')}
              />
            </PullToRefresh>

            {/* FAB: Create Ticket */}
            <FloatingActionButton
              onClick={() => setShowCreatePopup(true)}
              icon={<Plus size={24} />}
              label={t('ticket.createTicket')}
              size="extended"
            />

            {/* Filter Bottom Sheet */}
            <FilterBottomSheet
              isOpen={filterOpen}
              onClose={closeFilter}
              filters={[
                {
                  key: 'seasonGroup',
                  label: t('ticket.seasonGroupLabel'),
                  icon: '📅',
                  type: 'single',
                  options: seasonGroupOptions.map((sg) => ({ value: sg.id, label: sg.label }))},
                {
                  key: 'status',
                  label: t('common.status'),
                  icon: '📋',
                  type: 'single',
                  options: [
                    { value: 'DRAFT', label: t('ticket.statusDraft') },
                    { value: 'SUBMITTED', label: t('ticket.statusPending') },
                    { value: 'APPROVED', label: t('ticket.statusApproved') },
                    { value: 'REJECTED', label: t('ticket.statusRejected') },
                  ]},
              ]}
              values={mobileFilters}
              onChange={(key, value) => setMobileFilters(prev => ({ ...prev, [key]: value }))}
              onApply={closeFilter}
              onReset={() => setMobileFilters({})}
            />
          </div>
        ) : (
        /* Desktop Table View */
        <div className={`border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col ${'bg-white border-gray-300'}`}>
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className={`sticky top-0 z-10 ${'bg-[#E8DDD1]'}`}>
              <tr>
                {['FY', t('ticket.budgetNameLabel'), t('ticket.seasonGroupLabel'), t('ticket.seasonLabel'), t('budget.createdBy'), t('budget.createdOn'), t('common.status'), ''].map((header: any, idx: any) => (
                  <th
                    key={`h-${idx}`}
                    className={`px-4 py-2 text-left font-semibold text-xs uppercase tracking-wider ${'text-[#4A3728]'} ${idx === 6 ? 'text-center' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${'divide-gray-200'}`}>
              {filteredTickets.map((ticket: any) => {
                const isApproved = ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(ticket.status?.toUpperCase());
                return (
                <tr
                  key={ticket.id}
                  onClick={() => onOpenTicketDetail(ticket)}
                  className={`cursor-pointer transition-all duration-150 border-l-2 border-transparent ${'hover:bg-[rgba(215,183,151,0.15)] hover:border-l-[#D7B797]'}`}
                >
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] font-medium ${'text-gray-800'}`}>
                    {ticket.fy}
                  </td>
                  <td className={`px-4 py-3 font-medium ${'text-gray-800'}`}>
                    {ticket.budgetName}
                  </td>
                  <td className={`px-4 py-3 ${'text-gray-600'}`}>
                    {ticket.seasonGroup}
                  </td>
                  <td className={`px-4 py-3 ${'text-gray-600'}`}>
                    {ticket.season}
                  </td>
                  <td className={`px-4 py-3 ${'text-gray-600'}`}>
                    {ticket.createdBy}
                  </td>
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] ${'text-gray-700'}`}>
                    {ticket.createdOn}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusStyle(ticket.status)}`}>
                      {getDisplayStatus(ticket.status, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isApproved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sessionStorage.setItem('orderTicket', JSON.stringify(ticket.data || ticket));
                          router.push('/order-confirmation');
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded-md transition-all bg-[rgba(215,183,151,0.15)] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.3)]"
                        title="View Order"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {filteredTickets.length === 0 && (
            <EmptyState
              icon={Ticket}
              title={searchTerm ? t('ticket.noMatchingTickets') : t('ticket.noTicketsYet')}
              message={searchTerm ? t('ticket.tryAdjustingSearch') : t('ticket.createFirstTicket')}
              actionLabel={searchTerm ? undefined : t('ticket.createTicket')}
              onAction={searchTerm ? undefined : () => setShowCreatePopup(true)}
            />
          )}
        </div>
        )}
        </>
      )}

      {/* ===== CREATE TICKET POPUP ===== */}
      {showCreatePopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ${'bg-white'}`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${'border-[rgba(215,183,151,0.3)]'}`} style={{
              background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.08) 35%, rgba(215,183,151,0.22) 100%)',
              boxShadow: `inset 0 -1px 0 ${'rgba(215,183,151,0.08)'}`}}>
              <h3 className={`text-lg font-bold font-['Montserrat'] ${'text-[#6B4D30]'}`}>{t('ticket.createNewTicket')}</h3>
              <button
                onClick={() => { setShowCreatePopup(false); setValidationResult(null); }}
                className={`p-2 rounded-lg transition-colors ${'hover:bg-[rgba(215,183,151,0.15)]'}`}
              >
                <X size={20} className={'text-[#6B4D30]'} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Budget dropdown */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${'text-gray-600'}`}>{t('ticket.budgetNameLabel')}</label>
                <select
                  value={newTicket.budgetName}
                  onChange={(e: any) => { setNewTicket((prev: any) => ({ ...prev, budgetName: e.target.value })); setValidationResult(null); }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${'bg-white border-gray-300 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  <option value="">{t('ticket.selectBudgetPlaceholder')}</option>
                  {budgetList.map((b: any) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name} (FY{b.fiscalYear || b.fiscal_year || ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Season Group dropdown */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${'text-gray-600'}`}>{t('ticket.seasonGroupLabel')}</label>
                <select
                  value={newTicket.seasonGroup}
                  onChange={(e: any) => { setNewTicket((prev: any) => ({ ...prev, seasonGroup: e.target.value })); setValidationResult(null); }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${'bg-white border-gray-300 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  <option value="">{t('ticket.selectSeasonGroup')}</option>
                  {seasonGroupOptions.map((sg: any) => (
                    <option key={sg.id} value={sg.id}>{sg.label}</option>
                  ))}
                </select>
              </div>

              {/* Season dropdown */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${'text-gray-600'}`}>{t('ticket.seasonLabel')}</label>
                <select
                  value={newTicket.season}
                  onChange={(e: any) => { setNewTicket((prev: any) => ({ ...prev, season: e.target.value })); setValidationResult(null); }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${'bg-white border-gray-300 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  <option value="">{t('ticket.selectSeason')}</option>
                  {seasonOptions.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Validation Results */}
              {validationResult && (
                <div className="space-y-2 pt-2">
                  <p className={`text-xs font-semibold ${validationResult.valid ? 'text-green-600' : 'text-amber-600'}`}>
                    {validationResult.valid ? 'All checks passed' : 'Validation Issues Found'}
                  </p>
                  {validationResult.steps?.map((step: any) => (
                    <div key={step.step} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                      step.status === 'pass' ? 'bg-green-50 text-green-700' :
                      step.status === 'fail' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      <span className="mt-0.5 font-bold">
                        {step.status === 'pass' ? '\u2713' : step.status === 'fail' ? '\u2717' : '\u25CB'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">Step {step.step}: {step.label}</p>
                        {step.details?.length > 0 && (
                          <ul className="mt-1 space-y-0.5 pl-2 text-[11px]">
                            {step.details.map((d: string, i: number) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => { setShowCreatePopup(false); setValidationResult(null); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    if (!newTicket.budgetName || !newTicket.seasonGroup || !newTicket.season) return;

                    // Step 1: Validate
                    setValidationLoading(true);
                    setValidationResult(null);
                    try {
                      const validation = await ticketService.validate({ budgetId: newTicket.budgetName });
                      setValidationResult(validation);
                      if (!validation.valid) {
                        setValidationLoading(false);
                        return;
                      }
                    } catch (err: any) {
                      const errData = err?.response?.data;
                      if (errData?.validation) {
                        setValidationResult(errData.validation);
                      } else {
                        toast.error(errData?.message || 'Validation failed');
                      }
                      setValidationLoading(false);
                      return;
                    }
                    setValidationLoading(false);

                    // Step 2: Resolve season group / season IDs
                    const sgObj = seasonGroupsRaw.find((sg: any) => sg.name === newTicket.seasonGroup);
                    const sObj = sgObj?.seasons?.find((s: any) => s.name === newTicket.season);
                    if (!sgObj || !sObj) {
                      toast.error('Could not resolve Season Group / Season');
                      return;
                    }

                    // Step 3: Create ticket
                    setCreateLoading(true);
                    try {
                      await ticketService.create({
                        budgetId: newTicket.budgetName,
                        seasonGroupId: String(sgObj.id),
                        seasonId: String(sObj.id),
                      });
                      toast.success('Ticket created successfully!');
                      invalidateCache('/tickets');
                      setShowCreatePopup(false);
                      setNewTicket({ budgetName: '', seasonGroup: '', season: '' });
                      setValidationResult(null);
                      fetchTickets();
                    } catch (err: any) {
                      const errData = err?.response?.data;
                      if (errData?.validation) {
                        setValidationResult(errData.validation);
                      } else {
                        toast.error(errData?.message || 'Failed to create ticket');
                      }
                    } finally {
                      setCreateLoading(false);
                    }
                  }}
                  disabled={!newTicket.budgetName || !newTicket.seasonGroup || !newTicket.season || createLoading || validationLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
                    !newTicket.budgetName || !newTicket.seasonGroup || !newTicket.season || createLoading || validationLoading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A584]'
                  }`}
                >
                  {(createLoading || validationLoading) && <Loader2 size={14} className="animate-spin" />}
                  {validationLoading ? 'Validating...' :
                   createLoading ? 'Creating...' :
                   t('ticket.createTicket')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketScreen;
