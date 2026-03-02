'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Plus, X, Filter, Eye, Split, Check, Clock,
  Wallet, CircleCheckBig, Hourglass, Trash2, Send, Archive
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/formatters';
import { budgetService } from '@/services';
import { invalidateCache } from '@/services/api';
import { LoadingSpinner, ErrorMessage, EmptyState, ExpandableStatCard } from '@/components/ui';
import { MobileList, FilterChips, FloatingActionButton, PullToRefresh, FilterBottomSheet, useBottomSheet } from '@/components/mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/contexts/AppContext';

const BudgetManagementScreen = ({ selectedYear, setSelectedYear, onAllocate }: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { registerCreateBudget, unregisterCreateBudget } = useAppContext();
  const { isOpen: filterOpen, open: openFilter, close: closeFilter } = useBottomSheet();
  const [mobileFilterValues, setMobileFilterValues] = useState<Record<string, string | string[]>>({});

  // ── State ──────────────────────────────────────────────────────────
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const [editForm, setEditForm] = useState({ name: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ fiscalYear: new Date().getFullYear() + 1, name: '', totalBudget: '', description: '' });

  // ── Fetch budgets (always fetch all — client-side year filtering) ──
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await budgetService.getAll({});
      const budgets = (Array.isArray(response) ? response : []).map((b: any) => ({
        id: b.id,
        fiscalYear: b.fiscal_year ?? b.fiscalYear,
        totalBudget: Number(b.amount ?? b.totalBudget ?? b.totalAmount) || 0,
        budgetName: b.budgetCode || b.name || b.budgetName || 'Untitled',
        description: b.description || '',
        status: (b.status || 'DRAFT').toLowerCase(),
        createdAt: b.created_at || b.createdAt,
        createdBy: typeof b.creator === 'object' ? b.creator?.name : (b.created_by || b.createdBy),
      }));
      setBudgetData(budgets);
    } catch (err: any) {
      console.error('Failed to fetch budgets:', err);
      setError(t('budget.failedToLoadBudgets'));
      setBudgetData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Derive available FY list from fetched budgets
  const availableYears = useMemo(() => {
    const years = new Set(budgetData.map((b: any) => b.fiscalYear).filter(Boolean));
    return Array.from(years).map(Number).sort((a, b) => b - a);
  }, [budgetData]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedBudget?.id || deleting) return;
    setDeleting(true);
    try {
      await budgetService.delete(selectedBudget.id);
      invalidateCache('/budgets');
      toast.success(t('budget.deleteSuccess') || 'Budget deleted');
      setShowDeleteConfirm(false);
      setShowViewModal(false);
      setSelectedBudget(null);
      await fetchBudgets();
    } catch {
      toast.error(t('budget.deleteFailed') || 'Failed to delete budget');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (budgetId: string) => {
    if (submittingId) return;
    setSubmittingId(budgetId);
    try {
      await budgetService.submit(budgetId);
      invalidateCache('/budgets');
      toast.success(t('budget.submitSuccess') || 'Budget approved');
      await fetchBudgets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('budget.submitFailed') || 'Failed to submit');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleArchive = async () => {
    if (!selectedBudget?.id || archiving) return;
    setArchiving(true);
    try {
      await budgetService.archive(selectedBudget.id);
      invalidateCache('/budgets');
      toast.success(t('budget.archiveSuccess') || 'Budget archived');
      setShowArchiveConfirm(false);
      setShowViewModal(false);
      setSelectedBudget(null);
      await fetchBudgets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('budget.archiveFailed') || 'Failed to archive');
    } finally {
      setArchiving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedBudget?.id || saving) return;
    const amount = parseInt(editForm.amount) || 0;
    if (!editForm.name.trim()) { toast.error(t('budget.nameRequired') || 'Budget name is required'); return; }
    if (amount <= 0) { toast.error(t('budget.amountMustBePositive') || 'Amount must be > 0'); return; }
    setSaving(true);
    try {
      await budgetService.update(String(selectedBudget.id), {
        name: editForm.name.trim(),
        amount,
        description: editForm.description.trim() || undefined,
      });
      invalidateCache('/budgets');
      toast.success(t('budget.updateSuccess') || 'Budget updated');
      setSelectedBudget((prev: any) => ({ ...prev, budgetName: editForm.name.trim(), totalBudget: amount, description: editForm.description.trim() }));
      fetchBudgets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('budget.failedToUpdateBudget') || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const totalAmount = parseInt(newForm.totalBudget) || 0;
    if (!newForm.name.trim() || totalAmount <= 0) return;
    if (totalAmount > 100_000_000_000) { toast.error(t('budget.amountTooLarge') || 'Amount exceeds maximum'); return; }
    setCreating(true);
    try {
      await budgetService.create({ name: newForm.name.trim(), amount: totalAmount, fiscalYear: newForm.fiscalYear, description: newForm.description || undefined });
      invalidateCache('/budgets');
      toast.success(t('budget.budgetCreatedSuccess'));
      setShowCreateModal(false);
      setNewForm({ fiscalYear: new Date().getFullYear() + 1, name: '', totalBudget: '', description: '' });
      fetchBudgets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('budget.failedToCreateBudget'));
    } finally {
      setCreating(false);
    }
  };

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  useEffect(() => {
    registerCreateBudget(() => setShowCreateModal(true));
    return () => unregisterCreateBudget();
  }, [registerCreateBudget, unregisterCreateBudget]);

  useEffect(() => {
    if (selectedBudget) {
      setEditForm({ name: selectedBudget.budgetName || '', amount: String(selectedBudget.totalBudget || ''), description: selectedBudget.description || '' });
    }
  }, [selectedBudget?.id]);

  // ── Computed ───────────────────────────────────────────────────────
  const filteredBudgets = useMemo(() => {
    return budgetData.filter((b: any) => !selectedYear || b.fiscalYear === selectedYear);
  }, [budgetData, selectedYear]);

  const summaryStats = useMemo(() => {
    const total = budgetData.reduce((s: number, b: any) => s + (Number(b.totalBudget) || 0), 0);
    const approved = budgetData.filter((b: any) => b.status === 'approved').reduce((s: number, b: any) => s + (Number(b.totalBudget) || 0), 0);
    const remaining = total - approved;
    return {
      total, approved, remaining,
      count: budgetData.length,
      approvedPct: total > 0 ? ((approved / total) * 100).toFixed(1) : '0',
      remainingPct: total > 0 ? ((remaining / total) * 100).toFixed(1) : '0',
    };
  }, [budgetData]);

  const clearFilters = () => setSelectedYear(null);
  const hasActiveFilters = !!selectedYear;

  // ── Loading / Error ────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" message={t('budget.loadingBudgets')} /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><ErrorMessage message={error} onRetry={fetchBudgets} /></div>;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-2 md:space-y-3">

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="sticky -top-3 md:-top-6 z-30 -mx-3 md:-mx-6 -mt-3 md:-mt-6 mb-2 md:mb-3 border-b backdrop-blur-sm bg-white/95 border-[rgba(215,183,151,0.3)]">
        {/* Mobile Filter Button */}
        {isMobile && (
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <button onClick={openFilter} className="flex items-center gap-1.5 px-3 py-1 border rounded-md text-xs font-medium bg-white border-[#C4B5A5] text-[#6B4D30]">
              <Filter size={12} />
              {t('common.filters')}
              {selectedYear && <span className="w-2 h-2 rounded-full bg-[#D7B797]" />}
            </button>
          </div>
        )}
        {/* Desktop Filters */}
        {!isMobile && (
          <div className="flex flex-wrap items-end gap-2.5 px-3 md:px-6 py-1.5 relative z-[100]">
            {/* Year Filter */}
            <div className="relative shrink-0">
              <label className="block text-[10px] uppercase tracking-[0.06em] font-bold mb-0.5 text-[#8A6340]">FY</label>
              <button
                type="button"
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#666666]" />
                  <span className="font-['JetBrains_Mono']">{selectedYear ? `FY ${selectedYear}` : 'All FY'}</span>
                </div>
                <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${yearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {yearDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden animate-slideDown bg-white border-[#C4B5A5]">
                  {/* All FY option */}
                  <div
                    onClick={() => { setSelectedYear(null); setYearDropdownOpen(false); }}
                    className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${!selectedYear
                      ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                  >
                    <span className="font-medium">All FY</span>
                    {!selectedYear && <Check size={14} className="text-[#127749]" />}
                  </div>
                  {availableYears.map((year) => (
                    <div
                      key={year}
                      onClick={() => { setSelectedYear(year); setYearDropdownOpen(false); }}
                      className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedYear === year
                        ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                    >
                      <span className="font-medium font-['JetBrains_Mono']">FY {year}</span>
                      {selectedYear === year && <Check size={14} className="text-[#127749]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="shrink-0 p-1 rounded transition-colors text-[#999] hover:text-red-500 hover:bg-red-50 mb-0.5" title={t('common.clearAllFilters')}>
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ExpandableStatCard title={t('budget.totalBudget')} value={formatCurrency(summaryStats.total)} sub={t('budget.allBudgetsCombined')} icon={Wallet} accent="gold" trendLabel={`${summaryStats.count} budgets`} trend={1} />
        <ExpandableStatCard title={t('budget.allocated')} value={formatCurrency(summaryStats.approved)} sub={`${summaryStats.approvedPct}% ${t('budget.ofTotal')}`} icon={CircleCheckBig} accent="emerald" progress={Number(summaryStats.approvedPct)} progressLabel={t('budget.allocated')} />
        <ExpandableStatCard title={t('budget.remaining')} value={formatCurrency(summaryStats.remaining)} sub={`${summaryStats.remainingPct}% ${t('budget.ofTotal')}`} icon={Hourglass} accent="amber" progress={Number(summaryStats.remainingPct)} progressLabel={t('budget.remaining')} />
      </div>

      {/* ── Mobile View ─────────────────────────────────────────── */}
      {isMobile && (
        <PullToRefresh onRefresh={fetchBudgets}>
          <FilterChips
            chips={[{ key: 'year', label: t('budget.fiscalYear') }]}
            activeValues={{ year: selectedYear ? `FY${selectedYear}` : '' }}
            onChipPress={openFilter}
            onMorePress={openFilter}
            className="mb-2"
          />
          <MobileList
            items={filteredBudgets.map((budget: any) => ({
              id: budget.id,
              avatar: budget.status === 'approved' ? '✅' : '📝',
              title: budget.budgetName,
              subtitle: `FY${budget.fiscalYear}`,
              value: formatCurrency(budget.totalBudget),
              valueLabel: t('budget.amount'),
              expandedContent: (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setSelectedBudget(budget); setShowViewModal(true); }} className="flex-1 px-3 py-0.5 text-xs font-medium rounded-lg border border-[#C4B5A5] text-[#666]">
                    {t('budget.view')}
                  </button>
                  {budget.status === 'draft' && (
                    <button onClick={() => handleSubmit(budget.id)} disabled={submittingId === budget.id} className={`px-2 py-1 rounded-lg bg-blue-600 text-white text-xs ${submittingId === budget.id ? 'opacity-50' : ''}`}>
                      <Send size={14} />
                    </button>
                  )}
                  {budget.status === 'approved' && (
                    <button onClick={() => onAllocate?.({ id: budget.id, year: budget.fiscalYear, totalBudget: budget.totalBudget, budgetName: budget.budgetName })} className="px-2 py-1 rounded-lg bg-[#127749] text-white">
                      <Split size={14} />
                    </button>
                  )}
                </div>
              ),
            }))}
            expandable
            emptyMessage={hasActiveFilters ? t('budget.noMatchingBudgets') : t('budget.noBudgetsYet')}
          />
          <FloatingActionButton icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)} />
        </PullToRefresh>
      )}

      {/* ── Desktop Table ───────────────────────────────────────── */}
      {!isMobile && (
        <div className="rounded-xl shadow-sm border overflow-hidden bg-white border-[#C4B5A5]">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-[rgba(160,120,75,0.18)]">
                <tr>
                  <th className="text-left px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('budget.fiscalYear')}</th>
                  <th className="text-left px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('budget.budgetName')}</th>
                  <th className="text-left px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('budget.amount')}</th>
                  <th className="text-left px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('budget.createdBy')}</th>
                  <th className="text-left px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('budget.createdOn')}</th>
                  <th className="text-right px-3 py-0.5 text-xs font-semibold tracking-wider font-['Montserrat'] text-[#666]">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2E]/10">
                {filteredBudgets.map((budget: any) => (
                  <tr key={budget.id} onClick={() => { setSelectedBudget(budget); setShowViewModal(true); }} className="transition-colors cursor-pointer hover:bg-[rgba(160,120,75,0.18)]">
                    <td className="px-3 py-0.5"><span className="text-sm font-medium text-[#0A0A0A]">FY{budget.fiscalYear}</span></td>
                    <td className="px-3 py-0.5"><span className="text-sm font-medium text-[#6B4D30] hover:underline cursor-pointer">{budget.budgetName}</span></td>
                    <td className="px-3 py-0.5"><span className="text-sm font-semibold font-['JetBrains_Mono'] text-[#0A0A0A]">{formatCurrency(budget.totalBudget)}</span></td>
                    <td className="px-3 py-0.5"><span className="text-sm text-[#666]">{budget.createdBy || '-'}</span></td>
                    <td className="px-3 py-0.5"><span className="text-sm text-[#666]">{budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('vi-VN') : '-'}</span></td>
                    <td className="px-3 py-0.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedBudget(budget); setShowViewModal(true); }} className="p-1.5 rounded-md transition text-[#666] hover:text-[#0A0A0A] hover:bg-[#F2F2F2]" title={t('budget.view')}>
                          <Eye size={14} />
                        </button>
                        {budget.status === 'draft' && (
                          <button onClick={() => handleSubmit(budget.id)} disabled={submittingId === budget.id} className={`p-1.5 rounded-md transition text-blue-600 hover:bg-blue-50 ${submittingId === budget.id ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('budget.submit') || 'Submit'}>
                            <Send size={14} />
                          </button>
                        )}
                        {budget.status === 'approved' && (
                          <>
                            <button onClick={() => { setSelectedBudget(budget); setShowArchiveConfirm(true); }} className="p-1.5 rounded-md transition text-[#9A7B2E] hover:bg-[rgba(227,179,65,0.1)]" title={t('budget.archive') || 'Archive'}>
                              <Archive size={14} />
                            </button>
                            <button onClick={() => onAllocate?.({ id: budget.id, year: budget.fiscalYear, totalBudget: budget.totalBudget, budgetName: budget.budgetName })} className="p-1.5 rounded-md transition bg-[rgba(160,120,75,0.18)] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.25)] border border-[rgba(215,183,151,0.4)]" title={t('budget.allocate')}>
                              <Split size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredBudgets.length > 0 && (
                <tfoot>
                  <tr className="bg-[rgba(160,120,75,0.10)]">
                    <td className="px-3 py-1.5"><span className="text-xs font-bold uppercase tracking-wider font-['Montserrat'] text-[#6B4D30]">{t('common.total') || 'TOTAL'}</span></td>
                    <td className="px-3 py-1.5"><span className="text-xs font-medium text-[#666]">{filteredBudgets.length} {t('budget.budgets') || 'budgets'}</span></td>
                    <td className="px-3 py-1.5"><span className="text-sm font-bold font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(filteredBudgets.reduce((s: number, b: any) => s + (Number(b.totalBudget) || 0), 0))}</span></td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {filteredBudgets.length === 0 && (
            <div className="py-8">
              <EmptyState
                title={hasActiveFilters ? t('budget.noMatchingBudgets') : t('budget.noBudgetsYet')}
                message={hasActiveFilters ? t('budget.tryAdjustingFilters') : t('budget.createFirstBudget')}
                actionLabel={hasActiveFilters ? undefined : t('budget.createBudget')}
                onAction={hasActiveFilters ? undefined : () => setShowCreateModal(true)}
              />
              {hasActiveFilters && (
                <div className="text-center">
                  <button onClick={clearFilters} className="text-sm font-medium text-[#6B4D30] hover:text-[#6B4D30]/80">{t('common.clearAllFilters')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile Filter Bottom Sheet ──────────────────────────── */}
      <FilterBottomSheet
        isOpen={filterOpen}
        onClose={closeFilter}
        filters={[{ key: 'year', label: t('budget.fiscalYear'), type: 'single', options: [{ label: 'All FY', value: '' }, ...availableYears.map((y) => ({ label: `FY${y}`, value: String(y) }))] }]}
        values={mobileFilterValues}
        onChange={(key, value) => setMobileFilterValues(prev => ({ ...prev, [key]: value }))}
        onApply={() => setSelectedYear(mobileFilterValues.year ? Number(mobileFilterValues.year) : null)}
        onReset={() => { setMobileFilterValues({}); clearFilters(); }}
      />

      {/* ── View / Edit Modal ───────────────────────────────────── */}
      {showViewModal && selectedBudget && createPortal(
        <div className="fixed inset-0 z-[9999] animate-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
          <div className="relative flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scalePop bg-white text-[#0A0A0A]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#C4B5A5]">
                <h3 className="text-lg font-semibold font-['Montserrat']">{t('budget.budgetDetail')}</h3>
                <button onClick={() => setShowViewModal(false)} className="p-2 rounded-lg transition-colors hover:bg-[#F2F2F2]"><X size={18} /></button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4 text-sm max-h-[65vh] overflow-y-auto">
                {/* Read-only info */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#F7F4F1]">
                  <div>
                    <p className="text-xs mb-1 text-[#999]">{t('budget.fiscalYear')}</p>
                    <p className="font-semibold font-['Montserrat']">FY{selectedBudget.fiscalYear}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-[#999]">{t('budget.createdBy')}</p>
                    <p className="font-medium truncate">{selectedBudget.createdBy || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-[#999]">{t('budget.createdOn')}</p>
                    <p className="font-medium">{selectedBudget.createdAt ? new Date(selectedBudget.createdAt).toLocaleDateString('vi-VN') : '-'}</p>
                  </div>
                </div>

                {/* Budget Name */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-['Montserrat'] text-[#666]">
                    {t('budget.budgetName')} <span className="text-[#F85149]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={selectedBudget.status !== 'draft'}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999] ${selectedBudget.status !== 'draft' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder={t('budget.enterBudgetName')}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-['Montserrat'] text-[#666]">
                    {t('budget.amountVND')} <span className="text-[#F85149]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value.replace(/[^0-9]/g, '') })}
                    disabled={selectedBudget.status !== 'draft'}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] font-['JetBrains_Mono'] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999] ${selectedBudget.status !== 'draft' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                  {editForm.amount && (
                    <p className="text-xs mt-1 font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(parseInt(editForm.amount) || 0)}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-['Montserrat'] text-[#666]">{t('budget.description') || 'Description'}</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    disabled={selectedBudget.status !== 'draft'}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] resize-none bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999] ${selectedBudget.status !== 'draft' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder={t('budget.enterDescription') || 'Enter description...'}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#C4B5A5]">
                <div className="flex items-center gap-2">
                  {selectedBudget.status === 'draft' && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} /> {t('common.delete') || 'Delete'}
                    </button>
                  )}
                  {selectedBudget.status === 'approved' && (
                    <button onClick={() => setShowArchiveConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-[#9A7B2E] hover:bg-[rgba(227,179,65,0.12)]">
                      <Archive size={14} /> {t('budget.archive') || 'Archive'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowViewModal(false)} className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                    {t('common.close')}
                  </button>
                  {selectedBudget.status === 'draft' && (
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editForm.name.trim() || !editForm.amount}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        saving || !editForm.name.trim() || !editForm.amount ? 'bg-[#E5E5E5] text-[#999] cursor-not-allowed' : 'bg-[#127749] hover:bg-[#2A9E6A] text-white'
                      }`}
                    >
                      {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saving ? (t('common.saving') || 'Saving...') : (t('budget.saveChanges') || 'Save Changes')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      {showDeleteConfirm && selectedBudget && createPortal(
        <div className="fixed inset-0 z-[10000] animate-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scalePop bg-white text-[#0A0A0A]">
              <div className="px-6 py-5 space-y-3">
                <h3 className="text-lg font-semibold font-['Montserrat']">{t('budget.confirmDelete') || 'Confirm Delete'}</h3>
                <p className="text-sm text-[#666]">{t('budget.deleteWarning') || 'Are you sure you want to delete this budget? This action cannot be undone.'}</p>
                <p className="text-sm font-medium">{selectedBudget.budgetName}</p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C4B5A5]">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button onClick={handleDelete} disabled={deleting} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {deleting ? (t('common.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Archive Confirmation ─────────────────────────────────── */}
      {showArchiveConfirm && selectedBudget && createPortal(
        <div className="fixed inset-0 z-[10000] animate-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowArchiveConfirm(false)} />
          <div className="relative flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scalePop bg-white text-[#0A0A0A]">
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-[#9A7B2E]" />
                  <h3 className="text-lg font-semibold font-['Montserrat']">{t('budget.confirmArchive') || 'Confirm Archive'}</h3>
                </div>
                <p className="text-sm text-[#666]">{t('budget.archiveWarning') || 'Are you sure you want to archive this budget?'}</p>
                <p className="text-sm font-medium">{selectedBudget.budgetName}</p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C4B5A5]">
                <button onClick={() => setShowArchiveConfirm(false)} className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button onClick={handleArchive} disabled={archiving} className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${archiving ? 'opacity-50 cursor-not-allowed' : ''} bg-[#E3B341] hover:bg-[#D29922] text-[#0A0A0A]`}>
                  <Archive size={14} />
                  {archiving ? (t('budget.archiving') || 'Archiving...') : (t('budget.archive') || 'Archive')}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Create Budget Modal ──────────────────────────────────── */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] animate-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative flex min-h-screen items-center justify-center p-4">
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden bg-white animate-scalePop">
            <div className="flex items-center justify-between p-6 border-b border-[#C4B5A5]">
              <h3 className="text-lg font-semibold font-['Montserrat'] text-[#0A0A0A]">{t('budget.createNewBudget')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg transition-colors text-[#999] hover:text-[#0A0A0A] hover:bg-[#F2F2F2]"><X size={20} /></button>
            </div>
            <div className="p-3 md:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-14rem)]">
              {/* Fiscal Year */}
              <div>
                <label className="block text-sm font-medium mb-2 font-['Montserrat'] text-[#0A0A0A]">
                  {t('budget.fiscalYear')} <span className="text-[#F85149]">{t('common.required')}</span>
                </label>
                <select
                  value={newForm.fiscalYear}
                  onChange={(e) => setNewForm({ ...newForm, fiscalYear: parseInt(e.target.value) })}
                  className="w-full px-4 py-0.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A]"
                >
                  {[...new Set([...availableYears, new Date().getFullYear(), new Date().getFullYear() + 1])].sort((a, b) => b - a).map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>

              {/* Budget Name */}
              <div>
                <label className="block text-sm font-medium mb-2 font-['Montserrat'] text-[#0A0A0A]">
                  {t('budget.budgetName')} <span className="text-[#F85149]">{t('common.required')}</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder={t('budget.enterBudgetName')}
                  className="w-full px-4 py-0.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999]"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2 font-['Montserrat'] text-[#0A0A0A]">
                  {t('budget.amountVND')} <span className="text-[#F85149]">{t('common.required')}</span>
                </label>
                <input
                  type="text"
                  value={newForm.totalBudget}
                  onChange={(e) => setNewForm({ ...newForm, totalBudget: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder={t('budget.enterTotalBudgetAmount')}
                  className="w-full px-4 py-0.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999]"
                />
                {newForm.totalBudget && (
                  <p className="text-xs mt-1 font-['JetBrains_Mono'] text-[#999]">{formatCurrency(parseInt(newForm.totalBudget) || 0)}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2 font-['Montserrat'] text-[#0A0A0A]">{t('common.description')}</label>
                <textarea
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder={t('budget.enterDescription')}
                  rows={3}
                  className="w-full px-4 py-0.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] resize-none bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#C4B5A5] bg-[#F2F2F2] rounded-b-2xl">
              <button
                onClick={() => { setShowCreateModal(false); setNewForm({ fiscalYear: new Date().getFullYear() + 1, name: '', totalBudget: '', description: '' }); }}
                className="px-5 py-0.5 text-sm font-medium rounded-lg transition-colors text-[#666] hover:bg-[#E5E5E5]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newForm.totalBudget || !newForm.name.trim() || creating}
                className={`px-5 py-0.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
                  !newForm.totalBudget || !newForm.name.trim() || creating ? 'bg-[#2E2E2E] cursor-not-allowed text-[#666]' : 'bg-[#127749] hover:bg-[#2A9E6A]'
                }`}
              >
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? t('budget.creating') : t('budget.createBudget')}
              </button>
            </div>
          </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
};

export default BudgetManagementScreen;
