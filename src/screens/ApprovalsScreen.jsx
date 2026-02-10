'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck, CheckCircle, XCircle, Clock, Loader2,
  Filter, Search, ChevronDown, Eye, MessageSquare,
  X, AlertTriangle, Shield, ArrowUpRight
} from 'lucide-react';
import { approvalService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../utils';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════ */
const STATUS_CONFIG = {
  SUBMITTED: { color: '#D29922', bg: 'rgba(210,153,34,0.12)', label: 'Pending L1' },
  LEVEL1_APPROVED: { color: '#58A6FF', bg: 'rgba(88,166,255,0.12)', label: 'Pending L2' },
  LEVEL2_APPROVED: { color: '#2A9E6A', bg: 'rgba(42,158,106,0.12)', label: 'Approved' },
  APPROVED: { color: '#2A9E6A', bg: 'rgba(42,158,106,0.12)', label: 'Approved' },
  LEVEL1_REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' },
  LEVEL2_REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' },
  REJECTED: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Rejected' },
};

const ENTITY_ICONS = {
  budget: '💰',
  planning: '📊',
  proposal: '📦',
};

/* ═══════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════ */
const STAT_ACCENTS = {
  amber: { color: '#D29922', darkGrad: 'rgba(210,153,34,0.05)', lightGrad: 'rgba(180,130,20,0.08)', iconDark: 'rgba(210,153,34,0.06)', iconLight: 'rgba(180,130,20,0.06)' },
  blue: { color: '#58A6FF', darkGrad: 'rgba(88,166,255,0.05)', lightGrad: 'rgba(50,120,220,0.08)', iconDark: 'rgba(88,166,255,0.06)', iconLight: 'rgba(50,120,220,0.06)' },
  emerald: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.06)', lightGrad: 'rgba(22,120,70,0.08)', iconDark: 'rgba(42,158,106,0.07)', iconLight: 'rgba(22,120,70,0.07)' },
  gold: { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(180,140,95,0.10)', iconDark: 'rgba(215,183,151,0.07)', iconLight: 'rgba(160,120,75,0.08)' },
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
      {Icon && (
        <div className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none" style={{ opacity: darkMode ? 0.05 : 0.07 }}>
          <Icon size={80} color={a.color} strokeWidth={1} />
        </div>
      )}
      <div className="relative z-10">
        <div className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{title}</div>
        <div className={`text-2xl font-bold mt-1 font-['JetBrains_Mono'] ${textPrimary}`}>{value}</div>
        {sub && <div className={`text-xs mt-1 ${textMuted}`}>{sub}</div>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
const ApprovalsScreen = ({ darkMode }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [actionModal, setActionModal] = useState(null); // { item, action: 'approve'|'reject' }
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

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
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError(t('approvals.failedToLoad'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle approve/reject
  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const { item, action } = actionModal;
      if (action === 'approve') {
        await approvalService.approve(item.entityType, item.entityId, item.level, comment);
      } else {
        await approvalService.reject(item.entityType, item.entityId, item.level, comment);
      }
      setActionModal(null);
      setComment('');
      fetchPendingApprovals();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (entityFilter !== 'all' && item.entityType !== entityFilter) return false;
      if (levelFilter !== 'all' && item.level !== parseInt(levelFilter)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = (item.data?.name || item.data?.budgetName || '').toLowerCase();
        const brand = (item.data?.brand?.name || item.data?.brandName || '').toLowerCase();
        return name.includes(term) || brand.includes(term);
      }
      return true;
    });
  }, [items, entityFilter, levelFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    l1: items.filter(i => i.level === 1).length,
    l2: items.filter(i => i.level === 2).length,
    budgets: items.filter(i => i.entityType === 'budget').length,
  }), [items]);

  const bg = darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-[#121212]' : 'bg-white';
  const border = darkMode ? 'border-[#2E2E2E]' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-[#F2F2F2]' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-[#999999]' : 'text-gray-600';
  const textMuted = darkMode ? 'text-[#666666]' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg} p-6`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold font-['Montserrat'] ${textPrimary}`}>
          {t('screenConfig.approvals')}
        </h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>
          {t('approvals.subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title={t('approvals.totalPending')} value={stats.total} sub={t('approvals.awaitingReview')} darkMode={darkMode} icon={Clock} accent="amber" />
        <StatCard title={t('approvals.level1Pending')} value={stats.l1} sub={t('approvals.initialReview')} darkMode={darkMode} icon={Shield} accent="blue" />
        <StatCard title={t('approvals.level2Pending')} value={stats.l2} sub={t('approvals.finalApproval')} darkMode={darkMode} icon={FileCheck} accent="emerald" />
        <StatCard title={t('approvals.budgetItems')} value={stats.budgets} sub={t('approvals.budgetRequests')} darkMode={darkMode} icon={ArrowUpRight} accent="gold" />
      </div>

      {/* Filters */}
      <div className={`${cardBg} border ${border} rounded-2xl p-4 mb-4`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} flex-1 min-w-[200px] max-w-[360px]`}>
            <Search size={16} className={textMuted} />
            <input
              type="text"
              placeholder={t('approvals.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-transparent outline-none text-sm w-full font-['Montserrat'] ${textPrimary} placeholder:${textMuted}`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}>
                <X size={14} className={textMuted} />
              </button>
            )}
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className={`appearance-none px-3 py-2 pr-8 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none cursor-pointer`}
            >
              <option value="all">{t('approvals.allTypes')}</option>
              <option value="budget">{t('approvals.typeBudget')}</option>
              <option value="planning">{t('approvals.typePlanning')}</option>
              <option value="proposal">{t('approvals.typeProposal')}</option>
            </select>
            <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className={`appearance-none px-3 py-2 pr-8 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none cursor-pointer`}
            >
              <option value="all">{t('approvals.allLevels')}</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
            </select>
            <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchPendingApprovals}
            className={`px-4 py-2 rounded-xl border ${border} text-sm font-medium font-['Montserrat'] transition-all ${darkMode ? 'text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)]' : 'text-[#8A6340] hover:bg-[rgba(215,183,151,0.1)]'}`}
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${cardBg} border ${border} rounded-2xl overflow-hidden`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#D7B797]" />
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
            <CheckCircle size={48} className={`${darkMode ? 'text-[#2A9E6A]' : 'text-green-500'}`} />
            <p className={`text-base font-semibold mt-4 font-['Montserrat'] ${textPrimary}`}>{t('approvals.allCaughtUp')}</p>
            <p className={`text-sm mt-1 ${textSecondary}`}>{t('approvals.noPendingItems')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} border-b ${border}`}>
                  {[t('approvals.colType'), t('approvals.colName'), t('approvals.colBrand'), t('approvals.colLevel'), t('approvals.colStatus'), t('approvals.colSubmitted'), t('common.actions')].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${textMuted}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const status = item.data?.status || 'SUBMITTED';
                  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
                  const name = item.data?.name || item.data?.budgetName || `${item.entityType} #${item.entityId}`;
                  const brand = item.data?.brand?.name || item.data?.brandName || '-';

                  return (
                    <tr
                      key={`${item.entityType}-${item.entityId}-${idx}`}
                      className={`border-b ${border} transition-colors ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-50'}`}
                    >
                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{ENTITY_ICONS[item.entityType] || '📋'}</span>
                          <span className={`text-sm font-medium font-['Montserrat'] capitalize ${textPrimary}`}>
                            {item.entityType}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-medium font-['Montserrat'] ${textPrimary}`}>{name}</span>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-['Montserrat'] ${textSecondary}`}>{brand}</span>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-['JetBrains_Mono']"
                          style={{
                            color: item.level === 1 ? '#58A6FF' : '#A371F7',
                            backgroundColor: item.level === 1 ? 'rgba(88,166,255,0.12)' : 'rgba(163,113,247,0.12)',
                          }}
                        >
                          L{item.level}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-['JetBrains_Mono']"
                          style={{ color: sc.color, backgroundColor: sc.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN') : '-'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActionModal({ item, action: 'approve' }); setComment(''); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all bg-[rgba(42,158,106,0.12)] text-[#2A9E6A] hover:bg-[rgba(42,158,106,0.2)]"
                          >
                            <CheckCircle size={13} />
                            {t('approvals.approve')}
                          </button>
                          <button
                            onClick={() => { setActionModal({ item, action: 'reject' }); setComment(''); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all bg-[rgba(248,81,73,0.1)] text-[#F85149] hover:bg-[rgba(248,81,73,0.18)]"
                          >
                            <XCircle size={13} />
                            {t('approvals.reject')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl border ${border} ${cardBg} shadow-2xl`}>
            <div className={`p-5 border-b ${border}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold font-['Montserrat'] ${textPrimary}`}>
                  {actionModal.action === 'approve' ? t('approvals.confirmApprove') : t('approvals.confirmReject')}
                </h3>
                <button onClick={() => setActionModal(null)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-100'}`}>
                  <X size={18} className={textMuted} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <div className={`text-sm ${textSecondary}`}>
                  {ENTITY_ICONS[actionModal.item.entityType]} <span className="capitalize font-medium">{actionModal.item.entityType}</span>
                  {' — '}
                  <span className={textPrimary}>{actionModal.item.data?.name || actionModal.item.data?.budgetName || `#${actionModal.item.entityId}`}</span>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                  {t('approvals.commentOptional')}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none resize-none focus:border-[#D7B797]`}
                  placeholder={t('approvals.commentPlaceholder')}
                />
              </div>
            </div>
            <div className={`p-5 border-t ${border} flex justify-end gap-3`}>
              <button
                onClick={() => setActionModal(null)}
                className={`px-4 py-2 rounded-xl border ${border} text-sm font-medium font-['Montserrat'] ${textSecondary} transition-all ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-100'}`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`px-5 py-2 rounded-xl text-sm font-semibold font-['Montserrat'] transition-all disabled:opacity-50 ${
                  actionModal.action === 'approve'
                    ? 'bg-[#2A9E6A] text-white hover:bg-[#238a5a]'
                    : 'bg-[#F85149] text-white hover:bg-[#e04440]'
                }`}
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : actionModal.action === 'approve' ? t('approvals.approve') : t('approvals.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsScreen;
