'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, ArrowLeft, Loader2, Check, X, Clock,
  CheckCircle, XCircle, Package, Layers, DollarSign, BarChart3, ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils';
import { ProductImage, ConfirmDialog } from '@/components/ui';
import { ticketService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

import { useConfirmDialog } from '@/hooks/useConfirmDialog';

/* =========================
   APPROVAL STEPS
========================= */

const APPROVAL_STEPS = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'brand_manager', label: 'Group Brand Manager' },
  { id: 'finance', label: 'Finance' },
  { id: 'ceo', label: 'CEO' },
];

const getApprovalStepStatus = (stepId: any, currentStep: any, approvalHistory: any) => {
  const historyItem = approvalHistory?.find((h: any) => h.stepId === stepId);
  if (historyItem?.action === 'approved') return 'approved';
  if (historyItem?.action === 'rejected') return 'rejected';
  if (historyItem?.action === 'submitted') return 'approved';
  if (stepId === currentStep) return 'current';
  const stepIndex = APPROVAL_STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = APPROVAL_STEPS.findIndex((s) => s.id === currentStep);
  return stepIndex < currentIndex ? 'approved' : 'waiting';
};

const ApprovalProgressBar = ({ currentStep, approvalHistory }: any) => (
  <div className="border rounded-lg px-3 md:px-4 py-2 md:py-2.5 bg-white border-[rgba(215,183,151,0.2)]">
    <div className="flex items-center overflow-x-auto gap-0">
      {APPROVAL_STEPS.map((step, index) => {
        const status = getApprovalStepStatus(step.id, currentStep, approvalHistory);
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                status === 'approved' ? 'bg-[#127749] text-white' :
                status === 'rejected' ? 'bg-[#F85149] text-white' :
                status === 'current' ? 'bg-[#D7B797] text-white' : 'bg-gray-100 border border-gray-200 text-gray-400'
              }`}>
                {status === 'approved' ? <Check size={12} strokeWidth={3} /> :
                 status === 'rejected' ? <X size={12} strokeWidth={3} /> :
                 status === 'current' ? <Clock size={12} /> :
                 index + 1}
              </div>
              <div className="flex flex-col">
                <span className={`text-[11px] font-medium leading-tight ${
                  status === 'approved' ? 'text-[#2A9E6A]' :
                  status === 'rejected' ? 'text-[#FF7B72]' :
                  status === 'current' ? 'text-[#6B4D30]' : 'text-gray-400'
                }`}>{step.label}</span>
                {status === 'approved' && <span className="text-[9px] font-semibold text-[#2A9E6A]">Approved</span>}
                {status === 'rejected' && <span className="text-[9px] font-semibold text-[#FF7B72]">Rejected</span>}
                {status === 'current' && <span className="text-[9px] font-semibold text-amber-600">In Review</span>}
              </div>
            </div>
            {index < APPROVAL_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 min-w-[16px] ${
                getApprovalStepStatus(APPROVAL_STEPS[index + 1].id, currentStep, approvalHistory) !== 'waiting'
                  ? 'bg-[#127749]' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const StatusTrackingPanel = ({ approvalHistory, ticket }: any) => (
  <div className="border rounded-lg p-3 h-full flex flex-col bg-white border-[rgba(215,183,151,0.2)]">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] text-gray-400">
        STATUS
      </span>
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
        ['APPROVED', 'LEVEL2_APPROVED', 'FINAL'].includes(ticket?.status?.toUpperCase())
          ? 'bg-emerald-50 text-emerald-700'
          : ['REJECTED', 'LEVEL1_REJECTED', 'LEVEL2_REJECTED'].includes(ticket?.status?.toUpperCase())
          ? 'bg-red-50 text-red-700'
          : ['SUBMITTED', 'LEVEL1_APPROVED', 'PENDING', 'IN_REVIEW'].includes(ticket?.status?.toUpperCase())
          ? 'bg-amber-50 text-amber-700'
          : 'bg-gray-100 text-gray-600'
      }`}>
        {ticket?.status?.replace(/_/g, ' ') || 'pending'}
      </span>
    </div>
    <div className="space-y-0 flex-1">
      {approvalHistory?.length > 0 ? (
        approvalHistory.map((item: any, index: number) => (
          <div key={index} className="flex gap-2">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                item.action === 'approved' ? 'bg-[#2A9E6A]' :
                item.action === 'rejected' ? 'bg-[#F85149]' :
                item.action === 'submitted' ? 'bg-[#D7B797]' : 'bg-gray-300'
              }`} />
              {index < approvalHistory.length - 1 && (
                <div className="w-px flex-1 min-h-[12px] bg-gray-200" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold ${
                  item.action === 'approved' ? 'text-[#2A9E6A]' :
                  item.action === 'rejected' ? 'text-[#FF7B72]' : 'text-amber-700'
                }`}>
                  {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                </span>
                <span className="text-[10px] text-gray-400">
                  {item.stepLabel || item.role || '-'}
                </span>
              </div>
              {item.decidedAt && (
                <div className="text-[9px] font-['JetBrains_Mono'] text-gray-400">
                  {new Date(item.decidedAt).toLocaleString()}
                </div>
              )}
              {item.comment && (
                <div className={`mt-0.5 text-[10px] px-2 py-1 rounded ${
                  item.action === 'rejected'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-gray-50 text-gray-500'
                }`}>
                  {item.comment}
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-xs italic text-gray-400">No history</div>
      )}
    </div>
  </div>
);

/* =========================
   HELPERS
========================= */

const choiceLetter = (v: number) => String.fromCharCode(64 + v); // 1→A, 2→B, 3→C

/** Build SKU blocks from snapshot_allocate_headers */
function buildFromSnapshot(snapshotHeaders: any[]) {
  const brandAllocations: { brandId: string; brandName: string; totalAllocation: number }[] = [];
  const skuBlocks: any[] = [];
  const storeSet = new Map<string, { id: string; code: string }>();
  let grandOrder = 0;
  let grandValue = 0;
  let grandSkuCount = 0;
  let sizingChoiceName = '';

  for (const ah of snapshotHeaders) {
    const brandName = ah.brand?.name || 'Unknown';
    const brandId = String(ah.brand_id || ah.brandId || ah.brand?.id || '');

    // Brand allocation — we don't snapshot budget_allocates anymore,
    // so we compute from SKU proposal values
    let brandTotalValue = 0;

    for (const sph of (ah.sku_proposal_headers || ah.skuProposalHeaders || [])) {
      const proposals = sph.sku_proposals || sph.skuProposals || [];
      const sizingHeaders = sph.proposal_sizing_headers || sph.proposalSizingHeaders || [];

      // Determine final sizing choice
      const finalSizing = sizingHeaders.find((sh: any) => sh.is_final_version || sh.isFinalVersion) || sizingHeaders[sizingHeaders.length - 1];
      if (finalSizing && !sizingChoiceName) {
        sizingChoiceName = `Choice ${choiceLetter(finalSizing.version || sizingHeaders.length)}`;
      }

      // Build sizing lookup: skuProposalId → { sizeLabel: qty }
      const sizingBySkuId: Record<string, Record<string, number>> = {};
      if (finalSizing) {
        const sizings = finalSizing.proposal_sizings || finalSizing.proposalSizings || [];
        for (const ps of sizings) {
          const skuPropId = String(ps.sku_proposal_id || ps.skuProposalId || '');
          const sizeLabel = ps.subcategory_size?.name || ps.subcategorySize?.name || ps.subcategory_size_id || ps.subcategorySizeId || '';
          if (!sizingBySkuId[skuPropId]) sizingBySkuId[skuPropId] = {};
          sizingBySkuId[skuPropId][sizeLabel] = Number(ps.proposal_quantity || ps.proposalQuantity || 0);
        }
      }

      // Group proposals by subCategory
      const blockMap: Record<string, any> = {};
      for (const sku of proposals) {
        const product = sku.product || {};
        const subCat = product.sub_category || product.subCategory || {};
        const cat = subCat.category || {};
        const gender = cat.gender || {};
        const subCatName = subCat.name || 'Unknown';
        const blockKey = `${brandId}_${subCatName}`;

        if (!blockMap[blockKey]) {
          blockMap[blockKey] = {
            brandId,
            brandName,
            gender: gender.name || '',
            category: cat.name || '',
            subCategory: subCatName,
            items: [],
          };
        }

        // Compute store allocations
        const allocates = sku.sku_allocates || sku.skuAllocates || [];
        const storeQty: Record<string, number> = {};
        let totalOrder = 0;
        for (const sa of allocates) {
          const store = sa.store || {};
          const storeCode = store.code || store.name || String(sa.store_id || sa.storeId || '');
          const storeId = String(sa.store_id || sa.storeId || store.id || '');
          storeQty[storeCode] = Number(sa.quantity || 0);
          totalOrder += Number(sa.quantity || 0);
          if (!storeSet.has(storeCode)) {
            storeSet.set(storeCode, { id: storeId, code: storeCode });
          }
        }

        const srp = Number(sku.srp || 0);
        const unitCost = Number(sku.unit_cost || sku.unitCost || 0);
        const ttlValue = totalOrder * srp;
        const skuPropId = String(sku.id || '');

        blockMap[blockKey].items.push({
          sku: product.sku_code || product.skuCode || product.item_code || product.itemCode || skuPropId,
          name: product.product_name || product.productName || product.name || '-',
          imageUrl: product.image_url || product.imageUrl || '',
          customerTarget: sku.customer_target || sku.customerTarget || '-',
          unitCost,
          srp,
          orderQty: totalOrder,
          storeQty,
          ttlValue,
          sizing: sizingBySkuId[skuPropId] || {},
        });

        grandOrder += totalOrder;
        grandValue += ttlValue;
        brandTotalValue += ttlValue;
      }

      grandSkuCount += proposals.length;
      skuBlocks.push(...Object.values(blockMap));
    }

    brandAllocations.push({ brandId, brandName, totalAllocation: brandTotalValue });
  }

  const stores = Array.from(storeSet.values());
  return {
    brandAllocations,
    skuBlocks,
    stores,
    grandTotals: { order: grandOrder, ttlValue: grandValue, skuCount: grandSkuCount },
    sizingChoiceName,
  };
}

/* =========================
   MAIN COMPONENT
========================= */

export default function TicketDetailPage({ ticket, onBack, showApprovalActions = false }: any) {
  const { user } = useAuth();
  const { dialogProps, confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fullTicket, setFullTicket] = useState<any>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const toggleBlock = useCallback((key: string) => {
    setExpandedBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Fetch full ticket data with snapshot
  useEffect(() => {
    if (!ticket?.id) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await ticketService.getOne(String(ticket.id));
        setFullTicket(data);
      } catch (err: any) {
        console.error('Failed to fetch ticket detail:', err);
        toast.error('Failed to load ticket detail');
        setFullTicket(ticket);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket?.id]);

  // Parse snapshot data
  const { brandAllocations, skuBlocks, stores, grandTotals } = useMemo(() => {
    if (!fullTicket) return { brandAllocations: [], skuBlocks: [], stores: [], grandTotals: { order: 0, ttlValue: 0, skuCount: 0 } };
    const snapHeaders = fullTicket.snapshot_allocate_headers || fullTicket.snapshotAllocateHeaders || [];
    if (snapHeaders.length > 0) {
      return buildFromSnapshot(snapHeaders);
    }
    return { brandAllocations: [], skuBlocks: [], stores: [], grandTotals: { order: 0, ttlValue: 0, skuCount: 0 }, sizingChoiceName: '' };
  }, [fullTicket]);

  // Budget info from ticket relations
  const budgetInfo = useMemo(() => {
    if (!fullTicket) return null;
    const budget = fullTicket.budget || {};
    const seasonGroup = fullTicket.season_group || fullTicket.seasonGroup || {};
    const season = fullTicket.season || {};
    return {
      fiscalYear: budget.fiscal_year || budget.fiscalYear || '',
      budgetName: budget.name || budget.budget_name || budget.budgetName || '',
      budgetAmount: Number(budget.total_amount || budget.totalAmount || budget.total_budget || budget.totalBudget || 0),
      seasonGroup: seasonGroup.name || seasonGroup.code || '',
      season: season.name || season.code || '',
    };
  }, [fullTicket]);

  // Approval history
  const approvalHistory = useMemo(() => {
    const tk = fullTicket || ticket;
    if (!tk) return [];
    const status = (tk.status || '').toUpperCase();

    // Try real approval logs first
    const logs = tk.ticket_approval_logs || tk.ticketApprovalLogs || [];
    if (logs.length > 0) {
      const history: any[] = [{
        stepId: 'submitted',
        stepLabel: 'Submitted',
        action: 'submitted',
        decidedAt: tk.created_at || tk.createdAt || null,
        comment: null,
      }];
      for (const log of logs) {
        const approver = log.approver_user || log.approverUser || {};
        const level = log.approval_workflow_level || log.approvalWorkflowLevel || {};
        history.push({
          stepId: level.level_order === 1 ? 'brand_manager' : level.level_order === 2 ? 'finance' : level.level_order === 3 ? 'ceo' : 'unknown',
          stepLabel: level.name || approver.name || '-',
          action: (log.is_approved || log.isApproved) ? 'approved' : 'rejected',
          decidedAt: log.approved_at || log.approvedAt || log.created_at || log.createdAt || null,
          comment: log.comment || null,
        });
      }
      return history;
    }

    // Fallback: derive from status
    if (!status || status === 'DRAFT') return [];
    const history: any[] = [{
      stepId: 'submitted',
      stepLabel: 'Submitted',
      action: 'submitted',
      decidedAt: tk.created_at || tk.createdAt || null,
      comment: null,
    }];
    if (['LEVEL1_APPROVED', 'LEVEL2_APPROVED', 'APPROVED', 'FINAL', 'IN_REVIEW'].includes(status)) {
      history.push({ stepId: 'brand_manager', stepLabel: 'Group Brand Manager', action: 'approved', decidedAt: null, comment: null });
    } else if (status === 'LEVEL1_REJECTED') {
      history.push({ stepId: 'brand_manager', stepLabel: 'Group Brand Manager', action: 'rejected', decidedAt: null, comment: null });
    }
    if (['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(status)) {
      history.push({ stepId: 'finance', stepLabel: 'Finance', action: 'approved', decidedAt: null, comment: null });
    } else if (status === 'LEVEL2_REJECTED') {
      history.push({ stepId: 'finance', stepLabel: 'Finance', action: 'rejected', decidedAt: null, comment: null });
    }
    if (['APPROVED', 'FINAL'].includes(status)) {
      history.push({ stepId: 'ceo', stepLabel: 'CEO', action: 'approved', decidedAt: null, comment: null });
    }
    return history;
  }, [fullTicket, ticket]);

  const currentStep = useMemo(() => {
    const tk = fullTicket || ticket;
    const status = (tk?.status || '').toUpperCase();
    if (!status || status === 'DRAFT') return 'submitted';
    if (['SUBMITTED', 'PENDING'].includes(status)) return 'brand_manager';
    if (status === 'LEVEL1_APPROVED' || status === 'IN_REVIEW') return 'finance';
    if (status === 'LEVEL1_REJECTED') return 'brand_manager';
    if (status === 'LEVEL2_APPROVED') return 'ceo';
    if (status === 'LEVEL2_REJECTED') return 'finance';
    if (['APPROVED', 'FINAL'].includes(status)) return 'completed';
    return 'submitted';
  }, [fullTicket, ticket]);

  // Approval actions
  const canApprove = () => {
    if (!ticket || !user) return false;
    const status = (fullTicket?.status || ticket?.status || '').toUpperCase();
    const roleName = (user.role?.name || user.roleName || '').toLowerCase();
    const permissions = user.role?.permissions || user.permissions || [];
    if (status === 'SUBMITTED' || status === 'PENDING') {
      return permissions.includes('proposal:approve_l1') || permissions.includes('*') || roleName.includes('manager');
    }
    if (status === 'LEVEL1_APPROVED' || status === 'IN_REVIEW') {
      return permissions.includes('proposal:approve_l2') || permissions.includes('*') || roleName.includes('finance') || roleName.includes('director');
    }
    return false;
  };

  const handleApproveTicket = async () => {
    if (!fullTicket?.id) return;
    setActionLoading(true);
    try {
      // TODO: wire to real approval endpoint when available
      // await ticketService.processApproval(fullTicket.id, { ... });
      toast.success('Approved');
      if (onBack) onBack();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTicket = () => {
    confirm({
      title: 'Reject Ticket',
      message: 'Enter rejection reason:',
      confirmLabel: 'Reject',
      variant: 'danger',
      promptPlaceholder: 'Reason...',
      onConfirm: async (_reason?: string) => {
        if (!fullTicket?.id) return;
        setActionLoading(true);
        try {
          // TODO: wire to real rejection endpoint
          toast.success('Rejected');
          if (onBack) onBack();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Total brand allocation
  const totalBrandAllocation = brandAllocations.reduce((sum, ba) => sum + ba.totalAllocation, 0);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-[#6B4D30]" />
          <span className="text-gray-700">Loading ticket detail...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center text-gray-700">
          <p>No ticket data</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 hover:underline text-[#6B4D30]">
              Back to Tickets
            </button>
          )}
        </div>
      </div>
    );
  }

  const ticketId = fullTicket?.id || ticket?.id || '';
  const ticketStatus = (fullTicket?.status || ticket?.status || 'pending').replace(/_/g, ' ');

  return (
    <div className="space-y-1.5 md:space-y-2">
      {/* ===== HEADER BAR ===== */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#127749] to-[#2A9E6A]">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded transition-all hover:bg-white/10 text-white shrink-0">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold font-['Montserrat'] text-white">Ticket Detail</span>
              <span className="px-1.5 py-px text-[9px] font-bold rounded bg-white/15 text-white/80">
                {ticketStatus}
              </span>
            </div>
            <p className="text-[10px] text-white/60 truncate">
              #{ticketId} {fullTicket?.creator?.name ? `by ${fullTicket.creator.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showApprovalActions && canApprove() && (
            <>
              <button onClick={handleRejectTicket} disabled={actionLoading} className="flex items-center gap-1 px-2.5 py-1 bg-[#F85149]/20 hover:bg-[#F85149]/30 text-white font-medium rounded text-[11px] border border-[#F85149]/25 disabled:opacity-50">
                <XCircle size={11} /> Reject
              </button>
              <button onClick={handleApproveTicket} disabled={actionLoading} className="flex items-center gap-1 px-2.5 py-1 bg-white/25 hover:bg-white/35 text-white font-medium rounded text-[11px] border border-white/25 disabled:opacity-50">
                <CheckCircle size={11} /> Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== APPROVAL + BUDGET INFO (left) | STATUS (right) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-1.5 items-start">
        {/* Left: Approval Progress + Budget Info */}
        <div className="space-y-1.5">
          <ApprovalProgressBar currentStep={currentStep} approvalHistory={approvalHistory} />

          {/* Budget Information */}
          {budgetInfo && (budgetInfo.fiscalYear || budgetInfo.budgetName) && (
            <div className="rounded-lg border overflow-hidden bg-white border-[rgba(215,183,151,0.2)]">
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-[#6B4D30]" />
                  <span className="text-xs font-bold font-['Montserrat'] uppercase tracking-wide text-[#6B4D30]">
                    Budget Information
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {budgetInfo.fiscalYear && (
                <div>
                  <div className="text-xs text-[#999999]">Fiscal Year</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">FY{budgetInfo.fiscalYear}</div>
                </div>
              )}
              {budgetInfo.budgetName && (
                <div>
                  <div className="text-xs text-[#999999]">Budget Name</div>
                  <div className="text-sm font-bold font-['Montserrat'] text-[#0A0A0A] mt-1">{budgetInfo.budgetName}</div>
                </div>
              )}
              {budgetInfo.seasonGroup && (
                <div>
                  <div className="text-xs text-[#999999]">Season Group</div>
                  <div className="text-sm font-bold font-['Montserrat'] text-[#0A0A0A] mt-1">{budgetInfo.seasonGroup}</div>
                </div>
              )}
              {budgetInfo.season && (
                <div>
                  <div className="text-xs text-[#999999]">Season</div>
                  <div className="text-sm font-bold font-['Montserrat'] text-[#0A0A0A] mt-1">{budgetInfo.season}</div>
                </div>
              )}
              {budgetInfo.budgetAmount > 0 && (
                <div>
                  <div className="text-xs text-[#999999]">Budget Amount</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(budgetInfo.budgetAmount)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
          )}
        </div>

        {/* Right: Status & History */}
        <StatusTrackingPanel approvalHistory={approvalHistory} ticket={fullTicket || ticket} />
      </div>

      {/* ===== BUDGET ALLOCATION PER BRAND ===== */}
      {brandAllocations.length > 0 && (
        <div className="rounded-xl border overflow-hidden bg-white border-[rgba(215,183,151,0.3)]">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-[#6B4D30]" />
              <span className="text-xs font-bold font-['Montserrat'] uppercase tracking-wide text-[#6B4D30]">
                Budget Allocation per Brand
              </span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-[rgba(160,120,75,0.08)]">
                <tr>
                  <th className="text-left px-3 py-1.5 font-semibold text-[#666]">Brand</th>
                  <th className="text-right px-3 py-1.5 font-semibold text-[#666]">Allocated Amount</th>
                  <th className="text-right px-3 py-1.5 font-semibold text-[#666]">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brandAllocations.map((ba) => (
                  <tr key={ba.brandId} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-[#0A0A0A]">{ba.brandName}</td>
                    <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] font-medium text-[#6B4D30]">
                      {formatCurrency(ba.totalAllocation)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-[#666]">
                      {totalBrandAllocation > 0 ? ((ba.totalAllocation / totalBrandAllocation) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[rgba(160,120,75,0.08)]">
                <tr>
                  <td className="px-3 py-2 font-bold text-[#0A0A0A]">Total</td>
                  <td className="px-3 py-2 text-right font-['JetBrains_Mono'] font-bold text-[#6B4D30]">
                    {formatCurrency(totalBrandAllocation)}
                  </td>
                  <td className="px-3 py-2 text-right font-['JetBrains_Mono'] font-bold text-[#0A0A0A]">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===== SKU PROPOSAL DETAILS ===== */}
      <div className="rounded-xl border overflow-hidden bg-white border-[rgba(215,183,151,0.3)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[rgba(160,120,75,0.08)] to-transparent">
          <div className="flex items-center gap-2.5">
            <Package size={18} className="text-[#6B4D30]" />
            <h3 className="text-sm font-bold font-['Montserrat'] text-gray-800">
              SKU Proposal Details
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {skuBlocks.length > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(160,120,75,0.1)] text-[#6B4D30]">
                  <Package size={10} />
                  {grandTotals.skuCount} SKUs
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-['JetBrains_Mono'] bg-[rgba(18,119,73,0.08)] text-[#127749]">
                  <DollarSign size={10} />
                  {formatCurrency(grandTotals.ttlValue)}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-[#999]">No SKU data</span>
            )}
          </div>
        </div>

        {skuBlocks.length === 0 && (
          <div className="px-4 py-8 text-center text-[#999]">
            <Package size={36} className="mx-auto mb-2.5 opacity-30" />
            <p className="text-sm font-semibold mb-1 text-gray-500">No SKU proposals in snapshot</p>
          </div>
        )}
      </div>

      {/* ===== SKU BLOCKS (expandable) ===== */}
      {skuBlocks.length > 0 && (
        <div className="space-y-2">
          {skuBlocks.map((block: any, idx: number) => {
            const blockKey = `${block.brandId || ''}_${block.subCategory || ''}_${idx}`;
            const isExpanded = expandedBlocks[blockKey] !== false; // expanded by default
            const blockItems = block.items || [];
            const blockTotal = blockItems.reduce((sum: number, item: any) => sum + (Number(item.orderQty || 0)), 0);
            const sizeKeys = Array.from(new Set(blockItems.flatMap((item: any) => Object.keys(item.sizing || {})))) as string[];
            sizeKeys.sort();
            const hasSizing = sizeKeys.length > 0;

            return (
              <div key={blockKey} className="rounded-xl border overflow-hidden bg-white border-[rgba(215,183,151,0.3)]">
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

                {/* Block Items Table */}
                {isExpanded && (
                  <div className="border-t border-[rgba(215,183,151,0.2)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[rgba(160,120,75,0.08)]">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-semibold text-[#666]">SKU</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-[#666]">Name</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-[#666]">Order</th>
                            {stores.map((st) => (
                              <th key={st.code} className="text-center px-3 py-1.5 font-semibold text-[#666]">
                                {st.code}
                              </th>
                            ))}
                            <th className="text-right px-3 py-1.5 font-semibold text-[#666]">Value</th>
                            {/* Sizing columns at the end */}
                            {hasSizing && sizeKeys.map((size) => (
                              <th key={size} className="text-center px-2 py-1.5 font-semibold text-[#6B4D30] bg-[rgba(215,183,151,0.15)]">
                                {size}
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
                              <td className="px-3 py-1.5 text-[#0A0A0A] max-w-[200px] truncate" title={item.name}>{item.name}</td>
                              <td className="px-3 py-1.5 text-center font-['JetBrains_Mono'] font-bold text-[#0A0A0A]">
                                {item.orderQty || 0}
                              </td>
                              {stores.map((st) => (
                                <td key={st.code} className="px-3 py-1.5 text-center font-['JetBrains_Mono'] text-[#666]">
                                  {item.storeQty?.[st.code] || 0}
                                </td>
                              ))}
                              <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] font-medium text-[#127749]">
                                {formatCurrency(item.ttlValue || 0)}
                              </td>
                              {/* Sizing data */}
                              {hasSizing && sizeKeys.map((size) => (
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
      )}

      {/* ===== GRAND TOTAL BAR ===== */}
      {skuBlocks.length > 0 && (
        <div className="rounded-xl border overflow-hidden bg-[rgba(18,119,73,0.06)] border-[rgba(18,119,73,0.2)]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#127749]" />
              <span className="text-sm font-bold font-['Montserrat'] text-[#127749]">Grand Total</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10px] text-[#999]">Order</div>
                <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#0A0A0A]">{grandTotals.order}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[#999]">Value</div>
                <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#6B4D30]">{formatCurrency(grandTotals.ttlValue)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
