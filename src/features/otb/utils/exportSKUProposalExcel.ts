// ═══════════════════════════════════════════════════════════════════════════
// SKU Proposal — Excel Export / Import (2 sheets: SKU Proposal, Sizing)
// Uses ExcelJS (already in project dependencies).
//
// Sizing sheet layout: each SKU is a separate block with its own header +
// size table, showing ONLY the sizes that belong to that SKU's subcategory.
// ═══════════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';

// ─── Style constants ─────────────────────────────────────────────────────────
const HEADER_BG   = 'FF5C4A3A';
const RAIL_BG     = 'FFE8D5C4';
const SKU_BG      = 'FFDFD3C6';   // warm tan for per-SKU header
const EDITABLE_BG = 'FFFFF3E0';   // light gold — marks editable cells
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9, name: 'Calibri' };
const DATA_FONT:   Partial<ExcelJS.Font> = { size: 9, name: 'Calibri' };
const BORDER_THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FFD4C8BB' } };
const CELL_BORDER: Partial<ExcelJS.Borders> = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };
const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
const LEFT:   Partial<ExcelJS.Alignment> = { horizontal: 'left',   vertical: 'middle' };
const NUM_FMT = '#,##0';

function hCell(ws: ExcelJS.Worksheet, r: number, c: number, val: string, bg = HEADER_BG) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = HEADER_FONT;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.alignment = CENTER;
  cell.border = CELL_BORDER;
}

function dCell(ws: ExcelJS.Worksheet, r: number, c: number, val: any, opts?: {
  fmt?: string; align?: 'left' | 'center'; bold?: boolean; bg?: string;
}) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { ...DATA_FONT, bold: opts?.bold ?? false };
  if (opts?.fmt) cell.numFmt = opts.fmt;
  cell.alignment = (opts?.align === 'left' ? LEFT : CENTER);
  cell.border = CELL_BORDER;
  if (opts?.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SKUExportBlock {
  brandId: string;
  brandName: string;
  rail: string;
  gender: string;
  category: string;
  subCategory: string;
  items: SKUExportItem[];
}

export interface SKUExportItem {
  productId: string;
  sku: string;
  name: string;
  color: string;
  colorCode: string;
  productType: string;
  customerTarget: string;
  unitCost: number;
  srp: number;
  order: number;
  ttlValue: number;
  storeQty: Record<string, number>;
}

export interface SizingExportRow {
  productId: string;
  sku: string;
  name: string;
  rail: string;
  subCategory: string;
  order: number;
  /** sizeName → quantity */
  sizes: Record<string, number>;
  /** Ordered list of size names that belong to this SKU's subcategory */
  sizeKeys: string[];
}

export interface SKUProposalExportPayload {
  brandName: string;
  blocks: SKUExportBlock[];
  storeCodes: string[];
  sizingRows: SizingExportRow[];
  /** All unique size names in order (kept for backwards compat, not used by new sizing sheet) */
  sizeColumns: string[];
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportSKUProposalExcel(payload: SKUProposalExportPayload): Promise<string> {
  const { brandName, blocks, storeCodes, sizingRows } = payload;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DAFC OTB System';
  wb.created = new Date();

  buildSKUSheet(wb, blocks, storeCodes, brandName);
  buildSizingSheet(wb, sizingRows, brandName);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeBrand = brandName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `SKU_Proposal_${safeBrand}_${dateStr}.xlsx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

// ─── Sheet 1: SKU Proposal ──────────────────────────────────────────────────

function buildSKUSheet(wb: ExcelJS.Workbook, blocks: SKUExportBlock[], storeCodes: string[], brandName: string) {
  const ws = wb.addWorksheet('SKU Proposal');

  // Fixed columns + dynamic store columns
  const fixedHeaders = [
    'Product ID', 'Rail', 'SKU Code', 'SKU Name', 'Color',
    'Product Type', 'Customer Target', 'Unit Cost', 'SRP',
  ];
  const storeHeaders = storeCodes.map(c => c.toUpperCase());
  const afterStoreHeaders = ['Order Qty', 'Total Value'];
  const allHeaders = [...fixedHeaders, ...storeHeaders, ...afterStoreHeaders];
  const totalCols = allHeaders.length;

  // Row 1: title
  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = `SKU Proposal — ${brandName}`;
  title.font = { bold: true, size: 11, name: 'Calibri' };
  title.alignment = LEFT;

  // Row 2: headers
  allHeaders.forEach((h, i) => hCell(ws, 2, i + 1, h));
  ws.getRow(2).height = 18;

  // Mark editable store columns with gold header
  const storeStartCol = fixedHeaders.length + 1;
  storeCodes.forEach((_, i) => {
    const cell = ws.getCell(2, storeStartCol + i);
    cell.font = { ...HEADER_FONT, color: { argb: 'FF3D2B1A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EDITABLE_BG } };
  });

  // Column widths
  ws.getColumn(1).width = 12; // Product ID
  ws.getColumn(2).width = 18; // Rail
  ws.getColumn(3).width = 16; // SKU Code
  ws.getColumn(4).width = 30; // SKU Name
  ws.getColumn(5).width = 14; // Color
  ws.getColumn(6).width = 16; // Product Type
  ws.getColumn(7).width = 14; // Customer Target
  ws.getColumn(8).width = 12; // Unit Cost
  ws.getColumn(9).width = 12; // SRP
  storeCodes.forEach((_, i) => { ws.getColumn(storeStartCol + i).width = 10; });
  ws.getColumn(storeStartCol + storeCodes.length).width = 12;     // Order Qty
  ws.getColumn(storeStartCol + storeCodes.length + 1).width = 14; // Total Value

  let dataRow = 3;

  blocks.forEach((block) => {
    // Rail group header row
    ws.mergeCells(dataRow, 1, dataRow, totalCols);
    const railCell = ws.getCell(dataRow, 1);
    railCell.value = `▸ ${block.rail || 'No Rail'} — ${(block.gender || '').toUpperCase()} / ${block.category} / ${block.subCategory}`;
    railCell.font = { ...DATA_FONT, bold: true, color: { argb: 'FF3D2B1A' } };
    railCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RAIL_BG } };
    railCell.alignment = LEFT;
    railCell.border = CELL_BORDER;
    dataRow++;

    block.items.forEach((item, idx) => {
      const evenRow = idx % 2 === 0;
      const rowBg = evenRow ? undefined : 'FFF7F2ED';
      let c = 1;

      dCell(ws, dataRow, c++, item.productId, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, block.rail, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, item.sku, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, item.name, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, item.color, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, item.productType, { align: 'left', bg: rowBg });
      dCell(ws, dataRow, c++, item.customerTarget, { align: 'center', bg: rowBg });
      dCell(ws, dataRow, c++, item.unitCost, { fmt: NUM_FMT, bg: rowBg });
      dCell(ws, dataRow, c++, item.srp, { fmt: NUM_FMT, bg: rowBg });

      // Store quantities — EDITABLE
      storeCodes.forEach((code) => {
        dCell(ws, dataRow, c++, item.storeQty[code.toUpperCase()] || 0, { fmt: NUM_FMT, bg: EDITABLE_BG });
      });

      // Order & Total Value (computed)
      dCell(ws, dataRow, c++, item.order, { fmt: NUM_FMT, bold: true, bg: rowBg });
      dCell(ws, dataRow, c++, item.ttlValue, { fmt: NUM_FMT, bg: rowBg });

      dataRow++;
    });
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

// ─── Sheet 2: Sizing Proposal (per-SKU blocks) ─────────────────────────────
//
// Layout per SKU:
//   Row A: SKU header — merged across cols 1..4: "SKU: {code} — {name}"
//          col 1: "Product ID", col 2: productId value (for import mapping)
//          col 3..4: merged label with SKU info + metadata
//   Row B: column headers — "Size" | "Qty"
//   Rows C..N: one row per size with editable qty
//   Row N+1: total row
//   (blank separator row)
//
// This keeps each SKU self-contained and shows only its own sizes.
// ─────────────────────────────────────────────────────────────────────────────

// Marker text used to identify SKU header rows during import
const SKU_HEADER_MARKER = 'SKU_HEADER';

function buildSizingSheet(wb: ExcelJS.Workbook, sizingRows: SizingExportRow[], brandName: string) {
  const ws = wb.addWorksheet('Sizing Proposal');
  const COLS = 5; // Product ID | Rail | Sub-Category | Size | Qty

  // Row 1: title
  ws.mergeCells(1, 1, 1, COLS);
  const title = ws.getCell(1, 1);
  title.value = `Sizing Proposal — ${brandName}`;
  title.font = { bold: true, size: 11, name: 'Calibri' };
  title.alignment = LEFT;

  // Column widths
  ws.getColumn(1).width = 14; // Product ID
  ws.getColumn(2).width = 18; // Rail
  ws.getColumn(3).width = 22; // Sub-Category
  ws.getColumn(4).width = 12; // Size
  ws.getColumn(5).width = 12; // Qty

  let row = 3; // start after title + blank row

  sizingRows.forEach((sku) => {
    const sizeKeys = sku.sizeKeys.length > 0 ? sku.sizeKeys : Object.keys(sku.sizes);
    // If still empty, skip this SKU (no sizes at all)
    if (sizeKeys.length === 0) return;

    // ── SKU header row (brown background) ──────────────────────────────────
    // Col 1-2: Product ID label+value (used by import to identify the SKU)
    // Col 3-5: merged — SKU name, rail, sub-category info
    dCell(ws, row, 1, SKU_HEADER_MARKER, { bold: true, bg: SKU_BG, align: 'left' });
    dCell(ws, row, 2, sku.productId, { bold: true, bg: SKU_BG, align: 'left' });
    ws.mergeCells(row, 3, row, COLS);
    const infoCell = ws.getCell(row, 3);
    infoCell.value = `SKU: ${sku.sku} — ${sku.name}  |  Rail: ${sku.rail}  |  ${sku.subCategory}  |  Order: ${sku.order}`;
    infoCell.font = { ...DATA_FONT, bold: true, color: { argb: 'FF3D2B1A' } };
    infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKU_BG } };
    infoCell.alignment = LEFT;
    infoCell.border = CELL_BORDER;
    row++;

    // ── Size table header ──────────────────────────────────────────────────
    hCell(ws, row, 1, 'Product ID');
    hCell(ws, row, 2, 'Rail');
    hCell(ws, row, 3, 'Sub-Category');
    hCell(ws, row, 4, 'Size');
    hCell(ws, row, 5, 'Qty', EDITABLE_BG);
    // Qty header — editable style
    const qtyHeader = ws.getCell(row, 5);
    qtyHeader.font = { ...HEADER_FONT, color: { argb: 'FF3D2B1A' } };
    qtyHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EDITABLE_BG } };
    row++;

    // ── Size data rows ─────────────────────────────────────────────────────
    let sizeTotal = 0;
    sizeKeys.forEach((sizeName, idx) => {
      const qty = sku.sizes[sizeName] || 0;
      sizeTotal += qty;
      const rowBg = idx % 2 === 0 ? undefined : 'FFF7F2ED';

      dCell(ws, row, 1, sku.productId, { align: 'left', bg: rowBg });
      dCell(ws, row, 2, sku.rail, { align: 'left', bg: rowBg });
      dCell(ws, row, 3, sku.subCategory, { align: 'left', bg: rowBg });
      dCell(ws, row, 4, sizeName, { align: 'center', bold: true, bg: rowBg });
      dCell(ws, row, 5, qty, { fmt: NUM_FMT, bg: EDITABLE_BG });
      row++;
    });

    // ── Total row ──────────────────────────────────────────────────────────
    ws.mergeCells(row, 1, row, 4);
    const totalLabel = ws.getCell(row, 1);
    totalLabel.value = `Total (${sku.sku})`;
    totalLabel.font = { ...DATA_FONT, bold: true, italic: true };
    totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLabel.border = CELL_BORDER;
    totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEE5DB' } };
    dCell(ws, row, 5, sizeTotal, { fmt: NUM_FMT, bold: true, bg: 'FFEEE5DB' });
    row++;

    // ── Blank separator row ────────────────────────────────────────────────
    row++;
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// ═══════════════════════════════════════════════════════════════════════════
// Import — parse Excel and return structured data for the screen to apply
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportedSKURow {
  productId: string;
  rail: string;
  sku: string;
  customerTarget: string;
  storeQty: Record<string, number>;
}

export interface ImportedSizingRow {
  productId: string;
  sizes: Record<string, number>;
}

export interface SKUProposalImportResult {
  skuRows: ImportedSKURow[];
  sizingRows: ImportedSizingRow[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse an Excel file (exported from this system) and extract editable fields.
 * Returns structured data that SKUProposalScreen can apply to its state.
 */
export async function importSKUProposalExcel(file: File): Promise<SKUProposalImportResult> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const errors: string[] = [];
  const warnings: string[] = [];
  const skuRows: ImportedSKURow[] = [];
  const sizingRows: ImportedSizingRow[] = [];

  // ── Parse Sheet 1: SKU Proposal ──────────────────────────────────────────
  const skuSheet = wb.getWorksheet('SKU Proposal');
  if (!skuSheet) {
    errors.push('Missing sheet "SKU Proposal" in Excel file');
  } else {
    // Row 2 = headers, data starts at row 3
    const headerRow = skuSheet.getRow(2);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim();
    });

    // Find column indices
    const productIdCol = headers.findIndex(h => h === 'Product ID');
    const railCol = headers.findIndex(h => h === 'Rail');
    const customerTargetCol = headers.findIndex(h => h === 'Customer Target');

    if (productIdCol < 0) {
      errors.push('Cannot find "Product ID" column in SKU Proposal sheet');
    } else {
      // Identify store columns (between SRP and Order Qty)
      const srpCol = headers.findIndex(h => h === 'SRP');
      const orderCol = headers.findIndex(h => h === 'Order Qty');
      const storeColRange: { col: number; code: string }[] = [];
      if (srpCol > 0 && orderCol > 0) {
        for (let i = srpCol + 1; i < orderCol; i++) {
          if (headers[i]) storeColRange.push({ col: i, code: headers[i] });
        }
      }

      const rowCount = skuSheet.rowCount;
      for (let r = 3; r <= rowCount; r++) {
        const row = skuSheet.getRow(r);
        const pid = String(row.getCell(productIdCol).value || '').trim();
        // Skip rail group header rows (merged cells / no product ID)
        if (!pid || pid === 'null' || pid === 'undefined') continue;

        const storeQty: Record<string, number> = {};
        storeColRange.forEach(({ col, code }) => {
          const val = Number(row.getCell(col).value) || 0;
          if (val > 0) storeQty[code.toUpperCase()] = val;
        });

        skuRows.push({
          productId: pid,
          rail: String(row.getCell(railCol >= 0 ? railCol : 0).value || '').trim(),
          sku: String(row.getCell(headers.findIndex(h => h === 'SKU Code') >= 0 ? headers.findIndex(h => h === 'SKU Code') : 0).value || '').trim(),
          customerTarget: String(row.getCell(customerTargetCol >= 0 ? customerTargetCol : 0).value || 'New').trim(),
          storeQty,
        });
      }
    }
  }

  // ── Parse Sheet 2: Sizing Proposal (per-SKU block layout) ────────────────
  //
  // Format:
  //   SKU_HEADER | productId | info...       ← SKU header row
  //   Product ID | Rail | Sub-Category | Size | Qty  ← column headers
  //   pid        | rail | subCat       | S    | 10   ← size data rows
  //   pid        | rail | subCat       | M    | 20
  //   Total (sku)                             | 30   ← total row (skip)
  //   (blank)                                        ← separator (skip)
  //
  const sizingSheet = wb.getWorksheet('Sizing Proposal');
  if (!sizingSheet) {
    warnings.push('Missing sheet "Sizing Proposal" — sizing data will not be imported');
  } else {
    const rowCount = sizingSheet.rowCount;
    // Accumulate sizing per product
    const sizingAccum = new Map<string, Record<string, number>>();

    for (let r = 2; r <= rowCount; r++) {
      const exRow = sizingSheet.getRow(r);
      const col1 = String(exRow.getCell(1).value || '').trim();
      const col2 = String(exRow.getCell(2).value || '').trim();

      // Skip header rows, total rows, blank rows, SKU_HEADER rows, column header rows
      if (!col1 || col1 === SKU_HEADER_MARKER || col1 === 'Product ID') continue;
      // Skip total rows (merged across cols 1-4)
      if (col1.startsWith('Total')) continue;

      // This should be a size data row: col1=productId, col4=sizeName, col5=qty
      const productId = col1;
      const sizeName = String(exRow.getCell(4).value || '').trim();
      const qty = Math.round(Number(exRow.getCell(5).value) || 0);

      if (!sizeName || !productId) continue;

      let sizeMap = sizingAccum.get(productId);
      if (!sizeMap) {
        sizeMap = {};
        sizingAccum.set(productId, sizeMap);
      }
      if (qty > 0) {
        sizeMap[sizeName] = qty;
      }
    }

    // Convert accumulated data to output
    sizingAccum.forEach((sizes, productId) => {
      if (Object.keys(sizes).length > 0) {
        sizingRows.push({ productId, sizes });
      }
    });
  }

  // ── Validation ───────────────────────────────────────────────────────────
  if (skuRows.length === 0 && errors.length === 0) {
    warnings.push('No SKU data rows found in the file');
  }

  // Check for duplicate product IDs in SKU sheet
  const pidSet = new Set<string>();
  skuRows.forEach((r, i) => {
    if (pidSet.has(r.productId)) {
      warnings.push(`Duplicate Product ID "${r.productId}" at row ${i + 3} in SKU Proposal sheet`);
    }
    pidSet.add(r.productId);
  });

  // Validate sizing quantities
  sizingRows.forEach((r) => {
    const total = Object.values(r.sizes).reduce((s, v) => s + v, 0);
    if (total < 0) {
      errors.push(`Negative sizing total for Product ID "${r.productId}"`);
    }
  });

  return { skuRows, sizingRows, errors, warnings };
}
