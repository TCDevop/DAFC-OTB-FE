'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Loader2, Plus, X, LayoutList, LayoutGrid, Ticket, CircleCheckBig, DollarSign } from 'lucide-react';
import TicketKanbanBoard from '../components/TicketKanbanBoard';
import { budgetService, planningService, proposalService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../utils';

/* =========================
   UTILS
========================= */

// Map API status to display status (uses t function)
const getDisplayStatus = (status, t) => {
  const statusMap = {
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
const getEntityTypeLabel = (type, t) => {
  const labels = {
    'budget': t ? t('ticket.entityBudget') : 'Budget',
    'planning': t ? t('ticket.entityPlanning') : 'Planning',
    'proposal': t ? t('ticket.entityProposal') : 'SKU Proposal'
  };
  return labels[type] || type;
};

/* =========================
   KPI CARD
========================= */

const STAT_ACCENTS = {
  blue:    { color: '#58A6FF', darkGrad: 'rgba(88,166,255,0.05)',   lightGrad: 'rgba(50,120,220,0.08)', iconDark: 'rgba(88,166,255,0.06)', iconLight: 'rgba(50,120,220,0.06)' },
  emerald: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.06)',  lightGrad: 'rgba(22,120,70,0.08)',  iconDark: 'rgba(42,158,106,0.07)', iconLight: 'rgba(22,120,70,0.07)' },
  gold:    { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(180,140,95,0.10)', iconDark: 'rgba(215,183,151,0.07)', iconLight: 'rgba(160,120,75,0.08)' },
};

const StatCard = ({ title, value, sub, darkMode, icon: Icon, accent = 'blue' }) => {
  const a = STAT_ACCENTS[accent] || STAT_ACCENTS.blue;
  const borderColor = darkMode ? 'border-[#2E2E2E]' : 'border-gray-200';
  const textMuted = darkMode ? 'text-[#666666]' : 'text-gray-700';
  const textPrimary = darkMode ? 'text-[#F2F2F2]' : 'text-gray-900';

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-2xl p-5 transition-all duration-200 hover:shadow-lg group`}
      style={{
        background: darkMode
          ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${a.darkGrad} 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${a.lightGrad} 100%)`,
      }}
    >
      {/* Watermark Icon */}
      {Icon && (
        <div
          className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
          style={{ opacity: darkMode ? 0.05 : 0.07 }}
        >
          <Icon size={80} color={a.color} strokeWidth={1} />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>
            {title}
          </div>
          <div className={`text-2xl font-bold font-['JetBrains_Mono'] tabular-nums mt-2 ${textPrimary}`}>
            {value}
          </div>
          {sub && (
            <div className={`text-xs mt-1 ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: darkMode ? a.iconDark : a.iconLight }}
          >
            <Icon size={18} color={a.color} />
          </div>
        )}
      </div>
    </div>
  );
};

const SEASON_GROUPS = [
  { id: 'SS', label: 'Spring/Summer' },
  { id: 'FW', label: 'Fall/Winter' }
];

const SEASONS = [
  { id: 'Pre', label: 'Pre' },
  { id: 'Main', label: 'Main/Show' }
];


const TicketScreen = ({ onOpenTicketDetail, darkMode = true }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [newTicket, setNewTicket] = useState({
    budgetName: '',
    seasonGroup: '',
    season: ''
  });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [budgetOptions, setBudgetOptions] = useState([]);

  // Fetch all tickets (budgets, plannings, proposals)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all entities from different sources
        const [budgetsRes, planningsRes, proposalsRes] = await Promise.all([
          budgetService.getAll().catch(() => ({ data: [] })),
          planningService.getAll().catch(() => ({ data: [] })),
          proposalService.getAll().catch(() => ({ data: [] }))
        ]);

        const allTickets = [];

        // Transform budgets to tickets
        (budgetsRes.data || budgetsRes || []).forEach(b => {
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

        // Transform plannings to tickets
        (planningsRes.data || planningsRes || []).forEach(p => {
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

        // Transform proposals to tickets
        (proposalsRes.data || proposalsRes || []).forEach(pr => {
          allTickets.push({
            id: pr.id,
            entityType: 'proposal',
            name: pr.proposalCode || `Proposal ${pr.versionName || ''}`,
            brand: pr.planning?.budgetDetail?.budget?.groupBrand?.name || '-',
            seasonGroup: pr.planning?.budgetDetail?.budget?.seasonGroupId || '-',
            season: pr.planning?.budgetDetail?.budget?.seasonType || '-',
            createdBy: pr.createdBy?.name || 'System',
            createdOn: pr.createdAt ? new Date(pr.createdAt).toISOString().split('T')[0] : '-',
            status: pr.status,
            totalBudget: 0,
            data: pr
          });
        });

        // Sort by created date descending
        allTickets.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        setTickets(allTickets);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
        setError(t('ticket.failedToLoadTickets'));
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [isAuthenticated]);

  // Calculate stats
  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const approved = tickets.filter(t =>
      ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(t.status?.toUpperCase())
    ).length;
    const totalSpending = tickets
      .filter(t => ['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(t.status?.toUpperCase()))
      .reduce((sum, t) => sum + (t.totalBudget || 0), 0);

    return {
      totalTickets: total,
      approvedTickets: approved,
      totalSpending
    };
  }, [tickets]);

  // Status styles for dark/light mode
  const getStatusStyle = (status) => {
    const displayStatus = getDisplayStatus(status, t);
    const styles = {
      Approved: darkMode
        ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A] border border-[rgba(18,119,73,0.4)]'
        : 'bg-green-100 text-green-700',
      Final: darkMode
        ? 'bg-[rgba(18,119,73,0.2)] text-[#2A9E6A] border border-[rgba(18,119,73,0.5)]'
        : 'bg-green-200 text-green-800',
      Pending: darkMode
        ? 'bg-[rgba(210,153,34,0.15)] text-[#E3B341] border border-[rgba(210,153,34,0.4)]'
        : 'bg-yellow-100 text-yellow-700',
      'Pending L2': darkMode
        ? 'bg-[rgba(163,113,247,0.15)] text-[#A371F7] border border-[rgba(163,113,247,0.4)]'
        : 'bg-purple-100 text-purple-700',
      Draft: darkMode
        ? 'bg-[rgba(102,102,102,0.15)] text-[#999999] border border-[rgba(102,102,102,0.4)]'
        : 'bg-gray-100 text-gray-600',
      Rejected: darkMode
        ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72] border border-[rgba(248,81,73,0.4)]'
        : 'bg-red-100 text-red-700',
    };
    return styles[displayStatus] || styles['Draft'];
  };

  // Entity type badge style
  const getEntityTypeStyle = (type) => {
    const styles = {
      budget: darkMode
        ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] border border-[rgba(215,183,151,0.3)]'
        : 'bg-[rgba(215,183,151,0.2)] text-[#8A6340] border border-[rgba(215,183,151,0.4)]',
      planning: darkMode
        ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]'
        : 'bg-blue-100 text-blue-700',
      proposal: darkMode
        ? 'bg-[rgba(16,185,129,0.15)] text-[#34D399] border border-[rgba(16,185,129,0.3)]'
        : 'bg-emerald-100 text-emerald-700',
    };
    return styles[type] || styles['budget'];
  };

  return (
    <div className="space-y-6">
      {/* ===== PAGE TITLE ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-lg font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
            {t('ticket.title')}
          </h1>
          <p className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
            {t('ticket.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${
            darkMode ? 'bg-[#1A1A1A] border border-[#2E2E2E]' : 'bg-gray-100 border border-gray-200'
          }`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all duration-150 ${
                viewMode === 'table'
                  ? darkMode
                    ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm'
                    : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode
                    ? 'text-[#666666] hover:text-[#999999]'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              title={t('ticket.tableView')}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-all duration-150 ${
                viewMode === 'kanban'
                  ? darkMode
                    ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm'
                    : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode
                    ? 'text-[#666666] hover:text-[#999999]'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              title={t('ticket.kanbanView')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowCreatePopup(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
              darkMode
                ? 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A584]'
                : 'bg-[#D7B797] text-[#333333] hover:bg-[#C4A584]'
            }`}
          >
            <Plus size={18} />
            {t('ticket.createTicket')}
          </button>
        </div>
      </div>

      {/* ===== KPI HEADER ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('ticket.totalTickets')}
          value={ticketStats.totalTickets}
          darkMode={darkMode}
          icon={Ticket}
          accent="blue"
        />
        <StatCard
          title={t('ticket.approvedTickets')}
          value={ticketStats.approvedTickets}
          darkMode={darkMode}
          icon={CircleCheckBig}
          accent="emerald"
        />
        <StatCard
          title={t('ticket.totalSpending')}
          value={formatCurrency(ticketStats.totalSpending)}
          sub={t('ticket.approvedBudgetsOnly')}
          darkMode={darkMode}
          icon={DollarSign}
          accent="gold"
        />
      </div>

      {/* ===== TICKET CONTENT ===== */}
      {loading ? (
        <div className={`border rounded-lg p-12 flex flex-col items-center justify-center ${
          darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#666666]' : 'bg-white border-gray-200 text-gray-700'
        }`}>
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-sm">{t('ticket.loadingTickets')}</span>
        </div>
      ) : error ? (
        <div className={`border rounded-lg p-6 text-center text-sm ${
          darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#FF7B72]' : 'bg-white border-gray-200 text-red-500'
        }`}>
          {t('ticket.failedToLoadTickets')}: {error}
        </div>
      ) : viewMode === 'kanban' ? (
        <TicketKanbanBoard
          tickets={tickets}
          onTicketClick={onOpenTicketDetail}
          darkMode={darkMode}
        />
      ) : (
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'
        }`}>
          <table className="w-full text-sm">
            <thead className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(215,183,151,0.15)]'}>
              <tr>
                {[t('common.name'), t('approval.brand'), t('ticket.seasonLabel'), t('budget.createdBy'), t('budget.createdOn'), t('common.status'), t('common.actions')].map((header, idx) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-left font-medium text-xs uppercase tracking-wider ${
                      darkMode ? 'text-[#999999]' : 'text-gray-600'
                    } ${idx === 6 ? 'text-center' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${darkMode ? 'divide-[#2E2E2E]' : 'divide-gray-100'}`}>
              {tickets.map((ticket) => (
                <tr
                  key={`${ticket.entityType}-${ticket.id}`}
                  className={`transition-all duration-150 border-l-2 border-transparent ${
                    darkMode
                      ? 'hover:bg-[rgba(215,183,151,0.08)] hover:border-l-[#D7B797]'
                      : 'hover:bg-[rgba(215,183,151,0.15)] hover:border-l-[#D7B797]'
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                    {ticket.name}
                  </td>
                  <td className={`px-4 py-3 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {ticket.brand}
                  </td>
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {ticket.seasonGroup} {ticket.season}
                  </td>
                  <td className={`px-4 py-3 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {ticket.createdBy}
                  </td>
                  <td className={`px-4 py-3 font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
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
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all duration-150 ${
                        darkMode
                          ? 'text-[#D7B797] border-[rgba(215,183,151,0.3)] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.5)]'
                          : 'text-[#8A6340] border-[rgba(184,153,112,0.4)] hover:bg-[rgba(215,183,151,0.15)]'
                      }`}
                    >
                      <Eye size={14} />
                      {t('common.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tickets.length === 0 && (
            <div className={`p-6 text-center text-sm ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
              {t('ticket.noTicketsFound')}
            </div>
          )}
        </div>
      )}

      {/* ===== CREATE TICKET POPUP ===== */}
      {showCreatePopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              darkMode
                ? 'bg-gradient-to-r from-[rgba(215,183,151,0.15)] to-[rgba(215,183,151,0.08)] border-b border-[rgba(215,183,151,0.2)]'
                : 'bg-gradient-to-r from-[rgba(215,183,151,0.2)] to-[rgba(215,183,151,0.1)] border-b border-[rgba(215,183,151,0.3)]'
            }`}>
              <h3 className={`text-lg font-bold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{t('ticket.createNewTicket')}</h3>
              <button
                onClick={() => setShowCreatePopup(false)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.1)]' : 'hover:bg-[rgba(215,183,151,0.15)]'}`}
              >
                <X size={20} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{t('ticket.budgetNameLabel')}</label>
                <select
                  value={newTicket.budgetName}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, budgetName: e.target.value }))}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                      : 'bg-white border-gray-200 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                  }`}
                >
                  <option value="">{t('ticket.selectBudgetPlaceholder')}</option>
                  {tickets.filter(t => t.entityType === 'budget').map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{t('ticket.seasonGroupLabel')}</label>
                <select
                  value={newTicket.seasonGroup}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, seasonGroup: e.target.value }))}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                      : 'bg-white border-gray-200 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                  }`}
                >
                  <option value="">{t('ticket.selectSeasonGroup')}</option>
                  {SEASON_GROUPS.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{t('ticket.seasonLabel')}</label>
                <select
                  value={newTicket.season}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, season: e.target.value }))}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                      : 'bg-white border-gray-200 text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                  }`}
                >
                  <option value="">{t('ticket.selectSeason')}</option>
                  {SEASONS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCreatePopup(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    darkMode
                      ? 'text-[#999999] hover:bg-[rgba(215,183,151,0.1)] hover:text-[#D7B797]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement create ticket API call
                    console.log('Creating ticket:', newTicket);
                    setShowCreatePopup(false);
                    setNewTicket({ budgetName: '', seasonGroup: '', season: '' });
                  }}
                  disabled={!newTicket.budgetName || !newTicket.seasonGroup || !newTicket.season}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                    !newTicket.budgetName || !newTicket.seasonGroup || !newTicket.season
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A584]'
                  }`}
                >
                  {t('ticket.createTicket')}
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
