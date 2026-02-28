'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileCheck, CheckCircle, XCircle, Clock, Loader2,
  Filter, Search, ChevronDown, Eye,
  X, AlertTriangle, Shield, ArrowUpRight,
  Wallet, BarChart3, Package, ClipboardList,
  CheckSquare, Square, MinusSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { approvalService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExpandableStatCard } from '@/components/ui';
import { MobileList, FilterBottomSheet, PullToRefresh, useBottomSheet } from '@/components/mobile';
import { useIsMobile } from '@/hooks/useIsMobile';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════ */
const STATUS_CONFIG: any = {
  SUBMITTED: { color: '#D29922', bg: 'rgba(210,153,34,0.12)', label: 'Pending L1' },
  LEVEL1_APPROVED: { color: '#58A6FF', bg: 'rgba(88,166,255,0.12)', label: 'Pending L2' },
  LEVEL2_APPROVED: { color: '#2A9E6A', bg: 'rgba(42,158,106,0.12)', label: 'Approved' },
  APPROVED: { color: '#2A9E6A', bg: 'rgba(42,158,106,0.12)', label: 'Approved' },
  LEVEL1_REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' },
  LEVEL2_REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' },
  REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' }};

const ENTITY_ICONS: any = {
  budget: Wallet,
  planning: BarChart3,
  proposal: Package};

/* Helper: extract display name & brand from any pending approval item */
const getItemDisplayInfo = (item: any) => {
  const d = item.data || {};
  // Name: try common fields, then type-specific codes
  const name = d.name || d.budgetName || d.planningName || d.ticketName
    || d.budgetCode || d.planningCode || d.proposalCode
    || `${item.entityType} #${String(item.entityId).substring(0, 8)}`;
  // Brand: try direct groupBrand, then nested paths for planning/proposal
  const brand = d.groupBrand?.name
    || d.budgetDetail?.budget?.groupBrand?.name
    || d.budget?.groupBrand?.name
    || d.brand?.name || d.brandName || '-';
  return { name, brand };
};

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
const ApprovalsScreen = ({  }: any) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const { isOpen: filterOpen, open: openFilterSheet, close: closeFilterSheet } = useBottomSheet();
  const [mobileFilterValues, setMobileFilterValues] = useState<Record<string, string | string[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState<boolean>(false);
  const [bulkRejectComment, setBulkRejectComment] = useState<string>('');

  // Fetch pending approvals
  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalService.getPending();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch pending approvals:', err);
      setError(t('approvals.failedToLoad'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk selection helpers ---
  const getItemKey = (item: any) => `${item.entityType}:${item.entityId}`;

  const toggleSelect = useCallback((key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  // Navigate to entity detail page
  const navigateToEntity = (item: any) => {
    const routes: Record<string, string> = {
      budget: `/budget-management?highlight=${item.entityId}`,
      planning: `/planning/${item.entityId}`,
      proposal: `/proposal/${item.entityId}`};
    const path = routes[item.entityType];
    if (path) router.push(path);
  };

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item: any) => {
      if (entityFilter !== 'all' && item.entityType !== entityFilter) return false;
      if (levelFilter !== 'all' && item.level !== parseInt(levelFilter)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const info = getItemDisplayInfo(item);
        return info.name.toLowerCase().includes(term) || info.brand.toLowerCase().includes(term);
      }
      return true;
    });
  }, [items, entityFilter, levelFilter, searchTerm]);

  // Clear selection when filters/data change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [entityFilter, levelFilter, searchTerm, items]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === filtered.length && filtered.length > 0) {
        return new Set();
      }
      return new Set(filtered.map(getItemKey));
    });
  }, [filtered]);

  // Bulk approve/reject handler
  const handleBulkAction = useCallback(async (action: 'approve' | 'reject', comment?: string) => {
    if (selectedIds.size === 0) return;

    // For reject, prompt for a comment first
    if (action === 'reject' && !bulkRejectModalOpen) {
      setBulkRejectComment('');
      setBulkRejectModalOpen(true);
      return;
    }

    const selectedItems = filtered.filter((item: any) => selectedIds.has(getItemKey(item)));
    if (selectedItems.length === 0) return;

    const actionLabel = action === 'approve' ? t('approvals.approve') : t('approvals.reject');
    setBulkProcessing(true);

    let successCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      try {
        if (action === 'approve') {
          await approvalService.approve(item.entityType, item.entityId, item.level);
        } else {
          await approvalService.reject(item.entityType, item.entityId, item.level, comment || '');
        }
        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`Failed to ${action} ${item.entityType} ${item.entityId}:`, err);
      }
    }

    setBulkProcessing(false);
    setSelectedIds(new Set());
    setBulkRejectModalOpen(false);
    setBulkRejectComment('');

    if (successCount > 0 && failCount === 0) {
      toast.success(`${actionLabel}: ${successCount} ${t('approvals.itemsProcessed')}`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${actionLabel}: ${successCount} ${t('approvals.itemsProcessed')}`);
      toast.error(`${failCount} ${t('approvals.itemsFailed')}`);
    } else {
      toast.error(`${actionLabel}: ${t('approvals.allFailed')}`);
    }

    await fetchPendingApprovals();
  }, [selectedIds, filtered, t, bulkRejectModalOpen]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const l1 = items.filter((i: any) => i.level === 1).length;
    const l2 = items.filter((i: any) => i.level === 2).length;
    const budgets = items.filter((i: any) => i.entityType === 'budget').length;
    const plannings = items.filter((i: any) => i.entityType === 'planning').length;
    const proposals = items.filter((i: any) => i.entityType === 'proposal').length;

    return {
      total, l1, l2, budgets, plannings, proposals,
      entityBreakdown: [
        { label: t('approvals.typeBudget'), value: budgets, color: '#D7B797' },
        { label: t('approvals.typePlanning'), value: plannings, color: '#58A6FF' },
        { label: t('approvals.typeProposal'), value: proposals, color: '#2A9E6A' },
      ].filter((b: any) => b.value > 0),
      levelBreakdown: [
        { label: 'Level 1', value: l1, color: '#58A6FF' },
        { label: 'Level 2', value: l2, color: '#A371F7' },
      ].filter((b: any) => b.value > 0),
      l1Pct: total > 0 ? Math.round((l1 / total) * 100) : 0,
      l2Pct: total > 0 ? Math.round((l2 / total) * 100) : 0,
      budgetPct: total > 0 ? Math.round((budgets / total) * 100) : 0};
  }, [items, t]);

  const bg ='bg-gray-50';
  const cardBg ='bg-white';
  const border ='border-gray-300';
  const textPrimary ='text-gray-900';
  const textSecondary ='text-gray-700';
  const textMuted ='text-gray-600';

  return (
    <div className={`min-h-screen ${bg} p-2 md:p-4`}>
      {/* Compact Header + Filters */}
      <div className={`border ${border} rounded-xl px-2 md:px-3 py-2 mb-3`} style={{
        background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.04) 35%, rgba(215,183,151,0.12) 100%)',
        boxShadow: `inset 0 -1px 0 ${'rgba(215,183,151,0.05)'}`}}>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${'bg-[rgba(215,183,151,0.15)]'}`}>
            <FileCheck size={14} className={'text-[#6B4D30]'} />
          </div>
          <div className="flex-shrink-0">
            <h1 className={`text-sm font-semibold font-['Montserrat'] ${textPrimary} leading-tight`}>
              {t('screenConfig.approvals')}
            </h1>
            <p className={`text-[10px] ${textMuted} leading-tight`}>
              {t('approvals.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Mobile filter button */}
            {isMobile && (
              <button
                onClick={openFilterSheet}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${border} text-xs font-medium font-['Montserrat'] ${'text-[#6B4D30] bg-gray-50'}`}
              >
                <Filter size={12} />
                {t('budget.filters')}
                {(entityFilter !== 'all' || levelFilter !== 'all' || searchTerm) && (
                  <span className="w-2 h-2 rounded-full bg-[#D7B797]" />
                )}
              </button>
            )}

            {/* Desktop filters */}
            {!isMobile && (
            <>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${border} ${'bg-gray-50'} w-48`}>
              <Search size={12} className={textMuted} />
              <input
                type="text"
                placeholder={t('approvals.searchPlaceholder')}
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className={`bg-transparent outline-none text-xs w-full font-['Montserrat'] ${textPrimary} placeholder:${textMuted}`}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <X size={10} className={textMuted} />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={entityFilter}
                onChange={(e: any) => setEntityFilter(e.target.value)}
                className={`appearance-none px-2 py-1 pr-6 rounded-lg border ${border} ${'bg-gray-50'} text-xs font-['Montserrat'] ${textPrimary} outline-none cursor-pointer`}
              >
                <option value="all">{t('approvals.allTypes')}</option>
                <option value="budget">{t('approvals.typeBudget')}</option>
                <option value="planning">{t('approvals.typePlanning')}</option>
                <option value="proposal">{t('approvals.typeProposal')}</option>
              </select>
              <ChevronDown size={10} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
            </div>

            <div className="relative">
              <select
                value={levelFilter}
                onChange={(e: any) => setLevelFilter(e.target.value)}
                className={`appearance-none px-2 py-1 pr-6 rounded-lg border ${border} ${'bg-gray-50'} text-xs font-['Montserrat'] ${textPrimary} outline-none cursor-pointer`}
              >
                <option value="all">{t('approvals.allLevels')}</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
              </select>
              <ChevronDown size={10} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
            </div>
            </>
            )}

            <button
              onClick={fetchPendingApprovals}
              className={`px-2.5 py-1 rounded-lg border ${border} text-xs font-medium font-['Montserrat'] transition-all ${'text-[#6B4D30] hover:bg-[rgba(215,183,151,0.1)]'}`}
            >
              {t('common.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <ExpandableStatCard
          title={t('approvals.totalPending')}
          value={stats.total}
          sub={t('approvals.awaitingReview')}
          icon={Clock}
          accent="amber"
          breakdown={stats.entityBreakdown}
          expandTitle={t('approvals.allTypes')}
        />
        <ExpandableStatCard
          title={t('approvals.level1Pending')}
          value={stats.l1}
          sub={t('approvals.initialReview')}
          icon={Shield}
          accent="blue"
          progress={stats.l1Pct}
          progressLabel="Level 1"
          breakdown={stats.entityBreakdown}
        />
        <ExpandableStatCard
          title={t('approvals.level2Pending')}
          value={stats.l2}
          sub={t('approvals.finalApproval')}
          icon={FileCheck}
          accent="emerald"
          progress={stats.l2Pct}
          progressLabel="Level 2"
          badges={[
            { label: t('approvals.typeBudget'), value: stats.budgets, color: '#D7B797' },
            { label: t('approvals.typePlanning'), value: stats.plannings, color: '#58A6FF' },
          ].filter((b: any) => b.value > 0)}
        />
        <ExpandableStatCard
          title={t('approvals.budgetItems')}
          value={stats.budgets}
          sub={t('approvals.budgetRequests')}
          icon={ArrowUpRight}
          accent="gold"
          progress={stats.budgetPct}
          progressLabel={t('approvals.typeBudget')}
        />
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className={`border ${border} rounded-xl px-3 py-2 mb-3 flex flex-wrap items-center gap-2 ${'bg-white'}`}>
          <span className={`text-xs font-semibold font-['Montserrat'] ${textPrimary}`}>
            {selectedIds.size} {t('approvals.itemsSelected')}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkAction('approve')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] text-white bg-[#2A9E6A] hover:bg-[#238c5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {t('approvals.approveSelected')}
            </button>
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkAction('reject')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] text-white bg-[#F85149] hover:bg-[#e0443d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              {t('approvals.rejectSelected')}
            </button>
            <button
              disabled={bulkProcessing}
              onClick={deselectAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${border} text-xs font-medium font-['Montserrat'] transition-colors ${'text-gray-600 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <X size={13} />
              {t('approvals.deselectAll')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`border ${border} rounded-xl overflow-hidden`} style={{
        background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)'}}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className={`animate-spin ${'text-[#6B4D30]'}`} />
            <p className={`text-sm mt-3 ${textSecondary}`}>{t('approvals.loadingApprovals')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle size={32} className="text-[#F85149]" />
            <p className={`text-sm mt-3 ${textSecondary}`}>{error}</p>
            <button onClick={fetchPendingApprovals} className="mt-3 px-4 py-2 rounded-xl bg-[#D7B797] text-black text-sm font-medium font-['Montserrat']">
              {t('common.tryAgain')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle size={48} className={`${'text-green-500'}`} />
            <p className={`text-base font-semibold mt-4 font-['Montserrat'] ${textPrimary}`}>{t('approvals.allCaughtUp')}</p>
            <p className={`text-sm mt-1 ${textSecondary}`}>{t('approvals.noPendingItems')}</p>
          </div>
        ) : isMobile ? (
          /* Mobile Card View with Checkboxes */
          <PullToRefresh onRefresh={fetchPendingApprovals}>
            <div className="p-2 space-y-2">
              {/* Mobile Select All */}
              <button
                onClick={toggleSelectAll}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-['Montserrat'] ${'text-[#6B4D30]'}`}
              >
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? <CheckSquare size={16} className={'text-[#6B4D30]'} />
                  : selectedIds.size > 0
                    ? <MinusSquare size={16} className={'text-[#6B4D30]'} />
                    : <Square size={16} />
                }
                {t('approvals.selectAll')}
              </button>

              {filtered.map((item: any, idx: any) => {
                const status = item.data?.status || 'SUBMITTED';
                const sc = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
                const { name, brand } = getItemDisplayInfo(item);
                const itemKey = getItemKey(item);
                const isSelected = selectedIds.has(itemKey);

                return (
                  <div
                    key={`${item.entityType}-${item.entityId}-${idx}`}
                    className={`flex items-start gap-2 p-3 rounded-xl border ${border} transition-colors ${isSelected ? ('bg-[rgba(215,183,151,0.08)] border-[#6B4D30]') : ('bg-white')}`}
                  >
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(itemKey)} className="flex-shrink-0 mt-0.5" aria-label={`Select ${name}`}>
                      {isSelected
                        ? <CheckSquare size={18} className={'text-[#6B4D30]'} />
                        : <Square size={18} className={textMuted} />
                      }
                    </button>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0" onClick={() => navigateToEntity(item)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold font-['Montserrat'] ${textPrimary} truncate`}>{name}</span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-['JetBrains_Mono'] flex-shrink-0"
                          style={{ color: sc.color, backgroundColor: sc.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-['Montserrat'] capitalize ${textSecondary}`}>{item.entityType}</span>
                        <span className={textMuted}>&#183;</span>
                        <span className={`text-xs font-['Montserrat'] ${textSecondary}`}>{brand}</span>
                        <span className={textMuted}>&#183;</span>
                        <span
                          className="text-xs font-semibold font-['JetBrains_Mono']"
                          style={{ color: item.level === 1 ? '#58A6FF' : '#A371F7' }}
                        >
                          L{item.level}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-1 font-['JetBrains_Mono'] ${textMuted}`}>
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN') : '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </PullToRefresh>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${'bg-gray-50'} border-b ${border}`}>
                  <th className="px-3 py-2 w-8">
                    <button onClick={toggleSelectAll} className={`flex items-center justify-center ${textMuted} hover:text-[#D7B797] transition-colors`} aria-label="Select all approvals">
                      {selectedIds.size === filtered.length && filtered.length > 0
                        ? <CheckSquare size={16} className={'text-[#6B4D30]'} />
                        : selectedIds.size > 0
                          ? <MinusSquare size={16} className={'text-[#6B4D30]'} />
                          : <Square size={16} />
                      }
                    </button>
                  </th>
                  {[t('approvals.colType'), t('approvals.colName'), t('approvals.colBrand'), t('approvals.colLevel'), t('approvals.colStatus'), t('approvals.colSubmitted'), t('common.actions')].map((h: any) => (
                    <th key={h} className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${textMuted}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any, idx: any) => {
                  const status = item.data?.status || 'SUBMITTED';
                  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
                  const { name, brand } = getItemDisplayInfo(item);

                  const itemKey = getItemKey(item);
                  const isSelected = selectedIds.has(itemKey);

                  return (
                    <tr
                      key={`${item.entityType}-${item.entityId}-${idx}`}
                      className={`border-b ${border} transition-colors ${isSelected ? ('bg-[rgba(215,183,151,0.08)]') : ('hover:bg-gray-50')}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-1.5 w-8">
                        <button onClick={() => toggleSelect(itemKey)} className={`flex items-center justify-center ${textMuted} hover:text-[#D7B797] transition-colors`} aria-label={`Select ${name}`}>
                          {isSelected
                            ? <CheckSquare size={16} className={'text-[#6B4D30]'} />
                            : <Square size={16} />
                          }
                        </button>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {(() => { const Icon = ENTITY_ICONS[item.entityType] || ClipboardList; return <Icon size={16} strokeWidth={2} className={'text-[#6B4D30]'} />; })()}
                          <span className={`text-sm font-medium font-['Montserrat'] capitalize ${textPrimary}`}>
                            {item.entityType}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-1.5">
                        <span className={`text-sm font-medium font-['Montserrat'] ${textPrimary}`}>{name}</span>
                      </td>

                      {/* Brand */}
                      <td className="px-3 py-1.5">
                        <span className={`text-sm font-['Montserrat'] ${textSecondary}`}>{brand}</span>
                      </td>

                      {/* Level */}
                      <td className="px-3 py-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-['JetBrains_Mono']"
                          style={{
                            color: item.level === 1 ? '#58A6FF' : '#A371F7',
                            backgroundColor: item.level === 1 ? 'rgba(88,166,255,0.12)' : 'rgba(163,113,247,0.12)'}}
                        >
                          L{item.level}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-['JetBrains_Mono']"
                          style={{ color: sc.color, backgroundColor: sc.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="px-3 py-1.5">
                        <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN') : '-'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => navigateToEntity(item)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all ${'bg-[rgba(160,120,75,0.1)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
                        >
                          <Eye size={13} />
                          {t('common.view')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterOpen}
        onClose={closeFilterSheet}
        filters={[
          {
            key: 'entityFilter',
            label: t('approvals.allTypes'),
            icon: '🏷️',
            type: 'single',
            options: [
              { value: 'budget', label: t('approvals.typeBudget') },
              { value: 'planning', label: t('approvals.typePlanning') },
              { value: 'proposal', label: t('approvals.typeProposal') },
            ]},
          {
            key: 'levelFilter',
            label: t('approvals.allLevels'),
            icon: '🛡️',
            type: 'single',
            options: [
              { value: '1', label: 'Level 1' },
              { value: '2', label: 'Level 2' },
            ]},
        ]}
        values={mobileFilterValues}
        onChange={(key, value) => {
          setMobileFilterValues(prev => ({ ...prev, [key]: value }));
          if (key === 'entityFilter') setEntityFilter(value ? String(value) : 'all');
          if (key === 'levelFilter') setLevelFilter(value ? String(value) : 'all');
        }}
        onApply={closeFilterSheet}
        onReset={() => {
          setMobileFilterValues({});
          setSearchTerm('');
          setEntityFilter('all');
          setLevelFilter('all');
        }}
      />

      {/* Bulk Reject Comment Modal */}
      {bulkRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl border ${border} ${cardBg} shadow-2xl`}>
            <div className={`p-5 border-b ${border}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold font-['Montserrat'] ${textPrimary}`}>
                  {t('approvals.rejectReason') || 'Rejection Reason'}
                </h3>
                <button onClick={() => { setBulkRejectModalOpen(false); setBulkRejectComment(''); }} className={`p-1.5 rounded-lg ${'hover:bg-gray-100'}`} aria-label="Close rejection dialog">
                  <X size={18} className={textMuted} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <p className={`text-sm mb-3 ${textSecondary}`}>
                {t('approvals.rejectReasonDescription') || `Please provide a reason for rejecting ${selectedIds.size} item(s).`}
              </p>
              <textarea
                value={bulkRejectComment}
                onChange={(e: any) => setBulkRejectComment(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-xl border ${border} ${'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none resize-none focus:border-[#D7B797]`}
                placeholder={t('approvals.rejectCommentPlaceholder') || 'Enter reason for rejection...'}
                autoFocus
              />
            </div>
            <div className={`p-5 border-t ${border} flex justify-end gap-3`}>
              <button
                onClick={() => { setBulkRejectModalOpen(false); setBulkRejectComment(''); }}
                className={`px-4 py-2 rounded-xl border ${border} text-sm font-medium font-['Montserrat'] ${textSecondary} transition-all ${'hover:bg-gray-100'}`}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={() => handleBulkAction('reject', bulkRejectComment)}
                disabled={bulkProcessing || !bulkRejectComment.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold font-['Montserrat'] transition-all disabled:opacity-50 bg-[#F85149] text-white hover:bg-[#e0443d]"
              >
                {bulkProcessing ? <Loader2 size={16} className="animate-spin mx-auto" /> : (t('approvals.confirmReject') || 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsScreen;
