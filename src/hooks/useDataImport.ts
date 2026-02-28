'use client';
import { useState, useCallback, useRef } from 'react';
import { importService } from '../services';

const BATCH_SIZE = 500;

const IMPORT_TARGETS = [
  { value: 'products', label: 'Products / SKU' },
  { value: 'otb_budget', label: 'OTB Budget' },
  { value: 'wssi', label: 'WSSI' },
  { value: 'size_profiles', label: 'Size Profiles' },
  { value: 'forecasts', label: 'Forecasts' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'kpi_targets', label: 'KPI Targets' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'categories', label: 'Categories' },
];

const DUPLICATE_MODES = [
  { value: 'skip', label: 'Skip duplicates' },
  { value: 'overwrite', label: 'Overwrite existing' },
  { value: 'merge', label: 'Merge fields' },
];

// Parse CSV line respecting quoted fields
const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const useDataImport = () => {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);

  // Config state
  const [target, setTarget] = useState('products');
  const [importMode, setImportMode] = useState('upsert');
  const [duplicateHandling, setDuplicateHandling] = useState('skip');
  const [matchKeys, setMatchKeys] = useState<string[]>([]);

  // Progress state
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewData, setViewData] = useState<{ records: any[]; total: number; page: number; pageSize: number; totalPages: number }>({ records: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [viewLoading, setViewLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [allStats, setAllStats] = useState<any[]>([]);

  // Abort ref
  const abortRef = useRef(false);

  // ─── Parse CSV/Excel file ─────────────────────────────────────────
  const parseFile = useCallback(async (selectedFile: File) => {
    // File size guard (50 MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 50 MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'tsv') {
      const text = await selectedFile.text();
      const delimiter = ext === 'tsv' ? '\t' : ',';
      const lines = text.split('\n').filter((l: string) => l.trim());
      if (lines.length < 2) {
        setError('File must have at least a header row and one data row');
        return;
      }

      const parsedHeaders = parseCSVLine(lines[0], delimiter);
      setHeaders(parsedHeaders);

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        const row: Record<string, any> = {};
        parsedHeaders.forEach((h: string, idx: number) => {
          row[h] = values[idx] || '';
        });
        rows.push(row);
      }

      setParsedData(rows);
      setPreviewRows(rows.slice(0, 10));

      // Auto-select match keys based on common column names
      const autoKeys = parsedHeaders.filter((h: string) =>
        /^(id|sku|code|barcode|product_code|sku_code)$/i.test(h)
      );
      if (autoKeys.length > 0) setMatchKeys(autoKeys);

    } else if (ext === 'xlsx' || ext === 'xls') {
      // Dynamic import ExcelJS
      try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const buffer = await selectedFile.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet || worksheet.rowCount < 2) {
          setError('Excel file is empty or has no data rows');
          return;
        }

        // Extract headers from first row
        const headerRow = worksheet.getRow(1);
        const parsedHeaders: string[] = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          parsedHeaders[colNumber - 1] = String(cell.value || `Column${colNumber}`);
        });

        // Extract data rows
        const jsonData: Record<string, any>[] = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const rowData: Record<string, any> = {};
          let hasData = false;
          parsedHeaders.forEach((h, idx) => {
            const cell = row.getCell(idx + 1);
            const val = cell.value;
            rowData[h] = val !== null && val !== undefined ? String(val) : '';
            if (val !== null && val !== undefined && String(val).trim()) hasData = true;
          });
          if (hasData) jsonData.push(rowData);
        }

        if (jsonData.length === 0) {
          setError('Excel file is empty or has no data rows');
          return;
        }

        setHeaders(parsedHeaders);
        setParsedData(jsonData);
        setPreviewRows(jsonData.slice(0, 10));

        const autoKeys = parsedHeaders.filter((h: string) =>
          /^(id|sku|code|barcode|product_code|sku_code)$/i.test(h)
        );
        if (autoKeys.length > 0) setMatchKeys(autoKeys);
      } catch {
        setError('Failed to parse Excel file');
      }
    } else {
      setError('Unsupported file format. Use .csv, .tsv, .xlsx, or .xls');
    }
  }, []);

  // ─── Batch import ─────────────────────────────────────────────────
  const startImport = useCallback(async () => {
    if (parsedData.length === 0) {
      setError('No data to import. Please upload a file first.');
      return;
    }

    setIsImporting(true);
    setError(null);
    setResult(null);
    abortRef.current = false;

    const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const aggregate: { inserted: number; updated: number; skipped: number; errors: number; errorDetails: any[] } = { inserted: 0, updated: 0, skipped: 0, errors: 0, errorDetails: [] };

    try {
      for (let i = 0; i < totalBatches; i++) {
        if (abortRef.current) {
          setError('Import aborted by user');
          break;
        }

        const batch = parsedData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        setProgress({
          current: i + 1,
          total: totalBatches,
          percent: Math.round(((i + 1) / totalBatches) * 100),
        });

        const batchResult = await importService.batchImport({
          target,
          mode: importMode,
          duplicateHandling,
          matchKey: matchKeys,
          rows: batch,
          sessionId,
          batchIndex: i,
          totalBatches,
        });

        aggregate.inserted += batchResult.inserted || 0;
        aggregate.updated += batchResult.updated || 0;
        aggregate.skipped += batchResult.skipped || 0;
        aggregate.errors += batchResult.errors || 0;
        if (batchResult.errorDetails) {
          aggregate.errorDetails.push(...batchResult.errorDetails);
        }
      }

      setResult({
        ...aggregate,
        sessionId,
        totalRows: parsedData.length,
        message: `Import complete: +${aggregate.inserted} inserted, ↻${aggregate.updated} updated, ⊘${aggregate.skipped} skipped, ✕${aggregate.errors} errors`,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, target, importMode, duplicateHandling, matchKeys]);

  // ─── Abort import ─────────────────────────────────────────────────
  const abortImport = useCallback(() => {
    abortRef.current = true;
  }, []);

  // ─── Query imported data ──────────────────────────────────────────
  const fetchData = useCallback(async (params: Record<string, any> = {}) => {
    setViewLoading(true);
    try {
      const data = await importService.queryData({
        target: params.target || target,
        page: params.page || 1,
        pageSize: params.pageSize || 50,
        search: params.search || '',
        sortBy: params.sortBy || '_importedAt',
        sortOrder: params.sortOrder || 'desc',
      });
      setViewData(data);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch data');
      return null;
    } finally {
      setViewLoading(false);
    }
  }, [target]);

  // ─── Get stats ────────────────────────────────────────────────────
  const fetchStats = useCallback(async (t?: string) => {
    try {
      const data = await importService.getStats(t || target);
      setStats(data?.stats || data);
      return data?.stats || data;
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      return null;
    }
  }, [target]);

  const fetchAllStats = useCallback(async () => {
    try {
      const data = await importService.getAllStats();
      setAllStats(data?.stats || data || []);
      return data?.stats || data || [];
    } catch (err: any) {
      console.error('Failed to fetch all stats:', err);
      return [];
    }
  }, []);

  // ─── Delete operations ────────────────────────────────────────────
  const deleteSession = useCallback(async (t: string, sessionId: string) => {
    try {
      const data = await importService.deleteSession(t, sessionId);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Delete failed');
      return null;
    }
  }, []);

  const clearTarget = useCallback(async (t: string) => {
    try {
      const data = await importService.clearTarget(t);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Clear failed');
      return null;
    }
  }, []);

  // ─── Reset upload state ───────────────────────────────────────────
  const resetUpload = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setPreviewRows([]);
    setMatchKeys([]);
    setProgress({ current: 0, total: 0, percent: 0 });
    setResult(null);
    setError(null);
  }, []);

  return {
    // Constants
    IMPORT_TARGETS,
    DUPLICATE_MODES,

    // Upload state
    file,
    parsedData,
    headers,
    previewRows,

    // Config
    target,
    setTarget,
    importMode,
    setImportMode,
    duplicateHandling,
    setDuplicateHandling,
    matchKeys,
    setMatchKeys,

    // Progress
    isImporting,
    progress,
    result,
    error,
    setError,

    // View
    viewData,
    viewLoading,
    stats,
    allStats,

    // Actions
    parseFile,
    startImport,
    abortImport,
    fetchData,
    fetchStats,
    fetchAllStats,
    deleteSession,
    clearTarget,
    resetUpload,
  };
};
