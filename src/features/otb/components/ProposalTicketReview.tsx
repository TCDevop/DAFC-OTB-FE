'use client';

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Send, ChevronDown, ChevronRight, Package, Layers,
  FileText, ShoppingCart, DollarSign, BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils';
import { api, ticketService } from '@/services';
import { invalidateCache } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductImage } from '@/components/ui';

interface ProposalTicketReviewProps {
  reviewData: {
    budgetId: string;
    proposalHeaderIds?: string[];
    skuBlocks: any[];
    grandTotals: any;
    stores: any[];
    sizingChoiceName?: string;
    fiscalYear?: string;
    budgetName?: string;
    budgetAmount?: number;
    seasonGroup?: string;
    season?: string;
    seasonGroupId?: string;
    seasonId?: string;
    brandAllocations?: { brandId: string; brandName: string; totalAllocation: number }[];
    brandId?: string;
    brandName?: string;
  };
  onBack: () => void;
  onSubmitted: () => void;
}

const ProposalTicketReview = ({ reviewData, onBack, onSubmitted }: ProposalTicketReviewProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ warnings: any[] } | null>(null);

  const {
    skuBlocks, grandTotals, stores, budgetId, proposalHeaderIds, sizingChoiceName,
    fiscalYear, budgetName, budgetAmount, seasonGroup, season, seasonGroupId, seasonId, brandAllocations,
    brandName,
  } = reviewData;

  const toggleBlock = useCallback((key: string) => {
    setExpandedBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const createTicketAndSubmit = async (force = false) => {
    if (!budgetId || !seasonGroupId || !seasonId) {
      toast.error('Missing budget, season group, or season information');
      return;
    }

    // 1. Create ticket (validates + snapshots all final data)
    await ticketService.create({ budgetId, seasonGroupId, seasonId, force });

    // 2. Submit all proposal headers (DRAFT → SUBMITTED)
    //    Use raw api.post to avoid withErrorLog noise for already-submitted headers
    const headerIds = proposalHeaderIds || [];
    for (const hId of headerIds) {
      try {
        await api.post(`/proposals/${hId}/submit`);
      } catch (submitErr: any) {
        if (submitErr?.response?.status !== 400) throw submitErr;
        // 400 = already submitted → safe to ignore
      }
    }

    invalidateCache('/tickets');
    try { sessionStorage.setItem('tickets_need_refresh', '1'); } catch {}
    toast.success(t('skuProposal.submitSuccess') || 'Ticket created and proposal submitted for approval');
    onSubmitted();
  };

  const handleSubmitForApproval = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createTicketAndSubmit(false);
    } catch (err: any) {
      console.error('Failed to submit:', err);
      const data = err?.response?.data;
      const serverMsg = data?.message;
      const validation = data?.validation;

      // Backend asks for confirmation (warnings but still valid)
      if (data?.requireConfirmation && validation?.steps) {
        const warnSteps = validation.steps.filter((s: any) => s.status === 'warn');
        setConfirmDialog({ warnings: warnSteps });
        return;
      }

      // Hard fail — show errors
      if (validation?.steps) {
        const failedSteps = validation.steps.filter((s: any) => s.status === 'fail');
        if (failedSteps.length > 0) {
          failedSteps.forEach((s: any) => {
            const stepLabel = s.label || `Step ${s.step}`;
            const details = (s.details || []).join(', ');
            toast.error(`${stepLabel}${details ? ': ' + details : ''}`, { duration: 8000 });
          });
        } else {
          toast.error(serverMsg || 'Validation failed');
        }
      } else {
        toast.error(serverMsg || t('skuProposal.submitFailed') || 'Failed to create ticket');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceSubmit = async () => {
    setConfirmDialog(null);
    setSubmitting(true);
    try {
      await createTicketAndSubmit(true);
    } catch (err: any) {
      console.error('Failed to force submit:', err);
      toast.error(err?.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Total brand allocations
  const totalBrandAllocation = (brandAllocations || []).reduce((sum, ba) => sum + ba.totalAllocation, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold font-['Montserrat'] text-[#0A0A0A]">
            {t('skuProposal.reviewTicket') || 'Review Ticket'}{brandName ? ` — ${brandName}` : ''}
          </h2>
          <p className="text-xs text-[#999999]">
            {t('skuProposal.reviewBeforeSubmit') || 'Review your SKU proposal before submitting for approval'}
          </p>
        </div>
      </div>

      {/* Budget Info Header Card */}
      {(fiscalYear || budgetName) && (
        <div className="rounded-xl border overflow-hidden bg-white border-[rgba(215,183,151,0.3)]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-[#6B4D30]" />
              <span className="text-sm font-bold font-['Montserrat'] uppercase tracking-wide text-[#6B4D30]">
                Budget Information
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fiscalYear && (
                <div>
                  <div className="text-xs text-[#999999]">Fiscal Year</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">FY{fiscalYear}</div>
                </div>
              )}
              {budgetName && (
                <div>
                  <div className="text-xs text-[#999999]">Budget Name</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{budgetName}</div>
                </div>
              )}
              {seasonGroup && (
                <div>
                  <div className="text-xs text-[#999999]">Season Group</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{seasonGroup}</div>
                </div>
              )}
              {season && (
                <div>
                  <div className="text-xs text-[#999999]">Season</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{season}</div>
                </div>
              )}
            </div>
            {(brandName || totalBrandAllocation > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-[rgba(215,183,151,0.2)]">
                {brandName && (
                  <div>
                    <div className="text-xs text-[#999999]">Brand</div>
                    <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{brandName}</div>
                  </div>
                )}
                {totalBrandAllocation > 0 && (
                  <div>
                    <div className="text-xs text-[#999999]">Brand Allocation</div>
                    <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(totalBrandAllocation)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grand Total Summary Card */}
      <div className="rounded-xl border overflow-hidden bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.3)]">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-[#6B4D30]" />
            <span className="text-sm font-bold font-['Montserrat'] uppercase tracking-wide text-[#6B4D30]">
              {t('skuProposal.proposalSummary') || 'Proposal Summary'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-[#999999]">{t('skuProposal.totalRails') || 'Rails'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">
                {skuBlocks.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#999999]">{t('skuProposal.totalSKUs') || 'SKUs'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">
                {grandTotals.skuCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#999999]">{t('skuProposal.totalOrder') || 'Order Qty'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">
                {grandTotals.order}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#999999]">{t('skuProposal.totalValue') || 'Total Value'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#6B4D30]">
                {formatCurrency(grandTotals.ttlValue)}
              </div>
            </div>
            {sizingChoiceName && (
            <div>
              <div className="text-xs text-[#999999]">{t('skuProposal.sizing') || 'Sizing'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">
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
          const blockKey = `${block.brandId || ''}_${block.subCategory || ''}_${idx}`;
          const isExpanded = expandedBlocks[blockKey] || false;
          const blockItems = block.items || [];
          const blockTotal = blockItems.reduce((sum: number, item: any) => sum + (Number(item.orderQty || item.order || 0)), 0);
          // Extract all size keys from items' sizing data
          const sizeKeys = Array.from(new Set(blockItems.flatMap((item: any) => Object.keys(item.sizing || {})))) as string[];
          sizeKeys.sort();
          const hasSizing = sizeKeys.length > 0;

          return (
            <div
              key={blockKey}
              className="rounded-xl border overflow-hidden bg-white border-[rgba(215,183,151,0.3)]"
            >
              {/* Block Header */}
              <button
                onClick={() => toggleBlock(blockKey)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(160,120,75,0.04)]"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Layers size={14} className="text-[#6B4D30]" />
                <span className="text-sm font-semibold font-['Montserrat'] flex-1 text-left text-[#0A0A0A]">
                  {block.subCategory || block.category || 'Unknown'}
                </span>
                <span className="text-xs font-['JetBrains_Mono'] text-[#666666]">
                  {blockItems.length} SKUs
                </span>
                <span className="text-xs font-bold font-['JetBrains_Mono'] text-[#6B4D30]">
                  Qty: {blockTotal}
                </span>
              </button>

              {/* Block Items */}
              {isExpanded && (
                <div className="border-t border-[rgba(215,183,151,0.2)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[rgba(160,120,75,0.08)]">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-semibold text-[#666]">SKU</th>
                          <th className="text-left px-3 py-1.5 font-semibold text-[#666]">{t('skuProposal.name') || 'Name'}</th>
                          <th className="text-center px-3 py-1.5 font-semibold text-[#666]">{t('skuProposal.order') || 'Order'}</th>
                          {stores.map((st: any) => (
                            <th key={st.code} className="text-center px-3 py-1.5 font-semibold text-[#666]">
                              {st.code}
                            </th>
                          ))}
                          <th className="text-right px-3 py-1.5 font-semibold text-[#666]">{t('skuProposal.value') || 'Value'}</th>
                          {/* Sizing columns at the end with distinct header */}
                          {hasSizing && sizeKeys.map((size: string) => (
                            <th key={size} className="text-center px-2 py-1.5 font-semibold text-[#6B4D30] bg-[rgba(215,183,151,0.15)]">
                              {size.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {blockItems.map((item: any, iIdx: number) => (
                          <tr key={`${item.sku}_${iIdx}`} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <ProductImage subCategory={block.subCategory || ''} sku={item.sku} imageUrl={item.imageUrl} size={40} rounded="rounded-md" />
                                <span className="font-['JetBrains_Mono'] font-medium text-[#6B4D30]">{item.sku}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-[#0A0A0A]">{item.name}</td>
                            <td className="px-3 py-1.5 text-center font-['JetBrains_Mono'] font-bold text-[#0A0A0A]">
                              {item.orderQty || item.order || 0}
                            </td>
                            {stores.map((st: any) => (
                              <td key={st.code} className="px-3 py-1.5 text-center font-['JetBrains_Mono'] text-[#666]">
                                {item.storeQty?.[st.code] || item[`store_${st.code}`] || 0}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] font-medium text-[#127749]">
                              {formatCurrency(item.ttlValue || item.totalValue || 0)}
                            </td>
                            {/* Sizing data columns with light background */}
                            {hasSizing && sizeKeys.map((size: string) => (
                              <td key={size} className="px-2 py-1.5 text-center font-['JetBrains_Mono'] text-[#6B4D30]/80 bg-[rgba(215,183,151,0.08)]">
                                {item.sizing?.[size] || 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total Bar */}
      <div className="rounded-xl border overflow-hidden bg-[rgba(18,119,73,0.06)] border-[rgba(18,119,73,0.2)]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-[#127749]" />
            <span className="text-sm font-bold font-['Montserrat'] text-[#127749]">
              {t('common.grandTotal') || 'Grand Total'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] text-[#999]">{t('skuProposal.order') || 'Order'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{grandTotals.order}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#999]">{t('skuProposal.totalValue') || 'Value'}</div>
              <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(grandTotals.ttlValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Footer */}
      <div className="mt-4 py-3 border-t border-[rgba(215,183,151,0.3)]">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-[#666666] hover:bg-gray-100"
          >
            {t('common.back') || 'Back'}
          </button>
          <button
            onClick={handleSubmitForApproval}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold font-['Montserrat'] transition-colors shadow-md ${
              submitting ? 'opacity-50 cursor-not-allowed' : ''
            } bg-[#C4A77D] text-white hover:bg-[#B8956D]`}
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

      {/* Confirmation Dialog — rendered via portal to cover full screen */}
      {confirmDialog && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" style={{ border: '1px solid rgba(215,183,151,0.3)' }}>
            <h3 className="text-base font-bold font-['Montserrat'] text-[#0A0A0A] mb-2">
              Confirm Submit for Approval
            </h3>
            <p className="text-sm text-[#666] mb-4">
              Some brands are not fully completed. Are you sure you want to continue?
            </p>
            <div className="space-y-2 mb-5">
              {confirmDialog.warnings.map((w: any, i: number) => (
                <div key={i} className="rounded-lg bg-[rgba(255,180,0,0.08)] border border-[rgba(255,180,0,0.3)] px-3 py-2">
                  <div className="text-xs font-semibold text-[#996600] mb-1">
                    Step {w.step}: {w.label}
                  </div>
                  {(w.details || []).map((d: string, j: number) => (
                    <div key={j} className="text-xs text-[#996600]/80 pl-2">• {d}</div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#666] hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold font-['Montserrat'] bg-[#C4A77D] text-white hover:bg-[#B8956D] transition-colors shadow-md"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Confirm Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProposalTicketReview;
