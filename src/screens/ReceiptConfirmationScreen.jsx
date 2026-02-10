'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, CheckCircle, Clock, Loader2, Package,
  Search, ChevronDown, X, AlertTriangle, FileText,
  ClipboardCheck, XCircle, AlertCircle, BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../utils';
import { proposalService } from '../services/proposalService';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════ */
const RECEIPT_STATUS = {
  PENDING: { color: '#D29922', bg: 'rgba(210,153,34,0.12)', label: 'Pending' },
  CONFIRMED: { color: '#2A9E6A', bg: 'rgba(42,158,106,0.12)', label: 'Confirmed' },
  DISCREPANCY: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', label: 'Discrepancy' },
  PARTIAL: { color: '#A371F7', bg: 'rgba(163,113,247,0.12)', label: 'Partial' },
};

/* ═══════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════ */
const STAT_ACCENTS = {
  amber: { color: '#D29922', darkGrad: 'rgba(210,153,34,0.05)', lightGrad: 'rgba(180,130,20,0.08)' },
  blue: { color: '#58A6FF', darkGrad: 'rgba(88,166,255,0.05)', lightGrad: 'rgba(50,120,220,0.08)' },
  emerald: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.06)', lightGrad: 'rgba(22,120,70,0.08)' },
  red: { color: '#F85149', darkGrad: 'rgba(248,81,73,0.05)', lightGrad: 'rgba(220,50,50,0.08)' },
  gold: { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(180,140,95,0.10)' },
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
const ReceiptConfirmationScreen = ({ darkMode }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Derive receipts from approved proposals
      const response = await proposalService.getAll({ status: 'APPROVED' });
      const data = response.data || response;
      const proposals = Array.isArray(data) ? data : [];
      const mapped = proposals.map((p, idx) => ({
        id: p.id || idx + 1,
        receiptNumber: `REC-${String(idx + 1).padStart(5, '0')}`,
        poReference: p.proposalCode || `PO-${String(idx + 1).padStart(5, '0')}`,
        brandName: p.budget?.groupBrand?.name || p.brandName || '-',
        itemCount: p.products?.length || p.skuCount || 0,
        orderedQty: p.products?.reduce((sum, pr) => sum + (pr.totalQuantity || 0), 0) || p.totalQty || 0,
        receivedQty: 0,
        status: 'PENDING',
        receivedDate: null,
        createdAt: p.updatedAt || p.createdAt || new Date().toISOString(),
      }));
      setReceipts(mapped);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
      setError(t('receiptConfirm.failedToLoad'));
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async (receipt) => {
    setProcessing(true);
    // Local state update (no backend endpoint for receipts yet)
    setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: 'CONFIRMED', receivedQty: r.orderedQty, receivedDate: new Date().toISOString() } : r));
    setProcessing(false);
    setConfirmModal(null);
  };

  const handleFlagDiscrepancy = async (receipt) => {
    setProcessing(true);
    // Local state update (no backend endpoint for receipts yet)
    setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: 'DISCREPANCY', discrepancyNote } : r));
    setProcessing(false);
    setConfirmModal(null);
    setDiscrepancyNote('');
  };

  // Filtered
  const filtered = useMemo(() => {
    return receipts.filter(receipt => {
      if (statusFilter !== 'all' && receipt.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (receipt.receiptNumber || '').toLowerCase().includes(term) ||
          (receipt.poReference || '').toLowerCase().includes(term) ||
          (receipt.brandName || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [receipts, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    total: receipts.length,
    pending: receipts.filter(r => r.status === 'PENDING').length,
    confirmed: receipts.filter(r => r.status === 'CONFIRMED').length,
    discrepancy: receipts.filter(r => r.status === 'DISCREPANCY').length,
  }), [receipts]);

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
          {t('screenConfig.receiptConfirmation')}
        </h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>
          {t('receiptConfirm.subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title={t('receiptConfirm.totalReceipts')} value={stats.total} sub={t('receiptConfirm.allReceipts')} darkMode={darkMode} icon={Receipt} accent="gold" />
        <StatCard title={t('receiptConfirm.pendingReceipts')} value={stats.pending} sub={t('receiptConfirm.awaitingCheck')} darkMode={darkMode} icon={Clock} accent="amber" />
        <StatCard title={t('receiptConfirm.confirmedReceipts')} value={stats.confirmed} sub={t('receiptConfirm.goodsReceived')} darkMode={darkMode} icon={CheckCircle} accent="emerald" />
        <StatCard title={t('receiptConfirm.discrepancies')} value={stats.discrepancy} sub={t('receiptConfirm.needsAttention')} darkMode={darkMode} icon={AlertCircle} accent="red" />
      </div>

      {/* Filters */}
      <div className={`${cardBg} border ${border} rounded-2xl p-4 mb-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} flex-1 min-w-[200px] max-w-[360px]`}>
            <Search size={16} className={textMuted} />
            <input
              type="text"
              placeholder={t('receiptConfirm.searchPlaceholder')}
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

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`appearance-none px-3 py-2 pr-8 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none cursor-pointer`}
            >
              <option value="all">{t('receiptConfirm.allStatuses')}</option>
              <option value="PENDING">{t('receiptConfirm.statusPending')}</option>
              <option value="CONFIRMED">{t('receiptConfirm.statusConfirmed')}</option>
              <option value="DISCREPANCY">{t('receiptConfirm.statusDiscrepancy')}</option>
              <option value="PARTIAL">{t('receiptConfirm.statusPartial')}</option>
            </select>
            <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
          </div>

          <button
            onClick={fetchReceipts}
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
            <p className={`text-sm mt-3 ${textSecondary}`}>{t('receiptConfirm.loadingReceipts')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle size={32} className="text-[#F85149]" />
            <p className={`text-sm mt-3 ${textSecondary}`}>{error}</p>
            <button onClick={fetchReceipts} className="mt-3 px-4 py-2 rounded-xl bg-[#D7B797] text-black text-sm font-medium font-['Montserrat']">
              {t('common.tryAgain')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ClipboardCheck size={48} className={textMuted} />
            <p className={`text-base font-semibold mt-4 font-['Montserrat'] ${textPrimary}`}>{t('receiptConfirm.noReceipts')}</p>
            <p className={`text-sm mt-1 ${textSecondary}`}>{t('receiptConfirm.noReceiptsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} border-b ${border}`}>
                  {[t('receiptConfirm.colReceipt'), t('receiptConfirm.colPORef'), t('receiptConfirm.colBrand'), t('receiptConfirm.colItems'), t('receiptConfirm.colStatus'), t('receiptConfirm.colDate'), t('common.actions')].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${textMuted}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((receipt, idx) => {
                  const sc = RECEIPT_STATUS[receipt.status] || RECEIPT_STATUS.PENDING;
                  return (
                    <tr key={receipt.id || idx} className={`border-b ${border} transition-colors ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold font-['JetBrains_Mono'] ${textPrimary}`}>{receipt.receiptNumber}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-['JetBrains_Mono'] ${textSecondary}`}>{receipt.poReference}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-['Montserrat'] ${textPrimary}`}>{receipt.brandName}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-['JetBrains_Mono'] ${textPrimary}`}>{receipt.itemCount}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-['JetBrains_Mono']"
                          style={{ color: sc.color, backgroundColor: sc.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>
                          {receipt.receivedDate
                            ? new Date(receipt.receivedDate).toLocaleDateString('vi-VN')
                            : receipt.createdAt
                              ? new Date(receipt.createdAt).toLocaleDateString('vi-VN')
                              : '-'
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {receipt.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setConfirmModal({ receipt, action: 'confirm' }); setDiscrepancyNote(''); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all bg-[rgba(42,158,106,0.12)] text-[#2A9E6A] hover:bg-[rgba(42,158,106,0.2)]"
                            >
                              <CheckCircle size={13} />
                              {t('common.confirm')}
                            </button>
                            <button
                              onClick={() => { setConfirmModal({ receipt, action: 'discrepancy' }); setDiscrepancyNote(''); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all bg-[rgba(248,81,73,0.1)] text-[#F85149] hover:bg-[rgba(248,81,73,0.18)]"
                            >
                              <AlertCircle size={13} />
                              {t('receiptConfirm.flag')}
                            </button>
                          </div>
                        )}
                        {receipt.status === 'CONFIRMED' && (
                          <span className={`text-xs font-['Montserrat'] ${darkMode ? 'text-[#2A9E6A]' : 'text-green-600'}`}>
                            <CheckCircle size={14} className="inline mr-1" />
                            {t('receiptConfirm.verified')}
                          </span>
                        )}
                        {receipt.status === 'DISCREPANCY' && (
                          <span className={`text-xs font-['Montserrat'] ${darkMode ? 'text-[#FF7B72]' : 'text-red-600'}`}>
                            <AlertCircle size={14} className="inline mr-1" />
                            {t('receiptConfirm.underReview')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm/Discrepancy Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl border ${border} ${cardBg} shadow-2xl`}>
            <div className={`p-5 border-b ${border}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold font-['Montserrat'] ${textPrimary}`}>
                  {confirmModal.action === 'confirm' ? t('receiptConfirm.confirmReceipt') : t('receiptConfirm.flagDiscrepancy')}
                </h3>
                <button onClick={() => setConfirmModal(null)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-100'}`}>
                  <X size={18} className={textMuted} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className={`rounded-xl border ${border} p-4 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${textMuted}`}>{t('receiptConfirm.colReceipt')}</span>
                    <span className={`text-sm font-semibold font-['JetBrains_Mono'] ${textPrimary}`}>{confirmModal.receipt.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${textMuted}`}>{t('receiptConfirm.colPORef')}</span>
                    <span className={`text-sm font-['JetBrains_Mono'] ${textSecondary}`}>{confirmModal.receipt.poReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${textMuted}`}>{t('receiptConfirm.colBrand')}</span>
                    <span className={`text-sm font-['Montserrat'] ${textPrimary}`}>{confirmModal.receipt.brandName}</span>
                  </div>
                </div>
              </div>

              {confirmModal.action === 'discrepancy' && (
                <div className="mt-4">
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                    {t('receiptConfirm.discrepancyNote')}
                  </label>
                  <textarea
                    value={discrepancyNote}
                    onChange={(e) => setDiscrepancyNote(e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-xl border ${border} ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'} text-sm font-['Montserrat'] ${textPrimary} outline-none resize-none focus:border-[#D7B797]`}
                    placeholder={t('receiptConfirm.discrepancyPlaceholder')}
                  />
                </div>
              )}
            </div>
            <div className={`p-5 border-t ${border} flex justify-end gap-3`}>
              <button
                onClick={() => setConfirmModal(null)}
                className={`px-4 py-2 rounded-xl border ${border} text-sm font-medium font-['Montserrat'] ${textSecondary} transition-all ${darkMode ? 'hover:bg-[#1A1A1A]' : 'hover:bg-gray-100'}`}
              >
                {t('common.back')}
              </button>
              <button
                onClick={() => confirmModal.action === 'confirm' ? handleConfirmReceipt(confirmModal.receipt) : handleFlagDiscrepancy(confirmModal.receipt)}
                disabled={processing || (confirmModal.action === 'discrepancy' && !discrepancyNote.trim())}
                className={`px-5 py-2 rounded-xl text-sm font-semibold font-['Montserrat'] transition-all disabled:opacity-50 ${
                  confirmModal.action === 'confirm'
                    ? 'bg-[#2A9E6A] text-white hover:bg-[#238a5a]'
                    : 'bg-[#F85149] text-white hover:bg-[#e04440]'
                }`}
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : confirmModal.action === 'confirm' ? t('common.confirm') : t('receiptConfirm.submitFlag')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptConfirmationScreen;
