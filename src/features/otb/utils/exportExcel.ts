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
  const XLSX = await import('xlsx');
  const {
    budgetName, fiscalYear, stores, seasonGroups, seasonConfig,
    brands, allocationValues, totalBudget, totalAllocated,
  } = opts;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Allocation Detail ──
  const rows: Record<string, any>[] = [];

  brands.forEach((brand) => {
    seasonGroups.forEach((sg) => {
      const config = seasonConfig[sg];
      if (!config) return;

      config.subSeasons.forEach((sub) => {
        const key = `${brand.id}-${sg}-${sub}`;
        const storeVals = allocationValues[key] || {};
        const row: Record<string, any> = {
          Brand: brand.name,
          Season: config.name,
          'Sub-Season': sub,
        };

        let rowTotal = 0;
        stores.forEach((store) => {
          const val = typeof storeVals[store.id] === 'number' ? storeVals[store.id] : 0;
          row[store.code] = val;
          rowTotal += val;
        });
        row['Total'] = rowTotal;

        rows.push(row);
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Allocation');

  // ── Sheet 2: Summary ──
  const summaryRows = [
    { Metric: 'Budget Name', Value: budgetName },
    { Metric: 'Fiscal Year', Value: `FY${fiscalYear}` },
    { Metric: 'Total Budget', Value: totalBudget },
    { Metric: 'Total Allocated', Value: totalAllocated },
    { Metric: 'Remaining', Value: totalBudget - totalAllocated },
    { Metric: 'Allocation %', Value: totalBudget > 0 ? `${Math.round((totalAllocated / totalBudget) * 100)}%` : '0%' },
    { Metric: 'Stores', Value: stores.map(s => s.code).join(', ') },
    { Metric: 'Export Date', Value: new Date().toLocaleDateString('vi-VN') },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Download
  const filename = `allocation_${budgetName.replace(/\s+/g, '_')}_FY${fiscalYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
}
