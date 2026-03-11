// ═══════════════════════════════════════════════════════════════════════════
// OTB Analysis — Excel Export (3 sheets: Category, Collection, Gender)
// Uses ExcelJS. Only exports data for a single brand.
// ═══════════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CatRow {
  gender: string;
  category: string;
  subCategory: string;
  buyPct: number;
  salesPct: number;
  stPct: number;
  hist: Array<{ label: string; buyPct: number; salesPct: number; stPct: number }>;
  buyProposed: number;
  otbProposed: number;
  varPct: number;
  otbSubmitted: number;
  buyActual: number;
}

export interface CollectionRow {
  collection: string;
  store: string;
  buyPct: number;
  salesPct: number;
  stPct: number;
  moc: number;
  hist: Array<{ label: string; buyPct: number; salesPct: number; stPct: number; moc: number }>;
  buyProposed: number;
  otbProposed: number;
  varPct: number;
}

export interface GenderRow {
  gender: string;
  store: string;
  buyPct: number;
  salesPct: number;
  stPct: number;
  hist: Array<{ label: string; buyPct: number; salesPct: number; stPct: number }>;
  buyProposed: number;
  otbProposed: number;
  varPct: number;
}

export interface OTBExportPayload {
  brandName: string;
  baselinePeriodLabel: string;
  categoryRows: CatRow[];
  collectionRows: CollectionRow[];
  genderRows: GenderRow[];
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const HEADER_BG = 'FF5C4A3A';   // dark brown
const HEADER_BG_GOLD = 'FFA07020'; // gold %Proposed column
const HEADER_BG_HIST = 'FF8C7B6A'; // lighter for historical
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9, name: 'Calibri' };
const DATA_FONT = { size: 9, name: 'Calibri' };
const BORDER_THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FFD4C8BB' } };
const CELL_BORDER = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };
const PCT_FMT = '0.00"%"';
const NUM_FMT = '#,##0';
const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
const LEFT: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle' };

function headerCell(ws: ExcelJS.Worksheet, row: number, col: number, value: string, bgArgb = HEADER_BG) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = HEADER_FONT;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
  cell.alignment = CENTER;
  cell.border = CELL_BORDER;
}

function dataCell(ws: ExcelJS.Worksheet, row: number, col: number, value: any, fmt?: string, align: 'left' | 'center' = 'center', bold = false) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = { ...DATA_FONT, bold };
  if (fmt) cell.numFmt = fmt;
  cell.alignment = align === 'left' ? LEFT : CENTER;
  cell.border = CELL_BORDER;
}

function groupHeaderRow(ws: ExcelJS.Worksheet, row: number, label: string, colCount: number) {
  ws.mergeCells(row, 1, row, colCount);
  const cell = ws.getCell(row, 1);
  cell.value = label;
  cell.font = { ...DATA_FONT, bold: true, color: { argb: 'FF3D2B1A' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8D5C4' } };
  cell.alignment = LEFT;
  cell.border = CELL_BORDER;
}

// ─── Sheet 1: Category ───────────────────────────────────────────────────────

type NumTotals = {
  buyPct: number; salesPct: number; stPct: number;
  histBuy: number[]; histSales: number[]; histSt: number[];
  buyProposed: number; otbProposed: number; varPct: number; otbSubmitted: number; buyActual: number;
};

function emptyTotals(histLen: number): NumTotals {
  return { buyPct: 0, salesPct: 0, stPct: 0, histBuy: Array(histLen).fill(0), histSales: Array(histLen).fill(0), histSt: Array(histLen).fill(0), buyProposed: 0, otbProposed: 0, varPct: 0, otbSubmitted: 0, buyActual: 0 };
}
function addToTotals(t: NumTotals, row: CatRow) {
  t.buyPct += row.buyPct; t.salesPct += row.salesPct; t.stPct += row.stPct;
  row.hist.forEach((h, i) => { t.histBuy[i] = (t.histBuy[i] || 0) + h.buyPct; t.histSales[i] = (t.histSales[i] || 0) + h.salesPct; t.histSt[i] = (t.histSt[i] || 0) + h.stPct; });
  t.buyProposed += row.buyProposed; t.otbProposed += row.otbProposed; t.varPct += row.varPct; t.otbSubmitted += row.otbSubmitted; t.buyActual += row.buyActual;
}

function buildCategorySheet(wb: ExcelJS.Workbook, rows: CatRow[], baselineLabel: string, brandName: string) {
  const ws = wb.addWorksheet('Category');

  const histLabels = rows.length > 0 ? rows[0].hist.map(h => h.label) : [];
  const histLen = histLabels.length;
  const histColCount = histLen * 3;
  const baselineCols = baselineLabel ? 3 : 0;
  const totalCols = 3 + baselineCols + histColCount + 5;

  // Row 1: title
  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = `OTB Analysis — Category | Brand: ${brandName}`;
  title.font = { bold: true, size: 11, name: 'Calibri' };
  title.alignment = LEFT;

  // Row 2: period group headers
  let col = 4;
  if (baselineLabel) {
    ws.mergeCells(2, 4, 2, 6);
    const cell = ws.getCell(2, 4);
    cell.value = baselineLabel;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col = 7;
  }
  histLabels.forEach(label => {
    ws.mergeCells(2, col, 2, col + 2);
    const cell = ws.getCell(2, col);
    cell.value = label;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col += 3;
  });

  // Row 3: column headers
  let c = 1;
  headerCell(ws, 3, c++, 'Gender');
  headerCell(ws, 3, c++, 'Category');
  headerCell(ws, 3, c++, 'Sub-Category');
  if (baselineLabel) {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
  }
  histLabels.forEach(() => {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
  });
  headerCell(ws, 3, c++, '%Proposed', HEADER_BG_GOLD);
  headerCell(ws, 3, c++, '$OTB', HEADER_BG);
  headerCell(ws, 3, c++, 'Var%', HEADER_BG);
  headerCell(ws, 3, c++, 'Submit', HEADER_BG);
  headerCell(ws, 3, c++, '%Actual', HEADER_BG);

  ws.getRow(3).height = 16;
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 22;
  for (let i = 4; i <= totalCols; i++) ws.getColumn(i).width = 11;

  // Helper: write a total row (category or gender or grand)
  const writeTotalsRow = (r: number, col1Label: string, col2Label: string, t: NumTotals, bgArgb: string) => {
    const fill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    const boldFont = { ...DATA_FONT, bold: true };
    // merge col1+col2 for label if col2Label empty, else write separately
    if (col2Label === '') {
      ws.mergeCells(r, 1, r, 2);
      const lc = ws.getCell(r, 1); lc.value = col1Label; lc.font = boldFont; lc.fill = fill; lc.alignment = LEFT; lc.border = CELL_BORDER;
      const ec = ws.getCell(r, 3); ec.value = ''; ec.font = DATA_FONT; ec.fill = fill; ec.border = CELL_BORDER;
    } else {
      const lc1 = ws.getCell(r, 1); lc1.value = col1Label; lc1.font = boldFont; lc1.fill = fill; lc1.alignment = CENTER; lc1.border = CELL_BORDER;
      const lc2 = ws.getCell(r, 2); lc2.value = col2Label; lc2.font = { ...boldFont, italic: true }; lc2.fill = fill; lc2.alignment = LEFT; lc2.border = CELL_BORDER;
      const lc3 = ws.getCell(r, 3); lc3.value = ''; lc3.font = DATA_FONT; lc3.fill = fill; lc3.border = CELL_BORDER;
    }
    let dc = 4;
    if (baselineLabel) {
      const b1 = ws.getCell(r, dc++); b1.value = t.buyPct; b1.numFmt = PCT_FMT; b1.font = boldFont; b1.fill = fill; b1.alignment = CENTER; b1.border = CELL_BORDER;
      const b2 = ws.getCell(r, dc++); b2.value = t.salesPct; b2.numFmt = PCT_FMT; b2.font = boldFont; b2.fill = fill; b2.alignment = CENTER; b2.border = CELL_BORDER;
      const b3 = ws.getCell(r, dc++); b3.value = t.stPct; b3.numFmt = PCT_FMT; b3.font = boldFont; b3.fill = fill; b3.alignment = CENTER; b3.border = CELL_BORDER;
    }
    for (let i = 0; i < histLen; i++) {
      const h1 = ws.getCell(r, dc++); h1.value = t.histBuy[i] || 0; h1.numFmt = PCT_FMT; h1.font = boldFont; h1.fill = fill; h1.alignment = CENTER; h1.border = CELL_BORDER;
      const h2 = ws.getCell(r, dc++); h2.value = t.histSales[i] || 0; h2.numFmt = PCT_FMT; h2.font = boldFont; h2.fill = fill; h2.alignment = CENTER; h2.border = CELL_BORDER;
      const h3 = ws.getCell(r, dc++); h3.value = t.histSt[i] || 0; h3.numFmt = PCT_FMT; h3.font = boldFont; h3.fill = fill; h3.alignment = CENTER; h3.border = CELL_BORDER;
    }
    const p1 = ws.getCell(r, dc++); p1.value = t.buyProposed; p1.numFmt = PCT_FMT; p1.font = boldFont; p1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }; p1.alignment = CENTER; p1.border = CELL_BORDER;
    const p2 = ws.getCell(r, dc++); p2.value = t.otbProposed; p2.numFmt = NUM_FMT; p2.font = boldFont; p2.fill = fill; p2.alignment = CENTER; p2.border = CELL_BORDER;
    const p3 = ws.getCell(r, dc++); p3.value = t.varPct; p3.numFmt = PCT_FMT; p3.font = boldFont; p3.fill = fill; p3.alignment = CENTER; p3.border = CELL_BORDER;
    const p4 = ws.getCell(r, dc++); p4.value = t.otbSubmitted; p4.numFmt = NUM_FMT; p4.font = boldFont; p4.fill = fill; p4.alignment = CENTER; p4.border = CELL_BORDER;
    const p5 = ws.getCell(r, dc++); p5.value = t.buyActual; p5.numFmt = PCT_FMT; p5.font = boldFont; p5.fill = fill; p5.alignment = CENTER; p5.border = CELL_BORDER;
  };

  // Build group structure: gender → category → rows
  interface CatGroup { category: string; rows: CatRow[] }
  interface GenderGroup { gender: string; categories: CatGroup[] }
  const groups: GenderGroup[] = [];
  rows.forEach(row => {
    let gg = groups.find(g => g.gender === row.gender);
    if (!gg) { gg = { gender: row.gender, categories: [] }; groups.push(gg); }
    let cg = gg.categories.find(c => c.category === row.category);
    if (!cg) { cg = { category: row.category, rows: [] }; gg.categories.push(cg); }
    cg.rows.push(row);
  });

  // Spans to apply after writing
  interface SpanInfo { startRow: number; endRow: number; value: string; }
  const genderSpans: SpanInfo[] = [];
  const catSpans: SpanInfo[] = [];

  let dataRow = 4;
  const grandTotals = emptyTotals(histLen);

  groups.forEach(gg => {
    const genderDataStart = dataRow;
    const genderTotals = emptyTotals(histLen);

    gg.categories.forEach(cg => {
      const catDataStart = dataRow;
      const catTotals = emptyTotals(histLen);

      cg.rows.forEach((row, idx) => {
        const evenRow = idx % 2 === 0;
        const rowFill: ExcelJS.Fill = evenRow
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
          : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F2ED' } };
        const applyFill = (cell: ExcelJS.Cell) => { cell.fill = rowFill; };

        let dc = 1;
        const gc = ws.getCell(dataRow, dc++); gc.value = row.gender; gc.font = { ...DATA_FONT, bold: true }; gc.alignment = CENTER; gc.border = CELL_BORDER; applyFill(gc);
        const cc = ws.getCell(dataRow, dc++); cc.value = row.category; cc.font = { ...DATA_FONT, bold: true, italic: true }; cc.alignment = CENTER; cc.border = CELL_BORDER; applyFill(cc);
        dataCell(ws, dataRow, dc++, row.subCategory, undefined, 'left');
        if (baselineLabel) {
          dataCell(ws, dataRow, dc++, row.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
          dataCell(ws, dataRow, dc++, row.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
          dataCell(ws, dataRow, dc++, row.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
        }
        row.hist.forEach(h => {
          dataCell(ws, dataRow, dc++, h.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
          dataCell(ws, dataRow, dc++, h.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
          dataCell(ws, dataRow, dc++, h.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
        });
        dataCell(ws, dataRow, dc++, row.buyProposed, PCT_FMT, 'center', true);
        ws.getCell(dataRow, dc - 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        dataCell(ws, dataRow, dc++, row.otbProposed, NUM_FMT, 'center', true);
        dataCell(ws, dataRow, dc++, row.varPct, PCT_FMT);
        dataCell(ws, dataRow, dc++, row.otbSubmitted, NUM_FMT);
        dataCell(ws, dataRow, dc++, row.buyActual, PCT_FMT);

        addToTotals(catTotals, row);
        addToTotals(genderTotals, row);
        addToTotals(grandTotals, row);
        dataRow++;
      });

      // Category total row — col 1 = gender name (part of gender span), col 2 = "TOTAL [Cat]"
      catSpans.push({ startRow: catDataStart, endRow: dataRow - 1, value: cg.category });
      writeTotalsRow(dataRow, gg.gender, `TOTAL ${cg.category}`, catTotals, 'FFEEE5DB');
      dataRow++;
    });

    // Gender span covers data rows + category total rows (not the gender total row)
    genderSpans.push({ startRow: genderDataStart, endRow: dataRow - 1, value: gg.gender });
    // Gender total row — col 1+2 merged = "TOTAL [Gender]"
    writeTotalsRow(dataRow, `TOTAL ${gg.gender}`, '', genderTotals, 'FFD6C8BC');
    dataRow++;
  });

  // Grand total row — writeTotalsRow merges col 1+2, then override label with white text
  writeTotalsRow(dataRow, 'GRAND TOTAL', '', grandTotals, HEADER_BG);
  ws.getCell(dataRow, 1).font = { ...DATA_FONT, bold: true, color: { argb: 'FFFFFFFF' } };

  // Apply vertical merges for Gender column (col 1)
  genderSpans.forEach(span => {
    if (span.endRow > span.startRow) ws.mergeCells(span.startRow, 1, span.endRow, 1);
    const cell = ws.getCell(span.startRow, 1);
    cell.value = span.value;
    cell.font = { ...DATA_FONT, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DDD4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = CELL_BORDER;
  });

  // Apply vertical merges for Category column (col 2), excluding category total rows
  catSpans.forEach(span => {
    if (span.endRow > span.startRow) ws.mergeCells(span.startRow, 2, span.endRow, 2);
    const cell = ws.getCell(span.startRow, 2);
    cell.value = span.value;
    cell.font = { ...DATA_FONT, bold: true, italic: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5EDE4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = CELL_BORDER;
  });

  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }];
}

// ─── Sheet 2: Collection ─────────────────────────────────────────────────────

function buildCollectionSheet(wb: ExcelJS.Workbook, rows: CollectionRow[], baselineLabel: string, brandName: string) {
  const ws = wb.addWorksheet('Collection');

  const histLabels = rows.length > 0 ? rows[0].hist.map(h => h.label) : [];
  const histColCount = histLabels.length * 4; // %Buy, %Sales, %ST, MOC
  const totalCols = 2 + 4 + histColCount + 3; // collection+store | baseline | hist | proposed+otb+var

  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = `OTB Analysis — Collection | Brand: ${brandName}`;
  title.font = { bold: true, size: 11, name: 'Calibri' };
  title.alignment = LEFT;

  // Period group row
  let col = 3;
  if (baselineLabel) {
    ws.mergeCells(2, 3, 2, 6);
    const cell = ws.getCell(2, 3);
    cell.value = baselineLabel;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col = 7;
  }
  histLabels.forEach(label => {
    ws.mergeCells(2, col, 2, col + 3);
    const cell = ws.getCell(2, col);
    cell.value = label;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col += 4;
  });

  let c = 1;
  headerCell(ws, 3, c++, 'Collection');
  headerCell(ws, 3, c++, 'Store');
  if (baselineLabel) {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
    headerCell(ws, 3, c++, 'MOC', HEADER_BG_HIST);
  }
  histLabels.forEach(() => {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
    headerCell(ws, 3, c++, 'MOC', HEADER_BG_HIST);
  });
  headerCell(ws, 3, c++, '%Proposed', HEADER_BG_GOLD);
  headerCell(ws, 3, c++, '$OTB', HEADER_BG);
  headerCell(ws, 3, c++, 'Var%', HEADER_BG);

  ws.getRow(3).height = 16;
  ws.getColumn(1).width = 20; ws.getColumn(2).width = 20;
  for (let i = 3; i <= totalCols; i++) ws.getColumn(i).width = 11;

  let dataRow = 4;
  let lastCollection = '';

  rows.forEach((row, idx) => {
    if (row.collection !== lastCollection) {
      groupHeaderRow(ws, dataRow++, `▸ ${row.collection}`, totalCols);
      lastCollection = row.collection;
    }

    const evenRow = idx % 2 === 0;
    const rowFill: ExcelJS.Fill = evenRow
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F2ED' } };
    const applyFill = (cell: ExcelJS.Cell) => { cell.fill = rowFill; };

    let dc = 1;
    const colCell = ws.getCell(dataRow, dc++); colCell.value = row.collection; colCell.font = DATA_FONT; colCell.alignment = LEFT; colCell.border = CELL_BORDER; applyFill(colCell);
    dataCell(ws, dataRow, dc++, row.store, undefined, 'left');

    if (baselineLabel) {
      dataCell(ws, dataRow, dc++, row.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, row.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, row.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, row.moc, NUM_FMT); applyFill(ws.getCell(dataRow, dc - 1));
    }
    row.hist.forEach(h => {
      dataCell(ws, dataRow, dc++, h.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, h.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, h.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, h.moc, NUM_FMT); applyFill(ws.getCell(dataRow, dc - 1));
    });
    dataCell(ws, dataRow, dc++, row.buyProposed, PCT_FMT, 'center', true);
    ws.getCell(dataRow, dc - 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    dataCell(ws, dataRow, dc++, row.otbProposed, NUM_FMT, 'center', true);
    dataCell(ws, dataRow, dc++, row.varPct, PCT_FMT);

    dataRow++;
  });

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
}

// ─── Sheet 3: Gender ─────────────────────────────────────────────────────────

function buildGenderSheet(wb: ExcelJS.Workbook, rows: GenderRow[], baselineLabel: string, brandName: string) {
  const ws = wb.addWorksheet('Gender');

  const histLabels = rows.length > 0 ? rows[0].hist.map(h => h.label) : [];
  const histColCount = histLabels.length * 3;
  const totalCols = 2 + 3 + histColCount + 3;

  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = `OTB Analysis — Gender | Brand: ${brandName}`;
  title.font = { bold: true, size: 11, name: 'Calibri' };
  title.alignment = LEFT;

  let col = 3;
  if (baselineLabel) {
    ws.mergeCells(2, 3, 2, 5);
    const cell = ws.getCell(2, 3);
    cell.value = baselineLabel;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col = 6;
  }
  histLabels.forEach(label => {
    ws.mergeCells(2, col, 2, col + 2);
    const cell = ws.getCell(2, col);
    cell.value = label;
    cell.font = { size: 9, italic: true, name: 'Calibri', color: { argb: 'FF888888' } };
    cell.alignment = CENTER;
    col += 3;
  });

  let c = 1;
  headerCell(ws, 3, c++, 'Gender');
  headerCell(ws, 3, c++, 'Store');
  if (baselineLabel) {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
  }
  histLabels.forEach(() => {
    headerCell(ws, 3, c++, '%Buy', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%Sales', HEADER_BG_HIST);
    headerCell(ws, 3, c++, '%ST', HEADER_BG_HIST);
  });
  headerCell(ws, 3, c++, '%Proposed', HEADER_BG_GOLD);
  headerCell(ws, 3, c++, '$OTB', HEADER_BG);
  headerCell(ws, 3, c++, 'Var%', HEADER_BG);

  ws.getRow(3).height = 16;
  ws.getColumn(1).width = 12; ws.getColumn(2).width = 20;
  for (let i = 3; i <= totalCols; i++) ws.getColumn(i).width = 11;

  let dataRow = 4;
  let lastGender = '';

  rows.forEach((row, idx) => {
    if (row.gender !== lastGender) {
      groupHeaderRow(ws, dataRow++, `▸ ${row.gender}`, totalCols);
      lastGender = row.gender;
    }

    const evenRow = idx % 2 === 0;
    const rowFill: ExcelJS.Fill = evenRow
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F2ED' } };
    const applyFill = (cell: ExcelJS.Cell) => { cell.fill = rowFill; };

    let dc = 1;
    const gCell = ws.getCell(dataRow, dc++); gCell.value = row.gender; gCell.font = DATA_FONT; gCell.alignment = LEFT; gCell.border = CELL_BORDER; applyFill(gCell);
    dataCell(ws, dataRow, dc++, row.store, undefined, 'left');

    if (baselineLabel) {
      dataCell(ws, dataRow, dc++, row.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, row.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, row.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
    }
    row.hist.forEach(h => {
      dataCell(ws, dataRow, dc++, h.buyPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, h.salesPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
      dataCell(ws, dataRow, dc++, h.stPct, PCT_FMT); applyFill(ws.getCell(dataRow, dc - 1));
    });
    dataCell(ws, dataRow, dc++, row.buyProposed, PCT_FMT, 'center', true);
    ws.getCell(dataRow, dc - 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    dataCell(ws, dataRow, dc++, row.otbProposed, NUM_FMT, 'center', true);
    dataCell(ws, dataRow, dc++, row.varPct, PCT_FMT);

    dataRow++;
  });

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportOTBExcel(payload: OTBExportPayload): Promise<void> {
  const { brandName, baselinePeriodLabel, categoryRows, collectionRows, genderRows } = payload;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DAFC OTB System';
  wb.created = new Date();

  buildCategorySheet(wb, categoryRows, baselinePeriodLabel, brandName);
  buildCollectionSheet(wb, collectionRows, baselinePeriodLabel, brandName);
  buildGenderSheet(wb, genderRows, baselinePeriodLabel, brandName);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeBrand = brandName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `OTB_Analysis_${safeBrand}_${dateStr}.xlsx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
