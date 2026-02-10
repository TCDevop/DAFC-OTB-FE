'use client';

import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import {
  DollarSign, Sparkles, Filter, Clock, ChevronDown, Check,
  ChevronRight, TrendingUp, Sun, Snowflake,
  Star, Layers, Tag, FileText, X, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils';
import { SEASON_GROUPS, STORES, SEASON_CONFIG } from '../utils/constants';
import { budgetService, masterDataService, planningService } from '../services';
import { useLanguage } from '@/contexts/LanguageContext';

// Constants - same as BudgetManagementScreen
const YEARS = [2023, 2024, 2025, 2026];

const GROUP_BRAND_CATEGORIES = [
  { id: 'A', name: 'Group A', color: 'from-[#D7B797] to-[#8A6340]' },
  { id: 'B', name: 'Group B', color: 'from-[#127749] to-[#0d5a37]' },
  { id: 'C', name: 'Group C', color: 'from-[#2A9E6A] to-[#127749]' },
];


const BudgetAllocateScreen = ({
  budgets,
  plannings,
  getPlanningStatus,
  handleOpenPlanningDetail,
  onOpenOtbAnalysis,
  allocationData,
  onAllocationDataUsed,
  availableBudgets: propAvailableBudgets,
  darkMode = false
}) => {
  const { t } = useLanguage();
  // API state for fetching budgets and brands
  const [apiBudgets, setApiBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [brandList, setBrandList] = useState([]);

  // Fetch brands from API
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brands = await masterDataService.getBrands();
        const list = Array.isArray(brands) ? brands : (brands?.data || []);
        setBrandList(list.map(b => ({
          id: b.id || b.brandId,
          groupBrandId: b.groupBrandId || b.groupBrand || 'A',
          name: b.name || b.brandName
        })));
      } catch (err) {
        console.error('Failed to fetch brands:', err);
        setBrandList([]);
      }
    };
    fetchBrands();
  }, []);

  // Fetch budgets on mount (with Strict Mode ignore pattern)
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoadingBudgets(true);
      try {
        const response = await budgetService.getAll({ status: 'APPROVED' });
        if (ignore) return;
        const budgetList = (response.data || response || []).map(budget => ({
          id: budget.id,
          fiscalYear: budget.fiscalYear,
          groupBrand: typeof budget.groupBrand === 'object' ? (budget.groupBrand?.name || budget.groupBrand?.code || 'A') : (budget.groupBrand || 'A'),
          brandId: budget.brandId,
          brandName: budget.Brand?.name || budget.groupBrand?.name || budget.brandName || 'Unknown',
          totalBudget: budget.totalAmount || budget.totalBudget || 0,
          budgetName: budget.budgetCode || budget.name || budget.budgetName || 'Untitled',
          status: (budget.status || 'DRAFT').toLowerCase()
        }));
        setApiBudgets(budgetList);
      } catch (err) {
        if (!ignore) {
          console.error('Failed to fetch budgets:', err);
        }
      } finally {
        if (!ignore) setLoadingBudgets(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  // Available budgets for dropdown selection - prefer API data
  const availableBudgets = apiBudgets.length > 0 ? apiBudgets : (propAvailableBudgets || []);
  // Filter states - all single choice
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedGroupBrand, setSelectedGroupBrand] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedSeasonGroup, setSelectedSeasonGroup] = useState(null); // null means "All Seasons"
  // Budget info from allocation
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [totalBudget, setTotalBudget] = useState(0);

  // Budget name dropdown state
  const [isBudgetNameDropdownOpen, setIsBudgetNameDropdownOpen] = useState(false);

  // Store allocation data locally to survive the race condition with API fetch
  const [pendingAllocation, setPendingAllocation] = useState(null);
  const [fallbackBudgetName, setFallbackBudgetName] = useState(null);

  // Collapse states for table sections
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedBrands, setCollapsedBrands] = useState({});

  // Editable allocation values state
  // Structure: { 'brandId-seasonGroup-subSeason': { rex: number, ttp: number } }
  const [allocationValues, setAllocationValues] = useState({});

  // Track which cell is currently being edited (for showing raw value)
  const [editingCell, setEditingCell] = useState(null); // 'brandId-seasonGroup-subSeason-field'

  // Season totals editable state (for season header rows)
  // Structure: { 'brandId-seasonGroup': { rex: number, ttp: number } }
  const [seasonTotalValues, setSeasonTotalValues] = useState({});

  // Brand totals editable state (for total row)
  // Structure: { 'brandId': { rex: number, ttp: number } }
  const [brandTotalValues, setBrandTotalValues] = useState({});

  // Dropdown states
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isGroupBrandDropdownOpen, setIsGroupBrandDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  // Refs
  const budgetNameDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const groupBrandDropdownRef = useRef(null);
  const brandDropdownRef = useRef(null);
  const seasonDropdownRef = useRef(null);
  const versionDropdownRef = useRef(null);
  // Get brands filtered by selected group brand
  const filteredBrands = useMemo(() => {
    if (!selectedGroupBrand) return brandList;
    return brandList.filter(b => b.groupBrandId === selectedGroupBrand);
  }, [selectedGroupBrand]);

  // Track if we just applied allocation data to prevent reset (using ref for synchronous access)
  const appliedAllocationRef = useRef(false);

  // Reset brand selection when group brand changes (only if not from allocation)
  useEffect(() => {
    if (!appliedAllocationRef.current) {
      setSelectedBrand(null);
    } else {
      // Reset the flag after the brand has been set
      appliedAllocationRef.current = false;
    }
  }, [selectedGroupBrand]);

  // Handle allocation data from Budget Management page
  useEffect(() => {
    if (allocationData) {
      // Store locally so it survives clearing
      setPendingAllocation(allocationData);
      setFallbackBudgetName(allocationData.budgetName);

      // Mark that we're applying allocation data (synchronously)
      appliedAllocationRef.current = true;

      // Set filters from allocation data
      if (allocationData.year) setSelectedYear(allocationData.year);
      if (allocationData.groupBrand) setSelectedGroupBrand(allocationData.groupBrand);
      if (allocationData.totalBudget) setTotalBudget(allocationData.totalBudget);

      // Set budget ID directly if available
      if (allocationData.id) {
        setSelectedBudgetId(allocationData.id);
      }

      // Find and set brand
      if (allocationData.brandName && allocationData.groupBrand) {
        const matchingBrand = brandList.find(
          b => b.groupBrandId === allocationData.groupBrand && b.name === allocationData.brandName
        );
        if (matchingBrand) setSelectedBrand(matchingBrand.id);
      }

      // Clear allocation data from context
      if (onAllocationDataUsed) onAllocationDataUsed();
    }
  }, [allocationData, onAllocationDataUsed]);

  // When availableBudgets load and we have pending allocation, try to match
  useEffect(() => {
    if (pendingAllocation && availableBudgets.length > 0) {
      // Match by ID first, then by name
      const match = pendingAllocation.id
        ? availableBudgets.find(b => b.id === pendingAllocation.id)
        : availableBudgets.find(
            b => b.budgetName === pendingAllocation.budgetName &&
              b.fiscalYear === pendingAllocation.year &&
              b.groupBrand === pendingAllocation.groupBrand
          );

      if (match) {
        setSelectedBudgetId(match.id);
        setTotalBudget(match.totalBudget || pendingAllocation.totalBudget);
        // Keep fallbackBudgetName as a reliable backup - don't clear it
      }
      setPendingAllocation(null);
    }
  }, [pendingAllocation, availableBudgets]);

  // Get selected budget object
  const selectedBudget = availableBudgets.find(b => b.id === selectedBudgetId);

  // Fetch planning versions when budget is selected
  useEffect(() => {
    const fetchVersions = async () => {
      if (!selectedBudgetId) {
        setVersions([]);
        setSelectedVersionId(null);
        return;
      }
      setLoadingVersions(true);
      try {
        const response = await planningService.getAll({ budgetId: selectedBudgetId });
        const list = Array.isArray(response) ? response : (response?.data || []);
        setVersions(list.map(v => ({
          id: v.id,
          name: v.name || v.versionName || `Version ${v.versionNumber || v.id}`,
          status: v.status || 'DRAFT',
          isFinal: v.isFinal || v.status === 'FINAL' || false,
          versionNumber: v.versionNumber
        })));
        // Auto-select the final version if one exists
        const finalVersion = list.find(v => v.isFinal || v.status === 'FINAL');
        if (finalVersion) {
          setSelectedVersionId(finalVersion.id);
        } else {
          setSelectedVersionId(null);
        }
      } catch (err) {
        console.error('Failed to fetch planning versions:', err);
        setVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    };
    fetchVersions();
  }, [selectedBudgetId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (budgetNameDropdownRef.current && !budgetNameDropdownRef.current.contains(event.target)) {
        setIsBudgetNameDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
      if (groupBrandDropdownRef.current && !groupBrandDropdownRef.current.contains(event.target)) {
        setIsGroupBrandDropdownOpen(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
        setIsBrandDropdownOpen(false);
      }
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setIsSeasonDropdownOpen(false);
      }
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(event.target)) {
        setIsVersionDropdownOpen(false);
      }
};
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate store percentages from budgets
  const storePercentages = useMemo(() => {
    const totalByStore = {};
    let grandTotal = 0;

    STORES.forEach(store => {
      totalByStore[store.id] = 0;
    });

    budgets.forEach(budget => {
      if (budget.fiscalYear === selectedYear) {
        budget.details?.forEach(detail => {
          if (totalByStore[detail.storeId] !== undefined) {
            totalByStore[detail.storeId] += detail.budgetAmount;
            grandTotal += detail.budgetAmount;
          }
        });
      }
    });

    const percentages = {};
    STORES.forEach(store => {
      percentages[store.id] = grandTotal > 0 ? Math.round((totalByStore[store.id] / grandTotal) * 100) : 50;
    });

    return percentages;
  }, [budgets, selectedYear]);

  // Get allocation key for state
  const getAllocationKey = (brandId, seasonGroup, subSeason) => {
    return `${brandId}-${seasonGroup}-${subSeason}`;
  };

  // Handle allocation input change
  const handleAllocationChange = (brandId, seasonGroup, subSeason, field, value) => {
    const key = getAllocationKey(brandId, seasonGroup, subSeason);
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;

    setAllocationValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: numValue
      }
    }));
  };

  // Handle season total input change
  const handleSeasonTotalChange = (brandId, seasonGroup, field, value) => {
    const key = `${brandId}-${seasonGroup}`;
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;

    setSeasonTotalValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: numValue
      }
    }));
  };

  // Handle brand total input change
  const handleBrandTotalChange = (brandId, field, value) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;

    setBrandTotalValues(prev => ({
      ...prev,
      [brandId]: {
        ...prev[brandId],
        [field]: numValue
      }
    }));
  };

  // Get season total value (from state or calculated)
  const getSeasonTotalValue = (brandId, seasonGroup, field) => {
    const key = `${brandId}-${seasonGroup}`;
    if (seasonTotalValues[key]?.[field] !== undefined) {
      return seasonTotalValues[key][field];
    }
    return getSeasonTotals(brandId, seasonGroup)[field];
  };

  // Get brand total value (from state or calculated)
  const getBrandTotalValue = (brandId, field) => {
    if (brandTotalValues[brandId]?.[field] !== undefined) {
      return brandTotalValues[brandId][field];
    }
    return getBrandTotals(brandId)[field];
  };

  // Get budget data for a specific brand, season group, and sub-season
  const getBudgetData = (brandId, seasonGroupId, subSeason) => {
    const seasonType = subSeason === 'Pre' ? 'pre' : 'main';
    const seasonId = `${seasonGroupId}_${seasonType}_${selectedYear}`;

    const budget = budgets.find(b =>
      b.groupBrandId === brandId &&
      b.seasonId === seasonId &&
      b.fiscalYear === selectedYear
    );

    // Get values from allocation state first, then fall back to budget data
    const key = getAllocationKey(brandId, seasonGroupId, subSeason);
    const allocatedRex = allocationValues[key]?.rex;
    const allocatedTtp = allocationValues[key]?.ttp;

    if (!budget && allocatedRex === undefined && allocatedTtp === undefined) {
      return { rex: 0, ttp: 0, sum: 0, budget: null };
    }

    const rexDetail = budget?.details?.find(d => d.storeId === 'rex');
    const ttpDetail = budget?.details?.find(d => d.storeId === 'ttp');

    const rex = allocatedRex !== undefined ? allocatedRex : (rexDetail?.budgetAmount || 0);
    const ttp = allocatedTtp !== undefined ? allocatedTtp : (ttpDetail?.budgetAmount || 0);

    return {
      rex,
      ttp,
      sum: rex + ttp,
      budget
    };
  };

  // Get season totals for a brand
  const getSeasonTotals = (brandId, seasonGroupId) => {
    let rex = 0, ttp = 0, sum = 0;

    SEASON_CONFIG[seasonGroupId]?.subSeasons.forEach(subSeason => {
      const data = getBudgetData(brandId, seasonGroupId, subSeason);
      rex += data.rex;
      ttp += data.ttp;
      sum += data.sum;
    });

    return { rex, ttp, sum };
  };

  // Get brand totals (handles All Seasons when selectedSeasonGroup is null)
  const getBrandTotals = (brandId) => {
    if (selectedSeasonGroup) {
      return getSeasonTotals(brandId, selectedSeasonGroup);
    }
    // Sum totals from all season groups
    let rex = 0, ttp = 0, sum = 0;
    SEASON_GROUPS.forEach(sg => {
      const totals = getSeasonTotals(brandId, sg);
      rex += totals.rex;
      ttp += totals.ttp;
      sum += totals.sum;
    });
    return { rex, ttp, sum };
  };

  // Calculate mix percentage
  const calculateMix = (value, brandId) => {
    const brandTotals = getBrandTotals(brandId);
    if (brandTotals.sum === 0) return 0;
    return Math.round((value / brandTotals.sum) * 100);
  };

  // Toggle group collapse
  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Toggle brand collapse
  const toggleBrandCollapse = (brandId) => {
    setCollapsedBrands(prev => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  // Get brands to display based on filters
  const displayBrands = useMemo(() => {
    if (selectedBrand) {
      return brandList.filter(b => b.id === selectedBrand);
    }
    if (selectedGroupBrand) {
      return brandList.filter(b => b.groupBrandId === selectedGroupBrand);
    }
    return brandList;
  }, [selectedBrand, selectedGroupBrand]);

  // Get groups to display based on filters
  const displayGroups = useMemo(() => {
    if (selectedGroupBrand) {
      return GROUP_BRAND_CATEGORIES.filter(g => g.id === selectedGroupBrand);
    }
    return GROUP_BRAND_CATEGORIES;
  }, [selectedGroupBrand]);

  // Handle budget selection from dropdown - auto-populate other filters
  const handleBudgetSelect = (budget) => {
    if (!budget) {
      setSelectedBudgetId(null);
      setTotalBudget(0);
      setFallbackBudgetName(null);
      return;
    }

    appliedAllocationRef.current = true;
    setSelectedBudgetId(budget.id);
    setTotalBudget(budget.totalBudget);
    setFallbackBudgetName(budget.budgetName);

    // Auto-set other filters based on selected budget
    if (budget.fiscalYear) setSelectedYear(budget.fiscalYear);
    if (budget.groupBrand) setSelectedGroupBrand(budget.groupBrand);

    // Find matching brand
    if (budget.brandName && budget.groupBrand) {
      const matchingBrand = brandList.find(
        b => b.groupBrandId === budget.groupBrand && b.name === budget.brandName
      );
      if (matchingBrand) {
        setSelectedBrand(matchingBrand.id);
      }
    }

    setIsBudgetNameDropdownOpen(false);
  };

  // Clear budget selection
  const clearBudgetSelection = () => {
    setSelectedBudgetId(null);
    setTotalBudget(0);
    setSelectedVersionId(null);
    setVersions([]);
    setFallbackBudgetName(null);
  };

  // Handle set version as final
  const handleSetFinalVersion = async (versionId, e) => {
    e.stopPropagation();
    try {
      await planningService.finalize(versionId);
      toast.success(t('planning.latestVersion'));
      setVersions(prev => prev.map(v => ({
        ...v,
        isFinal: v.id === versionId
      })));
      setSelectedVersionId(versionId);
    } catch (err) {
      console.error('Failed to set version as final:', err);
      toast.error(t('approval.failedToSave'));
    }
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  // Get selected group brand object
  const selectedGroupBrandObj = GROUP_BRAND_CATEGORIES.find(b => b.id === selectedGroupBrand);
  const selectedBrandObj = brandList.find(b => b.id === selectedBrand);
  return (
    <>
      {/* Header Section */}
      <div className={`backdrop-blur-xl rounded-2xl shadow-xl border p-6 mb-6 relative z-[100] ${darkMode ? 'bg-[#121212]/95 border-[#2E2E2E]' : 'bg-gradient-to-br from-white to-[rgba(215,183,151,0.1)] border-[#C4B5A5]'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[rgba(215,183,151,0.15)] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[rgba(215,183,151,0.15)] to-transparent rounded-full blur-3xl"></div>

        <div className="relative">
          {/* Filter Section - Redesigned */}
          <div className={`rounded-xl border shadow-sm ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
            {/* Filter Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'bg-[#1A1A1A]/50 border-[#2E2E2E]' : 'bg-gradient-to-r from-[rgba(215,183,151,0.05)] to-[rgba(215,183,151,0.1)] border-[#C4B5A5]'}`}>
              <div className="flex items-center gap-2">
                <Filter size={16} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{t('common.filters')}</span>
              </div>
              {(selectedBudgetId || selectedGroupBrand || selectedBrand || selectedVersionId) && (
                <button
                  onClick={() => {
                    clearBudgetSelection();
                    setSelectedGroupBrand(null);
                    setSelectedBrand(null);
                    setSelectedVersionId(null);
                    setVersions([]);
                  }}
                  className={`flex items-center gap-1 text-xs transition-colors ${darkMode ? 'text-[#999999] hover:text-[#D7B797]' : 'text-[#666666] hover:text-[#8A6340]'}`}
                >
                  <X size={12} />
                  {t('common.clearAllFilters')}
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="p-4 relative z-[100]">
              <div className="flex flex-wrap items-end gap-3">
                {/* Budget Name Dropdown */}
                <div className="relative min-w-[200px]" ref={budgetNameDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('budget.budgetName')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBudgetNameDropdownOpen(!isBudgetNameDropdownOpen);
                      setIsYearDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${selectedBudget
                      ? darkMode
                        ? 'bg-[rgba(18,119,73,0.15)] border-[#127749] text-[#2A9E6A] hover:border-[#2A9E6A]'
                        : 'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749] hover:border-[#2A9E6A]'
                      : darkMode
                        ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                        : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className={selectedBudget ? 'text-[#127749]' : darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                      <span className="truncate">{selectedBudget?.budgetName || fallbackBudgetName || t('planning.selectBudget')}</span>
                    </div>
                    <ChevronDown size={16} className={`flex-shrink-0 transition-transform duration-200 ${isBudgetNameDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isBudgetNameDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-xl shadow-xl z-[9999] overflow-hidden min-w-[300px] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      <div className={`p-2 border-b ${darkMode ? 'border-[#2E2E2E] bg-[#121212]' : 'border-[#D4C8BB] bg-[rgba(160,120,75,0.08)]'}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wide font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('budget.title')}</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto py-1">
                        {/* Loading state */}
                        {loadingBudgets && (
                          <div className="px-4 py-6 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
                            <span className={`ml-2 text-sm ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.loading')}...</span>
                          </div>
                        )}
                        {/* Empty state */}
                        {!loadingBudgets && availableBudgets.length === 0 && (
                          <div className={`px-4 py-6 text-center text-sm ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                            {t('budget.noMatchingBudgets')}
                          </div>
                        )}
                        {/* Clear Selection Option */}
                        {!loadingBudgets && availableBudgets.length > 0 && (
                        <div
                          onClick={() => handleBudgetSelect(null)}
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${!selectedBudgetId
                            ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#999999]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'
                            }`}
                        >
                          <span className="font-medium">{t('planning.selectBudget')}</span>
                          {!selectedBudgetId && <Check size={14} className="text-[#127749]" />}
                        </div>
                        )}
                        {!loadingBudgets && availableBudgets.map((budget) => (
                          <div
                            key={budget.id}
                            onClick={() => handleBudgetSelect(budget)}
                            className={`px-4 py-3 cursor-pointer transition-colors border-t ${darkMode ? 'border-[#2E2E2E]/50' : 'border-[#D4C8BB]'} ${selectedBudgetId === budget.id
                              ? darkMode ? 'bg-[rgba(18,119,73,0.15)]' : 'bg-[rgba(18,119,73,0.1)]'
                              : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-sm font-['Montserrat'] ${selectedBudgetId === budget.id ? 'text-[#127749]' : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                                  {budget.budgetName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>FY{budget.fiscalYear}</span>
                                  <span className={darkMode ? 'text-[#2E2E2E]' : 'text-[#2E2E2E]/30'}>•</span>
                                  <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{budget.brandName}</span>
                                  <span className={darkMode ? 'text-[#2E2E2E]' : 'text-[#2E2E2E]/30'}>•</span>
                                  <span className="text-xs font-medium font-['JetBrains_Mono'] text-[#127749]">{formatCurrency(budget.totalBudget)}</span>
                                </div>
                              </div>
                              {selectedBudgetId === budget.id && (
                                <div className="w-5 h-5 rounded-full bg-[#127749] flex items-center justify-center flex-shrink-0 ml-2">
                                  <Check size={12} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Show message when no budgets available after loading */}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className={`h-10 w-px hidden sm:block ${darkMode ? 'bg-[#2E2E2E]' : 'bg-[#2E2E2E]/20'}`}></div>

                {/* Year Filter */}
                <div className="relative min-w-[120px]" ref={yearDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('budget.fiscalYear')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearDropdownOpen(!isYearDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${darkMode
                      ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                      : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                      <span className="font-['JetBrains_Mono']">FY {selectedYear}</span>
                    </div>
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isYearDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      {YEARS.map((year) => (
                        <div
                          key={year}
                          onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false); }}
                          className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedYear === year
                            ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                            }`}
                        >
                          <span className="font-medium font-['JetBrains_Mono']">FY {year}</span>
                          {selectedYear === year && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Brand Filter */}
                <div className="relative min-w-[140px]" ref={groupBrandDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('budget.groupBrand')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupBrandDropdownOpen(!isGroupBrandDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${selectedGroupBrand
                      ? darkMode
                        ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:border-[rgba(215,183,151,0.4)]'
                        : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:border-[#D7B797]'
                      : darkMode
                        ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                        : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} className={selectedGroupBrand ? 'text-[#D7B797]' : darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                      <span className="truncate">{selectedGroupBrandObj?.name || t('budget.allGroupBrands')}</span>
                    </div>
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isGroupBrandDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGroupBrandDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedGroupBrand(null); setIsGroupBrandDropdownOpen(false); }}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedGroupBrand === null
                          ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                          : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                          }`}
                      >
                        <span className="font-medium">{t('budget.allGroupBrands')}</span>
                        {selectedGroupBrand === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {GROUP_BRAND_CATEGORIES.map((group) => (
                        <div
                          key={group.id}
                          onClick={() => { setSelectedGroupBrand(group.id); setIsGroupBrandDropdownOpen(false); }}
                          className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedGroupBrand === group.id
                            ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                            }`}
                        >
                          <span className="font-medium">{group.name}</span>
                          {selectedGroupBrand === group.id && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brand Filter */}
                <div className="relative min-w-[140px]" ref={brandDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('budget.brand')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBrandDropdownOpen(!isBrandDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${selectedBrand
                      ? darkMode
                        ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:border-[rgba(215,183,151,0.4)]'
                        : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:border-[#D7B797]'
                      : darkMode
                        ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                        : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={14} className={selectedBrand ? 'text-[#D7B797]' : darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                      <span className="truncate">{selectedBrandObj?.name || t('budget.allBrands')}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isBrandDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden max-h-60 overflow-y-auto ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedBrand(null); setIsBrandDropdownOpen(false); }}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedBrand === null
                          ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                          : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                          }`}
                      >
                        <span className="font-medium">{t('budget.allBrands')}</span>
                        {selectedBrand === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {filteredBrands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => { setSelectedBrand(brand.id); setIsBrandDropdownOpen(false); }}
                          className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedBrand === brand.id
                            ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                            }`}
                        >
                          <span className="font-medium">{brand.name}</span>
                          {selectedBrand === brand.id && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Season Group Filter */}
                <div className="relative min-w-[140px]" ref={seasonDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('planning.seasonGroup')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSeasonDropdownOpen(!isSeasonDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${selectedSeasonGroup
                      ? selectedSeasonGroup === 'SS'
                        ? darkMode
                          ? 'bg-[rgba(227,179,65,0.15)] border-[#E3B341] text-[#E3B341] hover:border-[#E3B341]'
                          : 'bg-[rgba(227,179,65,0.15)] border-[#E3B341] text-[#8A6340] hover:border-[#D7B797]'
                        : darkMode
                          ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:border-[rgba(215,183,151,0.4)]'
                          : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:border-[#D7B797]'
                      : darkMode
                        ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                        : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedSeasonGroup === 'SS' ? <Sun size={14} className="text-[#E3B341]" /> : selectedSeasonGroup === 'FW' ? <Snowflake size={14} className="text-[#D7B797]" /> : <Filter size={14} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />}
                      <span>{selectedSeasonGroup ? (SEASON_CONFIG[selectedSeasonGroup]?.name || selectedSeasonGroup) : t('planning.allSeasonGroups')}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isSeasonDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedSeasonGroup(null); setIsSeasonDropdownOpen(false); }}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeasonGroup === null
                          ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                          : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <Filter size={14} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                          <span className="font-medium">{t('planning.allSeasonGroups')}</span>
                        </div>
                        {selectedSeasonGroup === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {SEASON_GROUPS.map((sg) => (
                        <div
                          key={sg}
                          onClick={() => { setSelectedSeasonGroup(sg); setIsSeasonDropdownOpen(false); }}
                          className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeasonGroup === sg
                            ? darkMode ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]' : 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            {sg === 'SS' ? <Sun size={14} className="text-[#E3B341]" /> : <Snowflake size={14} className="text-[#D7B797]" />}
                            <span className="font-medium">{SEASON_CONFIG[sg]?.name || sg}</span>
                          </div>
                          {selectedSeasonGroup === sg && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider before Version */}
                {selectedBudgetId && (
                  <div className={`h-10 w-px hidden sm:block ${darkMode ? 'bg-[#2E2E2E]' : 'bg-[#2E2E2E]/20'}`}></div>
                )}

                {/* Version Filter */}
                {selectedBudgetId && (
                <div className="relative min-w-[200px]" ref={versionDropdownRef}>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    Version
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVersionDropdownOpen(!isVersionDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                    }}
                    disabled={versions.length === 0 && !loadingVersions}
                    className={`w-full px-3 py-2.5 border rounded-lg font-medium cursor-pointer flex items-center justify-between text-sm transition-all ${
                      versions.length === 0 && !loadingVersions
                        ? darkMode
                          ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#666666] cursor-not-allowed opacity-50'
                          : 'bg-[#F2F2F2] border-[#C4B5A5] text-[#999999] cursor-not-allowed opacity-50'
                        : selectedVersion
                          ? selectedVersion.isFinal
                            ? darkMode
                              ? 'bg-[rgba(160,120,75,0.18)] border-[#D7B797] text-[#D7B797]'
                              : 'bg-[rgba(215,183,151,0.2)] border-[#D7B797] text-[#8A6340]'
                            : darkMode
                              ? 'bg-[rgba(18,119,73,0.15)] border-[#127749] text-[#2A9E6A]'
                              : 'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749]'
                          : darkMode
                            ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] hover:border-[rgba(215,183,151,0.25)] hover:bg-[rgba(215,183,151,0.08)]'
                            : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {selectedVersion?.isFinal ? (
                        <Star size={14} className="text-[#D7B797] fill-[#D7B797]" />
                      ) : (
                        <Sparkles size={14} className={selectedVersion ? 'text-[#D7B797]' : darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                      )}
                      <span className="truncate">
                        {loadingVersions ? 'Loading...' : selectedVersion ? selectedVersion.name : 'Select Version'}
                      </span>
                      {selectedVersion?.isFinal && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#D7B797] text-[#0A0A0A] rounded flex-shrink-0">FINAL</span>
                      )}
                    </div>
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isVersionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isVersionDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-xl shadow-xl z-[9999] overflow-hidden min-w-[300px] ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                      <div className={`p-2 border-b ${darkMode ? 'border-[#2E2E2E] bg-[#121212]' : 'border-[#D4C8BB] bg-[rgba(160,120,75,0.08)]'}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wide font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.planningVersions')}</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {loadingVersions && (
                          <div className="px-4 py-6 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
                            <span className={`ml-2 text-sm ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.loading')}...</span>
                          </div>
                        )}
                        {!loadingVersions && versions.length === 0 && (
                          <div className={`px-4 py-6 text-center text-sm ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                            {t('planning.noVersions')}
                          </div>
                        )}
                        {!loadingVersions && versions.map((version) => (
                          <div
                            key={version.id}
                            onClick={() => { setSelectedVersionId(version.id); setIsVersionDropdownOpen(false); }}
                            className={`px-4 py-3 cursor-pointer transition-colors border-t ${darkMode ? 'border-[#2E2E2E]/50' : 'border-[#D4C8BB]'} ${
                              selectedVersionId === version.id
                                ? darkMode ? 'bg-[rgba(18,119,73,0.15)]' : 'bg-[rgba(18,119,73,0.1)]'
                                : darkMode ? 'hover:bg-[rgba(215,183,151,0.08)]' : 'hover:bg-[rgba(160,120,75,0.18)]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {version.isFinal && <Star size={14} className="text-[#D7B797] fill-[#D7B797] flex-shrink-0" />}
                                <span className={`font-semibold text-sm font-['Montserrat'] truncate ${selectedVersionId === version.id ? 'text-[#127749]' : darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                                  {version.name}
                                </span>
                                {version.isFinal && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#D7B797] text-[#0A0A0A] rounded flex-shrink-0">FINAL</span>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  version.status === 'APPROVED' ? 'bg-[rgba(18,119,73,0.15)] text-[#127749]' :
                                  version.status === 'SUBMITTED' ? 'bg-[rgba(227,179,65,0.15)] text-[#E3B341]' :
                                  darkMode ? 'bg-[#2E2E2E] text-[#999999]' : 'bg-[#F2F2F2] text-[#666666]'
                                }`}>{version.status}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {!version.isFinal && (
                                  <button
                                    onClick={(e) => handleSetFinalVersion(version.id, e)}
                                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                      darkMode
                                        ? 'bg-[rgba(160,120,75,0.18)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.25)]'
                                        : 'bg-[rgba(215,183,151,0.2)] text-[#8A6340] hover:bg-[rgba(215,183,151,0.35)]'
                                    }`}
                                  >
                                    {t('planning.latestVersion')}
                                  </button>
                                )}
                                {selectedVersionId === version.id && <Check size={14} className="text-[#127749]" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}

              </div>
            </div>





          </div>
        </div>
      </div>
      {/* Budget Table - Collapsible by Group Brand and Brand */}
      {(selectedBudget || selectedBudgetId) && (
        <div className="space-y-4 relative z-[10]">
          {displayGroups.map((group) => {
            const groupBrands = displayBrands.filter(b => b.groupBrandId === group.id);
            const isGroupCollapsed = collapsedGroups[group.id];

            // Calculate group totals
            const groupTotals = groupBrands.reduce((acc, brand) => {
              const brandTotals = getBrandTotals(brand.id);
              return {
                rex: acc.rex + brandTotals.rex,
                ttp: acc.ttp + brandTotals.ttp,
                sum: acc.sum + brandTotals.sum
              };
            }, { rex: 0, ttp: 0, sum: 0 });

            return (
              <div key={group.id} className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'}`}>
                {/* Group Header - Collapsible with Total Budget */}
                <div
                  onClick={() => !selectedGroupBrand && toggleGroupCollapse(group.id)}
                  className={`px-6 py-4 bg-gradient-to-r ${group.color} border-b border-[#C4B5A5] flex items-center justify-between ${!selectedGroupBrand ? 'cursor-pointer hover:opacity-90' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {!selectedGroupBrand && (
                      <ChevronRight
                        size={20}
                        className={`text-white transition-transform duration-200 ${!isGroupCollapsed ? 'rotate-90' : ''}`}
                      />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold font-['Montserrat'] shadow-lg">
                      {group.id}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-white font-['Montserrat']">{group.name}</div>
                      <div className="text-sm text-white/80 font-['JetBrains_Mono']">
                        {groupBrands.length} brand{groupBrands.length !== 1 ? 's' : ''} • {selectedSeasonGroup ? SEASON_CONFIG[selectedSeasonGroup]?.name : t('planning.allSeasonGroups')} {selectedYear}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Budget Allocated - show when budget is selected */}
                    {totalBudget > 0 && (selectedBudget || selectedBudgetId) && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-white/15 rounded-xl backdrop-blur-sm">
                        <div className="text-right">
                          <div className="text-xs text-white/70 font-medium font-['Montserrat']">{selectedBudget?.budgetName || fallbackBudgetName}</div>
                          <div className="text-sm font-bold text-white font-['JetBrains_Mono']">{t('skuProposal.budget')}: {formatCurrency(totalBudget)}</div>
                        </div>
                      </div>
                    )}
                    {/* Group Total */}
                    <div className="text-right">
                      <div className="text-sm text-white/80 font-['Montserrat']">{t('skuProposal.totalPlanned')}</div>
                      <div className="font-bold text-xl text-white font-['JetBrains_Mono']">
                        {formatCurrency(groupTotals.sum)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Content - Collapsible */}
                {!isGroupCollapsed && (
                  <div>
                    {groupBrands.map((brand) => {
                      const isBrandCollapsed = collapsedBrands[brand.id];
                      const brandTotals = getBrandTotals(brand.id);

                      return (
                        <div key={brand.id} className={`last:border-b-0 ${darkMode ? 'border-b border-[#2E2E2E]' : 'border-b border-[#D4C8BB]'}`}>
                          {/* Brand Header - Collapsible when multiple brands */}
                          {(!selectedBrand && groupBrands.length > 1) && (
                            <div
                              onClick={() => toggleBrandCollapse(brand.id)}
                              className={`px-6 py-3 border-b flex items-center justify-between cursor-pointer transition-colors ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.08)]' : 'bg-gradient-to-r from-[rgba(215,183,151,0.05)] to-[rgba(215,183,151,0.1)] border-[#C4B5A5] hover:bg-[rgba(160,120,75,0.18)]'}`}
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight
                                  size={18}
                                  className={`transition-transform duration-200 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'} ${!isBrandCollapsed ? 'rotate-90' : ''}`}
                                />
                                <Tag size={16} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                                <span className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{brand.name}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.rex')}: </span>
                                    <span className={`text-sm font-medium font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{formatCurrency(brandTotals.rex)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.ttp')}: </span>
                                    <span className={`text-sm font-medium font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{formatCurrency(brandTotals.ttp)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.total')}: </span>
                                    <span className={`font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(brandTotals.sum)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Brand Table Content */}
                          {(!isBrandCollapsed || selectedBrand || groupBrands.length === 1) && (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(215,183,151,0.2)]'}>
                                    <th className={`px-6 py-3 text-left text-sm font-semibold w-64 font-['Montserrat'] ${darkMode ? 'text-white' : 'text-[#333333]'}`}>
                                      <div className="flex items-center gap-2">
                                        <TrendingUp size={16} />
                                        {selectedBrand || groupBrands.length === 1 ? brand.name : ''} FY {selectedYear}
                                      </div>
                                    </th>
                                    {STORES.map((store) => (
                                      <th key={store.id} className={`px-6 py-3 text-center text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-white' : 'text-[#333333]'}`}>
                                        <div>{store.code}</div>
                                        <div className={`text-xs font-normal font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>({storePercentages[store.id]}%)</div>
                                      </th>
                                    ))}
                                    <th className={`px-6 py-3 text-center text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-white' : 'text-[#333333]'}`}>{t('planning.totalValue')}</th>
                                    <th className={`px-6 py-3 text-center text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-white' : 'text-[#333333]'}`}>% MIX</th>
                                    <th className={`px-6 py-3 text-center text-sm font-semibold w-36 font-['Montserrat'] ${darkMode ? 'text-white' : 'text-[#333333]'}`}>{t('common.actions')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Render seasons based on selection */}
                                  {(selectedSeasonGroup ? [selectedSeasonGroup] : SEASON_GROUPS).map((seasonGroup) => (
                                    <Fragment key={`${brand.id}-${seasonGroup}`}>
                                      {/* Season Group Header */}
                                      <tr className={darkMode ? 'bg-[#1A1A1A] border-b border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.12)] border-b border-[#C4B5A5]'}>
                                        <td className="px-6 py-3">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-5 rounded-full ${seasonGroup === 'SS' ? 'bg-[#E3B341]' : 'bg-[#D7B797]'}`}></div>
                                            {seasonGroup === 'SS' ? (
                                              <Sun size={16} className="text-[#E3B341]" />
                                            ) : (
                                              <Snowflake size={16} className="text-[#D7B797]" />
                                            )}
                                            <span className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{SEASON_CONFIG[seasonGroup]?.name}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <input
                                            type="text"
                                            value={formatCurrency(getSeasonTotalValue(brand.id, seasonGroup, 'rex') || 0)}
                                            readOnly
                                            tabIndex={-1}
                                            className={`w-full px-3 py-2 text-center border rounded-lg font-semibold font-['JetBrains_Mono'] cursor-default ${darkMode
                                              ? 'border-[#2E2E2E] text-[#F2F2F2] bg-[#121212]'
                                              : 'border-[#C4B5A5] text-[#0A0A0A] bg-[rgba(160,120,75,0.12)]'
                                            }`}
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <input
                                            type="text"
                                            value={formatCurrency(getSeasonTotalValue(brand.id, seasonGroup, 'ttp') || 0)}
                                            readOnly
                                            tabIndex={-1}
                                            className={`w-full px-3 py-2 text-center border rounded-lg font-semibold font-['JetBrains_Mono'] cursor-default ${darkMode
                                              ? 'border-[#2E2E2E] text-[#F2F2F2] bg-[#121212]'
                                              : 'border-[#C4B5A5] text-[#0A0A0A] bg-[rgba(160,120,75,0.12)]'
                                            }`}
                                          />

                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <div className={`px-3 py-2 border rounded-lg font-bold font-['JetBrains_Mono'] ${darkMode
                                            ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]'
                                            : 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#0A0A0A]'
                                          }`}>
                                            {formatCurrency(getSeasonTotalValue(brand.id, seasonGroup, 'rex') + getSeasonTotalValue(brand.id, seasonGroup, 'ttp'))}
                                          </div>
                                        </td>
                                        <td className={`px-6 py-3 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                                          {selectedSeasonGroup ? '100%' : `${calculateMix(getSeasonTotalValue(brand.id, seasonGroup, 'rex') + getSeasonTotalValue(brand.id, seasonGroup, 'ttp'), brand.id)}%`}
                                        </td>
                                        <td className="px-6 py-3"></td>
                                      </tr>

                                      {/* Sub-Season Rows */}
                                      {SEASON_CONFIG[seasonGroup]?.subSeasons.map((subSeason) => {
                                        const data = getBudgetData(brand.id, seasonGroup, subSeason);
                                        const mix = calculateMix(data.sum, brand.id);

                                        return (
                                          <tr key={`${brand.id}-${seasonGroup}-${subSeason}`} className={`border-b transition-colors ${darkMode ? 'border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.08)]' : 'border-[#D4C8BB] hover:bg-[rgba(160,120,75,0.12)]'}`}>
                                            <td className="px-6 py-3 pl-14">
                                              <span className={`font-medium ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{subSeason}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              <input
                                                type="text"
                                                value={editingCell === `${brand.id}-${seasonGroup}-${subSeason}-rex` ? (data.rex || '') : formatCurrency(data.rex)}
                                                onChange={(e) => handleAllocationChange(brand.id, seasonGroup, subSeason, 'rex', e.target.value)}
                                                onFocus={() => setEditingCell(`${brand.id}-${seasonGroup}-${subSeason}-rex`)}
                                                onBlur={() => setEditingCell(null)}
                                                className={`w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] font-medium font-['JetBrains_Mono'] transition-colors ${darkMode
                                                  ? 'border-[#2E2E2E] text-[#F2F2F2] bg-[#121212] hover:border-[rgba(215,183,151,0.25)]'
                                                  : 'border-[#C4B5A5] text-[#0A0A0A] bg-white hover:border-[rgba(215,183,151,0.4)]'
                                                }`}
                                                placeholder="0"
                                              />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              <input
                                                type="text"
                                                value={editingCell === `${brand.id}-${seasonGroup}-${subSeason}-ttp` ? (data.ttp || '') : formatCurrency(data.ttp)}
                                                onChange={(e) => handleAllocationChange(brand.id, seasonGroup, subSeason, 'ttp', e.target.value)}
                                                onFocus={() => setEditingCell(`${brand.id}-${seasonGroup}-${subSeason}-ttp`)}
                                                onBlur={() => setEditingCell(null)}
                                                className={`w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D7B797] focus:border-[#D7B797] font-medium font-['JetBrains_Mono'] transition-colors ${darkMode
                                                  ? 'border-[#2E2E2E] text-[#F2F2F2] bg-[#121212] hover:border-[rgba(215,183,151,0.25)]'
                                                  : 'border-[#C4B5A5] text-[#0A0A0A] bg-white hover:border-[rgba(215,183,151,0.4)]'
                                                }`}
                                                placeholder="0"
                                              />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              <div className={`px-3 py-2 border rounded-lg font-semibold font-['JetBrains_Mono'] ${darkMode
                                                ? 'bg-[rgba(18,119,73,0.15)] border-[#127749] text-[#2A9E6A]'
                                                : 'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749]'
                                              }`}>
                                                {formatCurrency(data.sum)}
                                              </div>
                                            </td>
                                            <td className={`px-6 py-3 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                                              {mix}%
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                              <button
                                                onClick={() => {
                                                  if (onOpenOtbAnalysis) {
                                                    onOpenOtbAnalysis({
                                                      budgetId: selectedBudgetId,
                                                      budgetName: selectedBudget?.budgetName || fallbackBudgetName || null,
                                                      fiscalYear: selectedBudget?.fiscalYear || selectedYear,
                                                      brandName: selectedBudget?.brandName || brand?.name,
                                                      groupBrand: selectedBudget?.groupBrand || brand?.groupBrand,
                                                      totalBudget: selectedBudget?.totalBudget || 0,
                                                      status: selectedBudget?.status,
                                                      seasonGroup,
                                                      season: subSeason,
                                                      rex: data.rex,
                                                      ttp: data.ttp
                                                    });
                                                  }
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#127749] hover:bg-[#0d5a37] text-white rounded-lg font-medium text-sm font-['Montserrat'] transition-colors"
                                              >
                                                <Edit size={14} />
                                                {t('nav.otbAnalysis') || 'OTB Planning'}
                                              </button>

                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </Fragment>
                                  ))}

                                  {/* Total Row */}
                                  <tr className={`border-t-2 ${darkMode ? 'bg-[rgba(18,119,73,0.15)] border-[#127749]' : 'bg-[rgba(18,119,73,0.1)] border-[#127749]'}`}>
                                    <td className="px-6 py-3">
                                      <span className={`font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>TOTAL</span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <input
                                        type="text"
                                        value={formatCurrency(getBrandTotalValue(brand.id, 'rex') || 0)}
                                        readOnly
                                        tabIndex={-1}
                                        className={`w-full px-3 py-2 text-center border rounded-lg font-bold font-['JetBrains_Mono'] cursor-default ${darkMode
                                          ? 'border-[#127749] text-[#2A9E6A] bg-[rgba(18,119,73,0.2)]'
                                          : 'border-[#127749] text-[#127749] bg-[rgba(18,119,73,0.15)]'
                                        }`}
                                      />
                                    </td>

                                    <td className="px-4 py-2 text-center">
                                      <input
                                        type="text"
                                        value={formatCurrency(getBrandTotalValue(brand.id, 'ttp') || 0)}
                                        readOnly
                                        tabIndex={-1}
                                        className={`w-full px-3 py-2 text-center border rounded-lg font-bold font-['JetBrains_Mono'] cursor-default ${darkMode
                                          ? 'border-[#127749] text-[#2A9E6A] bg-[rgba(18,119,73,0.2)]'
                                          : 'border-[#127749] text-[#127749] bg-[rgba(18,119,73,0.15)]'
                                        }`}
                                      />
                                    </td>

                                    <td className="px-4 py-2 text-center">
                                      <div className={`px-3 py-2 border rounded-lg font-bold text-lg font-['JetBrains_Mono'] ${darkMode
                                        ? 'bg-[rgba(18,119,73,0.25)] border-[#2A9E6A] text-[#2A9E6A]'
                                        : 'bg-[rgba(18,119,73,0.2)] border-[#127749] text-[#127749]'
                                      }`}>
                                        {formatCurrency(getBrandTotalValue(brand.id, 'rex') + getBrandTotalValue(brand.id, 'ttp'))}
                                      </div>
                                    </td>
                                    <td className={`px-6 py-3 text-center font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>100%</td>
                                    <td className="px-6 py-3"></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default BudgetAllocateScreen;
