'use client';

import { useState, useRef, useEffect, useMemo, useCallback, Fragment, startTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign, Sparkles, Filter, Clock, ChevronDown, Check,
  ChevronRight, Sun, Snowflake,
  Star, Layers, Tag, FileText, X, Split, Pencil,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils';
import { SEASON_GROUPS, SEASON_CONFIG } from '@/utils/constants';
import { budgetService, masterDataService, planningService } from '@/services';
import { invalidateCache } from '@/services/api';
import { useAppContext } from '@/contexts/AppContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSmartScrollState } from '@/hooks/useSmartScrollState';
import { FilterBottomSheet, useBottomSheet } from '@/components/mobile';
import { TableSkeleton } from '@/components/ui';
import { useAllocationState, BRAND_BUDGET_CAP_PCT } from '../hooks/useAllocationState';
import { useBudgetAllocateSave } from '../hooks/useBudgetAllocateSave';
import { useClipboardPaste } from '../hooks/useClipboardPaste';
import AllocationProgressBar from './AllocationProgressBar';
import AllocationSidePanel from './AllocationSidePanel';
import UnsavedChangesBanner from './UnsavedChangesBanner';
import VersionCompareModal from './VersionCompareModal';
import { exportAllocationToExcel } from '../utils/exportExcel';

// Constants - same as BudgetManagementScreen
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i);

const GROUP_BRAND_COLORS = [
  'from-[#8A6340] to-[#6B4D30]',
  'from-[#5C4033] to-[#3E2B22]',
  'from-[#7A6350] to-[#5C4A32]',
  'from-[#4A3728] to-[#362A1E]',
];


const BudgetAllocateScreen = ({
  budgets,
  plannings,
  getPlanningStatus,
  handleOpenPlanningDetail,
  onOpenOtbAnalysis,
  onNavigateBack,
  allocationData,
  onAllocationDataUsed,
  availableBudgets: propAvailableBudgets
}: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { kpiData, registerSave, unregisterSave, registerSaveAsNew, unregisterSaveAsNew, setHeaderSubtitle } = useAppContext();

  const { isOpen: filterOpen, open: openFilter, close: closeFilter } = useBottomSheet();
  const [mobileFilterValues, setMobileFilterValues] = useState<Record<string, string | string[]>>({});
  // API state for fetching budgets and brands
  const [apiBudgets, setApiBudgets] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [brandList, setBrandList] = useState<any[]>([]);
  const [groupBrandList, setGroupBrandList] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [seasonGroups, setSeasonGroups] = useState<any[]>([]);

  // Fetch brands (group brands) from API
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brands = await masterDataService.getBrands({ limit: 3 });
        const list = Array.isArray(brands) ? brands : (brands?.data || []);

        // Group brands are the top-level items; individual brands may be nested
        // The API returns group_brands (Ferragamo, Burberry, etc.)
        const groups: any[] = [];
        const allBrands: any[] = [];

        list.forEach((b: any) => {
          const id = b.id || b.brandId;
          const name = b.name || b.brandName || b.code || 'Unknown';
          const groupId = b.group_brand_id || b.groupBrandId || b.groupId || id;

          // Add to group list (dedupe) - use group count for consistent color
          if (!groups.find((g: any) => g.id === groupId)) {
            groups.push({
              id: groupId,
              name: b.group_brand?.name || b.groupBrand?.name || b.groupName || name,
              color: GROUP_BRAND_COLORS[groups.length % GROUP_BRAND_COLORS.length]
            });
          }

          allBrands.push({
            id,
            groupBrandId: groupId,
            name
          });
        });

        setGroupBrandList(groups);
        setBrandList(allBrands);
      } catch (err: any) {
        console.error('Failed to fetch brands:', err);
        setBrandList([]);
        setGroupBrandList([]);
      }
    };
    fetchBrands();
    // Fetch categories
    masterDataService.getCategories().then(res => {
      const data = res.data || res || [];
      setCategoryData(Array.isArray(data) ? data : []);
    }).catch(() => setCategoryData([]));
    // Fetch stores
    masterDataService.getStores({ limit: 3 }).then(res => {
      const data = res.data || res || [];
      const seen = new Set<string>();
      const list = (Array.isArray(data) ? data : []).reduce((acc: any[], s: any) => {
        const id = (s.code || s.storeCode || s.id || '').toLowerCase();
        if (id && !seen.has(id)) {
          seen.add(id);
          acc.push({ id, code: s.code || s.storeCode || s.name || '', name: s.name || s.storeName || s.code || '', dbId: s.id });
        }
        return acc;
      }, []);
      setStores(list.length > 0 ? list : []);
      if (list.length === 0) toast.error('No stores found — please check master data');
    }).catch(() => {
      setStores([]);
      toast.error('Failed to load stores');
    });
  }, []);

  // Fetch budgets on mount (with Strict Mode ignore pattern)
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoadingBudgets(true);
      try {
        const response = await budgetService.getAll({});
        if (ignore) return;
        const budgetList = (Array.isArray(response) ? response : []).map((budget: any) => ({
          id: budget.id,
          fiscalYear: budget.fiscal_year ?? budget.fiscalYear,
          totalBudget: Number(budget.amount ?? budget.totalAmount ?? budget.totalBudget) || 0,
          budgetName: budget.name || budget.budgetCode || budget.budgetName || 'Untitled',
          status: (budget.status || 'DRAFT').toLowerCase()}));
        setApiBudgets(budgetList);
      } catch (err: any) {
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

  // Filter states - persisted via sessionStorage
  const FILTER_STORAGE_KEY = 'otb_budget_filters';
  const getStoredFilters = () => {
    try {
      const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  };
  const storedFilters = getStoredFilters();
  const [selectedYear, setSelectedYear] = useState(storedFilters?.selectedYear ?? 2025);
  const [selectedGroupBrand, setSelectedGroupBrand] = useState<any>(null);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedSeasonGroup, setSelectedSeasonGroup] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);

  // Fetch season groups filtered by selected year
  useEffect(() => {
    masterDataService.getSeasonGroups(selectedYear ? { year: Number(selectedYear) } : undefined).then(res => {
      const data = Array.isArray(res) ? res : [];
      setSeasonGroups(data);
    }).catch(() => setSeasonGroups([]));
  }, [selectedYear]);

  // Reset sub-season when season group changes
  useEffect(() => {
    setSelectedSeason(null);
  }, [selectedSeasonGroup]);

  // Persist filters to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
        selectedYear,
        selectedGroupBrand,
        selectedBrand,
        selectedSeasonGroup}));
    } catch { /* ignore */ }
  }, [selectedYear, selectedGroupBrand, selectedBrand, selectedSeasonGroup]);

  // Available budgets for dropdown selection - prefer API data
  const allBudgets = apiBudgets.length > 0 ? apiBudgets : (propAvailableBudgets || []);

  // Filter budgets by selected year for the dropdown
  const availableBudgets = useMemo(() => {
    if (!selectedYear) return allBudgets;
    return allBudgets.filter((b: any) => Number(b.fiscalYear) === Number(selectedYear));
  }, [allBudgets, selectedYear]);
  // Budget info from allocation
  const [selectedBudgetId, setSelectedBudgetId] = useState<any>(null);
  const [totalBudget, setTotalBudget] = useState(0);

  // Budget name dropdown state
  const [isBudgetNameDropdownOpen, setIsBudgetNameDropdownOpen] = useState(false);
  // Smart Filter Bar — direct DOM toggle, zero re-render
  const { barRef, handleBarClick } = useSmartScrollState();

  // Store allocation data locally to survive the race condition with API fetch
  const [pendingAllocation, setPendingAllocation] = useState<any>(null);
  const [fallbackBudgetName, setFallbackBudgetName] = useState<any>(null);

  // Collapse states for table sections
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, any>>({});
  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, any>>({});

  // Allocation state hook (undo/redo, dirty tracking, validation, save)
  const allocation = useAllocationState(t);
  const {
    allocationValues, setAllocationValues,
    seasonTotalValues, setSeasonTotalValues,
    brandTotalValues, setBrandTotalValues,
    allocationComments, handleCommentChange,
    handleAllocationChange, handleSeasonTotalChange, handleBrandTotalChange,
    canUndo, canRedo, undo, redo,
    isDirty, discardChanges, saving: planSaving, saveDraft, submitForApproval, validate,
    autoSaving, lastSavedAt, markClean} = allocation;

  // UX-27: Warn on browser close/refresh with unsaved changes
  useUnsavedChanges(isDirty);

  // Track which cell is currently being edited (for showing raw value)
  const [editingCell, setEditingCell] = useState<any>(null); // 'brandId-seasonGroup-subSeason-field'

  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // Leave dialog state (3 options: Save & Leave / Leave / Stay)
  const [leaveDialog, setLeaveDialog] = useState<{ target?: string } | null>(null);

  // Version compare modal state
  const [compareModal, setCompareModal] = useState<{ a: any; b: any } | null>(null);

  // Table view filters

  // Clipboard paste handler
  const handlePasteValues = useCallback((startIndex: number, values: number[]) => {
    const cells = Array.from(document.querySelectorAll<HTMLInputElement>('[data-alloc-cell]'));
    // We need to map cell indices back to brand/season/store keys
    // For now, trigger change events directly
    values.forEach((val, i) => {
      const cell = cells[startIndex + i];
      if (cell) {
        // Trigger a synthetic input event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(cell, String(val));
          cell.dispatchEvent(new Event('input', { bubbles: true }));
          cell.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }, []);
  useClipboardPaste(handlePasteValues);

  // Handle bulk update from BulkActionsMenu
  const handleBulkUpdate = useCallback((newValues: Record<string, any>) => {
    allocation.pushUndo({ allocationValues, seasonTotalValues, brandTotalValues, allocationComments });
    setAllocationValues(newValues);
  }, [allocationValues, seasonTotalValues, brandTotalValues, allocationComments, setAllocationValues, allocation]);

  // Dropdown states
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isGroupBrandDropdownOpen, setIsGroupBrandDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [isSubSeasonDropdownOpen, setIsSubSeasonDropdownOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<any>(null);
  const [brandVersionMap, setBrandVersionMap] = useState<Record<string, any>>({});
  const [openVersionBrandId, setOpenVersionBrandId] = useState<string | null>(null);
  const [dropdownAnchorEl, setDropdownAnchorEl] = useState<HTMLElement | null>(null);
  const [allocateHeaders, setAllocateHeaders] = useState<any[]>([]);

  // Sync versionId to hook for auto-save + Ctrl+S
  useEffect(() => {
    allocation.setVersionId(selectedVersionId);
  }, [selectedVersionId, allocation.setVersionId]);


  // Refs
  const budgetNameDropdownRef = useRef<any>(null);
  const yearDropdownRef = useRef<any>(null);
  const groupBrandDropdownRef = useRef<any>(null);
  const brandDropdownRef = useRef<any>(null);
  const seasonDropdownRef = useRef<any>(null);
  const subSeasonDropdownRef = useRef<any>(null);
  const prevBrandVersionMapRef = useRef<Record<string, any>>({});
  const pendingMarkCleanRef = useRef(false);
  // Always-current ref for brandVersionMap — read inside effects without adding to deps
  const brandVersionMapRef = useRef<Record<string, any>>({});

  // Get brands filtered by selected group brand for the brand dropdown
  const filteredBrands = useMemo(() => {
    if (!selectedGroupBrand) return brandList;
    return brandList.filter((b: any) => String(b.groupBrandId) === String(selectedGroupBrand));
  }, [selectedGroupBrand, brandList]);

  // Track if we just applied allocation data to prevent reset (using ref for synchronous access)
  const appliedAllocationRef = useRef(false);

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
      if (allocationData.totalBudget) setTotalBudget(allocationData.totalBudget);

      // Set budget ID directly if available
      if (allocationData.id) {
        setSelectedBudgetId(allocationData.id);
      }

      // Pre-fill brand / season filters (from OTB Analysis navigation)
      if (allocationData.groupBrandId) setSelectedGroupBrand(allocationData.groupBrandId);
      if (allocationData.brandId) setSelectedBrand(allocationData.brandId);
      if (allocationData.seasonGroupId) setSelectedSeasonGroup(allocationData.seasonGroupId);
      if (allocationData.seasonId) {
        // Delay setting season so it doesn't get reset by the seasonGroup change effect
        setTimeout(() => setSelectedSeason(allocationData.seasonId), 50);
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
        ? availableBudgets.find((b: any) => b.id === pendingAllocation.id)
        : availableBudgets.find(
            (b: any) => b.budgetName === pendingAllocation.budgetName &&
              b.fiscalYear === pendingAllocation.year
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
  const selectedBudget = availableBudgets.find((b: any) => b.id === selectedBudgetId);

  // Derive versions from plannings prop when budget changes
  useEffect(() => {
    if (!selectedBudgetId) {
      setVersions([]);
      setSelectedVersionId(null);
      return;
    }
    const filtered = (plannings || []).filter((p: any) => {
      const budgetId = p.budgetDetail?.budgetId || p.budgetDetail?.budget?.id;
      return budgetId === selectedBudgetId;
    });
    const mapped = filtered.map((p: any) => ({
      id: p.id,
      name: p.versionName || `Version ${p.versionNumber || p.id}`,
      status: p.status || 'DRAFT',
      isFinal: p.isFinal || false,
      versionNumber: p.versionNumber
    }));
    setVersions(mapped);
    const finalVersion = mapped.find((v: any) => v.isFinal);
    setSelectedVersionId(finalVersion ? finalVersion.id : null);
  }, [selectedBudgetId, plannings]);

  // Fetch allocate headers (per-brand versions) when budget changes
  useEffect(() => {
    if (!selectedBudgetId) {
      setAllocateHeaders([]);
      return;
    }
    let ignore = false;
    const load = async () => {
      try {
        const budget = await budgetService.getOne(String(selectedBudgetId));
        if (!ignore) setAllocateHeaders(Array.isArray(budget?.allocate_headers) ? budget.allocate_headers : []);
      } catch {
        if (!ignore) setAllocateHeaders([]);
      }
    };
    load();
    return () => { ignore = true; };
  }, [selectedBudgetId]);

  // Keep brandVersionMapRef current so the auto-select effect can read it without a circular dep
  brandVersionMapRef.current = brandVersionMap;

  // Auto-select version per brand — preserves user's current selection if it still exists
  useEffect(() => {
    if (allocateHeaders.length === 0) { setBrandVersionMap({}); return; }
    const current = brandVersionMapRef.current;
    const map: Record<string, any> = {};
    const brandIds = [...new Set(allocateHeaders.map((h: any) => h.brand_id ?? h.brandId))];
    brandIds.forEach((brandId: any) => {
      const headers = allocateHeaders.filter((h: any) => (h.brand_id ?? h.brandId) === brandId);
      // Preserve current selection if that header still exists in the updated list
      const currentId = current[String(brandId)];
      if (currentId !== undefined && headers.some(h => Number(h.id) === Number(currentId))) {
        map[String(brandId)] = currentId;
        return;
      }
      // Auto-select: final version if set, else latest
      const finalHeader = headers.find((h: any) => h.is_final_version ?? h.isFinalVersion);
      const latestHeader = finalHeader || headers.reduce((max: any, h: any) => (h.version > (max?.version || 0) ? h : max), null);
      if (latestHeader) map[String(brandId)] = latestHeader.id;
    });
    setBrandVersionMap(map);
  }, [allocateHeaders]);

  // Load budget_allocates data into allocationValues when a brand's selected version changes
  useEffect(() => {
    const prevMap = prevBrandVersionMapRef.current;
    const changedBrandIds = Object.keys({ ...brandVersionMap, ...prevMap }).filter(
      brandId => brandVersionMap[brandId] !== prevMap[brandId]
    );
    prevBrandVersionMapRef.current = { ...brandVersionMap };

    if (changedBrandIds.length === 0 || allocateHeaders.length === 0) return;

    // Use season name from DB directly as the subSeason key

    // startTransition: defer this heavy state update so the UI stays responsive during budget switch
    startTransition(() => {
      setAllocationValues((prev: Record<string, any>) => {
        const updated = { ...prev };

        changedBrandIds.forEach((brandId) => {
          // Clear existing values for this brand
          Object.keys(updated).forEach(key => {
            if (key.startsWith(`${brandId}-`)) delete updated[key];
          });

          const headerId = brandVersionMap[brandId];
          if (!headerId) return; // "All Versions" — keep cleared

          const header = allocateHeaders.find((h: any) => h.id === headerId);
          if (!header?.budget_allocates?.length) return;

          // Map each allocate row: key = brandId-seasonGroupName-seasonName, value = { storeCode: amount }
          header.budget_allocates.forEach((alloc: any) => {
            const sgName: string = alloc.season_group?.name ?? String(alloc.season_group_id);
            const subSeason: string = alloc.season?.name ?? String(alloc.season_id);
            const storeKey: string = (alloc.store?.code || String(alloc.store_id)).toLowerCase();
            const allocKey = `${brandId}-${sgName}-${subSeason}`;
            if (!updated[allocKey]) updated[allocKey] = {};
            updated[allocKey][storeKey] = Number(alloc.budget_amount);
          });
        });

        return updated;
      });
    });
    // After loading DB data, mark state as clean so isDirty only reflects user edits
    pendingMarkCleanRef.current = true;
  }, [brandVersionMap, allocateHeaders]);

  // When allocationValues changes and a DB load just happened, mark state as clean
  useEffect(() => {
    if (pendingMarkCleanRef.current) {
      pendingMarkCleanRef.current = false;
      markClean();
    }
  }, [allocationValues, markClean]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
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
      if (subSeasonDropdownRef.current && !subSeasonDropdownRef.current.contains(event.target)) {
        setIsSubSeasonDropdownOpen(false);
      }
      if (!(event.target as any).closest?.('.brand-version-dropdown') &&
          !(event.target as any).closest?.('.brand-version-portal')) {
        setOpenVersionBrandId(null); setDropdownAnchorEl(null);
        setDropdownAnchorEl(null);
      }
};
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate store percentages from budgets
  // Season groups and config derived from DB (fall back to constants while loading)
  const activeSeasonGroups = useMemo(() => {
    if (seasonGroups.length === 0) return SEASON_GROUPS;
    return seasonGroups.map((sg: any) => sg.name);
  }, [seasonGroups]);

  const dynamicSeasonConfig = useMemo(() => {
    if (seasonGroups.length === 0) return SEASON_CONFIG;
    const config: Record<string, any> = {};
    seasonGroups.forEach((sg: any) => {
      const subSeasons = (sg.seasons || []).map((s: any) => s.name);
      config[sg.name] = {
        name: sg.name,
        subSeasons: subSeasons.length > 0 ? subSeasons : (SEASON_CONFIG[sg.name]?.subSeasons ?? []),
        seasons: sg.seasons || []};
    });
    return config;
  }, [seasonGroups]);

  // Sub-seasons available for the selected season group
  const availableSubSeasons = useMemo(() => {
    if (!selectedSeasonGroup) return [];
    return dynamicSeasonConfig[selectedSeasonGroup]?.subSeasons || [];
  }, [selectedSeasonGroup, dynamicSeasonConfig]);

  const storePercentages = useMemo(() => {
    const totalByStore: Record<string, number> = {};
    let grandTotal = 0;

    stores.forEach((store: any) => {
      totalByStore[store.id] = 0;
    });

    budgets.forEach((budget: any) => {
      if (budget.fiscalYear === selectedYear) {
        budget.details?.forEach((detail: any) => {
          const sid = (detail.storeId || '').toLowerCase();
          if (totalByStore[sid] !== undefined) {
            totalByStore[sid] += detail.budgetAmount;
            grandTotal += detail.budgetAmount;
          }
        });
      }
    });

    const percentages: Record<string, number> = {};
    const defaultPct = stores.length > 0 ? Math.round(100 / stores.length) : 50;
    stores.forEach((store: any) => {
      percentages[store.id] = grandTotal > 0 ? Math.round((totalByStore[store.id] / grandTotal) * 100) : defaultPct;
    });

    return percentages;
  }, [budgets, selectedYear, stores]);

  // Get allocation key for state
  const getAllocationKey = (brandId: any, seasonGroup: any, subSeason: any) => {
    return `${brandId}-${seasonGroup}-${subSeason}`;
  };

  // Calculate total allocated for progress bar
  const totalAllocated = useMemo(() => {
    let sum = 0;
    Object.values(allocationValues).forEach((storeValues: any) => {
      if (storeValues && typeof storeValues === 'object') {
        Object.values(storeValues).forEach((val: any) => {
          if (typeof val === 'number') sum += val;
        });
      }
    });
    return sum;
  }, [allocationValues]);

  // Build brandId → display name map for validation messages
  const brandNames = useMemo(() => {
    const map: Record<string, string> = {};
    brandList.forEach((b: any) => { if (b.id && b.name) map[b.id] = b.name; });
    return map;
  }, [brandList]);

  // Validation issues for side panel
  const validationIssues = useMemo(
    () => validate(totalBudget, totalAllocated, brandNames),
    [validate, totalBudget, totalAllocated, brandNames],
  );

  // Navigate away (with unsaved changes check)
  const navigateTo = (target: string) => {
    if (isDirty) {
      setLeaveDialog({ target });
    } else {
      if (target === '/budget-management') {
        onNavigateBack?.();
      } else if (target === '/otb-analysis') {
        handleContinueNav();
      } else {
        onNavigateBack?.(); // fallback — stepper click
      }
    }
  };

  const handleBack = () => navigateTo('/budget-management');

  const handleContinueNav = () => {
    if (onOpenOtbAnalysis) {
      onOpenOtbAnalysis({
        budgetId: selectedBudgetId,
        budgetName: selectedBudget?.budgetName || fallbackBudgetName || null,
        fiscalYear: selectedBudget?.fiscalYear || selectedYear,
        totalBudget: selectedBudget?.totalBudget || 0,
        status: selectedBudget?.status});
    }
  };

  const handleContinue = () => navigateTo('/otb-analysis');

  // Leave dialog handlers
  const handleLeaveWithSave = async () => {
    checkBrandCapAndWarn();
    await saveAllocation();
    const target = leaveDialog?.target;
    setLeaveDialog(null);
    if (target === '/budget-management') onNavigateBack?.();
    else if (target === '/otb-analysis') handleContinueNav();
  };

  const handleLeaveWithoutSave = () => {
    discardChanges();
    const target = leaveDialog?.target;
    setLeaveDialog(null);
    if (target === '/budget-management') onNavigateBack?.();
    else if (target === '/otb-analysis') handleContinueNav();
  };

  // Stepper click handler
  const handleStepClick = (route: string) => {
    if (route === '/budget-management') handleBack();
    else if (route === '/otb-analysis') handleContinue();
    else navigateTo(route);
  };

  // Get season total value (from state or calculated)
  const getSeasonTotalValue = (brandId: any, seasonGroup: any, field: any) => {
    const key = `${brandId}-${seasonGroup}`;
    if (seasonTotalValues[key]?.[field] !== undefined) {
      return seasonTotalValues[key][field];
    }
    return (getSeasonTotals(brandId, seasonGroup) as any)[field];
  };

  // Get brand total value (from state or calculated)
  const getBrandTotalValue = (brandId: any, field: any) => {
    if (brandTotalValues[brandId]?.[field] !== undefined) {
      return brandTotalValues[brandId][field];
    }
    return (getBrandTotals(brandId) as any)[field];
  };

  // Get budget data for a specific brand, season group, and sub-season
  const getBudgetData = (brandId: any, seasonGroupId: any, subSeason: any) => {
    const seasonType = subSeason === 'Pre' ? 'pre' : 'main';
    const seasonId = `${seasonGroupId}_${seasonType}_${selectedYear}`;

    const budget = budgets.find((b: any) =>
      b.groupBrandId === brandId &&
      b.seasonId === seasonId &&
      b.fiscalYear === selectedYear
    );

    // Get values from allocation state first, then fall back to budget data
    const key = getAllocationKey(brandId, seasonGroupId, subSeason);
    const hasAnyAllocation = stores.some((s: any) => allocationValues[key]?.[s.id] !== undefined);

    if (!budget && !hasAnyAllocation) {
      const result: Record<string, any> = { sum: 0, budget: null };
      stores.forEach((s: any) => { result[s.id] = 0; });
      return result;
    }

    const result: Record<string, any> = { sum: 0, budget };
    stores.forEach((s: any) => {
      const allocated = allocationValues[key]?.[s.id];
      const detail = budget?.details?.find((d: any) => (d.storeId || '').toLowerCase() === s.id);
      const value = allocated !== undefined ? allocated : (detail?.budgetAmount || 0);
      result[s.id] = value;
      result.sum += value;
    });

    return result;
  };

  // Get season totals for a brand
  const getSeasonTotals = (brandId: any, seasonGroupId: any) => {
    const totals: Record<string, any> = { sum: 0 };
    stores.forEach((s: any) => { totals[s.id] = 0; });

    (dynamicSeasonConfig[seasonGroupId]?.subSeasons ?? []).forEach((subSeason: any) => {
      const data = getBudgetData(brandId, seasonGroupId, subSeason);
      stores.forEach((s: any) => { totals[s.id] += (data[s.id] || 0); });
      totals.sum += data.sum;
    });

    return totals;
  };

  // Get brand totals (handles All Seasons when selectedSeasonGroup is null)
  const getBrandTotals = (brandId: any) => {
    if (selectedSeasonGroup) {
      return getSeasonTotals(brandId, selectedSeasonGroup);
    }
    // Sum totals from all season groups
    const result: Record<string, any> = { sum: 0 };
    stores.forEach((s: any) => { result[s.id] = 0; });
    activeSeasonGroups.forEach((sg: any) => {
      const totals = getSeasonTotals(brandId, sg);
      stores.forEach((s: any) => { result[s.id] += (totals[s.id] || 0); });
      result.sum += totals.sum;
    });
    return result;
  };

  // Calculate mix percentage
  const calculateMix = (value: any, brandId: any) => {
    const brandTotals = getBrandTotals(brandId);
    if (brandTotals.sum === 0) return 0;
    return Math.round((value / brandTotals.sum) * 100);
  };

  // Row completion status: 'empty' | 'partial' | 'complete'
  const getRowStatus = useCallback((brandId: string, seasonGroup: string, subSeason: string) => {
    const data = getBudgetData(brandId, seasonGroup, subSeason);
    let filled = 0;
    stores.forEach((s: any) => {
      if (data[s.id] && data[s.id] > 0) filled++;
    });
    if (filled === 0) return 'empty';
    if (filled === stores.length) return 'complete';
    return 'partial';
  }, [getBudgetData, stores]);

  // Aggregate status for a group of rows
  const getAggregateStatus = (statuses: string[]) => {
    if (statuses.length === 0) return 'empty';
    if (statuses.every(s => s === 'complete')) return 'complete';
    if (statuses.every(s => s === 'empty')) return 'empty';
    return 'partial';
  };

  // Toggle group collapse
  const toggleGroupCollapse = (groupId: any) => {
    setCollapsedGroups((prev: any) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Toggle brand collapse
  const toggleBrandCollapse = (brandId: any) => {
    setCollapsedBrands((prev: any) => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  // Collapse all brands
  const collapseAll = useCallback(() => {
    const map: Record<string, boolean> = {};
    brandList.forEach((b: any) => { map[b.id] = true; });
    setCollapsedBrands(map);
  }, [brandList]);

  // Expand all brands and groups
  const expandAll = useCallback(() => {
    setCollapsedBrands({});
    setCollapsedGroups({});
  }, []);

  // Filter table rows by selected brand/group brand
  const displayBrands = useMemo(() => {
    if (selectedBrand) return brandList.filter((b: any) => String(b.id) === String(selectedBrand));
    if (selectedGroupBrand) {
      const g = groupBrandList.find((g: any) => String(g.id) === String(selectedGroupBrand));
      if (g) return brandList.filter((b: any) => String(b.groupBrandId) === String(g.id));
    }
    return brandList;
  }, [selectedBrand, selectedGroupBrand, brandList, groupBrandList]);

  const displayGroups = useMemo(() => {
    if (selectedGroupBrand) {
      const filtered = groupBrandList.filter((g: any) => String(g.id) === String(selectedGroupBrand));
      return filtered.length > 0 ? filtered : groupBrandList;
    }
    return groupBrandList;
  }, [selectedGroupBrand, groupBrandList]);

  // Pre-compute ALL table data in one pass to avoid O(N) inline function calls per render.
  // This covers: row values, row status, per-season totals, per-brand totals.
  const tableComputedData = useMemo(() => {
    const rowDataMap: Record<string, any> = {};
    const seasonTotalsMap: Record<string, any> = {};
    const brandTotalsMap: Record<string, any> = {};
    const rowStatusMap: Record<string, 'empty' | 'partial' | 'complete'> = {};

    displayBrands.forEach((brand: any) => {
      const sgList = selectedSeasonGroup ? [selectedSeasonGroup] : activeSeasonGroups;
      const bTotal: Record<string, any> = { sum: 0 };
      stores.forEach((s: any) => { bTotal[s.id] = 0; });

      sgList.forEach((sg: string) => {
        const sgTotal: Record<string, any> = { sum: 0 };
        stores.forEach((s: any) => { sgTotal[s.id] = 0; });

        (dynamicSeasonConfig[sg]?.subSeasons || []).forEach((ss: string) => {
          const allocKey = `${brand.id}-${sg}-${ss}`;
          const storedAlloc = allocationValues[allocKey];
          const hasAnyAlloc = storedAlloc !== undefined &&
            stores.some((s: any) => storedAlloc[s.id] !== undefined);

          const seasonType = ss === 'Pre' ? 'pre' : 'main';
          const seasonId = `${sg}_${seasonType}_${selectedYear}`;
          const budget = budgets.find((b: any) =>
            b.groupBrandId === brand.id && b.seasonId === seasonId && b.fiscalYear === selectedYear
          );

          const rowData: Record<string, any> = { sum: 0, budget };
          let filled = 0;

          stores.forEach((s: any) => {
            let value = 0;
            if (budget || hasAnyAlloc) {
              const allocated = storedAlloc?.[s.id];
              const detail = budget?.details?.find((d: any) => (d.storeId || '').toLowerCase() === s.id);
              value = allocated !== undefined ? allocated : (detail?.budgetAmount || 0);
            }
            rowData[s.id] = value;
            rowData.sum += value;
            if (value > 0) filled++;
            sgTotal[s.id] += value;
          });
          sgTotal.sum += rowData.sum;

          rowDataMap[allocKey] = rowData;
          rowStatusMap[allocKey] = filled === 0 ? 'empty' : filled === stores.length ? 'complete' : 'partial';
        });

        seasonTotalsMap[`${brand.id}-${sg}`] = sgTotal;
        stores.forEach((s: any) => { bTotal[s.id] += sgTotal[s.id] || 0; });
        bTotal.sum += sgTotal.sum;
      });

      brandTotalsMap[brand.id] = bTotal;
    });

    return { rowDataMap, seasonTotalsMap, brandTotalsMap, rowStatusMap };
  }, [allocationValues, displayBrands, selectedSeasonGroup, activeSeasonGroups, dynamicSeasonConfig, stores, budgets, selectedYear]);

  // Allocate All: validate season group, season, and final versions, then navigate with full context
  // (must be after displayBrands, allocateHeaders, brandNames are initialized)
  const handleAllocateAll = useCallback(() => {
    if (!selectedSeasonGroup) {
      toast('Vui lòng chọn Season Group trước khi tiếp tục', { icon: '⚠️' });
      return;
    }
    if (!selectedSeason) {
      toast('Vui lòng chọn Season trước khi tiếp tục', { icon: '⚠️' });
      return;
    }
    // Check that all displayed brands have a final version
    const brandsWithoutFinal = displayBrands.filter((brand: any) => {
      const brandHeaders = allocateHeaders.filter((h: any) =>
        Number(h.brand_id ?? h.brandId) === Number(brand.id)
      );
      return !brandHeaders.some((h: any) => h.is_final_version ?? h.isFinalVersion);
    });
    if (brandsWithoutFinal.length > 0) {
      const names = brandsWithoutFinal.map((b: any) => brandNames[b.id] || b.name || String(b.id)).join(', ');
      toast(`Các brand sau chưa có final version: ${names}. Vui lòng set final version trước khi tiếp tục.`, { icon: '⚠️', duration: 5000 });
      return;
    }
    // Navigate to OTB Analysis, passing budget + season context
    if (onOpenOtbAnalysis) {
      onOpenOtbAnalysis({
        budgetId: selectedBudgetId,
        budgetName: selectedBudget?.budgetName || fallbackBudgetName || null,
        fiscalYear: selectedBudget?.fiscalYear || selectedYear,
        totalBudget: selectedBudget?.totalBudget || 0,
        status: selectedBudget?.status,
        seasonGroup: selectedSeasonGroup,
        season: selectedSeason});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonGroup, selectedSeason, displayBrands, allocateHeaders, brandNames,
      onOpenOtbAnalysis, selectedBudgetId, selectedBudget, fallbackBudgetName, selectedYear]);

  // Budget allocation save / save-as-new (needs displayBrands, allocateHeaders, brandVersionMap)
  const { save: saveAllocation, saveAsNew: saveAsNewAllocation, saving: allocSaving } = useBudgetAllocateSave({
    budgetId: selectedBudgetId,
    displayBrands,
    allocateHeaders,
    brandVersionMap,
    allocationValues,
    stores,
    seasonGroups,
    onSaved: (results: any[]) => {
      if (results.length > 0) {
        setAllocateHeaders(prev => {
          // Replace existing headers in-place; append new ones (from saveAsNew)
          const byId = new Map(results.map((r: any) => [Number(r.id), r]));
          const updated = prev.map((h: any) => byId.get(Number(h.id)) ?? h);
          results.forEach((r: any) => {
            if (!prev.some((h: any) => Number(h.id) === Number(r.id))) updated.push(r);
          });
          return updated;
        });
      }
      markClean();
    }});

  const saving = allocSaving || planSaving;

  // Handle export (placed after displayBrands + totalAllocated are defined)
  const handleExportExcel = useCallback(async () => {
    if (!selectedBudgetId) return;
    try {
      await exportAllocationToExcel({
        budgetName: selectedBudget?.budgetName || fallbackBudgetName || 'Allocation',
        fiscalYear: selectedBudget?.fiscalYear || selectedYear,
        stores,
        seasonGroups: selectedSeasonGroup ? [selectedSeasonGroup] : activeSeasonGroups,
        seasonConfig: dynamicSeasonConfig,
        brands: displayBrands,
        allocationValues,
        totalBudget,
        totalAllocated});
      toast.success(t('planning.exportSuccess'));
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(t('planning.saveFailed'));
    }
  }, [selectedBudgetId, selectedBudget, fallbackBudgetName, selectedYear, stores, selectedSeasonGroup, displayBrands, allocationValues, totalBudget, totalAllocated, t]);

  // Handle budget selection from dropdown - auto-populate other filters
  const handleBudgetSelect = (budget: any) => {
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

    if (budget.fiscalYear) setSelectedYear(budget.fiscalYear);

    setIsBudgetNameDropdownOpen(false);
  };

  // Mark an allocate header version as final
  const handleSetAllocateFinal = async (headerId: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await budgetService.setFinalAllocateVersion(String(headerId));
      // Update locally: flip is_final_version for the brand that owns this header
      setAllocateHeaders(prev => {
        const target = prev.find((h: any) => Number(h.id) === Number(headerId));
        if (!target) return prev;
        const brandId = Number(target.brand_id ?? target.brandId);
        return prev.map((h: any) => ({
          ...h,
          is_final_version: Number(h.brand_id ?? h.brandId) === brandId
            ? Number(h.id) === Number(headerId)
            : (h.is_final_version ?? false)}));
      });
      toast.success('Đã đặt phiên bản final.');
    } catch (err: any) {
      console.error('Failed to set final version:', err);
      toast.error('Đặt final thất bại.');
    }
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
  const handleSetFinalVersion = async (versionId: any, e: any) => {
    e.stopPropagation();
    try {
      await planningService.finalize(versionId);
      invalidateCache('/planning');
      toast.success(t('planning.latestVersion'));
      setVersions((prev: any) => prev.map((v: any) => ({
        ...v,
        isFinal: v.id === versionId
      })));
      setSelectedVersionId(versionId);
    } catch (err: any) {
      console.error('Failed to set version as final:', err);
      toast.error(t('approval.failedToSave'));
    }
  };

  const selectedVersion = versions.find((v: any) => v.id === selectedVersionId);

  // VAL-01: Check per-brand budget cap and show warning toast before save/submit
  const checkBrandCapAndWarn = useCallback(() => {
    if (totalBudget <= 0) return;
    const capPct = Math.round(BRAND_BUDGET_CAP_PCT * 100);
    const perBrand: Record<string, number> = {};
    Object.entries(allocationValues).forEach(([key, storeValues]: [string, any]) => {
      const brandId = key.split('-')[0];
      if (!brandId || !storeValues || typeof storeValues !== 'object') return;
      Object.values(storeValues).forEach((val: any) => {
        if (typeof val === 'number' && val > 0) {
          perBrand[brandId] = (perBrand[brandId] || 0) + val;
        }
      });
    });
    Object.entries(perBrand).forEach(([brandId, total]) => {
      const pct = Math.round((total / totalBudget) * 100);
      if (pct > capPct) {
        const label = brandNames[brandId] || brandId;
        toast(t('planning.brandBudgetCapWarning', { brand: label, pct: String(pct), cap: String(capPct) }), { icon: '\u26A0\uFE0F' });
      }
    });
  }, [allocationValues, totalBudget, brandNames, t]);

  const handleSaveDraft = useCallback(() => {
    checkBrandCapAndWarn();
    saveAllocation();
  }, [checkBrandCapAndWarn, saveAllocation]);

  const handleSaveAsNew = useCallback(() => {
    checkBrandCapAndWarn();
    saveAsNewAllocation();
  }, [checkBrandCapAndWarn, saveAsNewAllocation]);

  const handleSubmitForApproval = useCallback(() => {
    checkBrandCapAndWarn();
    submitForApproval(selectedVersionId);
  }, [checkBrandCapAndWarn, submitForApproval, selectedVersionId]);

  // Register save handlers in AppHeader — unregister on unmount
  useEffect(() => {
    registerSave(handleSaveDraft);
    registerSaveAsNew(handleSaveAsNew);
    return () => {
      unregisterSave();
      unregisterSaveAsNew();
    };
  }, [handleSaveDraft, handleSaveAsNew, registerSave, unregisterSave, registerSaveAsNew, unregisterSaveAsNew]);

  // Ctrl+S keyboard shortcut to save draft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveDraft]);

  const selectedGroupBrandObj = groupBrandList.find((g: any) => String(g.id) === String(selectedGroupBrand));
  const selectedBrandObj = brandList.find((b: any) => String(b.id) === String(selectedBrand));

  // Sync group brand / brand selection to the header breadcrumb
  useEffect(() => {
    const parts: string[] = [];
    if (selectedGroupBrandObj?.name) parts.push(selectedGroupBrandObj.name);
    if (selectedBrandObj?.name) parts.push(selectedBrandObj.name);
    setHeaderSubtitle(parts.length > 0 ? parts.join(' › ') : null);
    return () => { setHeaderSubtitle(null); };
  }, [selectedGroupBrandObj, selectedBrandObj, setHeaderSubtitle]);

  return (
    <>
      {/* ── Save loading overlay — blocks all interaction while saving ── */}
      {saving && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className={`flex flex-col items-center gap-4 px-8 py-6 rounded-2xl shadow-2xl border ${'bg-white border-[#C4B5A5]'}`}>
            <div className="w-10 h-10 rounded-full border-4 border-[#D7B797]/30 border-t-[#D7B797] animate-spin" />
            <div className="text-center">
              <p className={`text-sm font-semibold font-['Montserrat'] ${'text-[#0A0A0A]'}`}>Saving allocation…</p>
              <p className={`text-xs mt-1 ${'text-[#999]'}`}>Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section — hides entirely on scroll */}
      <div ref={barRef} className={`sticky -top-3 md:-top-6 z-[50] -mx-3 md:-mx-6 -mt-3 md:-mt-6 mb-2 md:mb-3 backdrop-blur-sm relative border-b ${'bg-white/95 border-[rgba(215,183,151,0.3)]'}`}>

        {/* ===== FILTER CONTENT ===== */}
            <div className={`flex items-center gap-1.5 px-3 md:px-6 py-1.5 relative z-[9999]`}>
              {/* Mobile Filter Button */}
              {isMobile && (
                <button
                  onClick={openFilter}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-md text-xs font-medium ${'bg-white border-[#C4B5A5] text-[#6B4D30]'}`}
                >
                  <Filter size={12} />
                  {t('common.filters')}
                </button>
              )}
              {/* Desktop Filters */}
              {!isMobile && <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {/* Year Filter */}
                <div className="relative shrink-0" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearDropdownOpen(!isYearDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                    }}
                    className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className={'text-[#666666]'} />
                      <span className="font-['JetBrains_Mono']">FY {selectedYear}</span>
                    </div>
                    <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isYearDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden ${'bg-white border-[#C4B5A5]'}`}>
                      {YEARS.map((year: any) => (
                        <div
                          key={year}
                          onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false); }}
                          className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedYear === year
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                        >
                          <span className="font-medium font-['JetBrains_Mono']">FY {year}</span>
                          {selectedYear === year && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Budget Name Dropdown */}
                <div className="relative flex-1 min-w-0" ref={budgetNameDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBudgetNameDropdownOpen(!isBudgetNameDropdownOpen);
                      setIsYearDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                    }}
                    className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedBudget
                      ?'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749] hover:border-[#2A9E6A]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText size={12} className={selectedBudget ? 'text-[#127749]' :'text-[#666666]'} />
                      <span className="truncate">{selectedBudget?.budgetName || fallbackBudgetName || t('planning.selectBudget')}</span>
                    </div>
                    <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-200 ${isBudgetNameDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isBudgetNameDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-xl shadow-xl z-[9999] overflow-hidden whitespace-nowrap w-max min-w-full ${'bg-white border-[#C4B5A5]'}`}>
                      <div className={`p-2 border-b ${'border-[#D4C8BB] bg-[rgba(160,120,75,0.08)]'}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wide font-['Montserrat'] ${'text-[#666666]'}`}>{t('budget.title')}</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto py-0.5">
                        {/* Loading state */}
                        {loadingBudgets && (
                          <div className="px-4 py-6 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
                            <span className={`ml-2 text-sm ${'text-[#666666]'}`}>{t('common.loading')}...</span>
                          </div>
                        )}
                        {/* Empty state */}
                        {!loadingBudgets && availableBudgets.length === 0 && (
                          <div className={`px-4 py-6 text-center text-sm ${'text-[#666666]'}`}>
                            {t('budget.noMatchingBudgets')}
                          </div>
                        )}
                        {/* Clear Selection Option */}
                        {!loadingBudgets && availableBudgets.length > 0 && (
                        <div
                          onClick={() => handleBudgetSelect(null)}
                          className={`px-4 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${!selectedBudgetId
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'}`}
                        >
                          <span className="font-medium">{t('planning.selectBudget')}</span>
                          {!selectedBudgetId && <Check size={14} className="text-[#127749]" />}
                        </div>
                        )}
                        {!loadingBudgets && availableBudgets.map((budget: any) => (
                          <div
                            key={budget.id}
                            onClick={() => handleBudgetSelect(budget)}
                            className={`px-4 py-0.5 cursor-pointer transition-colors border-t ${'border-[#D4C8BB]'} ${selectedBudgetId === budget.id
                              ?'bg-[rgba(18,119,73,0.1)]':'hover:bg-[rgba(160,120,75,0.18)]'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-sm font-['Montserrat'] ${selectedBudgetId === budget.id ? 'text-[#127749]' :'text-[#0A0A0A]'}`}>
                                  {budget.budgetName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-['JetBrains_Mono'] ${'text-[#666666]'}`}>FY{budget.fiscalYear}</span>
                                  <span className={'text-[#2E2E2E]/30'}>•</span>
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

                {/* Group Brand Filter */}
                <div className="relative flex-1 min-w-0" ref={groupBrandDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupBrandDropdownOpen(!isGroupBrandDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                    }}
                    className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedGroupBrand
                      ?'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <Layers size={12} className={`shrink-0 ${selectedGroupBrand ? ('text-[#6B4D30]') :'text-[#666666]'}`} />
                      <span className="truncate">{selectedGroupBrandObj?.name || t('budget.allGroupBrands')}</span>
                    </div>
                    <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isGroupBrandDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGroupBrandDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max ${'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedGroupBrand(null); setSelectedBrand(null); setIsGroupBrandDropdownOpen(false); }}
                        className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedGroupBrand === null
                          ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                      >
                        <span className="font-medium">{t('budget.allGroupBrands')}</span>
                        {selectedGroupBrand === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {groupBrandList.map((group: any) => (
                        <div
                          key={group.id}
                          onClick={() => { setSelectedGroupBrand(group.id); setSelectedBrand(null); setIsGroupBrandDropdownOpen(false); }}
                          className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${String(selectedGroupBrand) === String(group.id)
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                        >
                          <span className="font-medium">{group.name}</span>
                          {String(selectedGroupBrand) === String(group.id) && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brand Filter */}
                <div className="relative flex-1 min-w-0" ref={brandDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBrandDropdownOpen(!isBrandDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsGroupBrandDropdownOpen(false);
                      setIsSeasonDropdownOpen(false);
                    }}
                    className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedBrand
                      ?'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <Tag size={12} className={`shrink-0 ${selectedBrand ? ('text-[#6B4D30]') :'text-[#666666]'}`} />
                      <span className="truncate">{selectedBrandObj?.name || t('budget.allBrands')}</span>
                    </div>
                    <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isBrandDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max max-h-60 overflow-y-auto ${'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedBrand(null); setIsBrandDropdownOpen(false); }}
                        className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedBrand === null
                          ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                      >
                        <span className="font-medium">{t('budget.allBrands')}</span>
                        {selectedBrand === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {filteredBrands.map((brand: any) => (
                        <div
                          key={brand.id}
                          onClick={() => { setSelectedBrand(brand.id); setIsBrandDropdownOpen(false); }}
                          className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${String(selectedBrand) === String(brand.id)
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                        >
                          <span className="font-medium">{brand.name}</span>
                          {String(selectedBrand) === String(brand.id) && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Season Group Filter */}
                <div className="relative flex-1 min-w-0" ref={seasonDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSeasonDropdownOpen(!isSeasonDropdownOpen);
                      setIsBudgetNameDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsSubSeasonDropdownOpen(false);
                    }}
                    className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedSeasonGroup
                      ? selectedSeasonGroup === 'SS'
                        ?'bg-[rgba(227,179,65,0.15)] border-[#E3B341] text-[#6B4D30] hover:border-[#D7B797]':'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      {selectedSeasonGroup === 'SS' ? <Sun size={12} className="shrink-0 text-[#E3B341]" /> : selectedSeasonGroup === 'FW' ? <Snowflake size={12} className={`shrink-0 ${'text-[#6B4D30]'}`} /> : <Filter size={12} className={`shrink-0 ${'text-[#666666]'}`} />}
                      <span className="truncate">{selectedSeasonGroup ? (dynamicSeasonConfig[selectedSeasonGroup]?.name || selectedSeasonGroup) : t('planning.allSeasonGroups')}</span>
                    </div>
                    <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isSeasonDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max ${'bg-white border-[#C4B5A5]'}`}>
                      <div
                        onClick={() => { setSelectedSeasonGroup(null); setIsSeasonDropdownOpen(false); }}
                        className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeasonGroup === null
                          ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Filter size={14} className={'text-[#666666]'} />
                          <span className="font-medium">{t('planning.allSeasonGroups')}</span>
                        </div>
                        {selectedSeasonGroup === null && <Check size={14} className="text-[#127749]" />}
                      </div>
                      {activeSeasonGroups.map((sg: any) => (
                        <div
                          key={sg}
                          onClick={() => { setSelectedSeasonGroup(sg); setIsSeasonDropdownOpen(false); }}
                          className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeasonGroup === sg
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                        >
                          <div className="flex items-center gap-2">
                            {sg === 'SS' ? <Sun size={14} className="text-[#E3B341]" /> : <Snowflake size={14} className={'text-[#6B4D30]'} />}
                            <span className="font-medium">{dynamicSeasonConfig[sg]?.name || sg}</span>
                          </div>
                          {selectedSeasonGroup === sg && <Check size={14} className="text-[#127749]" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-Season Filter — only shown when a Season Group is selected */}
                {selectedSeasonGroup && availableSubSeasons.length > 0 && (
                  <div className="relative flex-1 min-w-0" ref={subSeasonDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubSeasonDropdownOpen(!isSubSeasonDropdownOpen);
                        setIsSeasonDropdownOpen(false);
                        setIsBudgetNameDropdownOpen(false);
                        setIsYearDropdownOpen(false);
                      }}
                      className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedSeason
                        ?'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <ChevronRight size={12} className={`shrink-0 ${selectedSeason ? ('text-[#6B4D30]') :'text-[#666666]'}`} />
                        <span className="truncate">{selectedSeason || t('planning.allSeasons')}</span>
                      </div>
                      <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isSubSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSubSeasonDropdownOpen && (
                      <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max ${'bg-white border-[#C4B5A5]'}`}>
                        <div
                          onClick={() => { setSelectedSeason(null); setIsSubSeasonDropdownOpen(false); }}
                          className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeason === null
                            ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                        >
                          <span className="font-medium">{t('planning.allSeasons')}</span>
                          {selectedSeason === null && <Check size={14} className="text-[#127749]" />}
                        </div>
                        {availableSubSeasons.map((ss: any) => (
                          <div
                            key={ss}
                            onClick={() => { setSelectedSeason(ss); setIsSubSeasonDropdownOpen(false); }}
                            className={`px-3 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedSeason === ss
                              ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                          >
                            <span className="font-medium">{ss}</span>
                            {selectedSeason === ss && <Check size={14} className="text-[#127749]" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>}

              {/* Clear all filters - icon only */}
              {selectedBudgetId && (
                <button
                  onClick={() => {
                    clearBudgetSelection();
                    setBrandVersionMap({});
                  }}
                  className={`shrink-0 px-1.5 py-1 rounded-md transition-colors ${'text-[#666666] hover:text-[#F85149] hover:bg-red-50'}`}
                  title={t('common.clearAllFilters')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
      </div>

      {/* Loading skeleton */}
      {loadingBudgets && !selectedBudgetId && (
        <TableSkeleton rows={4} cols={stores.length + 3} />
      )}

      {/* Budget Table - Collapsible by Group Brand and Brand */}
      {(selectedBudget || selectedBudgetId) && (
        <>
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const allCollapsed = brandList.length > 0 && brandList.every((b: any) => collapsedBrands[b.id]);
            return (
              <button
                onClick={allCollapsed ? expandAll : collapseAll}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${'bg-white border border-[#C4B5A5] text-[#666666] hover:text-[#333333] hover:border-[#999]'}`}
              >
                {allCollapsed ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            );
          })()}
        </div>
        <div className="space-y-2">
          {displayGroups.map((group: any) => {
            const groupBrands = displayBrands.filter((b: any) => b.groupBrandId === group.id);
            const isGroupCollapsed = collapsedGroups[group.id];

            // Calculate group totals from pre-computed brand totals
            const groupTotals = groupBrands.reduce((acc: any, brand: any) => {
              const brandTotals = tableComputedData.brandTotalsMap[brand.id] || { sum: 0 };
              stores.forEach((s: any) => { acc[s.id] = (acc[s.id] || 0) + (brandTotals[s.id] || 0); });
              acc.sum += brandTotals.sum;
              return acc;
            }, { sum: 0 } as Record<string, any>);

            return (
              <div key={group.id} className={`rounded-xl shadow-sm border overflow-hidden ${'bg-white border-[#C4B5A5]'}`}>
                {/* Group Header - Collapsible with Total Budget */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className={`px-3 md:px-4 py-0.5 bg-gradient-to-r ${group.color} border-b border-[#C4B5A5] flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer hover:opacity-90`}
                >
                  <div className="flex items-center gap-2 md:gap-4">
                      <ChevronRight
                        size={20}
                        className={`text-white transition-transform duration-200 ${!isGroupCollapsed ? 'rotate-90' : ''}`}
                      />
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white text-xs font-bold font-['Montserrat'] shadow-sm">
                      {group.id}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white font-['Montserrat']">{group.name}</div>
                      <div className="text-[10px] text-white/80 font-['JetBrains_Mono']">
                        {groupBrands.length} brand{groupBrands.length !== 1 ? 's' : ''} • {selectedSeasonGroup ? dynamicSeasonConfig[selectedSeasonGroup]?.name : t('planning.allSeasonGroups')} {selectedYear}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Budget Allocated - show when budget is selected */}
                   
                    {/* Group Total */}
                    <div className="text-right">
                      <div className="text-xs text-white/80 font-['Montserrat']">{t('skuProposal.totalPlanned')}</div>
                      <div className="font-bold text-sm text-white font-['JetBrains_Mono'] flex items-center gap-2 justify-end">
                        {formatCurrency(groupTotals.sum)}
                        {totalBudget > 0 && (() => {
                          const allocPct = Math.round((groupTotals.sum / totalBudget) * 100);
                          const badgeColor = allocPct === 0
                            ? 'bg-white/20 text-white/80'
                            : allocPct > 100
                              ? 'bg-[#F85149] text-white'
                              : allocPct === 100
                                ? 'bg-[#2A9E6A] text-white'
                                : 'bg-[#D97706] text-white';
                          return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{allocPct}%</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Content - Collapsible */}
                {!isGroupCollapsed && (
                  <div>
                    {groupBrands.map((brand: any) => {
                      const isBrandCollapsed = collapsedBrands[brand.id];
                      const brandTotals = tableComputedData.brandTotalsMap[brand.id] || { sum: 0 };

                      return (
                        <div key={brand.id} className={`last:border-b-0 ${'border-b border-[#D4C8BB]'}`}>
                          {/* Brand Header - Collapsible when multiple brands */}
                          {(groupBrands.length > 1) && (
                            <div
                              onClick={() => toggleBrandCollapse(brand.id)}
                              className={`px-3 md:px-4 py-0.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-0 cursor-pointer transition-colors ${'bg-gradient-to-r from-[rgba(215,183,151,0.05)] to-[rgba(215,183,151,0.1)] border-[#C4B5A5] hover:bg-[rgba(160,120,75,0.18)]'}`}
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight
                                  size={18}
                                  className={`transition-transform duration-200 ${'text-[#666666]'} ${!isBrandCollapsed ? 'rotate-90' : ''}`}
                                />
                                <Tag size={16} className={'text-[#666666]'} />
                                {(() => {
                                  const brandStatuses = (selectedSeasonGroup ? [selectedSeasonGroup] : activeSeasonGroups)
                                    .flatMap((sg: string) => (dynamicSeasonConfig[sg]?.subSeasons || [])
                                      .map((ss: string) => tableComputedData.rowStatusMap[`${brand.id}-${sg}-${ss}`] || 'empty')
                                    );
                                  const bs = getAggregateStatus(brandStatuses);
                                  return <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    bs === 'complete' ? 'bg-[#2A9E6A]'
                                    : bs === 'partial' ? 'bg-[#D97706]'
                                    :'bg-[#D1D5DB]'}`} />;
                                })()}
                                <span className={`font-semibold text-xs font-['Montserrat'] uppercase tracking-wide ${'text-[#0A0A0A]'}`}>{brand.name}</span>
                              </div>
                              <div className="flex items-center gap-2 md:gap-4">
                                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                  {stores.map((store: any) => (
                                  <div key={store.id} className="text-right">
                                    <span className={`text-xs ${'text-[#666666]'}`}>{store.code}: </span>
                                    <span className={`text-xs md:text-sm font-medium font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>{formatCurrency(brandTotals[store.id] || 0)}</span>
                                  </div>
                                  ))}
                                  <div className="text-right flex items-center gap-1.5">
                                    <span className={`text-xs ${'text-[#666666]'}`}>{t('skuProposal.total')}: </span>
                                    <span className={`font-semibold font-['JetBrains_Mono'] ${'text-[#127749]'}`}>{formatCurrency(brandTotals.sum)}</span>
                                    {totalBudget > 0 && (() => {
                                      const bPct = Math.round((brandTotals.sum / totalBudget) * 100);
                                      const bc = bPct === 0
                                        ? ('bg-[#E5E7EB] text-[#6B7280]')
                                        : bPct > 100
                                          ? 'bg-[#F85149]/15 text-[#F85149]'
                                          : bPct === 100
                                            ? ('bg-[#127749]/15 text-[#127749]')
                                            : 'bg-[#D97706]/15 text-[#D97706]';
                                      return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${bc}`}>{bPct}%</span>;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Brand Table Content */}
                          {(!isBrandCollapsed || groupBrands.length === 1) && (
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
                              <table className="w-full">
                                <thead className="sticky top-0 z-10">
                                  <tr className={'bg-[rgba(215,183,151,0.2)]'}>
                                    <th className={`sticky left-0 z-20 px-3 md:px-4 py-0.5 text-left text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333] bg-[rgba(215,183,151,0.2)]'}`}>
                                      {(() => {
                                          const brandHeaders = allocateHeaders.filter(
                                            (h: any) => (h.brand_id ?? h.brandId) === brand.id
                                          );
                                          const selectedHeader = brandHeaders.find((h: any) => h.id === brandVersionMap[brand.id]);
                                          const selectedIsFinal = selectedHeader?.is_final_version ?? selectedHeader?.isFinalVersion ?? false;
                                          return (
                                          <div className="relative brand-version-dropdown">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); if (brandHeaders.length > 0) { if (openVersionBrandId === brand.id) { setOpenVersionBrandId(null); setDropdownAnchorEl(null); } else { setOpenVersionBrandId(brand.id); setDropdownAnchorEl(e.currentTarget); } } }}
                                              disabled={brandHeaders.length === 0}
                                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                brandHeaders.length === 0
                                                  ?'bg-[rgba(215,183,151,0.1)] text-[#aaa] cursor-not-allowed': selectedHeader
                                                    ? selectedIsFinal
                                                      ?'bg-[rgba(215,183,151,0.25)] text-[#6B4D30]':'bg-[rgba(18,119,73,0.15)] text-[#127749]':'bg-[rgba(215,183,151,0.15)] text-[#666666] hover:text-[#333333]'}`}
                                            >
                                              <ChevronDown size={11} className={`shrink-0 transition-transform ${openVersionBrandId === brand.id ? 'rotate-180' : ''}`} />
                                              {selectedHeader ? (
                                                <>
                                                  {selectedIsFinal && <Star size={11} className="shrink-0 fill-current" />}
                                                  <span className="whitespace-nowrap">Version {selectedHeader.version}</span>
                                                  {selectedIsFinal && <span className="px-1 text-[9px] font-bold rounded bg-[#D7B797] text-[#0A0A0A]">FINAL</span>}
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles size={11} className="shrink-0" />
                                                  <span className="whitespace-nowrap">Version</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                          );
                                        })()}
                                    </th>
                                    {stores.map((store: any) => (
                                      <th key={store.id} className={`px-1.5 py-0.5 text-center text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333]'}`}>
                                        <div>{store.code} <span className={`font-normal font-['JetBrains_Mono'] text-[10px] ${'text-[#666666]'}`}>({storePercentages[store.id]}%)</span></div>
                                      </th>
                                    ))}
                                    <th className={`px-1.5 py-0.5 text-center text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333]'}`}>{t('planning.totalValue')}</th>
                                    <th className={`px-1.5 py-0.5 text-center text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333]'}`}>MIX</th>
                                    <th className={`px-1.5 py-0.5 text-center text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333]'}`}>{t('planning.comment')}</th>
                                    <th className={`px-1.5 py-0.5 text-center text-xs font-semibold font-['Montserrat'] whitespace-nowrap ${'text-[#333333]'}`}>{t('common.actions')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Render seasons based on selection */}
                                  {(selectedSeasonGroup ? [selectedSeasonGroup] : activeSeasonGroups).map((seasonGroup: any) => (
                                    <Fragment key={`${brand.id}-${seasonGroup}`}>
                                      {/* Season Group Header — summary row (non-editable) */}
                                      <tr data-season-group={seasonGroup} className={`border-b ${'bg-[rgba(160,120,75,0.18)] border-[#C4B5A5]'}`}>
                                        <td className={`sticky left-0 z-20 px-3 md:px-4 py-1 ${'bg-[rgba(160,120,75,0.18)]'}`}>
                                          <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-4 rounded-full ${seasonGroup === 'SS' ? 'bg-[#E3B341]' : 'bg-[#D7B797]'}`}></div>
                                            {seasonGroup === 'SS' ? (
                                              <Sun size={14} className="text-[#E3B341]" />
                                            ) : (
                                              <Snowflake size={14} className={'text-[#6B4D30]'} />
                                            )}
                                            {(() => {
                                              const sgSubSeasons = dynamicSeasonConfig[seasonGroup]?.subSeasons || [];
                                              const sgStatus = getAggregateStatus(
                                                sgSubSeasons.map((ss: string) => tableComputedData.rowStatusMap[`${brand.id}-${seasonGroup}-${ss}`] || 'empty')
                                              );
                                              return <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                sgStatus === 'complete' ? 'bg-[#2A9E6A]'
                                                : sgStatus === 'partial' ? 'bg-[#D97706]'
                                                :'bg-[#D1D5DB]'}`} />;
                                            })()}
                                            <span className={`font-semibold text-xs font-['Montserrat'] uppercase tracking-wide ${'text-[#4A3728]'}`}>{dynamicSeasonConfig[seasonGroup]?.name}</span>
                                          </div>
                                        </td>
                                        {(() => {
                                          const sgKey = `${brand.id}-${seasonGroup}`;
                                          const sgPre = tableComputedData.seasonTotalsMap[sgKey] || { sum: 0 };
                                          // honour manual seasonTotalValues overrides
                                          const sgVal = (storeId: string) =>
                                            seasonTotalValues[sgKey]?.[storeId] !== undefined
                                              ? seasonTotalValues[sgKey][storeId]
                                              : (sgPre[storeId] || 0);
                                          const sgSum = stores.reduce((acc: number, st: any) => acc + sgVal(st.id), 0);
                                          const bTotal = tableComputedData.brandTotalsMap[brand.id] || { sum: 0 };
                                          const mixPct = !selectedSeasonGroup && bTotal.sum > 0
                                            ? Math.round((sgSum / bTotal.sum) * 100) : null;
                                          return (
                                            <>
                                              {stores.map((store: any) => (
                                                <td key={store.id} className="px-1.5 py-1 text-center">
                                                  <div className={`px-1.5 py-0.5 text-center text-xs font-bold font-['JetBrains_Mono'] ${'text-[#4A3728]'}`}>
                                                    {formatCurrency(sgVal(store.id))}
                                                  </div>
                                                </td>
                                              ))}
                                              <td className="px-1.5 py-1 text-center">
                                                <div className={`px-2 py-0.5 rounded font-bold text-xs font-['JetBrains_Mono'] ${' text-[#4A3728]'}`}>
                                                  {formatCurrency(sgSum)}
                                                </div>
                                              </td>
                                              <td className={`px-2 py-1 text-center text-xs font-bold font-['JetBrains_Mono'] ${'text-[#4A3728]'}`}>
                                                {mixPct === null ? '100%' : `${mixPct}%`}
                                              </td>
                                            </>
                                          );
                                        })()}
                                        <td className="px-2 py-1"></td>
                                        <td className="px-2 py-1"></td>
                                      </tr>

                                      {/* Sub-Season Rows */}
                                      {(dynamicSeasonConfig[seasonGroup]?.subSeasons || []).filter((ss: any) => !selectedSeason || ss === selectedSeason).map((subSeason: any) => {
                                        const data = tableComputedData.rowDataMap[`${brand.id}-${seasonGroup}-${subSeason}`] || { sum: 0 };
                                        const bTotalForMix = tableComputedData.brandTotalsMap[brand.id] || { sum: 0 };
                                        const mix = bTotalForMix.sum > 0 ? Math.round((data.sum / bTotalForMix.sum) * 100) : 0;

                                        return (
                                          <tr key={`${brand.id}-${seasonGroup}-${subSeason}`} className={`border-b transition-colors ${'border-[#D4C8BB] hover:bg-[rgba(160,120,75,0.12)]'}`}>
                                            <td className={`sticky left-0 z-20 px-3 md:px-4 py-0.5 pl-10 md:pl-12 ${'bg-white'}`}>
                                              <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                  (() => {
                                                    const st = tableComputedData.rowStatusMap[`${brand.id}-${seasonGroup}-${subSeason}`] || 'empty';
                                                    return st === 'complete' ? 'bg-[#2A9E6A]'
                                                         : st === 'partial'  ? 'bg-[#D97706]'
                                                         :'bg-[#D1D5DB]';
                                                  })()
                                                }`} />
                                                <span className={`text-xs font-medium ${'text-[#666666]'}`}>{subSeason}</span>
                                              </div>
                                            </td>
                                            {stores.map((store: any) => {
                                              const cellVal = data[store.id] || 0;
                                              const isNegative = typeof cellVal === 'number' && cellVal < 0;
                                              const isEditing = editingCell === `${brand.id}-${seasonGroup}-${subSeason}-${store.id}`;
                                              return (
                                            <td key={store.id} className="px-1.5 py-0.5 text-center">
                                              <div className="relative group">
                                                <input
                                                  type="text"
                                                  data-alloc-cell
                                                  value={isEditing ? (cellVal || '') : formatCurrency(cellVal)}
                                                  onChange={(e) => handleAllocationChange(brand.id, seasonGroup, subSeason, store.id, e.target.value)}
                                                  onFocus={(e) => {
                                                    setEditingCell(`${brand.id}-${seasonGroup}-${subSeason}-${store.id}`);
                                                    e.target.select();
                                                  }}
                                                  onBlur={() => setEditingCell(null)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                                      e.preventDefault();
                                                      const cells = Array.from(document.querySelectorAll<HTMLInputElement>('[data-alloc-cell]'));
                                                      const idx = cells.indexOf(e.currentTarget);
                                                      if (idx >= 0) {
                                                        const nextIdx = e.shiftKey ? idx - 1 : idx + (e.key === 'Enter' ? stores.length : 1);
                                                        const nextCell = cells[nextIdx];
                                                        if (nextCell) nextCell.focus();
                                                      }
                                                    }
                                                    if (e.key === 'Escape') {
                                                      e.currentTarget.blur();
                                                    }
                                                  }}
                                                  className={`w-full pl-4 pr-1.5 py-0.5 text-center border rounded text-xs focus:outline-none focus:ring-1 font-medium font-['JetBrains_Mono'] transition-colors ${
                                                    isNegative
                                                      ? 'border-[#F85149] focus:ring-[#F85149] focus:border-[#F85149] text-[#F85149]'
                                                      : `focus:ring-[#D7B797] focus:border-[#D7B797] ${'border-[#C4B5A5] text-[#0A0A0A] bg-white hover:border-[rgba(215,183,151,0.4)]'}`
                                                  }`}
                                                  placeholder="0"
                                                  title={isNegative ? t('planning.cellNegative') : undefined}
                                                />
                                                <Pencil size={8} className={`absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none ${isNegative ? 'text-[#F85149]/60' :'text-[#8A6340]/30'}`} />
                                              </div>
                                            </td>
                                              );
                                            })}
                                            <td className="px-1.5 py-0.5 text-center">
                                              <div className={`px-1.5 py-0.5 font-semibold text-xs font-['JetBrains_Mono'] ${' text-[#127749]'}`}>
                                                {formatCurrency(data.sum)}
                                              </div>
                                            </td>
                                            <td className={`px-2 py-0.5 text-center text-xs font-['JetBrains_Mono'] ${'text-[#666666]'}`}>
                                              {mix}%
                                            </td>
                                            <td className="px-1.5 py-0.5">
                                              <input
                                                type="text"
                                                value={allocationComments[`${brand.id}-${seasonGroup}-${subSeason}`] || ''}
                                                onChange={(e) => handleCommentChange(brand.id, seasonGroup, subSeason, e.target.value)}
                                                className={`w-full min-w-[80px] px-1.5 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#D7B797] focus:border-[#D7B797] ${'border-[#C4B5A5] text-[#0A0A0A] bg-white hover:border-[rgba(215,183,151,0.4)]'}`}
                                                placeholder={t('planning.commentPlaceholder')}
                                              />
                                            </td>
                                            <td className="px-1.5 py-0.5 text-center">
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
                                                      storeValues: stores.reduce((acc: any, s: any) => ({ ...acc, [s.id]: data[s.id] || 0 }), {})
                                                    });
                                                  }
                                                }}
                                                className={`p-1 rounded-md transition ${'bg-[rgba(160,120,75,0.18)] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.25)] border border-[rgba(215,183,151,0.4)]'}`}
                                                title={t('budget.allocateOTB')}
                                              >
                                                <Split size={12} />
                                              </button>

                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </Fragment>
                                  ))}

                                  {/* Total Row — grand total (non-editable) */}
                                  <tr className={`border-t-2 ${'bg-[rgba(18,119,73,0.12)] border-[#127749]'}`}>
                                    <td className="px-3 md:px-4 py-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-4 rounded-full ${'bg-[#127749]'}`}></div>
                                        <span className={`font-semibold text-xs font-['Montserrat'] uppercase tracking-wide ${'text-[#127749]'}`}>TOTAL</span>
                                      </div>
                                    </td>
                                    {stores.map((store: any) => (
                                    <td key={store.id} className="px-1.5 py-1.5 text-center">
                                      <div className={`px-1.5 py-0.5 text-center text-sm font-black font-['JetBrains_Mono'] ${'text-[#127749]'}`}>
                                        {formatCurrency(getBrandTotalValue(brand.id, store.id) || 0)}
                                      </div>
                                    </td>
                                    ))}

                                    <td className="px-1.5 py-1.5 text-center">
                                      <div className={`font-black text-sm font-['JetBrains_Mono'] ${'text-[#333333]'}`}>
                                        {formatCurrency(stores.reduce((s: number, st: any) => s + (getBrandTotalValue(brand.id, st.id) || 0), 0))}
                                      </div>
                                    </td>
                                    <td className={`px-2 py-1.5 text-center text-sm font-black font-['JetBrains_Mono'] ${'text-[#127749]'}`}>100%</td>
                                    <td className="px-2 py-1.5"></td>
                                    <td className="px-2 py-1.5"></td>
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
        </>
      )}
      {/* Combined Progress Bar + Allocate All Footer */}
      {(selectedBudget || selectedBudgetId) && (
        <div className={`mt-4 rounded-xl border overflow-hidden ${'border-[rgba(215,183,151,0.3)] bg-white'}`}>
          <div className="flex items-center gap-4 px-4 py-2.5">
            <div className="flex-1">
              <AllocationProgressBar
                totalBudget={totalBudget}
                totalAllocated={totalAllocated}
              />
            </div>
            {autoSaving && <span className="text-xs text-slate-400 animate-pulse whitespace-nowrap">Auto-saving…</span>}
            {!autoSaving && lastSavedAt && <span className="text-xs text-slate-400 whitespace-nowrap">Saved {lastSavedAt}</span>}
            <button
              onClick={handleAllocateAll}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all ${'bg-[rgba(18,119,73,0.12)] border border-[#127749] text-[#127749] hover:bg-[rgba(18,119,73,0.2)]'}`}
            >
              <ChevronRight size={14} />
              Allocate All
            </button>
          </div>
        </div>
      )}

      {/* Allocation Side Panel */}
      <AllocationSidePanel
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        validationIssues={validationIssues}
        versions={versions}
        selectedVersionId={selectedVersionId}
        onCompareVersion={(versionId) => {
          if (selectedVersionId && versionId !== selectedVersionId) {
            const vA = versions.find(v => v.id === selectedVersionId);
            const vB = versions.find(v => v.id === versionId);
            if (vA && vB) setCompareModal({ a: vA, b: vB });
          }
        }}
      />

      {/* Leave Confirmation Dialog (3 options) */}
      {leaveDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm mx-4 rounded-xl border shadow-2xl p-5 ${'bg-white border-[#C4B5A5]'}`}>
            <h3 className={`font-semibold font-['Montserrat'] mb-2 ${'text-[#0A0A0A]'}`}>
              {t('planning.leaveWithoutSaving')}
            </h3>
            <p className={`text-sm mb-4 ${'text-[#666]'}`}>
              {t('planning.leaveDesc')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLeaveWithSave}
                className={`w-full px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${'bg-[rgba(18,119,73,0.12)] text-[#127749] hover:bg-[rgba(18,119,73,0.2)]'}`}
              >
                {t('planning.saveAndLeave')}
              </button>
              <button
                onClick={handleLeaveWithoutSave}
                className="w-full px-4 py-2 rounded-lg text-xs font-semibold text-[#F85149] hover:bg-[rgba(248,81,73,0.1)] transition-colors"
              >
                {t('planning.leaveWithoutSave')}
              </button>
              <button
                onClick={() => setLeaveDialog(null)}
                className={`w-full px-4 py-2 rounded-lg text-xs font-medium transition-colors ${'text-[#666] hover:bg-[rgba(160,120,75,0.12)]'}`}
              >
                {t('planning.stay')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Compare Modal */}
      {compareModal && (
        <VersionCompareModal
          isOpen={!!compareModal}
          onClose={() => setCompareModal(null)}
          versionA={compareModal.a}
          versionB={compareModal.b}
        />
      )}

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterOpen}
        onClose={closeFilter}
        filters={[
          {
            key: 'budgetName',
            label: t('budget.budgetName'),
            type: 'single' as const,
            options: availableBudgets.map((b: any) => ({ label: b.budgetName, value: b.id }))},
          {
            key: 'year',
            label: t('budget.fiscalYear'),
            type: 'single' as const,
            options: YEARS.map((y: any) => ({ label: `FY${y}`, value: String(y) }))},
          {
            key: 'seasonGroup',
            label: t('planning.seasonGroup'),
            type: 'single' as const,
            options: activeSeasonGroups.map((sg: any) => ({ label: dynamicSeasonConfig[sg]?.name || sg, value: sg }))},
          ...(selectedBudgetId && versions.length > 0 ? [{
            key: 'version',
            label: 'Version',
            type: 'single' as const,
            options: versions.map((v: any) => ({ label: `${v.name}${v.isFinal ? ' (FINAL)' : ''}`, value: v.id }))}] : []),
        ]}
        values={mobileFilterValues}
        onChange={(key, value) => setMobileFilterValues(prev => ({ ...prev, [key]: value }))}
        onApply={() => {
          if (mobileFilterValues.budgetName) {
            const budget = availableBudgets.find((b: any) => b.id === mobileFilterValues.budgetName);
            if (budget) handleBudgetSelect(budget);
          } else {
            clearBudgetSelection();
          }
          setSelectedYear(mobileFilterValues.year ? Number(mobileFilterValues.year) : 2025);
          setSelectedSeasonGroup((mobileFilterValues.seasonGroup as string) || null);
          if (mobileFilterValues.version) setSelectedVersionId(mobileFilterValues.version as string);
        }}
        onReset={() => {
          setMobileFilterValues({});
          clearBudgetSelection();
          setSelectedYear(2025);
          setSelectedSeasonGroup(null);
          setSelectedVersionId(null);
          setVersions([]);
        }}
      />

      {/* Version dropdown portal — renders outside overflow containers */}
      {openVersionBrandId && dropdownAnchorEl && typeof document !== 'undefined' && (() => {
        const rect = dropdownAnchorEl.getBoundingClientRect();
        const brandHeaders = allocateHeaders.filter(
          (h: any) => (h.brand_id ?? h.brandId) === openVersionBrandId
        );
        return createPortal(
          <div
            className="brand-version-portal"
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              zIndex: 99999,
              minWidth: 200}}
          >
            <div className={`border rounded-lg shadow-xl overflow-hidden ${'bg-white border-[#C4B5A5]'}`}>
              <div className={`px-2 py-1 border-b ${'border-[#D4C8BB] bg-[rgba(160,120,75,0.08)]'}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wide font-['Montserrat'] ${'text-[#666666]'}`}>Allocate Versions</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {brandHeaders.map((header: any) => {
                  const isFinal = header.is_final_version ?? header.isFinalVersion ?? false;
                  const isSelected = brandVersionMap[openVersionBrandId] === header.id;
                  return (
                    <div
                      key={header.id}
                      onClick={(e) => { e.stopPropagation(); setBrandVersionMap(prev => ({...prev, [openVersionBrandId]: header.id})); setOpenVersionBrandId(null); setDropdownAnchorEl(null); }}
                      className={`px-3 py-1 flex items-center justify-between cursor-pointer transition-colors text-xs border-t ${'border-[#E5E0DB]'} ${
                        isSelected
                          ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isFinal && <Star size={11} className={'text-[#6B4D30] fill-[#6B4D30] shrink-0'} />}
                        <span className="font-medium truncate">Version {header.version}</span>
                        {isFinal && <span className="px-1 py-px text-[8px] font-bold bg-[#D7B797] text-[#0A0A0A] rounded shrink-0">FINAL</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isFinal && (
                          <button
                            onClick={(e) => { handleSetAllocateFinal(header.id, e); setOpenVersionBrandId(null); setDropdownAnchorEl(null); }}
                            title="Set as final version"
                            className={`p-0.5 rounded transition-colors ${'text-[#aaa] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.15)]'}`}
                          >
                            <Star size={10} />
                          </button>
                        )}
                        {isSelected && <Check size={11} className="text-[#127749]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </>
  );
};

export default BudgetAllocateScreen;
