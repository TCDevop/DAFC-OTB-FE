'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Trash2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, Search, ArrowUpDown, Download, X, Play, Pause, Filter
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDataImport } from '@/hooks/useDataImport';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileFilterSheet, MobileDataCard } from '@/components/ui';

const ImportDataScreen = ({  }: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const {
    IMPORT_TARGETS, DUPLICATE_MODES,
    file, parsedData, headers, previewRows,
    target, setTarget, importMode, setImportMode,
    duplicateHandling, setDuplicateHandling,
    matchKeys, setMatchKeys,
    isImporting, progress, result, error, setError,
    viewData, viewLoading, stats, allStats,
    parseFile, startImport, abortImport,
    fetchData, fetchStats, fetchAllStats,
    deleteSession, clearTarget, resetUpload} = useDataImport();

  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('upload'); // upload | data | stats
  const [viewTarget, setViewTarget] = useState<string>('products');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [confirmClear, setConfirmClear] = useState<any>(null);
  const fileInputRef = useRef<any>(null);

  // ─── Fetch data when switching to data/stats tab ─────────────────
  useEffect(() => {
    if (activeTab === 'data') {
      fetchData({ target: viewTarget, page: currentPage, search: searchTerm });
    }
  }, [activeTab, viewTarget, currentPage, searchTerm, fetchData]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchAllStats();
    }
  }, [activeTab, fetchAllStats]);

  // ─── File drop handler ────────────────────────────────────────────
  const handleDrop = useCallback((e: any) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) parseFile(droppedFile);
  }, [parseFile]);

  const handleFileSelect = (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseFile(selectedFile);
  };

  // ─── Styles ───────────────────────────────────────────────────────
  const cardBg ='bg-white border-gray-300';
  const textPrimary ='text-gray-900';
  const textSecondary ='text-gray-600';
  const textMuted ='text-gray-500';
  const inputBg ='bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const tableBorder ='border-gray-300';
  const hoverBg ='hover:bg-gray-50';

  // ─── Upload Tab ───────────────────────────────────────────────────
  const renderUploadTab = () => (
    <div className="space-y-4">
      {/* Target & Config Row */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <h3 className={`text-sm font-semibold mb-3 font-['Montserrat'] ${textPrimary}`}>
          {t('import.importConfig', 'Import Configuration')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Target */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
              {t('import.target', 'Target')}
            </label>
            <select
              value={target}
              onChange={(e: any) => setTarget(e.target.value)}
              className={`w-full text-xs rounded-lg border px-2.5 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
            >
              {IMPORT_TARGETS.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Import Mode */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
              {t('import.mode', 'Import Mode')}
            </label>
            <select
              value={importMode}
              onChange={(e: any) => setImportMode(e.target.value)}
              className={`w-full text-xs rounded-lg border px-2.5 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
            >
              <option value="upsert">Upsert (Insert or Update)</option>
              <option value="insert">Insert Only</option>
              <option value="update_only">Update Only</option>
            </select>
          </div>

          {/* Duplicate Handling */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
              {t('import.duplicateHandling', 'Duplicate Handling')}
            </label>
            <select
              value={duplicateHandling}
              onChange={(e: any) => setDuplicateHandling(e.target.value)}
              className={`w-full text-xs rounded-lg border px-2.5 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
            >
              {DUPLICATE_MODES.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Match Keys */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
              {t('import.matchKeys', 'Match Keys')}
            </label>
            <input
              type="text"
              value={matchKeys.join(', ')}
              onChange={(e: any) => setMatchKeys(e.target.value.split(',').map((s: any) => s.trim()).filter(Boolean))}
              placeholder="e.g. sku, code"
              className={`w-full text-xs rounded-lg border px-2.5 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
            />
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e: any) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-4 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${'border-gray-300 hover:border-[#8A6340] hover:bg-[rgba(215,183,151,0.04)]'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload size={32} className={textMuted} />
        <p className={`mt-2 text-sm font-medium ${textSecondary}`}>
          {t('import.dropzone', 'Drop CSV/Excel file here or click to browse')}
        </p>
        <p className={`mt-1 text-xs ${textMuted}`}>
          {t('import.supportedFormats', 'Supports .csv, .tsv, .xlsx, .xls')}
        </p>
      </div>

      {/* File Info */}
      {file && (
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className={'text-[#6B4D30]'} />
              <span className={`text-sm font-medium ${textPrimary}`}>{file.name}</span>
              <span className={`text-xs ${textMuted}`}>
                ({parsedData.length} {t('import.rows', 'rows')}, {headers.length} {t('import.columns', 'columns')})
              </span>
            </div>
            <button
              onClick={resetUpload}
              className={`p-1.5 rounded-lg transition-colors ${'hover:bg-gray-100 text-gray-500'}`}
            >
              <X size={14} />
            </button>
          </div>

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border ${tableBorder}">
              <table className="w-full text-xs">
                <thead>
                  <tr className={'bg-gray-50'}>
                    <th className={`px-3 py-2 text-left font-semibold ${textSecondary} border-b ${tableBorder}`}>#</th>
                    {headers.slice(0, 8).map((h: any) => (
                      <th key={h} className={`px-3 py-2 text-left font-semibold ${textSecondary} border-b ${tableBorder}`}>
                        {h}
                      </th>
                    ))}
                    {headers.length > 8 && (
                      <th className={`px-3 py-2 text-left font-semibold ${textMuted} border-b ${tableBorder}`}>
                        +{headers.length - 8} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row: any, i: any) => (
                    <tr key={i} className={`${hoverBg} transition-colors`}>
                      <td className={`px-3 py-1.5 ${textMuted} border-b ${tableBorder}`}>{i + 1}</td>
                      {headers.slice(0, 8).map((h: any) => (
                        <td key={h} className={`px-3 py-1.5 ${textPrimary} border-b ${tableBorder} max-w-[200px] truncate`}>
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                      {headers.length > 8 && (
                        <td className={`px-3 py-1.5 ${textMuted} border-b ${tableBorder}`}>...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <div className={`px-3 py-2 text-xs ${textMuted} text-center`}>
                  {t('import.showingPreview', 'Showing first 10 of')} {parsedData.length} {t('import.rows', 'rows')}
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {!isImporting ? (
              <button
                onClick={startImport}
                disabled={parsedData.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #D7B797 0%, #C49A6C 100%)' }}
              >
                <Play size={14} />
                {t('import.startImport', 'Start Import')} ({parsedData.length} {t('import.rows', 'rows')})
              </button>
            ) : (
              <button
                onClick={abortImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Pause size={14} />
                {t('import.abort', 'Abort')}
              </button>
            )}

            {/* Progress */}
            {isImporting && (
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={textSecondary}>
                    Batch {progress.current}/{progress.total}
                  </span>
                  <span className={textPrimary}>{progress.percent}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress.percent}%`,
                      background: 'linear-gradient(90deg, #D7B797 0%, #C49A6C 100%)'}}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className={`text-sm font-semibold ${textPrimary}`}>
              {t('import.importComplete', 'Import Complete')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: t('import.totalRows', 'Total Rows'), value: result.totalRows, color: textPrimary },
              { label: t('import.inserted', 'Inserted'), value: result.inserted, color: 'text-green-500' },
              { label: t('import.updated', 'Updated'), value: result.updated, color: 'text-blue-500' },
              { label: t('import.skipped', 'Skipped'), value: result.skipped, color: 'text-yellow-500' },
              { label: t('import.errors', 'Errors'), value: result.errors, color: 'text-red-500' },
            ].map((item: any) => (
              <div key={item.label} className={`rounded-lg p-3 ${'bg-gray-50'}`}>
                <div className={`text-xs ${textSecondary}`}>{item.label}</div>
                <div className={`text-lg font-bold font-['Montserrat'] ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
          {result.errorDetails?.length > 0 && (
            <div className="mt-3">
              <p className={`text-xs font-medium ${textSecondary} mb-1`}>
                {t('import.errorDetails', 'Error Details')}:
              </p>
              <div className={`max-h-32 overflow-y-auto text-xs space-y-1 ${'text-red-600'}`}>
                {result.errorDetails.slice(0, 10).map((err: any, i: any) => (
                  <div key={i}>Row {err.row}: {err.error}</div>
                ))}
                {result.errorDetails.length > 10 && (
                  <div className={textMuted}>... and {result.errorDetails.length - 10} more errors</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${'bg-red-50 border-red-200'}`}>
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className={`text-sm ${'text-red-700'}`}>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );

  // ─── Data Viewer Tab ──────────────────────────────────────────────
  const renderDataTab = () => {
    const records = viewData?.records || [];
    const dataHeaders = records.length > 0
      ? Object.keys(records[0]).filter((k: any) => !k.startsWith('_'))
      : [];

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className={`rounded-xl border p-3 md:p-4 ${cardBg}`}>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Mobile Filter Button */}
            {isMobile && (
              <button
                onClick={() => setShowMobileFilters(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium ${'bg-white border-[#C4B5A5] text-[#6B4D30]'}`}
              >
                <Filter size={12} />
                {t('common.filters', 'Filters')}
                {searchTerm && <span className="w-2 h-2 rounded-full bg-[#D7B797]" />}
              </button>
            )}

            <select
              value={viewTarget}
              onChange={(e: any) => { setViewTarget(e.target.value); setCurrentPage(1); }}
              className={`text-xs rounded-lg border px-2.5 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
            >
              {IMPORT_TARGETS.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Desktop search */}
            {!isMobile && (
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e: any) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={t('import.searchRecords', 'Search records...')}
                  className={`w-full text-xs rounded-lg border pl-8 pr-3 py-2 ${inputBg} focus:outline-none focus:ring-1 focus:ring-[#D7B797]`}
                />
              </div>
            )}

            <button
              onClick={() => fetchData({ target: viewTarget, page: currentPage, search: searchTerm })}
              className={`p-2 rounded-lg border transition-colors ${'border-gray-300 hover:bg-gray-50'}`}
            >
              <RefreshCw size={14} className={textSecondary} />
            </button>

            <button
              onClick={() => setConfirmClear(viewTarget)}
              className="p-2 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
              title={t('import.clearAll', 'Clear all data')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Confirm Clear Dialog */}
        {confirmClear && (
          <div className={`rounded-xl border p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 ${'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span className={`text-xs md:text-sm ${'text-red-700'}`}>
                {t('import.confirmClear', 'Clear all records for')} <strong>{confirmClear}</strong>? {t('common.irreversible')}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setConfirmClear(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${'bg-gray-200 text-gray-600'}`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  await clearTarget(confirmClear);
                  setConfirmClear(null);
                  fetchData({ target: viewTarget, page: 1, search: '' });
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          {viewLoading ? (
            <div className={`p-8 text-center ${textSecondary}`}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">{t('common.loading')}...</p>
            </div>
          ) : records.length === 0 ? (
            <div className={`p-8 text-center ${textMuted}`}>
              <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('common.noData')}</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              {isMobile ? (
                <div className="p-2 space-y-2">
                  {records.map((row: any, i: any) => {
                    const displayHeaders = dataHeaders.slice(0, 4);
                    const titleField = dataHeaders[0];
                    const subtitleField = dataHeaders[1];
                    const metricHeaders = displayHeaders.slice(2);

                    return (
                      <MobileDataCard
                        key={row._id || i}
                        title={String(row[titleField] ?? `#${(currentPage - 1) * (viewData.pageSize || 50) + i + 1}`)}
                        subtitle={subtitleField ? String(row[subtitleField] ?? '-') : undefined}
                        metrics={[
                          ...metricHeaders.map((h: any) => ({
                            label: h,
                            value: String(row[h] ?? '-')})),
                          {
                            label: t('import.importedAt', 'Imported At'),
                            value: row._importedAt ? new Date(row._importedAt).toLocaleDateString() : '-'},
                        ]}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={'bg-gray-50'}>
                        <th className={`px-3 py-2 text-left font-semibold ${textSecondary} border-b ${tableBorder}`}>#</th>
                        {dataHeaders.slice(0, 10).map((h: any) => (
                          <th key={h} className={`px-3 py-2 text-left font-semibold ${textSecondary} border-b ${tableBorder}`}>
                            {h}
                          </th>
                        ))}
                        <th className={`px-3 py-2 text-left font-semibold ${textMuted} border-b ${tableBorder}`}>
                          {t('import.importedAt', 'Imported At')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((row, i) => (
                        <tr key={row._id || i} className={`${hoverBg} transition-colors`}>
                          <td className={`px-3 py-1.5 ${textMuted} border-b ${tableBorder}`}>
                            {(currentPage - 1) * (viewData.pageSize || 50) + i + 1}
                          </td>
                          {dataHeaders.slice(0, 10).map((h: any) => (
                            <td key={h} className={`px-3 py-1.5 ${textPrimary} border-b ${tableBorder} max-w-[200px] truncate`}>
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                          <td className={`px-3 py-1.5 ${textMuted} border-b ${tableBorder} whitespace-nowrap`}>
                            {row._importedAt ? new Date(row._importedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className={`px-3 md:px-4 py-2 md:py-3 flex items-center justify-between border-t ${tableBorder}`}>
                <span className={`text-[10px] md:text-xs ${textSecondary}`}>
                  {t('common.of', 'of')} {viewData.total} {t('import.records', 'records')} ({t('import.page', 'page')} {viewData.page}/{viewData.totalPages})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p: any) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${'hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={14} className={textSecondary} />
                  </button>
                  <span className={`text-xs font-medium px-2 ${textPrimary}`}>{currentPage}</span>
                  <button
                    onClick={() => setCurrentPage((p: any) => Math.min(viewData.totalPages, p + 1))}
                    disabled={currentPage >= viewData.totalPages}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${'hover:bg-gray-100'}`}
                  >
                    <ChevronRight size={14} className={textSecondary} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Stats Tab ────────────────────────────────────────────────────
  const renderStatsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(allStats.length > 0 ? allStats : IMPORT_TARGETS.map((it: any) => ({ target: it.value, totalRecords: 0, lastImportAt: null, sessionCount: 0, fieldCounts: {} }))).map((stat: any) => {
          const targetLabel = IMPORT_TARGETS.find((it: any) => it.value === stat.target)?.label || stat.target;
          return (
            <div key={stat.target} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-semibold font-['Montserrat'] ${textPrimary}`}>{targetLabel}</h4>
                {stat.totalRecords > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {stat.totalRecords} records
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className={textSecondary}>{t('import.totalRecords', 'Total Records')}</span>
                  <span className={`font-medium ${textPrimary}`}>{stat.totalRecords}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textSecondary}>{t('import.sessions', 'Sessions')}</span>
                  <span className={`font-medium ${textPrimary}`}>{stat.sessionCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textSecondary}>{t('import.lastImport', 'Last Import')}</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {stat.lastImportAt ? new Date(stat.lastImportAt).toLocaleDateString() : '-'}
                  </span>
                </div>

                {Object.keys(stat.fieldCounts || {}).length > 0 && (
                  <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${'#D1D5DB'}` }}>
                    <p className={`text-[10px] font-medium mb-1 ${textMuted}`}>{t('import.fields', 'Fields')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(stat.fieldCounts).slice(0, 8).map((field: any) => (
                        <span
                          key={field}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${'bg-gray-100 text-gray-600'}`}
                        >
                          {field}
                        </span>
                      ))}
                      {Object.keys(stat.fieldCounts).length > 8 && (
                        <span className={`text-[10px] ${textMuted}`}>+{Object.keys(stat.fieldCounts).length - 8}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {stat.totalRecords > 0 && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setViewTarget(stat.target); setActiveTab('data'); }}
                    className={`flex-1 text-[10px] font-medium py-1.5 rounded-lg transition-colors ${'bg-gray-100 text-[#6B4D30] hover:bg-gray-200'}`}
                  >
                    {t('common.view')}
                  </button>
                  <button
                    onClick={() => setConfirmClear(stat.target)}
                    className="text-[10px] font-medium py-1.5 px-3 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {t('common.clearAll')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global clear confirm */}
      {confirmClear && (
        <div className={`rounded-xl border p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 ${'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className={`text-xs md:text-sm ${'text-red-700'}`}>
              {t('import.confirmClear', 'Clear all records for')} <strong>{confirmClear}</strong>? {t('common.irreversible')}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setConfirmClear(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${'bg-gray-200 text-gray-600'}`}>
              {t('common.cancel')}
            </button>
            <button
              onClick={async () => {
                await clearTarget(confirmClear);
                setConfirmClear(null);
                fetchAllStats();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────
  return (
    <div className={`min-h-screen p-2 md:p-4 ${''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-3 md:mb-4 gap-2 md:gap-3">
        <div>
          <h1 className={`text-base md:text-lg font-bold font-['Montserrat'] ${textPrimary}`}>
            {t('import.title', 'Import Data')}
          </h1>
          <p className={`text-[10px] md:text-xs mt-0.5 ${textSecondary}`}>
            {t('import.subtitle', 'Upload and manage imported data for OTB system')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto ${'bg-white/60 border border-gray-200'}`}>
        {[
          { id: 'upload', label: t('import.upload', 'Upload'), icon: Upload },
          { id: 'data', label: t('import.viewData', 'View Data'), icon: FileSpreadsheet },
          { id: 'stats', label: t('import.statistics', 'Statistics'), icon: ArrowUpDown },
        ].map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ?'bg-white text-[#6B4D30] shadow-sm': `${textSecondary} hover:${'text-gray-700'}`
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && renderUploadTab()}
      {activeTab === 'data' && renderDataTab()}
      {activeTab === 'stats' && renderStatsTab()}

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <MobileFilterSheet
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          title={t('common.filters', 'Filters')}
          filters={[
            {
              key: 'search',
              label: t('import.searchRecords', 'Search Records'),
              type: 'search',
              placeholder: t('import.searchRecords', 'Search records...')},
          ]}
          values={{ search: searchTerm || '' }}
          onApply={(vals: any) => {
            setSearchTerm(vals.search || '');
            setCurrentPage(1);
          }}
          onReset={() => {
            setSearchTerm('');
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
};

export default ImportDataScreen;
