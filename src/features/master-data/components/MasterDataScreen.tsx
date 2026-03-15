'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight,
  Building2, Package, FolderTree, Tag,
  RefreshCw, Filter, X, Eye,
  Store, Users, Calendar, Coins
} from 'lucide-react';
import { masterDataService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileList, MobileSearchBar, PullToRefresh, FilterBottomSheet, useBottomSheet } from '@/components/mobile';
import { ProductImage } from '@/components/ui';

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
    serverSide: true,
    fetchPage: async (params: { page: number; pageSize: number; search?: string }) => {
      // Use raw API call to get both data[] and meta.total
      return masterDataService.getSkuCatalogPaged({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
      });
    },
    columns: [
      { key: 'image_url', label: '', width: '48px', isImage: true },
      { key: 'sku_code', label: t('masterData.colSkuCode'), width: '140px', mono: true },
      { key: 'product_name', label: t('masterData.colProductName') },
      { key: 'sub_category', label: 'Sub Category', width: '150px', render: (_v: any, item: any) => item?.sub_category?.name || '-' },
      { key: 'sub_category', label: 'Brand', width: '140px', render: (_v: any, item: any) => item?.sub_category?.category?.brand?.name || '-' },
      { key: '_actions', label: 'Actions', width: '80px', isActions: true },
    ],
    searchFields: ['sku_code', 'product_name', 'color'],
    clickable: false,
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
  currencies: {
    title: 'Currencies',
    icon: Coins,
    fetchFn: () => masterDataService.getCurrencies(),
    columns: [
      { key: 'currency_code', label: 'Code', width: '100px', mono: true },
      { key: 'currency_name', label: 'Name' },
      { key: 'symbol', label: 'Symbol', width: '80px' },
      { key: 'exchange_rate_to_vnd', label: 'Rate to VND', width: '140px', mono: true, render: (v: any) => v ? Number(v).toLocaleString() : '-' },
      { key: 'created_at', label: 'Created On', width: '140px', render: (v: any) => v ? new Date(v).toLocaleDateString('vi-VN') : '-' },
      { key: 'is_active', label: t('masterData.colStatus'), render: (v: any) => v !== false ? t('common.active') : t('common.inactive'), badge: true },
    ],
    searchFields: ['currency_code', 'currency_name'],
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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  // Server-side pagination state
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const pageSize = 50;

  const TYPE_CONFIG: any = useMemo(() => getTypeConfig(t), [t]);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.brands;
  const Icon = config.icon;
  const isServerSide = !!config.serverSide;

  // Debounce search for server-side mode
  useEffect(() => {
    if (!isServerSide) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, isServerSide]);

  // Server-side fetch
  const fetchServerPage = useCallback(async (page: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.fetchPage({ page, pageSize, search });
      const list = Array.isArray(result) ? result : (result?.data || []);
      const meta = result?.meta;
      setData(list);
      setServerTotal(meta?.total ?? list.length);
    } catch (err: any) {
      console.error('Master data fetch error:', err);
      setError(t('masterData.failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, [config, pageSize, t]);

  // Client-side fetch
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

  // Unified refresh handler
  const handleRefresh = useCallback(() => {
    if (isServerSide) fetchServerPage(currentPage, debouncedSearch);
    else fetchData();
  }, [isServerSide, fetchServerPage, fetchData, currentPage, debouncedSearch]);

  // Trigger fetch on type change
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setDebouncedSearch('');
    if (!isServerSide) fetchData();
  }, [type]);

  // Server-side: fetch when page or debounced search changes
  useEffect(() => {
    if (!isServerSide) return;
    fetchServerPage(currentPage, debouncedSearch);
  }, [isServerSide, currentPage, debouncedSearch]);

  // Client-side filter by search
  const filteredData = useMemo(() => {
    if (isServerSide) return data; // already filtered by server
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item: any) =>
      config.searchFields.some((field: any) => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, config.searchFields, isServerSide]);

  // Pagination
  const totalRecords = isServerSide ? serverTotal : filteredData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedData = useMemo(() => {
    if (isServerSide) return data; // server already returns current page
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, isServerSide, data]);

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
    <div className="flex flex-col h-full min-h-0 gap-3">
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
                {loading ? t('common.loading') : t('masterData.records', { count: totalRecords })}
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
              onClick={handleRefresh}
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
      <div className={`flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden ${'border-[#C4B5A5]'}`} style={{
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
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-[#D7B797] text-[#0A0A0A] rounded-md font-medium text-xs font-['Montserrat'] hover:bg-[#C4A480] transition-colors"
            >
              {t('masterData.tryAgain')}
            </button>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-10 text-center">
            <Icon size={32} className={`mx-auto mb-3 ${'text-[#2E2E2E]/30'}`} />
            <p className={`text-xs font-['Montserrat'] ${'text-[#999999]'}`}>
              {searchTerm ? t('masterData.noResultsFound') : t('masterData.noDataAvailable')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Mobile Card View */}
            {isMobile ? (
              <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-2 overflow-y-auto flex-1 min-h-0">
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
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead>
                    <tr className={'bg-[rgba(160,120,75,0.08)]'}>
                      <th className={`px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] w-10 ${'text-[#999999]'}`}>
                        #
                      </th>
                      {config.columns.map((col: any, ci: number) => (
                        <th
                          key={col.key + ci}
                          className={`px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] ${'text-[#999999]'}`}
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
                        onClick={() => config.clickable && setSelectedItem(item)}
                        className={`border-t transition-colors ${'border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.05)]'} ${config.clickable ? 'cursor-pointer' : ''}`}
                      >
                        <td className={`px-3 py-1.5 text-xs font-['JetBrains_Mono'] ${'text-[#BBBBBB]'}`}>
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        {config.columns.map((col: any, colIdx: number) => {
                          if (col.isImage) {
                            return (
                              <td key={col.key + colIdx} className="px-2 py-1">
                                <ProductImage
                                  subCategory={item.sub_category?.name || ''}
                                  sku={item.sku_code || ''}
                                  imageUrl={item.image_url || ''}
                                  size={40}
                                  rounded="rounded-lg"
                                />
                              </td>
                            );
                          }
                          if (col.isActions) {
                            return (
                              <td key={col.key + colIdx} className="px-3 py-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-['Montserrat'] font-semibold rounded-md bg-[rgba(160,120,75,0.1)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.2)] transition-colors"
                                >
                                  <Eye size={11} />
                                  Detail
                                </button>
                              </td>
                            );
                          }
                          const rawValue = item[col.key];
                          const displayValue = col.render ? col.render(rawValue, item) : (rawValue || '-');

                          return (
                            <td
                              key={col.key + colIdx}
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
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
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
          </div>
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

      {/* SKU Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-[rgba(215,183,151,0.3)]"
            style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.04)]">
              <div className="flex items-center gap-3 min-w-0">
                <Package size={16} className="text-[#6B4D30] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-['Montserrat'] text-[#0A0A0A] truncate">
                    {selectedItem.product_name || selectedItem.sku_code || 'SKU Detail'}
                  </h3>
                  <p className="text-[11px] font-['JetBrains_Mono'] text-[#999999]">{selectedItem.sku_code || ''}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <X size={16} className="text-[#999999]" />
              </button>
            </div>

            {/* Body — image left, info right */}
            <div className="flex" style={{ height: 'calc(min(90vh, 640px) - 57px)' }}>
              {/* Left: image */}
              <div className="w-64 shrink-0 flex flex-col items-center justify-center overflow-hidden bg-[rgba(160,120,75,0.03)] border-r border-[rgba(215,183,151,0.15)] p-6 gap-4">
                <ProductImage
                  subCategory={selectedItem.sub_category?.name || ''}
                  sku={selectedItem.sku_code || ''}
                  imageUrl={selectedItem.image_url || ''}
                  size={180}
                  rounded="rounded-xl"
                />
                <div className="text-center space-y-0.5">
                  <p className="text-[11px] font-['JetBrains_Mono'] font-semibold text-[#6B4D30]">{selectedItem.sku_code}</p>
                  {selectedItem.color && (
                    <p className="text-[10px] font-['Montserrat'] text-[#999999]">{selectedItem.color}</p>
                  )}
                </div>
              </div>

              {/* Right: info */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-2.5">
                  {[
                    { label: 'Product Name', value: selectedItem.product_name },
                    { label: 'Item Code', value: selectedItem.item_code, mono: true },
                    { label: 'Brand', value: selectedItem.sub_category?.category?.brand?.name },
                    { label: 'Gender', value: selectedItem.sub_category?.category?.gender?.name },
                    { label: 'Category', value: selectedItem.sub_category?.category?.name },
                    { label: 'Sub Category', value: selectedItem.sub_category?.name },
                    { label: 'Rail', value: selectedItem.rail },
                    { label: 'Theme', value: selectedItem.theme },
                    { label: 'Color', value: selectedItem.color },
                    { label: 'Composition', value: selectedItem.composition },
                    { label: 'Unit Price', value: selectedItem.unit_price ? formatCurrency(Number(selectedItem.unit_price)) : null, mono: true },
                    { label: 'Unit Cost', value: selectedItem.unit_cost ? formatCurrency(Number(selectedItem.unit_cost)) : null, mono: true },
                  ].filter(row => row.value).map((row) => (
                    <div key={row.label} className="flex items-start gap-2 py-1.5 border-b border-[rgba(215,183,151,0.1)] last:border-0">
                      <span className="text-[10px] font-['Montserrat'] font-medium text-[#AAAAAA] w-24 shrink-0 pt-0.5 uppercase tracking-wide">{row.label}</span>
                      <span className={`text-xs ${row.mono ? "font-['JetBrains_Mono'] font-semibold" : "font-['Montserrat']"} text-[#0A0A0A] break-words`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataScreen;
