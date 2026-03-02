'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Loader2, Plus, X, LayoutList, LayoutGrid, Ticket, CircleCheckBig, DollarSign, Search } from 'lucide-react';
import TicketKanbanBoard from './TicketKanbanBoard';
import { ExpandableStatCard, ErrorMessage } from '@/components/ui';
import { MobileList, FilterChips, FloatingActionButton, PullToRefresh, useBottomSheet, FilterBottomSheet } from '@/components/mobile';
import { budgetService, masterDataService, planningService, proposalService, ticketService } from '@/services';
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

// Get entity type label (uses t function)
const getEntityTypeLabel = (type: any, t: any) => {
  const labels: any = {
    'budget': t ? t('ticket.entityBudget') : 'Budget',
    'planning': t ? t('ticket.entityPlanning') : 'Planning',
    'proposal': t ? t('ticket.entityProposal') : 'SKU Proposal',
    'ticket': 'Ticket',
  };
  return labels[type] || type;
};

// (Season groups & seasons loaded from API via masterDataService.getSeasonGroups)


const getStatusColor = (status: any) => {
  const s = status?.toUpperCase();
  if (['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(s)) return 'success';
  if (['SUBMITTED', 'LEVEL1_APPROVED'].includes(s)) return 'warning';
  if (['LEVEL1_REJECTED', 'LEVEL2_REJECTED', 'REJECTED'].includes(s)) return 'critical';
  return 'neutral';
};

const TicketScreen = ({ onOpenTicketDetail }: any) => {
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
  const [budgetOptions, setBudgetOptions] = useState<any[]>([]);
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

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsRes, planningsRes, proposalsRes, ticketsRes] = await Promise.all([
        budgetService.getAll().catch(() => []),
        planningService.getAll().catch(() => []),
        proposalService.getAll().catch(() => []),
        ticketService.getAll().catch(() => []),
      ]);

      const allTickets: any[] = [];

      (Array.isArray(budgetsRes) ? budgetsRes : []).forEach((b: any) => {
        allTickets.push({
          id: b.id,
          entityType: 'budget',
          name: `${b.groupBrand?.name || 'Budget'} - ${b.seasonGroupId || ''} ${b.seasonType || ''}`,
          brand: b.groupBrand?.name || '-',
          seasonGroup: b.seasonGroupId || '-',
          season: b.seasonType || '-',
          createdBy: b.createdBy?.name || 'System',
          createdOn: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '-',
          status: b.status,
          totalBudget: Number(b.totalBudget) || 0,
          data: b
        });
      });

      (Array.isArray(planningsRes) ? planningsRes : []).forEach((p: any) => {
        allTickets.push({
          id: p.id,
          entityType: 'planning',
          name: p.planningCode || `Planning ${p.versionName || ''}`,
          brand: p.budgetDetail?.budget?.groupBrand?.name || '-',
          seasonGroup: p.budgetDetail?.budget?.seasonGroupId || '-',
          season: p.budgetDetail?.budget?.seasonType || '-',
          createdBy: p.createdBy?.name || 'System',
          createdOn: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
          status: p.status,
          totalBudget: Number(p.budgetDetail?.budgetAmount) || 0,
          data: p
        });
      });

      (Array.isArray(proposalsRes) ? proposalsRes : []).forEach((pr: any) => {
        allTickets.push({
          id: pr.id,
          entityType: 'proposal',
          name: pr.ticketName || pr.proposalCode || `Proposal ${pr.versionName || ''}`,
          brand: pr.budget?.groupBrand?.name || '-',
          seasonGroup: pr.budget?.seasonGroupId || '-',
          season: pr.budget?.seasonType || '-',
          createdBy: pr.createdBy?.name || 'System',
          createdOn: pr.createdAt ? new Date(pr.createdAt).toISOString().split('T')[0] : '-',
          status: pr.status,
          totalBudget: Number(pr.totalValue) || 0,
          data: pr
        });
      });

      // Add actual tickets from backend
      (Array.isArray(ticketsRes) ? ticketsRes : []).forEach((tk: any) => {
        const brands = (tk.budget?.allocate_headers || []).map((ah: any) => ah.brand?.name).filter(Boolean);
        allTickets.push({
          id: tk.id,
          entityType: 'ticket',
          name: `Ticket #${tk.id} - ${tk.budget?.name || 'Budget'}`,
          brand: brands.join(', ') || '-',
          seasonGroup: tk.season_group?.name || '-',
          season: tk.season?.name || '-',
          createdBy: tk.creator?.name || 'System',
          createdOn: tk.created_at ? new Date(tk.created_at).toISOString().split('T')[0] : '-',
          status: tk.status,
          totalBudget: Number(tk.budget?.amount) || 0,
          data: tk
        });
      });

      allTickets.sort((a: any, b: any) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
      setTickets(allTickets);
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

    // By entity type
    const byType: any = {};
    tickets.forEach((tk: any) => {
      const type = tk.entityType || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });
    const typeBreakdown = Object.entries(byType)
      .map(([label, value]: any) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }))
      .sort((a: any, b: any) => b.value - a.value);

    return {
      totalTickets: total,
      approvedTickets: approved,
      pendingTickets: pending,
      draftTickets: draft,
      rejectedTickets: rejected,
      totalSpending,
      approvedPct: total > 0 ? Math.round((approved / total) * 100) : 0,
      typeBreakdown};
  }, [tickets]);

  // Filter tickets by search term
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const q = searchTerm.toLowerCase();
    return tickets.filter((tk: any) =>
      (tk.name || '').toLowerCase().includes(q) ||
      (tk.brand || '').toLowerCase().includes(q) ||
      (tk.seasonGroup || '').toLowerCase().includes(q) ||
      (tk.season || '').toLowerCase().includes(q) ||
      (tk.createdBy || '').toLowerCase().includes(q) ||
      getDisplayStatus(tk.status, t).toLowerCase().includes(q) ||
      getEntityTypeLabel(tk.entityType, t).toLowerCase().includes(q)
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

  // Entity type badge style
  const getEntityTypeStyle = (type: any) => {
    const styles: any = {
      budget:'bg-[rgba(215,183,151,0.2)] text-[#6B4D30] border border-[rgba(215,183,151,0.4)]',
      planning:'bg-blue-100 text-blue-700',
      proposal:'bg-emerald-100 text-emerald-700',
      ticket:'bg-amber-100 text-amber-700 border border-amber-300'};
    return styles[type] || styles['budget'];
  };

  return (
    <div className="flex flex-col gap-2 md:gap-4 h-[calc(100vh-140px)]">
      {/* ===== PAGE TITLE ===== */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <ExpandableStatCard
          title={t('ticket.totalTickets')}
          value={ticketStats.totalTickets}
          icon={Ticket}
          accent="blue"
          breakdown={ticketStats.typeBreakdown}
          expandTitle={t('home.kpiDetail.byEntityType')}
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
                  { key: 'entityType', label: mobileFilters.entityType ? String(mobileFilters.entityType) : t('approvals.allTypes'), icon: '🏷️' },
                ]}
                activeValues={mobileFilters}
                onChipPress={() => openFilter()}
                onMorePress={openFilter}
              />
            </div>

            <PullToRefresh onRefresh={fetchTickets}>
              <MobileList
                items={filteredTickets.map((ticket) => ({
                  id: `${ticket.entityType}-${ticket.id}`,
                  avatar: ticket.entityType === 'budget' ? '💰' : ticket.entityType === 'planning' ? '📊' : '📦',
                  title: ticket.name,
                  subtitle: `${ticket.brand} • ${ticket.seasonGroup} ${ticket.season}`,
                  value: ticket.totalBudget > 0 ? formatCurrency(ticket.totalBudget) : undefined,
                  status: {
                    text: getDisplayStatus(ticket.status, t),
                    variant: (['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(ticket.status?.toUpperCase()) ? 'success' :
                      ['LEVEL1_REJECTED', 'LEVEL2_REJECTED', 'REJECTED'].includes(ticket.status?.toUpperCase()) ? 'error' :
                      ['SUBMITTED', 'LEVEL1_APPROVED'].includes(ticket.status?.toUpperCase()) ? 'warning' : 'default') as any},
                  details: [
                    { label: t('budget.createdBy'), value: ticket.createdBy },
                    { label: t('budget.createdOn'), value: ticket.createdOn },
                    { label: t('approvals.colType'), value: getEntityTypeLabel(ticket.entityType, t) },
                  ]}))}
                onItemPress={(item) => {
                  const ticket = filteredTickets.find((t: any) => `${t.entityType}-${t.id}` === item.id);
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
                  key: 'entityType',
                  label: t('approvals.allTypes'),
                  icon: '🏷️',
                  type: 'single',
                  options: [
                    { value: 'budget', label: t('ticket.entityBudget') },
                    { value: 'planning', label: t('ticket.entityPlanning') },
                    { value: 'proposal', label: t('ticket.entityProposal') },
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
                {[t('common.name'), t('approval.brand'), t('ticket.seasonLabel'), t('budget.createdBy'), t('budget.createdOn'), t('common.status'), t('common.actions')].map((header: any, idx: any) => (
                  <th
                    key={header}
                    className={`px-4 py-2 text-left font-semibold text-xs uppercase tracking-wider ${'text-[#4A3728]'} ${idx === 6 ? 'text-center' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${'divide-gray-200'}`}>
              {filteredTickets.map((ticket: any) => (
                <tr
                  key={`${ticket.entityType}-${ticket.id}`}
                  className={`transition-all duration-150 border-l-2 border-transparent ${'hover:bg-[rgba(215,183,151,0.15)] hover:border-l-[#D7B797]'}`}
                >
                  <td className={`px-4 py-3 font-medium ${'text-gray-800'}`}>
                    {ticket.name}
                  </td>
                  <td className={`px-4 py-3 ${'text-gray-600'}`}>
                    {ticket.brand}
                  </td>
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] ${'text-gray-600'}`}>
                    {ticket.seasonGroup} {ticket.season}
                  </td>
                  <td className={`px-4 py-3 ${'text-gray-600'}`}>
                    {ticket.createdBy}
                  </td>
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] ${'text-gray-700'}`}>
                    {ticket.createdOn}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusStyle(ticket.status)}`}>
                      {getDisplayStatus(ticket.status, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onOpenTicketDetail(ticket)}
                      className={`p-1.5 border rounded-lg transition-all duration-150 ${'text-[#6B4D30] border-[rgba(184,153,112,0.4)] hover:bg-[rgba(215,183,151,0.15)]'}`}
                      title={t('common.view')}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {filteredTickets.length === 0 && (
            <div className={`p-6 text-center text-sm ${'text-gray-700'}`}>
              {t('ticket.noTicketsFound')}
            </div>
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
