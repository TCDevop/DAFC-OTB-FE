'use client';

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft, Send, ChevronDown, ChevronRight, Package, Layers,
  FileText, ShoppingCart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils';
import { proposalService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductImage } from '@/components/ui';

interface ProposalTicketReviewProps {
  reviewData: {
    budgetId: string;
    skuBlocks: any[];
    grandTotals: any;
    stores: any[];
    sizingChoiceName?: string;
  };
  darkMode?: boolean;
  onBack: () => void;
  onSubmitted: () => void;
}

const ProposalTicketReview = ({ reviewData, darkMode = false, onBack, onSubmitted }: ProposalTicketReviewProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const { skuBlocks, grandTotals, stores, budgetId, sizingChoiceName } = reviewData;

  const toggleBlock = useCallback((key: string) => {
    setExpandedBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSubmitForApproval = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (budgetId) {
        await proposalService.submit(budgetId);
      }
      toast.success(t('skuProposal.submitSuccess') || 'Proposal submitted for approval');
      onSubmitted();
    } catch (err: any) {
      console.error('Failed to submit proposal:', err);
      toast.error(err?.response?.data?.message || t('skuProposal.submitFailed') || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#999999]'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className={`text-lg font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
            {t('skuProposal.reviewTicket') || 'Review Ticket'}
          </h2>
          <p className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>
            {t('skuProposal.reviewBeforeSubmit') || 'Review your SKU proposal before submitting for approval'}
          </p>
        </div>
      </div>

      {/* Grand Total Summary Card */}
      <div className={`rounded-xl border overflow-hidden ${
        darkMode ? 'bg-[rgba(215,183,151,0.06)] border-[rgba(215,183,151,0.2)]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.3)]'
      }`}>
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className={darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'} />
            <span className={`text-sm font-bold font-['Montserrat'] uppercase tracking-wide ${darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'}`}>
              {t('skuProposal.proposalSummary') || 'Proposal Summary'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.totalRails') || 'Rails'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {skuBlocks.length}
              </div>
            </div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.totalSKUs') || 'SKUs'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {grandTotals.skuCount}
              </div>
            </div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.totalOrder') || 'Order Qty'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {grandTotals.order}
              </div>
            </div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.totalValue') || 'Total Value'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'}`}>
                {formatCurrency(grandTotals.ttlValue)}
              </div>
            </div>
            {sizingChoiceName && (
            <div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.sizing') || 'Sizing'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {sizingChoiceName}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* SKU Blocks (expandable) */}
      <div className="space-y-2">
        {skuBlocks.map((block: any, idx: number) => {
          const blockKey = block.subCategory || `block-${idx}`;
          const isExpanded = expandedBlocks[blockKey] || false;
          const blockItems = block.items || [];
          const blockTotal = blockItems.reduce((sum: number, item: any) => sum + (Number(item.orderQty || item.order || 0)), 0);
          // Extract all size keys from items' sizing data
          const sizeKeys = Array.from(new Set(blockItems.flatMap((item: any) => Object.keys(item.sizing || {})))) as string[];
          sizeKeys.sort();

          return (
            <div
              key={blockKey}
              className={`rounded-xl border overflow-hidden ${
                darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.3)]'
              }`}
            >
              {/* Block Header */}
              <button
                onClick={() => toggleBlock(blockKey)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  darkMode ? 'hover:bg-[rgba(215,183,151,0.04)]' : 'hover:bg-[rgba(160,120,75,0.04)]'
                }`}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Layers size={14} className={darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'} />
                <span className={`text-sm font-semibold font-['Montserrat'] flex-1 text-left ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                  {block.subCategory || block.category || 'Unknown'}
                </span>
                <span className={`text-xs font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {blockItems.length} SKUs
                </span>
                <span className={`text-xs font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'}`}>
                  Qty: {blockTotal}
                </span>
              </button>

              {/* Block Items */}
              {isExpanded && (
                <div className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-[rgba(215,183,151,0.2)]'}`}>
                  <table className="w-full text-xs">
                    <thead className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.08)]'}>
                      <tr>
                        <th className={`text-left px-3 py-1.5 font-semibold ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>SKU</th>
                        <th className={`text-left px-3 py-1.5 font-semibold ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>{t('skuProposal.name') || 'Name'}</th>
                        <th className={`text-center px-3 py-1.5 font-semibold ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>{t('skuProposal.order') || 'Order'}</th>
                        {sizeKeys.length > 0 && sizeKeys.map((size: string) => (
                          <th key={size} className={`text-center px-2 py-1.5 font-semibold ${darkMode ? 'text-[#D7B797]/70' : 'text-[#6B4D30]/70'}`}>
                            {size.toUpperCase()}
                          </th>
                        ))}
                        {stores.map((st: any) => (
                          <th key={st.code} className={`text-center px-3 py-1.5 font-semibold ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>
                            {st.code}
                          </th>
                        ))}
                        <th className={`text-right px-3 py-1.5 font-semibold ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>{t('skuProposal.value') || 'Value'}</th>
                      </tr>
                    </thead>
                    <tbody className={darkMode ? 'divide-y divide-[#2E2E2E]' : 'divide-y divide-gray-100'}>
                      {blockItems.map((item: any, iIdx: number) => (
                        <tr key={item.sku || iIdx} className={`${darkMode ? 'hover:bg-[rgba(215,183,151,0.04)]' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <ProductImage subCategory={block.subCategory || ''} sku={item.sku} size={40} darkMode={darkMode} rounded="rounded-md" />
                              <span className={`font-['JetBrains_Mono'] font-medium ${darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'}`}>{item.sku}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-1.5 ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{item.name}</td>
                          <td className={`px-3 py-1.5 text-center font-['JetBrains_Mono'] font-bold ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                            {item.orderQty || item.order || 0}
                          </td>
                          {sizeKeys.length > 0 && sizeKeys.map((size: string) => (
                            <td key={size} className={`px-2 py-1.5 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]/80' : 'text-[#6B4D30]/80'}`}>
                              {item.sizing?.[size] || 0}
                            </td>
                          ))}
                          {stores.map((st: any) => (
                            <td key={st.code} className={`px-3 py-1.5 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999]' : 'text-[#666]'}`}>
                              {item.storeQty?.[st.code] || item[`store_${st.code}`] || 0}
                            </td>
                          ))}
                          <td className={`px-3 py-1.5 text-right font-['JetBrains_Mono'] font-medium ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>
                            {formatCurrency(item.ttlValue || item.totalValue || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total Bar */}
      <div className={`rounded-xl border overflow-hidden ${
        darkMode ? 'bg-[rgba(42,158,106,0.08)] border-[rgba(42,158,106,0.25)]' : 'bg-[rgba(18,119,73,0.06)] border-[rgba(18,119,73,0.2)]'
      }`}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className={darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'} />
            <span className={`text-sm font-bold font-['Montserrat'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>
              {t('common.grandTotal') || 'Grand Total'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-[10px] ${darkMode ? 'text-[#666]' : 'text-[#999]'}`}>{t('skuProposal.order') || 'Order'}</div>
              <div className={`text-sm font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{grandTotals.order}</div>
            </div>
            <div className="text-center">
              <div className={`text-[10px] ${darkMode ? 'text-[#666]' : 'text-[#999]'}`}>{t('skuProposal.totalValue') || 'Value'}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#6B4D30]'}`}>{formatCurrency(grandTotals.ttlValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Footer */}
      <div className={`mt-4 py-3 border-t ${
        darkMode ? 'border-[#2E2E2E]' : 'border-[rgba(215,183,151,0.3)]'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'text-[#999999] hover:bg-[#1A1A1A]'
                : 'text-[#666666] hover:bg-gray-100'
            }`}
          >
            {t('common.back') || 'Back'}
          </button>
          <button
            onClick={handleSubmitForApproval}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold font-['Montserrat'] transition-colors shadow-md ${
              submitting
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              darkMode
                ? 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A584]'
                : 'bg-[#C4A77D] text-white hover:bg-[#B8956D]'
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting
              ? (t('common.submitting') || 'Submitting...')
              : (t('skuProposal.submitForApproval') || 'Submit for Approval')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalTicketReview;
