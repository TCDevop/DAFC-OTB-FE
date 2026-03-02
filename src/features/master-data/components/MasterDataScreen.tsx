'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight,
  Building2, Package, FolderTree, Tag,
  RefreshCw, Filter, X,
  Store, Users, Calendar
} from 'lucide-react';
import { masterDataService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileList, MobileSearchBar, PullToRefresh, FilterBottomSheet, useBottomSheet } from '@/components/mobile';

// Config per master data type (takes t for i18n)
const getTypeConfig = (t: any) => ({
  brands: {
    title: t('masterData.titleBrands'),
    icon: Building2,
    fetchFn: () => masterDataService.getBrands(),
    columns: [
      { key: 'code', label: t('masterData.colCode'), width: '120px', mono: true },
      { key: 'name', label: t('masterData.colBrandName') },
      { key: 'group_brand', label: t('masterData.colGroup'), render: (v: any) => v?.name || '-' },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['code', 'name'],
  },
  skus: {
    title: t('masterData.titleSkuCatalog'),
    icon: Package,
    fetchFn: async () => {
      const result = await masterDataService.getSkuCatalog();
      return Array.isArray(result) ? result : (result?.data || []);
    },
    columns: [
      { key: 'sku_code', label: t('masterData.colSkuCode'), width: '140px', mono: true },
      { key: 'product_name', label: t('masterData.colProductName') },
      { key: 'sub_category', label: t('masterData.colCategory'), width: '150px', render: (_v: any, item: any) => item?.sub_category?.category?.name || '-' },
      { key: 'brand', label: t('masterData.colBrand'), width: '120px', render: (v: any) => v?.name || '-' },
      { key: 'color', label: t('masterData.colColor'), width: '120px' },
      { key: 'srp', label: t('masterData.colSRP'), width: '120px', render: (v: any) => v ? formatCurrency(v) : '-', mono: true },
    ],
    searchFields: ['sku_code', 'product_name', 'color'],
  },
  categories: {
    title: t('masterData.titleCategories'),
    icon: FolderTree,
    fetchFn: async () => {
      // API returns Gender[] with nested categories — flatten to Category[]
      const genders: any[] = await masterDataService.getCategories();
      const list = Array.isArray(genders) ? genders : [];
      const cats: any[] = [];
      list.forEach((gender: any) => {
        (gender.categories || []).forEach((cat: any) => {
          cats.push({ ...cat, _gender: gender });
        });
      });
      return cats;
    },
    columns: [
      { key: 'name', label: t('masterData.colCategoryName') },
      { key: '_gender', label: t('masterData.colGender'), render: (v: any) => v?.name || '-' },
      { key: 'sub_categories', label: t('masterData.colSubCategories'), render: (v: any) => Array.isArray(v) ? t('masterData.items', { count: v.length }) : '-' },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['name'],
  },
  subcategories: {
    title: t('masterData.titleSubCategories'),
    icon: Tag,
    fetchFn: () => masterDataService.getSubCategoriesDirect(),
    columns: [
      { key: 'name', label: t('masterData.colSubCategoryName') },
      { key: 'category', label: t('masterData.colParentCategory'), render: (v: any) => v?.name || '-' },
      { key: '_gender', label: t('masterData.colGender'), render: (_v: any, item: any) => item?.category?.gender?.name || '-' },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['name'],
  },
  stores: {
    title: t('masterData.titleStores'),
    icon: Store,
    fetchFn: () => masterDataService.getStores(),
    columns: [
      { key: 'code', label: t('masterData.colCode'), width: '120px', mono: true },
      { key: 'name', label: t('masterData.colStoreName') },
      { key: 'region', label: t('masterData.colRegion'), width: '150px' },
      { key: 'location', label: t('masterData.colLocation') },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['code', 'name', 'region'],
  },
  genders: {
    title: t('masterData.titleGenders'),
    icon: Users,
    fetchFn: () => masterDataService.getGenders(),
    columns: [
      { key: 'name', label: t('masterData.colGenderName') },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['name'],
  },
  'season-groups': {
    title: t('masterData.titleSeasonGroups'),
    icon: Calendar,
    fetchFn: () => masterDataService.getSeasonGroups(),
    columns: [
      { key: 'name', label: t('masterData.colSeasonGroupName') },
      { key: 'year', label: t('masterData.colYear'), width: '100px', mono: true },
      { key: 'seasons', label: t('masterData.colSeasons'), render: (v: any) => Array.isArray(v) ? v.map((s: any) => s.name).join(', ') || '-' : '-' },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['name'],
  },
});

const MasterDataScreen = ({ type = 'brands' }: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { isOpen: searchOpen, open: openSearch, close: closeSearch } = useBottomSheet();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const TYPE_CONFIG: any = useMemo(() => getTypeConfig(t), [t]);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.brands;
  const Icon = config.icon;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.fetchFn();
      const list = Array.isArray(result) ? result : (result?.data || []);
      setData(list);
    } catch (err: any) {
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
    return data.filter((item: any) =>
      config.searchFields.some((field: any) => {
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

  const activeLabel = t('common.active');
  const renderBadge = (value: any) => {
    const isActive = value === activeLabel || value === 'Active';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]' : 'bg-red-50 text-red-600'}`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#2A9E6A]' : 'bg-red-400'}`} />
        {value}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header + Search - Merged compact */}
      <div className={`rounded-lg border overflow-hidden ${'border-[#C4B5A5]'}`} style={{
        background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.05) 35%, rgba(215,183,151,0.14) 100%)',
        boxShadow: `inset 0 -1px 0 ${'rgba(215,183,151,0.08)'}`}}>
        <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background:'linear-gradient(135deg, rgba(160,120,75,0.12) 0%, rgba(160,120,75,0.22) 100%)'}}>
              <Icon size={14} className={'text-[#6B4D30]'} style={undefined} />
            </div>
            <div>
              <h1 className={`text-sm font-bold font-['Montserrat'] leading-tight ${'text-[#0A0A0A]'}`}>
                {config.title}
              </h1>
              <p className={`text-[10px] font-['JetBrains_Mono'] ${'text-[#999999]'}`}>
                {loading ? t('common.loading') : t('masterData.records', { count: filteredData.length })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            {isMobile && (
              <button
                onClick={openSearch}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium ${'bg-white border-[#C4B5A5] text-[#6B4D30]'}`}
              >
                <Search size={12} />
                {t('masterData.search')}
                {searchTerm && <span className="w-2 h-2 rounded-full bg-[#D7B797]" />}
              </button>
            )}

            {/* Desktop Inline Search */}
            {!isMobile && (
              <div className="relative">
                <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${'text-[#999999]'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e: any) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={`${t('masterData.search')} ${config.title.toLowerCase()}...`}
                  className={`w-56 pl-8 pr-7 py-1 border rounded-md text-xs font-['Montserrat'] transition-all focus:outline-none focus:ring-1 focus:ring-[#D7B797] ${'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${'text-[#999999] hover:text-[#666666]'}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs font-['Montserrat'] transition-all ${'text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)] border border-[#C4B5A5]'}`}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {!isMobile && t('masterData.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`rounded-lg border overflow-hidden ${'border-[#C4B5A5]'}`} style={{
        background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)'}}>
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw size={24} className={`animate-spin mx-auto mb-3 ${'text-[#6B4D30]'}`} />
            <p className={`text-xs font-['Montserrat'] ${'text-[#999999]'}`}>{t('masterData.loadingData')}</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-red-400 mb-3 text-xs font-['Montserrat']">{error}</p>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-[#D7B797] text-[#0A0A0A] rounded-md font-medium text-xs font-['Montserrat'] hover:bg-[#C4A480] transition-colors"
            >
              {t('masterData.tryAgain')}
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-10 text-center">
            <Icon size={32} className={`mx-auto mb-3 ${'text-[#2E2E2E]/30'}`} />
            <p className={`text-xs font-['Montserrat'] ${'text-[#999999]'}`}>
              {searchTerm ? t('masterData.noResultsFound') : t('masterData.noDataAvailable')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            {isMobile ? (
              <PullToRefresh onRefresh={fetchData}>
                <div className="p-2">
                  {/* Mobile Search Bar */}
                  <div className="mb-3">
                    <MobileSearchBar
                      value={searchTerm}
                      onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                      placeholder={`${t('masterData.search')} ${config.title.toLowerCase()}...`}
                    />
                  </div>
                  <MobileList
                    items={paginatedData.map((item: any, index: any) => {
                      const firstCol = config.columns[0];
                      const titleValue = firstCol?.render ? firstCol.render(item[firstCol.key], item) : (item[firstCol.key] || '-');
                      const secondCol = config.columns[1];
                      const subtitleValue = secondCol?.render ? secondCol.render(item[secondCol.key], item) : (item[secondCol.key] || '-');
                      const statusCol = config.columns.find((c: any) => c.badge);
                      const statusValue = statusCol ? (statusCol.render ? statusCol.render(item[statusCol.key], item) : (item[statusCol.key] || '-')) : null;
                      const metricCols = config.columns.filter((c: any) => c !== firstCol && c !== secondCol && !c.badge);

                      return {
                        id: String(item.id || index),
                        avatar: String(titleValue).substring(0, 2).toUpperCase(),
                        title: String(titleValue),
                        subtitle: String(subtitleValue),
                        status: statusValue ? {
                          text: String(statusValue),
                          variant: (statusValue === t('common.active') ? 'success' : 'error') as any} : undefined,
                        details: metricCols.map((col: any) => ({
                          label: col.label,
                          value: String(col.render ? col.render(item[col.key], item) : (item[col.key] || '-'))}))};
                    })}
                    expandable
                    emptyMessage={searchTerm ? t('masterData.noResultsFound') : t('masterData.noDataAvailable')}
                  />
                </div>
              </PullToRefresh>
            ) : (
              /* Desktop Table View */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={'bg-[rgba(160,120,75,0.08)]'}>
                      <th className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] w-10 ${'text-[#999999]'}`}>
                        #
                      </th>
                      {config.columns.map((col: any) => (
                        <th
                          key={col.key}
                          className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#999999]'}`}
                          style={{ width: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item: any, index: any) => (
                      <tr
                        key={item.id || index}
                        className={`border-t transition-colors ${'border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.05)]'}`}
                      >
                        <td className={`px-3 py-1.5 text-xs font-['JetBrains_Mono'] ${'text-[#BBBBBB]'}`}>
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        {config.columns.map((col: any) => {
                          const rawValue = item[col.key];
                          const displayValue = col.render ? col.render(rawValue, item) : (rawValue || '-');

                          return (
                            <td
                              key={col.key}
                              className={`px-3 py-1.5 text-xs ${
                                col.mono ? "font-['JetBrains_Mono']" : "font-['Montserrat']"
                              } ${'text-[#0A0A0A]'}`}
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
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-3 py-1.5 border-t ${'border-[#D4C8BB]'}`}>
                <p className={`text-[10px] font-['JetBrains_Mono'] ${'text-[#999999]'}`}>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${'hover:bg-[rgba(160,120,75,0.12)] text-[#666666]'}`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className={`px-2 py-0.5 text-[10px] font-['JetBrains_Mono'] ${'text-[#0A0A0A]'}`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${'hover:bg-[rgba(160,120,75,0.12)] text-[#666666]'}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Search Bottom Sheet */}
      <FilterBottomSheet
        isOpen={searchOpen}
        onClose={closeSearch}
        filters={[]}
        values={{}}
        onChange={() => {}}
        onApply={() => { closeSearch(); }}
        onReset={() => { setSearchTerm(''); setCurrentPage(1); closeSearch(); }}
      />
    </div>
  );
};

export default MasterDataScreen;
