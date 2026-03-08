'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Loader2, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { orderService } from '@/services';
import { ProductImage } from '@/components/ui';
import ReceiptGapAnalysis from './ReceiptGapAnalysis';

/* ═══════════════════════════════════════════════
   COLUMN DEFINITIONS
   All order columns are view-only.
   Receipt-specific columns are editable.
═══════════════════════════════════════════════ */
interface ColDef {
  key: string;
  dbKey: string;
  label: string;
  width: number;
  editable: boolean;
  type?: string;
  group?: 'order' | 'receipt';
}

// ── Order columns (view-only, from order_confirmation) ──
const ORDER_COLUMNS: ColDef[] = [
  { key: 'image',              dbKey: 'image_url',               label: 'Image',                   width: 60,  editable: false, type: 'image', group: 'order' },
  { key: 'sku',                dbKey: 'sku',                     label: 'SKU',                     width: 130, editable: false, group: 'order' },
  { key: 'name',               dbKey: 'name',                    label: 'Product Name',            width: 200, editable: false, group: 'order' },
  { key: 'collectionName',     dbKey: 'collection_name',         label: 'Collection',              width: 140, editable: false, group: 'order' },
  { key: 'brandId',            dbKey: 'brand_id',                label: 'Brand ID',                width: 100, editable: false, group: 'order' },
  { key: 'color',              dbKey: 'color',                   label: 'Color',                   width: 100, editable: false, group: 'order' },
  { key: 'colorCode',          dbKey: 'color_code',              label: 'Color Code',              width: 100, editable: false, group: 'order' },
  { key: 'division',           dbKey: 'division',                label: 'Division (L2)',           width: 110, editable: false, group: 'order' },
  { key: 'productType',        dbKey: 'product_type',            label: 'Product Type (L3)',       width: 140, editable: false, group: 'order' },
  { key: 'department',         dbKey: 'department',              label: 'Department (L4)',         width: 140, editable: false, group: 'order' },
  { key: 'carryForward',       dbKey: 'carry_forward',           label: 'Carry Forward',           width: 110, editable: false, group: 'order' },
  { key: 'fsr',                dbKey: 'fsr',                     label: 'FSR',                     width: 80,  editable: false, group: 'order' },
  { key: 'composition',        dbKey: 'composition',             label: 'Composition',             width: 160, editable: false, group: 'order' },
  { key: 'wholesaleSGD',       dbKey: 'wholesale_sgd',           label: 'Wholesale (SGD)',         width: 120, editable: false, type: 'number', group: 'order' },
  { key: 'rrpSGD',             dbKey: 'rrp_sgd',                 label: 'R.R.P (SGD)',             width: 110, editable: false, type: 'number', group: 'order' },
  { key: 'regionalRRP',        dbKey: 'regional_rrp',            label: 'Regional RRP',            width: 110, editable: false, type: 'number', group: 'order' },
  { key: 'totalPriceSGD',      dbKey: 'total_price_sgd',         label: 'Order Total (SGD)',       width: 130, editable: false, type: 'number', group: 'order' },
  { key: 'currency',           dbKey: 'currency',                label: 'Order Currency',          width: 100, editable: false, group: 'order' },
  { key: 'totalUnits',         dbKey: 'total_units',             label: 'Order Qty',               width: 100, editable: false, type: 'number', group: 'order' },
  { key: 'size',               dbKey: 'size',                    label: 'Size',                    width: 80,  editable: false, group: 'order' },
];

// ── Receipt columns (editable) ──
const RECEIPT_COLUMNS: ColDef[] = [
  { key: 'receivedUnits',      dbKey: 'received_units',          label: 'Received Qty',            width: 120, editable: true, type: 'number', group: 'receipt' },
  { key: 'actualUnitPrice',    dbKey: 'actual_unit_price',       label: 'Actual Unit Price',       width: 140, editable: true, type: 'number', group: 'receipt' },
  { key: 'actualTotalPrice',   dbKey: 'actual_total_price',      label: 'Actual Total Price',      width: 150, editable: true, type: 'number', group: 'receipt' },
  { key: 'receiptCurrency',    dbKey: 'receipt_currency',        label: 'Currency',                width: 100, editable: true, group: 'receipt' },
  { key: 'receiptComment',     dbKey: 'receipt_comment',         label: 'Remarks',                 width: 200, editable: true, group: 'receipt' },
];

const ALL_COLUMNS = [...ORDER_COLUMNS, ...RECEIPT_COLUMNS];

/* ═══════════════════════════════════════════════
   Convert DB row → UI row
═══════════════════════════════════════════════ */
function dbRowToUiRow(dbRow: Record<string, any>, idx: number): Record<string, any> {
  const uiRow: Record<string, any> = { _id: idx, _dbId: dbRow.id, _status: dbRow.status };
  for (const col of ALL_COLUMNS) {
    if (col.type === 'image') {
      uiRow.imageUrl = dbRow.image_url || '';
    } else {
      uiRow[col.key] = dbRow[col.dbKey] ?? '';
    }
  }
  // Extra fields for gap analysis (not displayed as columns)
  uiRow.unitCost = Number(dbRow.unit_cost) || 0;
  uiRow.amount = Number(dbRow.amount) || 0;
  // Proposal value = total_units × unit_cost (from master data)
  const totalUnits = Number(dbRow.total_units) || 0;
  const unitCost = Number(dbRow.unit_cost) || 0;
  uiRow.proposalValue = totalUnits * unitCost;
  return uiRow;
}

/* ═══════════════════════════════════════════════
   Convert UI row → DB patch (receipt fields only)
═══════════════════════════════════════════════ */
function uiRowToReceiptPatch(uiRow: Record<string, any>): Record<string, any> {
  const patch: Record<string, any> = {};
  // _dbId is the order_confirmation row ID
  if (uiRow._dbId) patch.order_confirmation_id = String(uiRow._dbId);
  for (const col of RECEIPT_COLUMNS) {
    const val = uiRow[col.key];
    if (col.type === 'number') {
      patch[col.dbKey] = val !== '' && val != null ? Number(val) : null;
    } else {
      patch[col.dbKey] = val || null;
    }
  }
  return patch;
}

/* ═══════════════════════════════════════════════
   EDITABLE CELL
═══════════════════════════════════════════════ */
const EditableCell = React.memo(({ value, onChange, type }: { value: any; onChange: (v: string) => void; type?: string }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  const commit = () => {
    setEditing(false);
    if (draft !== String(value ?? '')) onChange(draft);
  };

  if (!editing) {
    return (
      <div
        className="w-full h-full px-2 py-1.5 truncate text-xs font-['JetBrains_Mono'] text-gray-800 cursor-text hover:bg-blue-50/60"
        onDoubleClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
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
const ReceiptTicketDetail = ({ ticket, onBack }: { ticket: any; onBack: () => void }) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showGap, setShowGap] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<any>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // ── Load merged order + receipt data ──
  useEffect(() => {
    if (!ticket?.id) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      try {
        const mergedRows = await orderService.getReceiptByTicketId(String(ticket.id));
        const list = Array.isArray(mergedRows) ? mergedRows : [];
        setRows(list.map((r: any, i: number) => dbRowToUiRow(r, i)));
      } catch (err: any) {
        console.error('Failed to fetch receipt data:', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket?.id]);

  // ── Cell change handler (receipt columns only) ──
  const handleCellChange = useCallback((rowIdx: number, colKey: string, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colKey]: value };
      return next;
    });
    setHasChanges(true);
  }, []);

  // ── Save receipt data ──
  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const patches = rows.map(uiRowToReceiptPatch);
      const saved = await orderService.saveReceipt(String(ticket.id), patches);
      const savedList = Array.isArray(saved) ? saved : [];
      if (savedList.length > 0) {
        setRows(savedList.map((r: any, i: number) => dbRowToUiRow(r, i)));
      }
      setHasChanges(false);
      showToast('success', t('receiptConfirm.saveSuccess') || 'Receipt data saved');
    } catch (err: any) {
      console.error('Failed to save receipt data:', err);
      showToast('error', err?.response?.data?.message || t('receiptConfirm.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const totalWidth = ALL_COLUMNS.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Toast ── */}
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
                {ticket?.ticketCode || ticket?.budgetName || t('receiptConfirm.title')}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">CONFIRMED</span>
            </div>
            <p className="text-[10px] text-gray-500">
              {ticket?.brandName} &middot; FY{ticket?.fy} &middot; {ticket?.seasonGroup} &middot; {ticket?.season}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGap(!showGap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-['Montserrat'] transition-colors border ${
              showGap
                ? 'bg-[rgba(139,105,20,0.1)] border-[#8B6914] text-[#6B4D30]'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={14} />
            Gap Analysis
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-['Montserrat'] transition-colors ${
              saving || !hasChanges
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#D7B797] text-[#333] hover:bg-[#C4A584]'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? (t('common.saving') || 'Saving...') : t('common.save')}
          </button>
        </div>
      </div>

      {/* ── Gap Analysis (toggle) ── */}
      {showGap && !loading && rows.length > 0 && <ReceiptGapAnalysis rows={rows} />}

      {/* ── Spreadsheet (hidden when gap analysis is shown) ── */}
      {!showGap && <div className="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={28} className="animate-spin text-[#8B6914] mb-3" />
            <span className="text-sm text-gray-500">{t('receiptConfirm.loadingReceipts')}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ImageIcon size={32} className="text-gray-300 mb-3" />
            <span className="text-sm text-gray-500">{t('receiptConfirm.noReceipts') || 'No order data found'}</span>
          </div>
        ) : (
          <div className="overflow-auto w-full h-full">
            <table
              className="border-collapse"
              style={{ minWidth: totalWidth + 40 }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                {ALL_COLUMNS.map(col => (
                  <col key={col.key} style={{ width: col.width }} />
                ))}
              </colgroup>

              <thead className="sticky top-0 z-20">
                {/* Group header row */}
                <tr className="bg-[#D9CCBC]">
                  <th className="border-r border-[#c4b5a3]" rowSpan={2}></th>
                  <th
                    colSpan={ORDER_COLUMNS.length}
                    className="px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#4A3728] border-r-2 border-[#b09a82]"
                  >
                    Order Information
                  </th>
                  <th
                    colSpan={RECEIPT_COLUMNS.length}
                    className="px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#2A6DB0] bg-[#dce8f3]"
                  >
                    Receipt Verification
                  </th>
                </tr>

                {/* Column header row */}
                <tr className="bg-[#E8DDD1]">
                  {ALL_COLUMNS.map((col, idx) => (
                    <th
                      key={col.key}
                      className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] border-r whitespace-nowrap ${
                        col.group === 'receipt'
                          ? 'text-[#2A6DB0] bg-[#e8f0fa] border-[#c5d5e8]'
                          : 'text-[#4A3728] bg-[#D9CCBC] border-[#d4c4b0]'
                      } ${idx === ORDER_COLUMNS.length - 1 ? 'border-r-2 border-r-[#b09a82]' : ''}`}
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

                    {ALL_COLUMNS.map((col, colIdx) => (
                      <td
                        key={col.key}
                        className={`p-0 border-r h-8 ${
                          col.group === 'receipt'
                            ? 'bg-[#f5f9ff] border-[#e0e8f0]'
                            : 'bg-[#F5F0EB] border-gray-100'
                        } ${colIdx === ORDER_COLUMNS.length - 1 ? 'border-r-2 border-r-[#d4c4b0]' : ''}`}
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
      </div>}

      {/* ── Footer (hidden when gap analysis is shown) ── */}
      {!showGap && <div className="flex items-center justify-between pt-2 shrink-0">
        <span className="text-[10px] text-gray-400 font-['Montserrat']">
          {rows.length} rows &middot; {ORDER_COLUMNS.length} order columns &middot; {RECEIPT_COLUMNS.length} receipt columns
        </span>
        <span className="text-[10px] text-gray-400 font-['Montserrat']">
          {t('orderConfirm.doubleClickEdit') || 'Double-click to edit receipt cells'}
        </span>
      </div>}
    </div>
  );
};

export default ReceiptTicketDetail;
