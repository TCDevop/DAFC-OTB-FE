import { formatCurrency } from '../../../utils';

interface ExportAllocationOptions {
  budgetName: string;
  fiscalYear: number;
  stores: { id: string; code: string; name: string }[];
  seasonGroups: string[];
  seasonConfig: Record<string, { name: string; subSeasons: string[] }>;
  brands: { id: string; name: string }[];
  allocationValues: Record<string, any>;
  totalBudget: number;
  totalAllocated: number;
}

export async function exportAllocationToExcel(opts: ExportAllocationOptions) {
  const ExcelJS = await import('exceljs');
  const {
    budgetName, fiscalYear, stores, seasonGroups, seasonConfig,
    brands, allocationValues, totalBudget, totalAllocated,
  } = opts;

  const workbook = new ExcelJS.Workbook();

  // ── Sheet 1: Allocation Detail ──
  const ws = workbook.addWorksheet('Allocation');

  // Build header row
  const headerColumns = ['Brand', 'Season', 'Sub-Season', ...stores.map(s => s.code), 'Total'];
  ws.addRow(headerColumns);

  // Build data rows
  brands.forEach((brand) => {
    seasonGroups.forEach((sg) => {
      const config = seasonConfig[sg];
      if (!config) return;

      config.subSeasons.forEach((sub) => {
        const key = `${brand.id}-${sg}-${sub}`;
        const storeVals = allocationValues[key] || {};

        let rowTotal = 0;
        const storeValues = stores.map((store) => {
          const val = typeof storeVals[store.id] === 'number' ? storeVals[store.id] : 0;
          rowTotal += val;
          return val;
        });

        ws.addRow([brand.name, config.name, sub, ...storeValues, rowTotal]);
      });
    });
  });

  // ── Sheet 2: Summary ──
  const ws2 = workbook.addWorksheet('Summary');
  ws2.addRow(['Metric', 'Value']);
  ws2.addRow(['Budget Name', budgetName]);
  ws2.addRow(['Fiscal Year', `FY${fiscalYear}`]);
  ws2.addRow(['Total Budget', totalBudget]);
  ws2.addRow(['Total Allocated', totalAllocated]);
  ws2.addRow(['Remaining', totalBudget - totalAllocated]);
  ws2.addRow(['Allocation %', totalBudget > 0 ? `${Math.round((totalAllocated / totalBudget) * 100)}%` : '0%']);
  ws2.addRow(['Stores', stores.map(s => s.code).join(', ')]);
  ws2.addRow(['Export Date', new Date().toLocaleDateString('vi-VN')]);

  // Download
  const filename = `allocation_${budgetName.replace(/\s+/g, '_')}_FY${fiscalYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return filename;
}
