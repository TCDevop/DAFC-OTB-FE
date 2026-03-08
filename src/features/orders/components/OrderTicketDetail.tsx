'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ticketService, orderService } from '@/services';
import { ProductImage } from '@/components/ui';

/* ═══════════════════════════════════════════════
   COLUMN DEFINITIONS
   editable = false → view only (from snapshot)
   editable = true  → user can edit
   dbKey = mapping to order_confirmation table column (snake_case)
═══════════════════════════════════════════════ */
const COLUMNS: { key: string; dbKey: string; label: string; width: number; editable: boolean; type?: string }[] = [
  { key: 'image',              dbKey: 'image_url',               label: 'Image',                   width: 60,  editable: false, type: 'image' },
  { key: 'sku',                dbKey: 'sku',                     label: 'Sku',                     width: 130, editable: false },
  { key: 'name',               dbKey: 'name',                    label: 'Name',                    width: 200, editable: false },
  { key: 'collectionName',     dbKey: 'collection_name',         label: 'Collection Name',         width: 140, editable: false },
  { key: 'brandId',            dbKey: 'brand_id',                label: 'Brand ID',                width: 100, editable: true },
  { key: 'color',              dbKey: 'color',                   label: 'Color',                   width: 100, editable: false },
  { key: 'colorCode',          dbKey: 'color_code',              label: 'Color Code',              width: 100, editable: true },
  { key: 'division',           dbKey: 'division',                label: 'Division (L2)',           width: 110, editable: false },
  { key: 'productType',        dbKey: 'product_type',            label: 'Product Type (L3)',       width: 140, editable: false },
  { key: 'department',         dbKey: 'department',              label: 'Department/Group (L4)',   width: 160, editable: false },
  { key: 'carryForward',       dbKey: 'carry_forward',           label: 'Carry Forward',           width: 110, editable: false },
  { key: 'fsr',                dbKey: 'fsr',                     label: 'FSR',                     width: 80,  editable: true },
  { key: 'composition',        dbKey: 'composition',             label: 'MAIN RM COMPOSITION',     width: 180, editable: false },
  { key: 'wholesaleSGD',       dbKey: 'wholesale_sgd',           label: 'Wholesale (SGD)',         width: 120, editable: true, type: 'number' },
  { key: 'rrpSGD',             dbKey: 'rrp_sgd',                 label: 'R.R.P (SGD)',             width: 110, editable: true, type: 'number' },
  { key: 'regionalRRP',        dbKey: 'regional_rrp',            label: 'Regional RRP',            width: 110, editable: true, type: 'number' },
  { key: 'theme',              dbKey: 'theme',                   label: 'Theme',                   width: 120, editable: false },
  { key: 'totalPriceSGD',      dbKey: 'total_price_sgd',         label: 'Total Price (SGD)',       width: 130, editable: true, type: 'number' },
  { key: 'mod',                dbKey: 'mod',                     label: 'Mod',                     width: 80,  editable: true },
  { key: 'ves',                dbKey: 'ves',                     label: 'Ves',                     width: 80,  editable: true },
  { key: 'inCatalogue',        dbKey: 'in_catalogue',            label: 'In Catalogue',            width: 100, editable: true },
  { key: 'gruppo',             dbKey: 'gruppo',                  label: 'Gruppo',                  width: 100, editable: true },
  { key: 'tipology',           dbKey: 'tipology',                label: 'Tipology',                width: 100, editable: true },
  { key: 'skuType',            dbKey: 'sku_type',                label: 'Sku Type',                width: 100, editable: true },
  { key: 'gca',                dbKey: 'gca',                     label: 'GCA',                     width: 80,  editable: true },
  { key: 'window',             dbKey: 'window',                  label: 'Window',                  width: 100, editable: true },
  { key: 'heel',               dbKey: 'heel',                    label: 'HEEL',                    width: 80,  editable: true },
  { key: 'dimension',          dbKey: 'dimension',               label: 'Dimension',               width: 100, editable: true },
  { key: 'finish',             dbKey: 'finish',                  label: 'Finish',                  width: 100, editable: true },
  { key: 'delivery',           dbKey: 'delivery',                label: 'Delivery',                width: 100, editable: true },
  { key: 'currency',           dbKey: 'currency',                label: 'Currency',                width: 90,  editable: true },
  { key: 'priceModSingle',     dbKey: 'price_mod_single',        label: 'PRICE MOD SINGLE',        width: 150, editable: true, type: 'number' },
  { key: 'priceModSingleRetail', dbKey: 'price_mod_single_retail', label: 'PRICE MOD SINGLE RETAIL', width: 180, editable: true, type: 'number' },
  { key: 'amount',             dbKey: 'amount',                  label: 'Amount',                  width: 100, editable: true, type: 'number' },
  { key: 'amountRetail',       dbKey: 'amount_retail',           label: 'Amount Retail',           width: 110, editable: true, type: 'number' },
  { key: 'productStatus',      dbKey: 'product_status',          label: 'Product Status',          width: 120, editable: true },
  { key: 'styleName',          dbKey: 'style_name',              label: 'Style Name',              width: 150, editable: false },
  { key: 'totalUnits',         dbKey: 'total_units',             label: 'Total Units',             width: 100, editable: false, type: 'number' },
  { key: 'size2',              dbKey: 'size2',                   label: 'Size 2',                  width: 80,  editable: true },
  { key: 'size',               dbKey: 'size',                    label: 'Size',                    width: 80,  editable: false },
];

// Build lookup maps
const DB_TO_UI = Object.fromEntries(COLUMNS.filter(c => c.dbKey !== c.key).map(c => [c.dbKey, c.key]));
const UI_TO_DB = Object.fromEntries(COLUMNS.map(c => [c.key, c.dbKey]));

/* ═══════════════════════════════════════════════
   Convert DB row (snake_case) → UI row (camelCase)
═══════════════════════════════════════════════ */
function dbRowToUiRow(dbRow: Record<string, any>, idx: number): Record<string, any> {
  const uiRow: Record<string, any> = { _id: idx, _dbId: dbRow.id, _status: dbRow.status };
  for (const col of COLUMNS) {
    if (col.type === 'image') {
      uiRow.imageUrl = dbRow.image_url || '';
    } else {
      uiRow[col.key] = dbRow[col.dbKey] ?? '';
    }
  }
  return uiRow;
}

/* ═══════════════════════════════════════════════
   Convert UI row → DB row for saving
═══════════════════════════════════════════════ */
function uiRowToDbRow(uiRow: Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {};
  if (uiRow._dbId) dbRow.id = String(uiRow._dbId);
  for (const col of COLUMNS) {
    if (col.type === 'image') {
      dbRow.image_url = uiRow.imageUrl || null;
    } else {
      const val = uiRow[col.key];
      if (col.type === 'number') {
        dbRow[col.dbKey] = val !== '' && val != null ? Number(val) : null;
      } else {
        dbRow[col.dbKey] = val || null;
      }
    }
  }
  return dbRow;
}

/* ═══════════════════════════════════════════════
   FLATTEN SNAPSHOT → rows (1 row = 1 SKU × 1 size)
   Used only when no saved order data exists yet
═══════════════════════════════════════════════ */
function flattenTicketToRows(fullTicket: any): Record<string, any>[] {
  const snapHeaders = fullTicket?.snapshot_allocate_headers || fullTicket?.snapshotAllocateHeaders || [];
  const rows: Record<string, any>[] = [];
  let idx = 0;

  for (const ah of snapHeaders) {
    const brandId = String(ah.brand_id || ah.brandId || ah.brand?.id || '');

    for (const sph of (ah.sku_proposal_headers || ah.skuProposalHeaders || [])) {
      const proposals = sph.sku_proposals || sph.skuProposals || [];
      const sizingHeaders = sph.proposal_sizing_headers || sph.proposalSizingHeaders || [];

      const finalSizing = sizingHeaders.find((sh: any) => sh.is_final_version || sh.isFinalVersion) || sizingHeaders[sizingHeaders.length - 1];

      const sizingBySkuId: Record<string, { sizeLabel: string; qty: number }[]> = {};
      if (finalSizing) {
        const sizings = finalSizing.proposal_sizings || finalSizing.proposalSizings || [];
        for (const ps of sizings) {
          const skuPropId = String(ps.sku_proposal_id || ps.skuProposalId || '');
          const sizeLabel = ps.subcategory_size?.name || ps.subcategorySize?.name || ps.subcategory_size_id || ps.subcategorySizeId || '';
          const qty = Number(ps.proposal_quantity || ps.proposalQuantity || 0);
          if (!sizingBySkuId[skuPropId]) sizingBySkuId[skuPropId] = [];
          sizingBySkuId[skuPropId].push({ sizeLabel, qty });
        }
      }

      for (const sku of proposals) {
        const product = sku.product || {};
        const subCat = product.sub_category || product.subCategory || {};
        const cat = subCat.category || {};
        const gender = cat.gender || {};
        const skuPropId = String(sku.id || '');

        const allocates = sku.sku_allocates || sku.skuAllocates || [];
        let totalOrder = 0;
        for (const sa of allocates) totalOrder += Number(sa.quantity || 0);

        const srp = Number(sku.srp || 0);
        const unitCost = Number(sku.unit_cost || sku.unitCost || 0);

        const baseRow: Record<string, any> = {
          imageUrl: product.image_url || product.imageUrl || '',
          sku: product.sku_code || product.skuCode || product.item_code || product.itemCode || skuPropId,
          name: product.product_name || product.productName || product.name || '',
          collectionName: product.rail || '',
          brandId: brandId,
          color: product.color || '',
          division: gender.name || '',
          productType: subCat.name || '',
          department: cat.name || '',
          carryForward: sku.customer_target || sku.customerTarget || '',
          composition: product.composition || '',
          theme: product.theme || '',
          styleName: product.product_name || product.productName || product.name || '',
          totalUnits: totalOrder,
          wholesaleSGD: unitCost || '',
          rrpSGD: srp || '',
        };

        const sizings = sizingBySkuId[skuPropId];
        if (sizings && sizings.length > 0) {
          for (const sz of sizings) {
            rows.push({ _id: idx++, ...baseRow, size: sz.sizeLabel, totalUnits: sz.qty });
          }
        } else {
          rows.push({ _id: idx++, ...baseRow, size: '' });
        }
      }
    }
  }

  return rows;
}

/* ═══════════════════════════════════════════════
   EDITABLE CELL
═══════════════════════════════════════════════ */
const EditableCell = React.memo(({ value, onChange, type, disabled }: { value: any; onChange: (v: string) => void; type?: string; disabled?: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  const commit = () => {
    setEditing(false);
    if (draft !== String(value ?? '')) onChange(draft);
  };

  if (disabled || !editing) {
    return (
      <div
        className={`w-full h-full px-2 py-1.5 truncate text-xs font-['JetBrains_Mono'] text-gray-800 ${disabled ? 'cursor-default opacity-60' : 'cursor-text hover:bg-blue-50/60'}`}
        onDoubleClick={() => { if (!disabled) { setDraft(String(value ?? '')); setEditing(true); } }}
      >
        {value ?? ''}
      </div>
    );
  }

  return (
    <input
      autoFocus
      type={type === 'number' ? 'number' : 'text'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className="w-full h-full px-2 py-1 text-xs font-['JetBrains_Mono'] text-gray-900 bg-white border-2 border-blue-400 outline-none rounded-none"
    />
  );
});
EditableCell.displayName = 'EditableCell';

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const OrderTicketDetail = ({ ticket, onBack }: { ticket: any; onBack: () => void }) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('NEW'); // NEW = not saved yet, DRAFT, CONFIRMED, CANCELLED
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<any>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // ── Load data: try order_confirmation table first, fallback to ticket snapshot ──
  useEffect(() => {
    if (!ticket?.id) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Try to load saved order data
        const savedRows = await orderService.getByTicketId(String(ticket.id));
        const savedList = Array.isArray(savedRows) ? savedRows : [];

        if (savedList.length > 0) {
          // Saved data exists → load from DB
          setRows(savedList.map((r: any, i: number) => dbRowToUiRow(r, i)));
          setOrderStatus(savedList[0]?.status || 'DRAFT');
          setHasChanges(false);
        } else {
          // No saved data → flatten from ticket snapshot
          const fullTicket = await ticketService.getOne(String(ticket.id));
          const dataRows = flattenTicketToRows(fullTicket);
          setRows(dataRows);
          setOrderStatus('NEW');
          setHasChanges(dataRows.length > 0);
        }
      } catch (err: any) {
        // If order endpoint fails (404), fall back to ticket snapshot
        console.warn('Order data not found, loading from snapshot:', err?.message);
        try {
          const fullTicket = await ticketService.getOne(String(ticket.id));
          const dataRows = flattenTicketToRows(fullTicket);
          setRows(dataRows);
          setOrderStatus('NEW');
          setHasChanges(dataRows.length > 0);
        } catch (err2: any) {
          console.error('Failed to fetch ticket detail:', err2);
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket?.id]);

  // ── Cell change handler ──
  const handleCellChange = useCallback((rowIdx: number, colKey: string, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colKey]: value };
      return next;
    });
    setHasChanges(true);
  }, []);

  // ── Save handler ──
  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const dbRows = rows.map(uiRowToDbRow);
      const saved = await orderService.save(String(ticket.id), dbRows);
      const savedList = Array.isArray(saved) ? saved : [];

      if (savedList.length > 0) {
        setRows(savedList.map((r: any, i: number) => dbRowToUiRow(r, i)));
        setOrderStatus(savedList[0]?.status || 'DRAFT');
      }
      setHasChanges(false);
      showToast('success', t('orderConfirm.saveSuccess') || 'Order saved successfully');
    } catch (err: any) {
      console.error('Failed to save order:', err);
      showToast('error', err?.response?.data?.message || t('orderConfirm.saveFailed') || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm handler ──
  const handleConfirm = async () => {
    if (hasChanges) {
      showToast('error', t('orderConfirm.saveBeforeConfirm') || 'Please save changes before confirming');
      return;
    }
    if (orderStatus === 'NEW') {
      showToast('error', t('orderConfirm.saveBeforeConfirm') || 'Please save data first');
      return;
    }
    setConfirming(true);
    try {
      await orderService.confirmOrder(String(ticket.id));
      setOrderStatus('CONFIRMED');
      showToast('success', t('orderConfirm.confirmSuccess') || 'Order confirmed');
    } catch (err: any) {
      console.error('Failed to confirm order:', err);
      showToast('error', err?.response?.data?.message || t('orderConfirm.confirmFailed') || 'Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  };

  const isReadOnly = orderStatus === 'CONFIRMED' || orderStatus === 'CANCELLED';
  const totalWidth = COLUMNS.reduce((sum, col) => sum + col.width, 0);

  const statusBadge = () => {
    if (orderStatus === 'CONFIRMED') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">CONFIRMED</span>;
    if (orderStatus === 'CANCELLED') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">CANCELLED</span>;
    if (orderStatus === 'DRAFT') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">DRAFT</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">NEW</span>;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold font-['Montserrat'] text-gray-800">
                {ticket?.budgetName || t('orderConfirm.title')}
              </h1>
              {statusBadge()}
            </div>
            <p className="text-[10px] text-gray-500">
              FY{ticket?.fy} &middot; {ticket?.seasonGroup} &middot; {ticket?.season}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={saving || rows.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-['Montserrat'] transition-colors ${
                saving || rows.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#D7B797] text-[#333] hover:bg-[#C4A584]'
              }`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? (t('common.saving') || 'Saving...') : t('common.save')}
            </button>
          )}

          {/* Confirm button */}
          {!isReadOnly && orderStatus !== 'NEW' && (
            <button
              onClick={handleConfirm}
              disabled={confirming || hasChanges}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-['Montserrat'] transition-colors ${
                confirming || hasChanges
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={hasChanges ? (t('orderConfirm.saveBeforeConfirm') || 'Save changes first') : ''}
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {t('orderConfirm.confirm') || 'Confirm'}
            </button>
          )}
        </div>
      </div>

      {/* ── Unsaved changes warning ── */}
      {hasChanges && !isReadOnly && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-amber-50 border border-amber-200 rounded-md shrink-0">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-700">{t('orderConfirm.unsavedChanges') || 'You have unsaved changes'}</span>
        </div>
      )}

      {/* ── Spreadsheet ── */}
      <div className="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={28} className="animate-spin text-[#8B6914] mb-3" />
            <span className="text-sm text-gray-500">{t('orderConfirm.loadingOrders') || 'Loading order data...'}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ImageIcon size={32} className="text-gray-300 mb-3" />
            <span className="text-sm text-gray-500">{t('orderConfirm.noData') || 'No SKU data in this ticket'}</span>
          </div>
        ) : (
          <div className="overflow-auto w-full h-full">
            <table
              className="border-collapse"
              style={{ minWidth: totalWidth + 40 }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                {COLUMNS.map(col => (
                  <col key={col.key} style={{ width: col.width }} />
                ))}
              </colgroup>

              <thead className="sticky top-0 z-20">
                <tr className="bg-[#E8DDD1]">
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-[#4A3728] border-r border-[#d4c4b0] sticky left-0 z-30 bg-[#E8DDD1]">
                    #
                  </th>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] border-r border-[#d4c4b0] whitespace-nowrap ${
                        col.editable ? 'text-[#2A6DB0] bg-[#E8DDD1]' : 'text-[#4A3728] bg-[#D9CCBC]'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={row._id}
                    className="border-b border-gray-100 hover:bg-[rgba(215,183,151,0.08)] group"
                  >
                    <td className="px-1 py-0 text-center text-[10px] font-['JetBrains_Mono'] text-gray-400 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                      {rowIdx + 1}
                    </td>

                    {COLUMNS.map(col => (
                      <td
                        key={col.key}
                        className={`p-0 border-r border-gray-100 h-8 ${
                          col.editable ? 'bg-white' : 'bg-[#F5F0EB]'
                        }`}
                      >
                        {col.type === 'image' ? (
                          <div className="flex items-center justify-center h-full">
                            {row.imageUrl ? (
                              <ProductImage
                                subCategory={row.productType || ''}
                                sku={row.sku}
                                imageUrl={row.imageUrl}
                                size={40}
                                rounded="rounded"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-gray-50">
                                <ImageIcon size={12} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                        ) : col.editable ? (
                          <EditableCell
                            value={row[col.key]}
                            onChange={(v) => handleCellChange(rowIdx, col.key, v)}
                            type={col.type}
                            disabled={isReadOnly}
                          />
                        ) : (
                          <div className="px-2 py-1.5 text-xs font-['JetBrains_Mono'] text-gray-600 truncate">
                            {row[col.key] ?? ''}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer info ── */}
      <div className="flex items-center justify-between pt-2 shrink-0">
        <span className="text-[10px] text-gray-400 font-['Montserrat']">
          {rows.length} rows &middot; {COLUMNS.filter(c => c.editable).length} editable columns &middot; {COLUMNS.filter(c => !c.editable).length} view-only columns
        </span>
        <span className="text-[10px] text-gray-400 font-['Montserrat']">
          {isReadOnly ? (t('orderConfirm.readOnly') || 'Read only') : (t('orderConfirm.doubleClickEdit') || 'Double-click to edit cells')}
        </span>
      </div>
    </div>
  );
};

export default OrderTicketDetail;
