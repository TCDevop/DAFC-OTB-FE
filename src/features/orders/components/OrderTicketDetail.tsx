'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ticketService } from '@/services';
import { ProductImage } from '@/components/ui';

/* ═══════════════════════════════════════════════
   COLUMN DEFINITIONS
   editable = false → view only (from vendor file)
   editable = true  → user can edit (N columns)
═══════════════════════════════════════════════ */
const COLUMNS: { key: string; label: string; width: number; editable: boolean; type?: string }[] = [
  { key: 'image',              label: 'Image',                   width: 60,  editable: false, type: 'image' },
  { key: 'sku',                label: 'Sku',                     width: 130, editable: false },
  { key: 'name',               label: 'Name',                    width: 200, editable: false },
  { key: 'collectionName',     label: 'Collection Name',         width: 140, editable: false },
  { key: 'brandId',            label: 'Brand ID',                width: 100, editable: true },
  { key: 'color',              label: 'Color',                   width: 100, editable: false },
  { key: 'colorCode',          label: 'Color Code',              width: 100, editable: true },
  { key: 'division',           label: 'Division (L2)',           width: 110, editable: false },
  { key: 'productType',        label: 'Product Type (L3)',       width: 140, editable: false },
  { key: 'department',         label: 'Department/Group (L4)',   width: 160, editable: false },
  { key: 'carryForward',       label: 'Carry Forward',           width: 110, editable: false },
  { key: 'fsr',                label: 'FSR',                     width: 80,  editable: true },
  { key: 'composition',        label: 'MAIN RM COMPOSITION',     width: 180, editable: false },
  { key: 'wholesaleSGD',       label: 'Wholesale (SGD)',         width: 120, editable: true, type: 'number' },
  { key: 'rrpSGD',             label: 'R.R.P (SGD)',             width: 110, editable: true, type: 'number' },
  { key: 'regionalRRP',        label: 'Regional RRP',            width: 110, editable: true, type: 'number' },
  { key: 'theme',              label: 'Theme',                   width: 120, editable: false },
  { key: 'totalPriceSGD',      label: 'Total Price (SGD)',       width: 130, editable: true, type: 'number' },
  { key: 'mod',                label: 'Mod',                     width: 80,  editable: true },
  { key: 'ves',                label: 'Ves',                     width: 80,  editable: true },
  { key: 'inCatalogue',        label: 'In Catalogue',            width: 100, editable: true },
  { key: 'gruppo',             label: 'Gruppo',                  width: 100, editable: true },
  { key: 'tipology',           label: 'Tipology',                width: 100, editable: true },
  { key: 'skuType',            label: 'Sku Type',                width: 100, editable: true },
  { key: 'gca',                label: 'GCA',                     width: 80,  editable: true },
  { key: 'window',             label: 'Window',                  width: 100, editable: true },
  { key: 'heel',               label: 'HEEL',                    width: 80,  editable: true },
  { key: 'dimension',          label: 'Dimension',               width: 100, editable: true },
  { key: 'finish',             label: 'Finish',                  width: 100, editable: true },
  { key: 'delivery',           label: 'Delivery',                width: 100, editable: true },
  { key: 'currency',           label: 'Currency',                width: 90,  editable: true },
  { key: 'priceModSingle',     label: 'PRICE MOD SINGLE',        width: 150, editable: true, type: 'number' },
  { key: 'priceModSingleRetail', label: 'PRICE MOD SINGLE RETAIL', width: 180, editable: true, type: 'number' },
  { key: 'amount',             label: 'Amount',                  width: 100, editable: true, type: 'number' },
  { key: 'amountRetail',       label: 'Amount Retail',           width: 110, editable: true, type: 'number' },
  { key: 'productStatus',      label: 'Product Status',          width: 120, editable: true },
  { key: 'styleName',          label: 'Style Name',              width: 150, editable: false },
  { key: 'totalUnits',         label: 'Total Units',             width: 100, editable: false, type: 'number' },
  { key: 'size2',              label: 'Size 2',                  width: 80,  editable: true },
  { key: 'size',               label: 'Size',                    width: 80,  editable: false },
];

/* ═══════════════════════════════════════════════
   FLATTEN SNAPSHOT → rows (1 row = 1 SKU × 1 size)
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

      // Get final sizing version
      const finalSizing = sizingHeaders.find((sh: any) => sh.is_final_version || sh.isFinalVersion) || sizingHeaders[sizingHeaders.length - 1];

      // Build sizing lookup: skuProposalId → [{ sizeLabel, qty }]
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

        // Compute total order qty from allocations
        const allocates = sku.sku_allocates || sku.skuAllocates || [];
        let totalOrder = 0;
        for (const sa of allocates) {
          totalOrder += Number(sa.quantity || 0);
        }

        const srp = Number(sku.srp || 0);
        const unitCost = Number(sku.unit_cost || sku.unitCost || 0);

        // Base fields shared across all sizes of this SKU
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
          // Pre-fill editable fields with known data
          wholesaleSGD: unitCost || '',
          rrpSGD: srp || '',
        };

        // Get sizings for this SKU
        const sizings = sizingBySkuId[skuPropId];

        if (sizings && sizings.length > 0) {
          // One row per size
          for (const sz of sizings) {
            rows.push({
              _id: idx++,
              ...baseRow,
              size: sz.sizeLabel,
              totalUnits: sz.qty,
            });
          }
        } else {
          // No sizing data → single row with total qty
          rows.push({
            _id: idx++,
            ...baseRow,
            size: '',
          });
        }
      }
    }
  }

  return rows;
}

/* ═══════════════════════════════════════════════
   EDITABLE CELL
═══════════════════════════════════════════════ */
const EditableCell = ({ value, onChange, type }: { value: any; onChange: (v: string) => void; type?: string }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  const commit = () => {
    setEditing(false);
    if (draft !== String(value ?? '')) onChange(draft);
  };

  if (!editing) {
    return (
      <div
        className="w-full h-full px-2 py-1.5 cursor-text truncate text-xs font-['JetBrains_Mono'] text-gray-800 hover:bg-blue-50/60"
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
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const OrderTicketDetail = ({ ticket, onBack }: { ticket: any; onBack: () => void }) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch full ticket data and flatten into rows
  useEffect(() => {
    if (!ticket?.id) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const fullTicket = await ticketService.getOne(String(ticket.id));
        const dataRows = flattenTicketToRows(fullTicket);
        setRows(dataRows.length > 0 ? dataRows : []);
      } catch (err: any) {
        console.error('Failed to fetch ticket detail:', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket?.id]);

  const handleCellChange = useCallback((rowIdx: number, colKey: string, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colKey]: value };
      return next;
    });
  }, []);

  const totalWidth = COLUMNS.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
            <h1 className="text-sm font-semibold font-['Montserrat'] text-gray-800">
              {ticket?.budgetName || t('orderConfirm.title')}
            </h1>
            <p className="text-[10px] text-gray-500">
              FY{ticket?.fy} &middot; {ticket?.seasonGroup} &middot; {ticket?.season}
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-['Montserrat'] bg-[#D7B797] text-[#333] hover:bg-[#C4A584] transition-colors"
        >
          <Save size={14} />
          {t('common.save')}
        </button>
      </div>

      {/* ── Spreadsheet ── */}
      <div className="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={28} className="animate-spin text-[#8B6914] mb-3" />
            <span className="text-sm text-gray-500">Loading ticket data...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ImageIcon size={32} className="text-gray-300 mb-3" />
            <span className="text-sm text-gray-500">No SKU data in this ticket</span>
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
          Double-click to edit cells
        </span>
      </div>
    </div>
  );
};

export default OrderTicketDetail;
