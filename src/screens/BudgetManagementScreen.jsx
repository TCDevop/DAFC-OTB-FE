'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronDown, Plus, Search, Table, PieChart, X, Filter, Eye, Split,
  Wallet, CircleCheckBig, Hourglass
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GROUP_BRANDS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { budgetService, masterDataService } from '../services';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Common';
import BudgetAlertsBanner from '../components/BudgetAlertsBanner';
import { useLanguage } from '@/contexts/LanguageContext';

const YEARS = [2023, 2024, 2025, 2026];

// Group Brand Categories (parent level)
const GROUP_BRAND_CATEGORIES = [
  { id: 'A', name: 'Group A' },
  { id: 'B', name: 'Group B' },
  { id: 'C', name: 'Group C' },
];

const CARD_ACCENTS = {
  total:     { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(180,140,95,0.10)', iconDark: 'rgba(215,183,151,0.07)', iconLight: 'rgba(160,120,75,0.08)' },
  allocated: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.06)',  lightGrad: 'rgba(22,120,70,0.08)',  iconDark: 'rgba(42,158,106,0.07)', iconLight: 'rgba(22,120,70,0.07)' },
  remaining: { color: '#E3B341', darkGrad: 'rgba(227,179,65,0.06)',  lightGrad: 'rgba(200,150,30,0.09)', iconDark: 'rgba(227,179,65,0.07)', iconLight: 'rgba(180,130,20,0.07)' },
};

const BudgetManagementScreen = ({
  selectedYear,
  setSelectedYear,
  selectedGroupBrand,
  setSelectedGroupBrand,
  selectedBrand,
  setSelectedBrand,
  onAllocate,
  darkMode = false
}) => {
  const { t } = useLanguage();

  // API state
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Master data for create form
  const [apiBrands, setApiBrands] = useState([]);
  const [apiStores, setApiStores] = useState([]);

  // Fetch budgets from API
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedYear) filters.fiscalYear = selectedYear;
      if (selectedBrand) filters.brandId = selectedBrand;

      const response = await budgetService.getAll(filters);
      // Map API response to UI format
      const budgets = (response.data || response || []).map(budget => ({
        id: budget.id,
        fiscalYear: budget.fiscalYear,
        groupBrand: typeof budget.groupBrand === 'object' ? (budget.groupBrand?.name || budget.groupBrand?.code || 'A') : (budget.groupBrand || 'A'),
        brandId: budget.groupBrandId || budget.brandId,
        brandName: budget.groupBrand?.name || budget.Brand?.name || budget.brandName || 'Unknown',
        totalBudget: Number(budget.totalBudget || budget.totalAmount) || 0,
        budgetName: budget.budgetCode || budget.name || budget.budgetName || 'Untitled',
        status: (budget.status || 'DRAFT').toLowerCase(),
        createdAt: budget.createdAt,
        createdBy: budget.createdBy
      }));
      setBudgetData(budgets);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
      setError(t('budget.failedToLoadBudgets'));
      setBudgetData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedBrand]);

  // Initial fetch
  useEffect(() => {
    fetchBudgets();
    // Fetch master data for create form
    masterDataService.getBrands().then(b => setApiBrands(Array.isArray(b) ? b : [])).catch(() => {});
    masterDataService.getStores().then(s => setApiStores(Array.isArray(s) ? s : [])).catch(() => {});
  }, [fetchBudgets]);

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currency, setCurrency] = useState('VND'); // VND or USD

  // Dropdown states
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [groupBrandDropdownOpen, setGroupBrandDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Form state for create budget
  const [newBudgetForm, setNewBudgetForm] = useState({
    fiscalYear: 2026,
    groupBrand: 'A',
    brandId: '',
    seasonGroup: 'SS',
    seasonType: 'pre',
    name: '',
    totalBudget: '',
    description: ''
  });

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    return budgetData.filter(budget => {
      if (selectedYear && budget.fiscalYear !== selectedYear) return false;
      if (selectedGroupBrand && budget.groupBrand !== selectedGroupBrand) return false;
      if (selectedBrand && budget.brandId !== selectedBrand) return false;
      if (searchQuery && !budget.budgetName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [budgetData, selectedYear, selectedGroupBrand, selectedBrand, searchQuery]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = budgetData.reduce((sum, b) => sum + (Number(b.totalBudget) || 0), 0);
    const approved = budgetData.filter(b => b.status === 'approved').reduce((sum, b) => sum + (Number(b.totalBudget) || 0), 0);
    const pending = budgetData.filter(b => b.status === 'pending').reduce((sum, b) => sum + (Number(b.totalBudget) || 0), 0);
    const draft = budgetData.filter(b => b.status === 'draft').reduce((sum, b) => sum + (Number(b.totalBudget) || 0), 0);

    return {
      total,
      approved,
      pending,
      draft,
      approvedPct: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
      pendingPct: total > 0 ? ((pending / total) * 100).toFixed(1) : 0
    };
  }, [budgetData]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedYear(null);
    setSelectedGroupBrand(null);
    setSelectedBrand(null);
    setSearchQuery('');
  };

  const DetailRow = ({ label, value, strong }) => (
  <div className="flex justify-between gap-4">
    <span className={darkMode ? 'text-[#999999]' : 'text-[#666666]'}>{label}</span>
    <span className={`text-right ${strong ? 'font-semibold text-[#2A9E6A] font-[\'JetBrains_Mono\']' : ''}`}>
      {value}
    </span>
  </div>
);


  const hasActiveFilters = selectedYear || selectedGroupBrand || selectedBrand || searchQuery;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner darkMode={darkMode} size="lg" message={t('budget.loadingBudgets')} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorMessage darkMode={darkMode} message={error} onRetry={fetchBudgets} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Alerts Banner */}
      <BudgetAlertsBanner darkMode={darkMode} />

      {/* Filters Section */}
      <div className={`rounded-xl shadow-sm border p-4 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
          <span className={`text-sm font-medium font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('budget.filters')}</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`ml-auto text-xs font-medium transition-colors ${
                darkMode
                  ? 'text-[#D7B797] hover:text-[#D7B797]/80'
                  : 'text-[#8A6340] hover:text-[#8A6340]/80'
              }`}
            >
              {t('budget.clearAll')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setYearDropdownOpen(!yearDropdownOpen);
                setGroupBrandDropdownOpen(false);
                setBrandDropdownOpen(false);
              }}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 border rounded-lg transition-colors min-w-[140px] ${selectedYear
                ? darkMode
                  ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797]'
                  : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340]'
                : darkMode
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)]'
                  : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(215,183,151,0.4)]'
                }`}
            >
              <span className="text-sm font-medium">{selectedYear ? `FY${selectedYear}` : t('budget.allYears')}</span>
              <ChevronDown size={16} className="opacity-50 shrink-0" />
            </button>
            {yearDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg border py-1 z-20 min-w-[140px] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                <button
                  onClick={() => { setSelectedYear(null); setYearDropdownOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${!selectedYear ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                >
                  {t('budget.allYears')}
                </button>
                {YEARS.map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setYearDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${selectedYear === year ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                  >
                    FY{year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group Brand Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setGroupBrandDropdownOpen(!groupBrandDropdownOpen);
                setYearDropdownOpen(false);
                setBrandDropdownOpen(false);
              }}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 border rounded-lg transition-colors min-w-[150px] ${selectedGroupBrand
                ? darkMode
                  ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797]'
                  : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340]'
                : darkMode
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)]'
                  : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(215,183,151,0.4)]'
                }`}
            >
              <span className="text-sm font-medium">
                {selectedGroupBrand
                  ? GROUP_BRAND_CATEGORIES.find(g => g.id === selectedGroupBrand)?.name
                  : t('budget.allGroupBrands')}
              </span>
              <ChevronDown size={16} className="opacity-50 shrink-0" />
            </button>
            {groupBrandDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg border py-1 z-20 min-w-[150px] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                <button
                  onClick={() => { setSelectedGroupBrand(null); setGroupBrandDropdownOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${!selectedGroupBrand ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                >
                  {t('budget.allGroupBrands')}
                </button>
                {GROUP_BRAND_CATEGORIES.map(group => (
                  <button
                    key={group.id}
                    onClick={() => { setSelectedGroupBrand(group.id); setGroupBrandDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${selectedGroupBrand === group.id ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setBrandDropdownOpen(!brandDropdownOpen);
                setYearDropdownOpen(false);
                setGroupBrandDropdownOpen(false);
              }}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 border rounded-lg transition-colors min-w-[140px] ${selectedBrand
                ? darkMode
                  ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797]'
                  : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340]'
                : darkMode
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)]'
                  : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(215,183,151,0.4)]'
                }`}
            >
              <span className="text-sm font-medium">
                {selectedBrand ? GROUP_BRANDS.find(b => b.id === selectedBrand)?.name : t('budget.allBrands')}
              </span>
              <ChevronDown size={16} className="opacity-50 shrink-0" />
            </button>
            {brandDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg border py-1 z-20 min-w-[140px] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                <button
                  onClick={() => { setSelectedBrand(null); setBrandDropdownOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${!selectedBrand ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                >
                  {t('budget.allBrands')}
                </button>
                {GROUP_BRANDS.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => { setSelectedBrand(brand.id); setBrandDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'} ${selectedBrand === brand.id ? (darkMode ? 'text-[#D7B797] font-medium' : 'text-[#8A6340] font-medium') : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`} />
            <input
              type="text"
              placeholder={t('budget.searchBudgets')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-transparent ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
            />
          </div>

          {/* Currency Toggle */}
          <div className={`flex items-center rounded-lg p-1 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[#F2F2F2]'}`}>
            <button
              onClick={() => setCurrency('VND')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-['JetBrains_Mono'] transition-all ${
                currency === 'VND'
                  ? darkMode
                    ? 'bg-[#D7B797] text-[#0A0A0A] shadow-sm'
                    : 'bg-[#D7B797] text-[#0A0A0A] shadow-sm'
                  : darkMode
                    ? 'text-[#666666] hover:text-[#F2F2F2]'
                    : 'text-[#999999] hover:text-[#0A0A0A]'
              }`}
            >
              VND
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-['JetBrains_Mono'] transition-all ${
                currency === 'USD'
                  ? darkMode
                    ? 'bg-[#127749] text-white shadow-sm'
                    : 'bg-[#127749] text-white shadow-sm'
                  : darkMode
                    ? 'text-[#666666] hover:text-[#F2F2F2]'
                    : 'text-[#999999] hover:text-[#0A0A0A]'
              }`}
            >
              USD
            </button>
          </div>

          {/* View Toggle */}
          {/* <div className={`flex items-center gap-1 rounded-lg p-1 ml-auto ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[#F2F2F2]'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? darkMode ? 'bg-[#2E2E2E] text-[#F2F2F2] shadow-sm' : 'bg-white text-[#0A0A0A] shadow-sm'
                  : darkMode ? 'text-[#999999] hover:text-[#F2F2F2]' : 'text-[#666666] hover:text-[#0A0A0A]'
              }`}
            >
              <Table size={16} />
              Table
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'charts'
                  ? darkMode ? 'bg-[#2E2E2E] text-[#F2F2F2] shadow-sm' : 'bg-white text-[#0A0A0A] shadow-sm'
                  : darkMode ? 'text-[#999999] hover:text-[#F2F2F2]' : 'text-[#666666] hover:text-[#0A0A0A]'
              }`}
            >
              <PieChart size={16} />
              Charts
            </button>
          </div> */}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#127749] text-white rounded-lg hover:bg-[#2A9E6A] transition-colors shadow-sm text-sm font-medium font-['Montserrat']"
          >
            <Plus size={16} />
            {t('budget.createBudget')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Budget Card */}
        <div
          className={`relative overflow-hidden border rounded-2xl shadow-sm p-5 transition-all duration-200 hover:shadow-lg group ${
            darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
          }`}
          style={{
            background: darkMode
              ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.total.darkGrad} 100%)`
              : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.total.lightGrad} 100%)`,
          }}
        >
          <div
            className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
            style={{ opacity: darkMode ? 0.05 : 0.07 }}
          >
            <Wallet size={80} color={CARD_ACCENTS.total.color} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-semibold tracking-wider mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{t('budget.totalBudget')}</p>
                <p className={`text-2xl font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{formatCurrency(summaryStats.total, { currency })}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('budget.allBudgetsCombined')}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: darkMode ? CARD_ACCENTS.total.iconDark : CARD_ACCENTS.total.iconLight }}
              >
                <Wallet size={18} color={CARD_ACCENTS.total.color} />
              </div>
            </div>
          </div>
        </div>

        {/* Allocated Card */}
        <div
          className={`relative overflow-hidden border rounded-2xl shadow-sm p-5 transition-all duration-200 hover:shadow-lg group ${
            darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
          }`}
          style={{
            background: darkMode
              ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.allocated.darkGrad} 100%)`
              : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.allocated.lightGrad} 100%)`,
          }}
        >
          <div
            className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
            style={{ opacity: darkMode ? 0.05 : 0.07 }}
          >
            <CircleCheckBig size={80} color={CARD_ACCENTS.allocated.color} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#127749] tracking-wider mb-2 font-['Montserrat']">{t('budget.allocated')}</p>
                <p className="text-2xl font-bold text-[#2A9E6A] font-['JetBrains_Mono']">{formatCurrency(summaryStats.approved, { currency })}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{summaryStats.approvedPct}% {t('budget.ofTotal')}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: darkMode ? CARD_ACCENTS.allocated.iconDark : CARD_ACCENTS.allocated.iconLight }}
              >
                <CircleCheckBig size={18} color={CARD_ACCENTS.allocated.color} />
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div
          className={`relative overflow-hidden border rounded-2xl shadow-sm p-5 transition-all duration-200 hover:shadow-lg group ${
            darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
          }`}
          style={{
            background: darkMode
              ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.remaining.darkGrad} 100%)`
              : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.remaining.lightGrad} 100%)`,
          }}
        >
          <div
            className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
            style={{ opacity: darkMode ? 0.05 : 0.07 }}
          >
            <Hourglass size={80} color={CARD_ACCENTS.remaining.color} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#E3B341] tracking-wider mb-2 font-['Montserrat']">{t('budget.remaining')}</p>
                <p className="text-2xl font-bold text-[#E3B341] font-['JetBrains_Mono']">{formatCurrency(summaryStats.pending, { currency })}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{summaryStats.pendingPct}% {t('budget.ofTotal')}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: darkMode ? CARD_ACCENTS.remaining.iconDark : CARD_ACCENTS.remaining.iconLight }}
              >
                <Hourglass size={18} color={CARD_ACCENTS.remaining.color} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {viewMode === 'table' && (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
          <table className="w-full">
            <thead className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.18)]'}>
              <tr>
                <th className={`text-left px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('budget.fiscalYear')}
                </th>
                <th className={`text-left px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('budget.groupBrand')}
                </th>
                <th className={`text-left px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('budget.brand')}
                </th>
                <th className={`text-left px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('budget.budgetName')}
                </th>
                <th className={`text-left px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('budget.amount')}
                </th>
                <th className={`text-right px-6 py-4 text-xs font-semibold tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className={darkMode ? 'divide-y divide-[#2E2E2E]' : 'divide-y divide-[#2E2E2E]/10'}>
              {filteredBudgets.map((budget) => (
                <tr
                  key={budget.id}
                  className={`transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'}`}
                >
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>FY{budget.fiscalYear}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-[#2E2E2E] text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#0A0A0A]'}`}>
                      {budget.groupBrand}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{budget.brandName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium cursor-pointer transition-colors ${
                      darkMode
                        ? 'text-[#D7B797] hover:text-[#D7B797]/80 hover:underline'
                        : 'text-[#8A6340] hover:text-[#8A6340]/80 hover:underline'
                    }`}>
                      {budget.budgetName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{formatCurrency(budget.totalBudget, { currency })}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* View */}
                      <button
                        onClick={() => {
                          setSelectedBudget(budget);
                          setShowViewModal(true);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition
                          ${darkMode
                            ? 'text-[#999999] hover:text-[#F2F2F2] hover:bg-[#2E2E2E]'
                            : 'text-[#666666] hover:text-[#0A0A0A] hover:bg-[#F2F2F2]'
                          }`}
                      >
                        <Eye size={14} />
                        {t('budget.view')}
                      </button>

                      {/* Allocate */}
                      <button
                        onClick={() =>
                          onAllocate &&
                          onAllocate({
                            id: budget.id,
                            year: budget.fiscalYear,
                            groupBrand: budget.groupBrand,
                            brandId: budget.brandId,
                            brandName: budget.brandName,
                            totalBudget: budget.totalBudget,
                            budgetName: budget.budgetName,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition
        ${darkMode
                            ? 'bg-[rgba(215,183,151,0.08)] text-[#D7B797] hover:bg-[rgba(160,120,75,0.18)] border border-[rgba(215,183,151,0.25)]'
                            : 'bg-[rgba(160,120,75,0.18)] text-[#8A6340] hover:bg-[rgba(215,183,151,0.25)] border border-[rgba(215,183,151,0.4)]'
                          }`}
                      >
                        <Split size={14} />
                        {t('budget.allocate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBudgets.length === 0 && (
            <div className="py-8">
              <EmptyState
                darkMode={darkMode}
                title={hasActiveFilters ? t('budget.noMatchingBudgets') : t('budget.noBudgetsYet')}
                message={hasActiveFilters
                  ? t('budget.tryAdjustingFilters')
                  : t('budget.createFirstBudget')
                }
                actionLabel={hasActiveFilters ? undefined : t('budget.createBudget')}
                onAction={hasActiveFilters ? undefined : () => setShowCreateModal(true)}
              />
              {hasActiveFilters && (
                <div className="text-center">
                  <button
                    onClick={clearFilters}
                    className={`text-sm font-medium transition-colors ${
                      darkMode
                        ? 'text-[#D7B797] hover:text-[#D7B797]/80'
                        : 'text-[#8A6340] hover:text-[#8A6340]/80'
                    }`}
                  >
                    {t('common.clearAllFilters')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showViewModal && selectedBudget && (
        <div className="fixed inset-0 z-[9999]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowViewModal(false)}
          />

          {/* Modal */}
          <div className="relative flex min-h-screen items-center justify-center p-4">
            <div
              className={`w-full max-w-lg rounded-2xl shadow-xl overflow-hidden
          ${darkMode ? 'bg-[#121212] text-[#F2F2F2]' : 'bg-white text-[#0A0A0A]'}`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between px-6 py-4 border-b
            ${darkMode ? 'border-[#2E2E2E]' : 'border-[#C4B5A5]'}`}
              >
                <h3 className="text-lg font-semibold font-['Montserrat']">{t('budget.budgetDetail')}</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#2E2E2E]' : 'hover:bg-[#F2F2F2]'}`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4 text-sm">
                <DetailRow label={t('budget.fiscalYear')} value={`FY${selectedBudget.fiscalYear}`} />
                <DetailRow label={t('budget.groupBrand')} value={selectedBudget.groupBrand} />
                <DetailRow label={t('budget.brand')} value={selectedBudget.brandName} />
                <DetailRow label={t('budget.budgetName')} value={selectedBudget.budgetName} />
                <DetailRow label={t('budget.createdBy')} value="TC Admin" />
                <DetailRow label={t('budget.createdOn')} value="02/02/2025" />

                <DetailRow
                  label={t('budget.totalBudget')}
                  value={formatCurrency(selectedBudget.totalBudget, { currency })}
                  strong
                />
              </div>

              {/* Footer */}
              <div
                className={`flex justify-end px-6 py-4 border-t
            ${darkMode ? 'border-[#2E2E2E]' : 'border-[#C4B5A5]'}`}
              >
                <button
                  onClick={() => setShowViewModal(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${darkMode
                ? 'bg-[#2E2E2E] hover:bg-[#1A1A1A] text-[#F2F2F2]'
                : 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0A0A0A]'}`}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Charts View Placeholder */}
      {viewMode === 'charts' && (
        <div className={`rounded-xl shadow-sm border p-12 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
          <div className="text-center">
            <PieChart size={48} className={`mx-auto mb-4 ${darkMode ? 'text-[#2E2E2E]' : 'text-[#999999]'}`} />
            <p className={darkMode ? 'text-[#666666]' : 'text-[#999999]'}>{t('common.chartsComingSoon')}</p>
          </div>
        </div>
      )}

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-[#2E2E2E]' : 'border-[#C4B5A5]'}`}>
              <h3 className={`text-lg font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{t('budget.createNewBudget')}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-[#666666] hover:text-[#F2F2F2] hover:bg-[#2E2E2E]' : 'text-[#999999] hover:text-[#0A0A0A] hover:bg-[#F2F2F2]'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-14rem)]">
              {/* Fiscal Year */}
              <div className="grid grid-cols-3 gap-4">
                {/* Fiscal Year */}
                <div>
                  <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {t('budget.fiscalYear')} <span className="text-[#F85149]">{t('common.required')}</span>
                  </label>
                  <select
                    value={newBudgetForm.fiscalYear}
                    onChange={(e) =>
                      setNewBudgetForm({
                        ...newBudgetForm,
                        fiscalYear: parseInt(e.target.value),
                      })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Group Brand */}
                <div>
                  <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {t('budget.groupBrand')} <span className="text-[#F85149]">{t('common.required')}</span>
                  </label>
                  <select
                    value={newBudgetForm.groupBrand}
                    onChange={(e) =>
                      setNewBudgetForm({ ...newBudgetForm, groupBrand: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                  >
                    {GROUP_BRAND_CATEGORIES.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {t('budget.brand')} <span className="text-[#F85149]">{t('common.required')}</span>
                  </label>
                  <select
                    value={newBudgetForm.brandId}
                    onChange={(e) =>
                      setNewBudgetForm({ ...newBudgetForm, brandId: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                  >
                    <option value="">{t('budget.selectBrand')}</option>
                    {apiBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Season Group & Season Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {t('otbAnalysis.seasonGroup')} <span className="text-[#F85149]">{t('common.required')}</span>
                  </label>
                  <select
                    value={newBudgetForm.seasonGroup}
                    onChange={(e) => setNewBudgetForm({ ...newBudgetForm, seasonGroup: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                  >
                    <option value="SS">Spring Summer</option>
                    <option value="FW">Fall Winter</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                    {t('otbAnalysis.season')} <span className="text-[#F85149]">{t('common.required')}</span>
                  </label>
                  <select
                    value={newBudgetForm.seasonType}
                    onChange={(e) => setNewBudgetForm({ ...newBudgetForm, seasonType: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                  >
                    <option value="pre">Pre</option>
                    <option value="main">Main / Show</option>
                  </select>
                </div>
              </div>

              {/* Budget Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                  {t('budget.budgetName')} <span className="text-[#F85149]">{t('common.required')}</span>
                </label>
                <input
                  type="text"
                  value={newBudgetForm.name}
                  onChange={(e) => setNewBudgetForm({ ...newBudgetForm, name: e.target.value })}
                  placeholder={t('budget.enterBudgetName')}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
                />
              </div>

              {/* Total Budget */}
              <div>
                <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                  {t('budget.amountVND')} <span className="text-[#F85149]">{t('common.required')}</span>
                </label>
                <input
                  type="text"
                  value={newBudgetForm.totalBudget}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setNewBudgetForm({ ...newBudgetForm, totalBudget: value });
                  }}
                  placeholder={t('budget.enterTotalBudgetAmount')}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
                />
                {newBudgetForm.totalBudget && (
                  <p className={`text-xs mt-1 font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>
                    {formatCurrency(parseInt(newBudgetForm.totalBudget) || 0, { currency })}
                  </p>
                )}
              </div>



              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                  {t('common.description')}
                </label>
                <textarea
                  value={newBudgetForm.description}
                  onChange={(e) => setNewBudgetForm({ ...newBudgetForm, description: e.target.value })}
                  placeholder={t('budget.enterDescription')}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] resize-none ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
                />
              </div>
            </div>
            <div className={`flex items-center justify-end gap-3 p-6 border-t ${darkMode ? 'border-[#2E2E2E] bg-[#0A0A0A]' : 'border-[#C4B5A5] bg-[#F2F2F2]'} rounded-b-2xl`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBudgetForm({ fiscalYear: 2026, groupBrand: 'A', brandId: apiBrands[0]?.id || '', seasonGroup: 'SS', seasonType: 'pre', name: '', totalBudget: '', description: '' });
                }}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${darkMode ? 'text-[#999999] hover:bg-[#2E2E2E]' : 'text-[#666666] hover:bg-[#E5E5E5]'}`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (!newBudgetForm.totalBudget || !newBudgetForm.brandId) return;

                  setCreating(true);
                  try {
                    const totalAmount = parseInt(newBudgetForm.totalBudget) || 0;
                    if (apiStores.length === 0) {
                      toast.error(t('budget.noStoresAvailable') || 'No stores available');
                      return;
                    }
                    // Split budget equally across all stores
                    const stores = apiStores;
                    const perStore = Math.floor(totalAmount / stores.length);
                    const details = stores.map((store, idx) => ({
                      storeId: store.id,
                      budgetAmount: idx === 0 ? totalAmount - perStore * (stores.length - 1) : perStore,
                    }));

                    await budgetService.create({
                      groupBrandId: newBudgetForm.brandId,
                      seasonGroupId: newBudgetForm.seasonGroup,
                      seasonType: newBudgetForm.seasonType,
                      fiscalYear: newBudgetForm.fiscalYear,
                      comment: newBudgetForm.description || undefined,
                      details,
                    });
                    toast.success(t('budget.budgetCreatedSuccess'));
                    setShowCreateModal(false);
                    setNewBudgetForm({ fiscalYear: 2026, groupBrand: 'A', brandId: apiBrands[0]?.id || '', seasonGroup: 'SS', seasonType: 'pre', name: '', totalBudget: '', description: '' });
                    // Refresh the list
                    fetchBudgets();
                  } catch (err) {
                    console.error('Failed to create budget:', err);
                    toast.error(err.response?.data?.message || t('budget.failedToCreateBudget'));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={!newBudgetForm.totalBudget || !newBudgetForm.name || creating}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
                  !newBudgetForm.totalBudget || !newBudgetForm.name || creating
                    ? 'bg-[#2E2E2E] cursor-not-allowed text-[#666666]'
                    : 'bg-[#127749] hover:bg-[#2A9E6A]'
                }`}
              >
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? t('budget.creating') : t('budget.createBudget')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BudgetManagementScreen;
