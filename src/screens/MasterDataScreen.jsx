'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight,
  Building2, Package, FolderTree, Tag,
  RefreshCw, Filter, X
} from 'lucide-react';
import { masterDataService } from '../services';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../utils';

// Config per master data type (takes t for i18n)
const getTypeConfig = (t) => ({
  brands: {
    title: t('masterData.titleBrands'),
    icon: Building2,
    fetchFn: () => masterDataService.getBrands(),
    columns: [
      { key: 'code', label: t('masterData.colCode'), width: '120px', mono: true },
      { key: 'name', label: t('masterData.colBrandName') },
      { key: 'groupBrand', label: t('masterData.colGroup'), render: (v) => v?.name || v || '-' },
      { key: 'isActive', label: t('masterData.colStatus'), render: (v) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['code', 'name'],
  },
  skus: {
    title: t('masterData.titleSkuCatalog'),
    icon: Package,
    fetchFn: () => masterDataService.getSkuCatalog(),
    columns: [
      { key: 'skuCode', label: t('masterData.colSkuCode'), width: '140px', mono: true },
      { key: 'productName', label: t('masterData.colProductName') },
      { key: 'productType', label: t('masterData.colCategory'), width: '150px' },
      { key: 'color', label: t('masterData.colColor'), width: '120px' },
      { key: 'theme', label: t('masterData.colTheme'), width: '120px' },
      { key: 'srp', label: t('masterData.colSRP'), width: '120px', render: (v) => v ? formatCurrency(v) : '-', mono: true },
    ],
    searchFields: ['skuCode', 'productName', 'color'],
  },
  categories: {
    title: t('masterData.titleCategories'),
    icon: FolderTree,
    fetchFn: () => masterDataService.getCategories(),
    columns: [
      { key: 'code', label: t('masterData.colCode'), width: '120px', mono: true },
      { key: 'name', label: t('masterData.colCategoryName') },
      { key: 'gender', label: t('masterData.colGender'), render: (v) => v?.name || v || '-' },
      { key: 'subCategories', label: t('masterData.colSubCategories'), render: (v) => Array.isArray(v) ? t('masterData.items', { count: v.length }) : '-' },
      { key: 'isActive', label: t('masterData.colStatus'), render: (v) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['code', 'name'],
  },
  subcategories: {
    title: t('masterData.titleSubCategories'),
    icon: Tag,
    fetchFn: () => masterDataService.getSubCategories(),
    columns: [
      { key: 'code', label: t('masterData.colCode'), width: '120px', mono: true },
      { key: 'name', label: t('masterData.colSubCategoryName') },
      { key: 'parent', label: t('masterData.colParentCategory'), render: (v) => v?.name || '-' },
      { key: 'isActive', label: t('masterData.colStatus'), render: (v) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['code', 'name'],
  },
});

const MasterDataScreen = ({ type = 'brands', darkMode = false }) => {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const TYPE_CONFIG = useMemo(() => getTypeConfig(t), [t]);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.brands;
  const Icon = config.icon;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.fetchFn();
      const list = Array.isArray(result) ? result : (result?.data || []);
      setData(list);
    } catch (err) {
      console.error('Master data fetch error:', err);
      setError(t('masterData.failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    fetchData();
  }, [fetchData]);

  // Filter by search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item =>
      config.searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, config.searchFields]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const renderBadge = (value) => {
    const isActive = value === 'Active';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
          : darkMode ? 'bg-[rgba(248,81,73,0.1)] text-[#FF7B72]' : 'bg-red-50 text-red-600'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#2A9E6A]' : 'bg-red-400'}`} />
        {value}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`backdrop-blur-xl rounded-2xl shadow-xl border p-6 ${
        darkMode ? 'bg-[#121212]/95 border-[#2E2E2E]' : 'bg-gradient-to-br from-white to-[rgba(160,120,75,0.12)] border-[#C4B5A5]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-[rgba(215,183,151,0.1)]' : 'bg-[rgba(160,120,75,0.18)]'
            }`}>
              <Icon size={24} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {config.title}
              </h1>
              <p className={`text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                {loading ? t('common.loading') : t('masterData.records', { count: filteredData.length })}
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm font-['Montserrat'] transition-all ${
              darkMode
                ? 'text-[#999999] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)] border border-[#2E2E2E]'
                : 'text-[#666666] hover:text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)] border border-[#C4B5A5]'
            }`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('masterData.refresh')}
          </button>
        </div>
      </div>

      {/* Search / Filter */}
      <div className={`rounded-xl border shadow-sm p-4 ${
        darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
            <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{t('masterData.search')}</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm font-['Montserrat'] transition-all focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${
                darkMode
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]'
                  : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-[#666666] hover:text-[#999999]' : 'text-[#999999] hover:text-[#666666]'}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`rounded-xl border shadow-sm overflow-hidden ${
        darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
      }`}>
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw size={32} className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
            <p className={`text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('masterData.loadingData')}</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-400 mb-4 font-['Montserrat']">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-[#D7B797] text-[#0A0A0A] rounded-lg font-medium text-sm font-['Montserrat'] hover:bg-[#C4A480] transition-colors"
            >
              {t('masterData.tryAgain')}
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center">
            <Icon size={48} className={`mx-auto mb-4 ${darkMode ? 'text-[#2E2E2E]' : 'text-[#2E2E2E]/30'}`} />
            <p className={`text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
              {searchTerm ? t('masterData.noResultsFound') : t('masterData.noDataAvailable')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.12)]'}>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] w-12 ${
                      darkMode ? 'text-[#999999]' : 'text-[#666666]'
                    }`}>
                      #
                    </th>
                    {config.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${
                          darkMode ? 'text-[#999999]' : 'text-[#666666]'
                        }`}
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className={`border-t transition-colors ${
                        darkMode
                          ? 'border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.04)]'
                          : 'border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.06)]'
                      }`}
                    >
                      <td className={`px-4 py-3 text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {config.columns.map((col) => {
                        const rawValue = item[col.key];
                        const displayValue = col.render ? col.render(rawValue, item) : (rawValue || '-');

                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-sm ${
                              col.mono ? "font-['JetBrains_Mono']" : "font-['Montserrat']"
                            } ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                          >
                            {col.badge ? renderBadge(displayValue) : displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${
                darkMode ? 'border-[#2E2E2E]' : 'border-[#D4C8BB]'
              }`}>
                <p className={`text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#999999]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={`px-3 py-1 text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#999999]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'
                    }`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MasterDataScreen;
