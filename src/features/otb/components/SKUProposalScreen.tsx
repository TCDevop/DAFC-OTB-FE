'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Package, Pencil, X, Plus, Trash2, Ruler, Clock, Users,
  Layers, Check, LayoutGrid, List, SlidersHorizontal, Download, Upload, Send, Tag, Star, Sparkles,
  AlertTriangle, ArrowRight, Save, FilePlus, FileText, Columns2, PanelRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils';
import { budgetService, masterDataService, proposalService, planningService } from '@/services';
import { invalidateCache } from '@/services/api';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { FilterBottomSheet, useBottomSheet } from '@/components/mobile';
import { ProductImage, ConfirmDialog, FilterSelect, ScrollToHeader } from '@/components/ui';
import CreatableSelect from '@/components/ui/CreatableSelect';
import AddSKUModal from './AddSKUModal';
import {
  exportSKUProposalExcel, importSKUProposalExcel,
  type SKUExportBlock, type SizingExportRow, type SKUProposalImportResult,
} from '../utils/exportSKUProposalExcel';

// Season groups & seasons are now loaded from API (masterDataService.getSeasonGroups)

// DAFC Design System card backgrounds - warm gold tints
const CARD_BG_CLASSES = [
  { light: 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.3)]', dark: 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.2)]' },
  { light: 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.35)]', dark: 'bg-[rgba(215,183,151,0.1)] border-[rgba(215,183,151,0.25)]' },
  { light: 'bg-[rgba(18,119,73,0.08)] border-[rgba(18,119,73,0.2)]', dark: 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)]' },
  { light: 'bg-[rgba(215,183,151,0.12)] border-[rgba(215,183,151,0.32)]', dark: 'bg-[rgba(215,183,151,0.06)] border-[rgba(215,183,151,0.18)]' },
  { light: 'bg-[rgba(18,119,73,0.06)] border-[rgba(18,119,73,0.18)]', dark: 'bg-[rgba(42,158,106,0.08)] border-[rgba(42,158,106,0.2)]' },
  { light: 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)]', dark: 'bg-[rgba(215,183,151,0.05)] border-[rgba(215,183,151,0.15)]' }
];

// Fallback size keys (used only when DB sizes haven't loaded yet)
const FALLBACK_SIZE_KEYS: string[] = []; // No fallback — empty means master data has no sizes for this subcategory
const buildEmptySizeData = (sizeKeys: string[]): Record<string, number> => {
  const empty: Record<string, number> = {};
  sizeKeys.forEach(k => { empty[k] = 0; });
  return empty;
};

// Build block key including brandId for per-brand section support — keyed by product.rail
const buildBlockKey = (block: any) =>
  `${block.brandId || 'all'}_${block.rail || block.subCategory}`;

// Extract brand ID from a proposal header (handles both Prisma & transformed formats)
const extractBrandId = (p: any): string => {
  // Primary: from allocate_header linkage
  const fromHeader = p.allocate_header?.brand_id || p.allocateHeader?.brandId || p.brandId;
  if (fromHeader) return String(fromHeader);
  // Fallback: from first SKU proposal's product brand
  const items = p.sku_proposals || p.skuProposals || p.products || [];
  const firstProduct = items[0]?.product || items[0];
  const fromProduct = firstProduct?.brand_id || firstProduct?.brand?.id || firstProduct?.brandId;
  if (fromProduct) return String(fromProduct);
  return 'all';
};

// Build SKU blocks from a single proposal header's detail response (from findOne API)
const buildBlocksFromProposal = (proposal: any, brandId: string): any[] => {
  if (!proposal) return [];
  const blocks: any[] = [];
  const proposalHeaderId = String(proposal.id || '');
  const items = proposal.sku_proposals || proposal.skuProposals || proposal.products || [];

  items.forEach((sp: any) => {
    const prod = sp.product || sp;
    const rail = (prod.rail || sp.rail || '').trim();
    // Keep metadata for display/filters
    const gender = (prod.sub_category?.category?.gender?.name || prod.gender || '').toLowerCase();
    const category = (prod.sub_category?.category?.name || prod.category || '').toLowerCase();
    const subCategory = (prod.sub_category?.name || prod.subCategory || '').toLowerCase();

    let block = blocks.find((b: any) => b.rail === rail);
    if (!block) {
      block = { brandId, proposalHeaderId, rail, gender, category, subCategory, items: [] };
      blocks.push(block);
    }

    // Extract store allocations into { CODE: qty } map
    const allocations = sp.sku_allocates || sp.skuAllocates || prod.allocations || [];
    const storeQty: Record<string, number> = {};
    for (const a of allocations) {
      const code = (a.store?.code || '').toUpperCase();
      if (code) storeQty[code] = Number(a.quantity) || 0;
    }

    const orderQty = Object.values(storeQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    const itemUnitCost = Number(sp.unit_cost ?? sp.unitCost ?? prod.unit_cost ?? prod.unitCost) || 0;

    // product_id is the FK to the product table — always prefer it over prod.id
    // because when sp.product is null, prod falls back to sp and prod.id = sp.id (sku_proposal ID, not product ID)
    const realProductId = sp.product_id || sp.productId || (sp.product ? prod.id : '') || '';
    block.items.push({
      productId: String(realProductId),
      skuProposalId: String(sp.id || ''),
      sku: prod.sku_code || prod.skuCode || prod.sku || '',
      name: prod.product_name || prod.productName || prod.name || '',
      collectionName: prod.collectionName || prod.collection || prod.family || '',
      color: prod.color || '',
      colorCode: prod.colorCode || '',
      division: prod.division || category,
      productType: prod.productType || subCategory,
      departmentGroup: prod.departmentGroup || prod.department || '',
      fsr: prod.fsr || '',
      carryForward: prod.carryForward || 'NEW',
      composition: prod.composition || '',
      unitCost: itemUnitCost,
      importTaxPct: Number(prod.importTaxPct || prod.importTax) || 0,
      srp: Number(sp.srp ?? prod.unit_price ?? prod.unitPrice ?? prod.srp) || 0,
      wholesale: Number(prod.wholesale) || 0,
      rrp: Number(prod.rrp) || 0,
      regionalRrp: Number(prod.regionalRrp) || 0,
      theme: prod.theme || '',
      size: prod.size || '',
      order: orderQty,
      storeQty,
      ttlValue: orderQty * itemUnitCost,
      customerTarget: sp.customer_target || sp.customerTarget || prod.customerTarget || 'New',
      imageUrl: prod.image_url || prod.imageUrl || '',
      comment: sp.comment || '',
      sizingComment: sp.sizing_comment || sp.sizingComment || '',
      proposalSizings: sp.proposal_sizings || sp.proposalSizings || [],
    });
  });
  return blocks;
};

const SKUProposalScreen = ({ skuContext, onContextUsed, onSubmitTicket }: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const router = useRouter();
  const { setAllocationData, setOtbAnalysisContext, registerSave, unregisterSave, registerSaveAsNew, unregisterSaveAsNew, registerExport, unregisterExport, registerImport, unregisterImport, registerBackNavigate, unregisterBackNavigate, showLoading, hideLoading } = useAppContext();
  const { dialogProps, confirm } = useConfirmDialog();
  const { isOpen: filterOpen, open: openFilter, close: closeFilter } = useBottomSheet();
  const [mobileFilterValues, setMobileFilterValues] = useState<Record<string, string | string[]>>({});
  // SKU catalog and proposal data from API
  const [skuCatalog, setSkuCatalog] = useState<any[]>([]);
  const [skuDataLoading, setSkuDataLoading] = useState(true);

  // Master data for filters (genders, categories, season groups, brands) and stores
  const [masterGenders, setMasterGenders] = useState<any[]>([]);
  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  // Subcategory sizes: subCatName (lowercase) → [{ id, name }]
  const [subCategorySizesMap, setSubCategorySizesMap] = useState<Record<string, { id: string; name: string }[]>>({});
  const [stores, setStores] = useState<any[]>([]);
  const [apiSeasonGroups, setApiSeasonGroups] = useState<any[]>([]);
  const [apiBrands, setApiBrandsLocal] = useState<any[]>([]);
  // Per-brand category structures: brandId → flat categories with genderName + sub_categories
  const [brandCategoryMap, setBrandCategoryMap] = useState<Record<string, any[]>>({});

  // Fetch master data for filters + stores (excluding categories — loaded per brand below)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [gendersRes, storesRes, brandsRes] = await Promise.all([
          masterDataService.getGenders().catch(() => []),
          masterDataService.getStores().catch(() => []),
          masterDataService.getBrands().catch(() => []),
        ]);
        const genders = Array.isArray(gendersRes) ? gendersRes : (gendersRes?.data || []);
        setMasterGenders(genders.map((g: any) => (g.name || g.code || '').toLowerCase()));
        const storeList = Array.isArray(storesRes) ? storesRes : (storesRes?.data || []);
        // Deduplicate by code
        const rawStores = storeList.length > 0 ? storeList : [{ code: 'REX', name: 'REX' }, { code: 'TTP', name: 'TTP' }];
        const seen = new Set<string>();
        const uniqueStores = rawStores.filter((s: any) => {
          const code = (s.code || '').toUpperCase();
          if (!code || seen.has(code)) return false;
          seen.add(code);
          return true;
        });
        setStores(uniqueStores);
        // Brands — deduplicate by name (same brand name = same visual section)
        const brandsData = Array.isArray(brandsRes) ? brandsRes : (brandsRes?.data || []);
        const seenBrandNames = new Set<string>();
        const uniqueBrands = brandsData.filter((b: any) => {
          const bName = (b.name || b.code || '').toLowerCase();
          if (seenBrandNames.has(bName)) return false;
          seenBrandNames.add(bName);
          return true;
        });
        setApiBrandsLocal(uniqueBrands);
      } catch (err: any) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Load categories per brand (each brand gets its own category structure)
  useEffect(() => {
    if (apiBrands.length === 0) return;
    const loadPerBrand = async () => {
      const map: Record<string, any[]> = {};
      await Promise.all(apiBrands.map(async (brand: any) => {
        const brandId = String(brand.id);
        try {
          const res = await masterDataService.getCategories({ brandId });
          const raw = Array.isArray(res) ? res : (res?.data || []);
          const isGenderHierarchy = raw.length > 0 && raw[0]?.categories && Array.isArray(raw[0].categories);
          if (isGenderHierarchy) {
            map[brandId] = raw.flatMap((g: any) => (g.categories || []).map((c: any) => ({ ...c, genderName: g.name })));
          } else {
            map[brandId] = raw;
          }
        } catch {
          map[brandId] = [];
        }
      }));
      setBrandCategoryMap(map);
      // Also populate sizeKeyToIdRef from nested subcategory_sizes
      Object.values(map).forEach((cats: any[]) => {
        cats.forEach((cat: any) => {
          (cat.sub_categories || cat.subCategories || []).forEach((sc: any) => {
            const scName = (sc.name || '').toLowerCase();
            const scSizes = (sc.subcategory_sizes || sc.subcategorySizes || []);
            scSizes.forEach((s: any) => { if (s.name && s.id) sizeKeyToIdRef.current[s.name] = String(s.id); });
          });
        });
      });
    };
    loadPerBrand();
  }, [apiBrands]);

  // Load subcategory sizes after masterCategories are available
  useEffect(() => {
    if (masterCategories.length === 0) return;
    const map: Record<string, { id: string; name: string }[]> = {};
    // Use nested subcategory_sizes already included in the categories response
    masterCategories.forEach((cat: any) => {
      (cat.sub_categories || cat.subCategories || []).forEach((sc: any) => {
        const scName = (sc.name || '').toLowerCase();
        const scSizes = (sc.subcategory_sizes || sc.subcategorySizes || []).map((s: any) => ({
          id: String(s.id), name: s.name || '',
        }));
        if (scSizes.length > 0) {
          map[scName] = scSizes;
          scSizes.forEach((s: any) => { if (s.name) sizeKeyToIdRef.current[s.name] = s.id; });
        }
      });
    });
    if (Object.keys(map).length > 0) {
      setSubCategorySizesMap(map);
    } else {
      // Fallback: fetch sizes via individual API calls if nested data is absent
      const subCats: { id: string; name: string }[] = [];
      masterCategories.forEach((cat: any) => {
        (cat.sub_categories || cat.subCategories || []).forEach((sc: any) => {
          if (sc.id) subCats.push({ id: String(sc.id), name: (sc.name || '').toLowerCase() });
        });
      });
      Promise.all(subCats.map(async (sc) => {
        try {
          const res = await masterDataService.getSubcategorySizes(sc.id);
          const sizes = (Array.isArray(res) ? res : (res?.data || [])).map((s: any) => ({
            id: String(s.id), name: s.name || '',
          }));
          if (sizes.length > 0) {
            map[sc.name] = sizes;
            sizes.forEach((s: any) => { if (s.name) sizeKeyToIdRef.current[s.name] = s.id; });
          }
        } catch { /* ignore individual failures */ }
      })).then(() => { setSubCategorySizesMap({ ...map }); });
    }
  }, [masterCategories]);

  // Fetch SKU catalog only (at mount) — handles paginated BE response
  useEffect(() => {
    const mapProduct = (s: any) => ({
      productId: String(s.id || ''),
      sku: s.sku_code || s.skuCode || s.sku || s.code || s.id,
      name: s.product_name || s.productName || s.name || '',
      collectionName: s.collectionName || s.collection || s.family || '',
      color: s.color || '',
      colorCode: s.colorCode || '',
      division: s.sub_category?.category?.name || s.division || s.category || '',
      productType: s.sub_category?.name || s.productType || s.category || '',
      departmentGroup: s.departmentGroup || s.department || '',
      fsr: s.fsr || '',
      carryForward: s.carryForward || s.carry || 'NEW',
      composition: s.composition || '',
      unitCost: Number(s.unit_cost ?? s.unitCost) || 0,
      importTaxPct: Number(s.importTaxPct || s.importTax) || 0,
      srp: Number(s.unit_price ?? s.unitPrice ?? s.srp) || 0,
      wholesale: Number(s.wholesale) || 0,
      rrp: Number(s.rrp) || 0,
      regionalRrp: Number(s.regionalRrp) || 0,
      theme: s.theme || '',
      size: s.size || '',
      imageUrl: s.image_url || s.imageUrl || '',
    });
    const fetchCatalog = async () => {
      setSkuDataLoading(true);
      try {
        // Fetch all pages — BE returns { data: [...], meta: { page, pageSize, total, totalPages } }
        const allItems: any[] = [];
        let page = 1;
        const pageSize = 200;
        while (true) {
          const res = await masterDataService.getSkuCatalog({ page, pageSize }).catch(() => null);
          // Handle both paginated { data, meta } and flat array responses
          const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          allItems.push(...items);
          const totalPages = res?.meta?.totalPages || 1;
          if (page >= totalPages || items.length === 0) break;
          page++;
        }
        setSkuCatalog(allItems.map(mapProduct));
      } catch (err: any) {
        console.error('Failed to fetch SKU catalog:', err);
      } finally {
        setSkuDataLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // API state for fetching budgets
  const [apiBudgets, setApiBudgets] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // Fetch budgets from API (all statuses)
  const fetchBudgets = useCallback(async () => {
    setLoadingBudgets(true);
    // Always invalidate cache to ensure fresh allocate headers
    invalidateCache('/budgets');
    try {
      const response = await budgetService.getAll({});
      const budgetList = (Array.isArray(response) ? response : []).map((budget: any) => {
        // Extract allocate_headers for brand/allocate-header mapping (same pattern as OTB Analysis)
        const rawAllocateHeaders = budget.allocate_headers || budget.allocateHeaders || [];
        const allocateHeaders = rawAllocateHeaders.map((ah: any) => ({
          id: String(ah.id),
          brandId: String(ah.brand_id || ah.brand?.id || ah.brandId || ''),
          brandName: ah.brand?.name || ah.brandName || '',
          isFinal: ah.is_final_version || ah.isFinalVersion || false,
          budgetAllocates: (ah.budget_allocates || ah.budgetAllocates || []).map((ba: any) => ({
            seasonGroupName: ba.season_group?.name || ba.seasonGroup?.name || '',
            seasonName: ba.season?.name || ba.season?.name || '',
            budgetAmount: Number(ba.budget_amount ?? ba.budgetAmount) || 0,
            storeCode: ba.store?.code || ba.storeCode || ''}))}));
        return {
          id: budget.id,
          fiscalYear: Number(budget.fiscal_year ?? budget.fiscalYear) || undefined,
          groupBrand: typeof budget.groupBrand === 'object' ? (budget.groupBrand?.name || budget.groupBrand?.code || 'A') : (budget.groupBrand || 'A'),
          brandId: budget.brandId || budget.brand_id,
          brandName: budget.Brand?.name || budget.brandName || 'Unknown',
          totalBudget: Number(budget.amount) || Number(budget.totalBudget) || Number(budget.totalAmount) || 0,
          budgetName: budget.name || budget.budgetCode || budget.budgetName || `Budget #${budget.id}`,
          status: (budget.status || 'DRAFT').toLowerCase(),
          allocateHeaders};
      });
      setApiBudgets(budgetList);
    } catch (err: any) {
      console.error('Failed to fetch budgets:', err);
      toast.error(t('budget.failedToLoadBudgets'));
    } finally {
      setLoadingBudgets(false);
    }
  }, []);

  // Fetch budgets on mount
  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // sessionStorage auto-fill removed — all filters default to 'all'
  const [fyFilter, setFyFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [isBudgetDropdownOpen, setIsBudgetDropdownOpen] = useState(false);
  const budgetDropdownRef = useRef<HTMLDivElement>(null);
  const [brandFilter, setBrandFilter] = useState('all');
  const [seasonGroupFilter, setSeasonGroupFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('all');

  const [genderFilter, setGenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [railFilter, setRailFilter] = useState('all');
  const hasActiveSkuFilter = genderFilter !== 'all' || categoryFilter !== 'all' || subCategoryFilter !== 'all' || railFilter !== 'all';
  const [pendingContextFilters, setPendingContextFilters] = useState<{ category?: string; subCategory?: string } | null>(null);

  // Load categories per selected brand (reload when brandFilter changes)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const params: any = {};
        if (brandFilter !== 'all') params.brandId = brandFilter;
        const categoriesRes = await masterDataService.getCategories(params);
        const rawCategories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []);
        const isGenderHierarchy = rawCategories.length > 0 && rawCategories[0]?.categories && Array.isArray(rawCategories[0].categories);
        if (isGenderHierarchy) {
          const flatCats = rawCategories.flatMap((g: any) => (g.categories || []).map((c: any) => ({
            ...c,
            genderName: g.name})));
          setMasterCategories(flatCats);
        } else {
          setMasterCategories(rawCategories);
        }
      } catch {
        setMasterCategories([]);
      }
    };
    loadCategories();
    // Reset category & subcategory filter when brand changes
    // (pendingContextFilters effect will re-apply after masterCategories loads)
    setCategoryFilter('all');
    setSubCategoryFilter('all');
  }, [brandFilter]);

  // Apply pending context filters once masterCategories are loaded
  useEffect(() => {
    if (pendingContextFilters && masterCategories.length > 0) {
      if (pendingContextFilters.category) setCategoryFilter(pendingContextFilters.category);
      if (pendingContextFilters.subCategory) setSubCategoryFilter(pendingContextFilters.subCategory);
      setPendingContextFilters(null);
    }
  }, [masterCategories, pendingContextFilters]);

  // Fetch all season groups (no year filter)
  useEffect(() => {
    const controller = new AbortController();
    masterDataService.getSeasonGroups(undefined, { signal: controller.signal }).then(res => {
      const sgData = Array.isArray(res) ? res : [];
      setApiSeasonGroups(sgData);
    }).catch((err: any) => {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
      setApiSeasonGroups([]);
    });
    return () => { controller.abort(); };
  }, []);

  // Allocation/Planning validation — checks if budget + season filters are selected
  const filtersComplete = budgetFilter !== 'all' && seasonGroupFilter !== 'all' && seasonFilter !== 'all';

  // Resolve season group/season filter names → DB IDs for API calls
  const resolvedSeasonIds = useMemo(() => {
    let seasonGroupId: string | undefined;
    let seasonId: string | undefined;
    if (seasonGroupFilter !== 'all') {
      const sg = apiSeasonGroups.find((g: any) => g.name === seasonGroupFilter);
      if (sg) {
        seasonGroupId = String(sg.id);
        if (seasonFilter !== 'all') {
          const s = (sg.seasons || []).find((s: any) => s.name === seasonFilter);
          if (s) seasonId = String(s.id);
        }
      }
    }
    return { seasonGroupId, seasonId };
  }, [apiSeasonGroups, seasonGroupFilter, seasonFilter]);

  // Match allocate headers by season, deduplicate per brand (prefer final, then latest)
  const matchedAllocateHeaders = useMemo(() => {
    if (!filtersComplete) return [];
    const budget = apiBudgets.find((b: any) => b.id === budgetFilter);
    if (!budget) return [];
    const allMatched = (budget.allocateHeaders || []).filter((ah: any) => {
      // Filter by brand if a specific brand is selected
      if (brandFilter !== 'all' && String(ah.brandId) !== String(brandFilter)) return false;
      // Must have budget allocations for the selected season group + season
      return (ah.budgetAllocates || []).some((ba: any) =>
        ba.seasonGroupName === seasonGroupFilter && ba.seasonName === seasonFilter
      );
    });
    // Deduplicate per brand: prefer final version, then latest (by id)
    const byBrand: Record<string, any> = {};
    allMatched.forEach((ah: any) => {
      const existing = byBrand[ah.brandId];
      if (!existing) {
        byBrand[ah.brandId] = ah;
      } else if (ah.isFinal && !existing.isFinal) {
        byBrand[ah.brandId] = ah;
      } else if (!existing.isFinal && !ah.isFinal && String(ah.id) > String(existing.id)) {
        byBrand[ah.brandId] = ah;
      }
    });
    return Object.values(byBrand);
  }, [filtersComplete, budgetFilter, brandFilter, apiBudgets, seasonGroupFilter, seasonFilter]);

  // Gated proposal loading — only when budget + season filters are complete
  // Uses AbortController to cancel in-flight requests when filters change,
  // preventing connection pool exhaustion and "Network Error" on other requests.
  const loadProposalsRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  // Map from UI size key (e.g. "s0002") to DB subcategory_size ID (BigInt string)
  const sizeKeyToIdRef = useRef<Record<string, string>>({});
  useEffect(() => {
    // Cancel any in-flight requests from previous run
    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
      loadAbortRef.current = null;
    }

    if (!filtersComplete || matchedAllocateHeaders.length === 0) {
      setBrandProposalHeaders({});
      setBrandSkuVersion({});
      setSkuBlocks([]);
      return;
    }

    const controller = new AbortController();
    loadAbortRef.current = controller;
    const signal = controller.signal;
    const loadId = ++loadProposalsRef.current;

    // Invalidate proposal cache to ensure fresh data when season changes
    invalidateCache('/proposals');

    const loadFilteredProposals = async () => {
      setSkuDataLoading(true);
      try {
        const newHeadersByBrand: Record<string, any[]> = {};
        const allBlocks: any[] = [];

        for (const ah of matchedAllocateHeaders) {
          if (signal.aborted || loadId !== loadProposalsRef.current) return; // stale
          const brandId = String(ah.brandId);
          const proposalsList = await proposalService.getAll({
            allocateHeaderId: ah.id,
            ...(resolvedSeasonIds.seasonGroupId && { seasonGroupId: resolvedSeasonIds.seasonGroupId }),
            ...(resolvedSeasonIds.seasonId && { seasonId: resolvedSeasonIds.seasonId }),
          }, { signal }).catch((e: any) => {
            if (e?.code === 'ERR_CANCELED') throw e;
            return [];
          });
          const list = Array.isArray(proposalsList) ? proposalsList : [];

          // ── 1. Load existing proposals (if any) ──────────────────────────
          let brandBlocks: any[] = [];
          if (list.length > 0) {
            // Build per-brand proposal headers
            newHeadersByBrand[brandId] = list.map((h: any) => ({
              id: h.id,
              version: h.version,
              status: h.status,
              isFinal: h.is_final_version ?? h.isFinalVersion ?? false,
            })).sort((a: any, b: any) => b.version - a.version);

            if (signal.aborted) return;

            // Fetch details for each proposal
            const detailResults = await Promise.all(
              list.map((p: any) => proposalService.getOne(p.id, { signal }).catch((e: any) => {
                if (e?.code === 'ERR_CANCELED') throw e;
                return null;
              }))
            );
            const proposals = detailResults.map((r: any) => r?.data || r).filter(Boolean);

            // Build blocks — only from final version (or latest if no final)
            const finalHeader = newHeadersByBrand[brandId]?.find((h: any) => h.isFinal) || newHeadersByBrand[brandId]?.[0];
            const activeProposal = finalHeader
              ? proposals.find((p: any) => String(p.id) === String(finalHeader.id))
              : proposals[0];
            if (activeProposal) {
              brandBlocks = buildBlocksFromProposal(activeProposal, brandId);
              captureSnapshotFromBlocks(brandId, brandBlocks);
            }

            // Enrich catalog with unique SKUs from proposal products
            const seenSkus = new Set(skuCatalog.map((c: any) => c.sku));
            const supplementarySkus: any[] = [];
            proposals.forEach((p: any) => {
              const items = p.sku_proposals || p.skuProposals || p.products || [];
              items.forEach((sp: any) => {
                const prod = sp.product || sp;
                const sku = prod.sku_code || prod.skuCode || prod.sku;
                if (sku && !seenSkus.has(sku)) {
                  seenSkus.add(sku);
                  supplementarySkus.push({
                    productId: String(sp.product_id || sp.productId || (sp.product ? prod.id : '') || ''),
                    sku, name: prod.product_name || prod.productName || prod.name || '',
                    collectionName: prod.collectionName || prod.collection || prod.family || '',
                    color: prod.color || '', colorCode: prod.colorCode || '',
                    division: prod.sub_category?.category?.name || prod.division || prod.category || '',
                    productType: prod.sub_category?.name || prod.productType || prod.subCategory || '',
                    departmentGroup: prod.departmentGroup || prod.department || '',
                    fsr: prod.fsr || '', carryForward: prod.carryForward || 'NEW',
                    composition: prod.composition || '',
                    unitCost: Number(prod.unit_cost ?? prod.unitCost ?? sp.unit_cost ?? sp.unitCost) || 0,
                    importTaxPct: Number(prod.importTaxPct || prod.importTax) || 0,
                    srp: Number(prod.unit_price ?? prod.unitPrice ?? sp.srp ?? prod.srp) || 0, wholesale: Number(prod.wholesale) || 0,
                    rrp: Number(prod.rrp) || 0, regionalRrp: Number(prod.regionalRrp) || 0,
                    theme: prod.theme || '', size: prod.size || '',
                    imageUrl: prod.image_url || prod.imageUrl || '',
                  });
                }
              });
            });
            if (supplementarySkus.length > 0) {
              setSkuCatalog(prev => [...prev, ...supplementarySkus]);
            }
          }

          // ── 2. Load recommended SKUs only when no existing DB version ──
          if (list.length === 0) {
          if (signal.aborted) return;
          const budget = apiBudgets.find((b: any) => b.id === budgetFilter);
          const currentFY = budget?.fiscalYear;
          const brandObj = apiBrands.find((b: any) => String(b.id) === brandId);
          const brandName = brandObj?.name || ah.brandName || '';
          if (currentFY && seasonFilter !== 'all') {
            try {
              const recommends = await masterDataService.getProductRecommends({
                year: currentFY - 1,
                seasonName: seasonFilter,
                brandName: brandName || undefined,
              });
              const recList = Array.isArray(recommends) ? recommends : (recommends?.data || []);
              if (recList.length > 0) {
                // Collect existing productIds from proposal blocks for dedup
                const existingProductIds = new Set<string>();
                brandBlocks.forEach((b: any) => (b.items || []).forEach((item: any) => {
                  if (item.productId) existingProductIds.add(String(item.productId));
                }));

                recList.forEach((rec: any) => {
                  const prod = rec.product || {};
                  const subCat = prod.sub_category || {};
                  const cat = subCat.category || {};
                  const genderObj = cat.gender || {};
                  const rail = (prod.rail || rec.rail || '').trim();
                  if (!rail) return;
                  const recProductId = String(prod.id || '');
                  // Skip if this product already exists in proposal blocks
                  if (recProductId && existingProductIds.has(recProductId)) return;

                  const gender = (genderObj.name || '').toLowerCase();
                  const category = (cat.name || rec.category || '').toLowerCase();
                  const subCategory = (subCat.name || rec.sub_category || '').toLowerCase();

                  // Find existing block by rail (from proposal or previously added recommend)
                  let block = brandBlocks.find((b: any) => b.rail === rail);
                  if (!block) {
                    block = { brandId, proposalHeaderId: '', rail, gender, category, subCategory, items: [], isRecommended: true };
                    brandBlocks.push(block);
                  }
                  block.items.push({
                    productId: recProductId,
                    skuProposalId: '',
                    sku: rec.sku || prod.sku_code || '',
                    name: prod.product_name || prod.name || rec.item_code || '',
                    collectionName: prod.collection || '',
                    color: prod.color || '',
                    colorCode: prod.colorCode || '',
                    division: cat.name || '',
                    productType: subCat.name || '',
                    departmentGroup: '',
                    fsr: '',
                    carryForward: 'NEW',
                    composition: prod.composition || '',
                    unitCost: Number(prod.unit_cost) || 0,
                    importTaxPct: 0,
                    srp: Number(prod.unit_price) || 0,
                    wholesale: 0, rrp: 0, regionalRrp: 0,
                    theme: prod.theme || '',
                    size: '',
                    order: 0,
                    storeQty: {},
                    ttlValue: 0,
                    customerTarget: 'New',
                    imageUrl: prod.image_url || '',
                    isRecommended: true,
                  });
                });
              }
            } catch (err: any) {
              if (err?.code === 'ERR_CANCELED') throw err;
              console.error('[SKUProposal] Failed to load product recommends:', err?.message);
            }
          }
          } // end: no existing DB version

          allBlocks.push(...brandBlocks);
        }

        if (signal.aborted || loadId !== loadProposalsRef.current) return; // stale

        setBrandProposalHeaders(newHeadersByBrand);
        setSkuBlocks(allBlocks);
        hydrateSizingData(allBlocks);

        // Auto-select final or latest version per brand
        const autoSelected: Record<string, string> = {};
        for (const [bId, headers] of Object.entries(newHeadersByBrand)) {
          const finalH = headers.find((h: any) => h.isFinal);
          autoSelected[bId] = String(finalH ? finalH.id : headers[0]?.id || '');
        }
        setBrandSkuVersion(autoSelected);
      } catch (err: any) {
        // Silently ignore cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        console.error('Failed to load proposals:', err);
      } finally {
        if (loadId === loadProposalsRef.current) setSkuDataLoading(false);
      }
    };
    loadFilteredProposals();

    return () => { controller.abort(); };
  }, [filtersComplete, matchedAllocateHeaders, budgetFilter, seasonGroupFilter, seasonFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const [brandPlanningHeaders, setBrandPlanningHeaders] = useState<Record<string, any[]>>({});
  const [brandLoadingPlanning, setBrandLoadingPlanning] = useState<Record<string, boolean>>({});
  // OTB allocated amounts from final planning version's categories per brand
  // brandId → "gender_category_subCategory" (lowercase) → otbProposedAmount
  const [brandCategoryOtb, setBrandCategoryOtb] = useState<Record<string, Record<string, number>>>({});
  // Sub-categories from planning final version for side panel: brandId → list
  const [brandPlanningSubcats, setBrandPlanningSubcats] = useState<Record<string, { gender: string; category: string; subCategory: string }[]>>({});

  const [collapsed, setCollapsed] = useState<Record<string, any>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({});
  const [subCatPanelOpen, setSubCatPanelOpen] = useState(false);
  const [contextBanner, setContextBanner] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'card'>('list');
  const [lightbox, setLightbox] = useState<{ open: boolean; key: string; tab: 'details' | 'storeOrder' | 'sizing'; item: any; blockKey: string; idx: number; block: any } | null>(null);
  const [customerTargetOptions, setCustomerTargetOptions] = useState<string[]>(['New', 'Existing']);
  // Per-brand proposal headers (versions) from API
  const [brandProposalHeaders, setBrandProposalHeaders] = useState<Record<string, any[]>>({});
  const [brandSkuVersion, setBrandSkuVersion] = useState<Record<string, string>>({});
  const [brandSaving, setBrandSaving] = useState<Record<string, boolean>>({});
  // Sizing history data: keyed by `${brandId}_${subCategoryId}` → { size, salesMixPct, stPct }[]
  const [sizingHistoryMap, setSizingHistoryMap] = useState<Record<string, { size: string; salesMixPct: number; stPct: number | null }[]>>({});
  // Portal dropdown state for version
  const [openDropdown, setOpenDropdown] = useState<{ type: 'version'; brandId: string } | null>(null);
  const [dropdownAnchorEl, setDropdownAnchorEl] = useState<HTMLElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: any) => {
      if (dropdownAnchorEl && dropdownAnchorEl.contains(e.target)) return;
      const portal = document.querySelector('.sku-version-portal');
      if (portal && portal.contains(e.target)) return;
      setOpenDropdown(null);
      setDropdownAnchorEl(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openDropdown, dropdownAnchorEl]);

  // Close budget dropdown on outside click
  useEffect(() => {
    if (!isBudgetDropdownOpen) return;
    const handleClick = (e: any) => {
      if (budgetDropdownRef.current && !budgetDropdownRef.current.contains(e.target)) {
        setIsBudgetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isBudgetDropdownOpen]);

  const barRef = useRef<HTMLDivElement>(null);


  // Refetch proposal + sizing headers for a brand from server (ensures UI = DB after mutations)
  const refetchBrandHeaders = async (brandId: string) => {
    const ah = matchedAllocateHeaders.find((h: any) => String(h.brandId) === brandId);
    if (!ah) return;
    try {
      const list = await proposalService.getAll({ allocateHeaderId: ah.id });
      const freshList = Array.isArray(list) ? list : [];
      // Rebuild proposal headers
      const mappedProposals = freshList.map((h: any) => ({
        id: h.id, version: h.version, status: h.status,
        isFinal: h.is_final_version ?? h.isFinalVersion ?? false,
      })).sort((a: any, b: any) => b.version - a.version);
      setBrandProposalHeaders(prev => ({ ...prev, [brandId]: mappedProposals }));
      const finalHeader = mappedProposals.find((h: any) => h.isFinal);
      if (finalHeader) setBrandSkuVersion(prev => ({ ...prev, [brandId]: String(finalHeader.id) }));
    } catch (err) {
      console.error('[refetchBrandHeaders] failed:', err);
    }
  };

  const handleSetFinalVersion = async (brandId: string, headerId: any, e: any) => {
    e.stopPropagation();
    try {
      await proposalService.update(String(headerId), { isFinalVersion: true });
      await refetchBrandHeaders(brandId);
    } catch (err: any) {
      console.error('Failed to set final version:', err);
    }
  };


  // Shared helper: resolve selected ID from state map, falling back to final/first header
  const getBrandSelection = (brandId: string, stateMap: Record<string, string>, headersMap: Record<string, any[]>) => {
    if (stateMap[brandId]) return stateMap[brandId];
    const headers = headersMap[brandId] || [];
    const finalH = headers.find((h: any) => h.isFinal);
    if (finalH) return String(finalH.id);
    if (headers.length > 0) return String(headers[0].id);
    return '';
  };
  const getBrandSkuVersion = (brandId: string) => getBrandSelection(brandId, brandSkuVersion, brandProposalHeaders);

  // Hydrate sizingData state from blocks — each item carries proposalSizings from the API
  const hydrateSizingData = useCallback((blocks: any[]) => {
    const loaded: Record<string, any> = {};

    blocks.forEach((block: any) => {
      const blockKey = buildBlockKey(block);
      (block.items || []).forEach((item: any, idx: number) => {
        const key = `${blockKey}_${idx}`;
        const rows: any[] = item.proposalSizings || [];
        if (rows.length === 0) return;

        const sizeMap: Record<string, number> = {};
        rows.forEach((ps: any) => {
          const sizeName = ps.subcategory_size?.name || ps.subcategorySize?.name || '';
          if (!sizeName) return;
          // Cache sizeName → DB ID for save payload
          const sizeDbId = String(ps.subcategory_size_id || ps.subcategorySizeId || ps.subcategory_size?.id || '');
          if (sizeDbId && sizeDbId !== 'undefined') {
            sizeKeyToIdRef.current[sizeName] = sizeDbId;
          }
          sizeMap[sizeName] = Number(ps.proposal_quantity ?? ps.proposalQuantity) || 0;
        });

        if (Object.keys(sizeMap).length > 0) {
          loaded[key] = sizeMap;
        }
      });
    });

    if (Object.keys(loaded).length > 0) {
      setSizingData(prev => ({ ...prev, ...loaded }));
    }
  }, []);

  // Capture a snapshot of the DB state for a brand (called after load/save)
  // Reads sizing from raw proposalSizings embedded in items (not from React state)
  const captureSnapshotFromBlocks = useCallback((brandId: string, blocks: any[]) => {
    const snapshot: Record<string, any> = {};
    blocks.forEach((block: any) => {
      (block.items || []).forEach((item: any) => {
        if (!item.productId || !item.skuProposalId) return;
        const sizingMap: Record<string, number> = {};
        (item.proposalSizings || []).forEach((ps: any) => {
          const name = ps.subcategory_size?.name || ps.subcategorySize?.name || '';
          if (name) sizingMap[name] = Number(ps.proposal_quantity ?? ps.proposalQuantity) || 0;
        });
        snapshot[String(item.productId)] = {
          order: Number(item.order) || 0,
          storeQty: { ...(item.storeQty || {}) },
          customerTarget: item.customerTarget || 'New',
          comment: item.comment || '',
          sizingComment: item.sizingComment || '',
          sizing: sizingMap,
        };
      });
    });
    brandSnapshotRef.current[brandId] = snapshot;
  }, []);

  // Load a specific proposal version for a brand (called when version dropdown changes)
  const loadProposalVersion = useCallback(async (brandId: string, headerId: string) => {
    try {
      const response = await proposalService.getOne(headerId);
      const p = response?.data || response;
      if (!p) return;
      const newBrandBlocks = buildBlocksFromProposal(p, brandId);
      captureSnapshotFromBlocks(brandId, newBrandBlocks);
      setSkuBlocks(prev => {
        const other = prev.filter((b: any) => String(b.brandId) !== brandId);
        return [...other, ...newBrandBlocks];
      });
      hydrateSizingData(newBrandBlocks);
    } catch (err: any) {
      console.error('Failed to load proposal version:', err);
      toast.error('Failed to load version');
    }
  }, [hydrateSizingData, captureSnapshotFromBlocks]);

  // Computed labels for collapsed bar badges
  const budgetDisplayName = useMemo(() => {
    if (budgetFilter === 'all') return 'All Budgets';
    const b = apiBudgets.find((b: any) => b.id === budgetFilter || b.budgetName === budgetFilter);
    return b?.budgetName || budgetFilter;
  }, [budgetFilter, apiBudgets]);


  // Apply context from OTB Analysis when navigating here
  useEffect(() => {
    if (skuContext) {
      // Set filters based on context
      if (skuContext.budgetId) {
        setBudgetFilter(skuContext.budgetId);
      }
      if (skuContext.fiscalYear) {
        setFyFilter(String(skuContext.fiscalYear));
      }
      // Set brand filter (single brand from brandIds array)
      if (skuContext.brandIds?.length === 1) {
        setBrandFilter(String(skuContext.brandIds[0]));
      } else if (skuContext.brandIds?.length > 1) {
        setBrandFilter('all');
      }
      if (skuContext.seasonGroup) {
        setSeasonGroupFilter(skuContext.seasonGroup);
      }
      if (skuContext.season) {
        setSeasonFilter(skuContext.season);
      }
      if (skuContext.gender?.name) {
        setGenderFilter(skuContext.gender.name.toLowerCase());
      }
      // Store pending category/subcategory — will be applied after masterCategories loads
      const pendingCat = skuContext.category?.name ? skuContext.category.name.toLowerCase() : undefined;
      const pendingSub = skuContext.subCategory?.name ? skuContext.subCategory.name.toLowerCase() : undefined;
      if (pendingCat || pendingSub) {
        setPendingContextFilters({ category: pendingCat, subCategory: pendingSub });
      }

      // Set banner info
      setContextBanner({
        budgetName: skuContext.budgetName,
        fiscalYear: skuContext.fiscalYear,
        brandName: skuContext.brandName,
        seasonGroup: skuContext.seasonGroup,
        season: skuContext.season,
        gender: skuContext.gender?.name,
        category: skuContext.category?.name,
        subCategory: skuContext.subCategory?.name,
        otbData: skuContext.otbData
      });

      // Clear context after use
      if (onContextUsed) {
        onContextUsed();
      }
    }
  }, [skuContext, onContextUsed]);

  const [skuBlocks, setSkuBlocks] = useState<any[]>([]);
  // Refs that always hold the latest state — used by save callbacks to avoid stale closures
  const skuBlocksRef = useRef<any[]>([]);
  const sizingDataRef = useRef<Record<string, any>>({});
  const subCategoryFilterRef = useRef<string>('all');
  // Snapshot of DB state per brand — used for delta diffing on save
  const brandSnapshotRef = useRef<Record<string, Record<string, any>>>({});

  // When context is provided and data loads but no proposal blocks exist,
  // build blocks from the SKU catalog matching the context's subCategory
  useEffect(() => {
    if (contextBanner?.subCategory && skuCatalog.length > 0 && skuBlocks.length === 0 && !skuDataLoading) {
      const subCat = contextBanner.subCategory;
      const matchingItems = skuCatalog.filter((item: any) => (item.productType || '').toLowerCase() === subCat.toLowerCase());
      if (matchingItems.length > 0) {
        const genderKey = (contextBanner.gender || '').toLowerCase();
        const ctxBrandId = brandFilter !== 'all' ? brandFilter : (apiBrands.length > 0 ? String(apiBrands[0].id) : 'all');
        setSkuBlocks([{
          brandId: ctxBrandId,
          gender: genderKey,
          category: contextBanner.category || '',
          subCategory: subCat,
          items: matchingItems.map((item: any) => ({
            ...item,
            order: 0,
            storeQty: {},
            ttlValue: 0,
            customerTarget: 'New'
          }))
        }]);
      }
    }
  }, [contextBanner, skuCatalog, skuBlocks.length, skuDataLoading]);
  const [editingCell, setEditingCell] = useState<any>(null);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [commentPopup, setCommentPopup] = useState<{ text: string; blockKey: string; idx: number; rect: DOMRect } | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Live item from skuBlocks for the currently open lightbox (avoids stale snapshot)
  const lightboxLiveItem = useMemo(() => {
    if (!lightbox) return null;
    const block = skuBlocks.find((b: any) => buildBlockKey(b) === lightbox.blockKey);
    return block?.items?.[lightbox.idx] ?? lightbox.item;
  }, [lightbox, skuBlocks]);

  // Add SKU Modal state
  const [addSkuModal, setAddSkuModal] = useState<{ open: boolean; blockKey: string; block: any } | null>(null);

  const [sizingData, setSizingData] = useState<Record<string, any>>({});

  // Import preview — computed diff shown before applying
  type ImportPreviewItem = {
    productId: string; skuCode: string; skuName: string; rail: string;
    oldOrder: number; newOrder: number;
    oldSizingTotal: number; newSizingTotal: number;
    orderChanged: boolean; sizingChanged: boolean;
    sizingExceedsOrder: boolean;
    storeChanges: Array<{ code: string; oldQty: number; newQty: number }>;
    sizeChanges: Array<{ name: string; oldQty: number; newQty: number }>;
  };
  const [importPreview, setImportPreview] = useState<{
    items: ImportPreviewItem[];
    result: SKUProposalImportResult;
  } | null>(null);
  // Keep refs in sync — assign during render (not useEffect) so they're always current
  skuBlocksRef.current = skuBlocks;
  sizingDataRef.current = sizingData;
  subCategoryFilterRef.current = subCategoryFilter;

  // Get size column names for a subcategory (from DB), fallback to FALLBACK_SIZE_KEYS
  // Also ensures sizeKeyToIdRef is populated for every returned size name
  const getSizeKeysForSubCategory = useCallback((subCategoryName: string): string[] => {
    const sizes = subCategorySizesMap[(subCategoryName || '').toLowerCase()];
    if (sizes && sizes.length > 0) {
      // Ensure ref is populated for every size (defensive against race conditions)
      sizes.forEach(s => {
        if (s.name && s.id && !sizeKeyToIdRef.current[s.name]) {
          sizeKeyToIdRef.current[s.name] = String(s.id);
        }
      });
      return sizes.map(s => s.name);
    }
    return FALLBACK_SIZE_KEYS;
  }, [subCategorySizesMap]);

  const getDefaultSizing = (subCategoryName?: string) => {
    const sizeKeys = getSizeKeysForSubCategory(subCategoryName || '');
    return buildEmptySizeData(sizeKeys);
  };

  const getSizingKey = (blockKey: any, itemIdx: any) => `${blockKey}_${itemIdx}`;

  const getSizing = (blockKey: any, itemIdx: any) => {
    const key = getSizingKey(blockKey, itemIdx);
    return sizingData[key] || {};
  };

  const updateSizing = (blockKey: any, itemIdx: any, size: any, value: any) => {
    const key = getSizingKey(blockKey, itemIdx);
    setSizingData((prev: any) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [size]: parseInt(value) || 0 }
    }));
  };

  const calculateSum = (sizeData: any): number => {
    return Object.values(sizeData).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0) as number;
  };

  // Check if sizing is complete for a given SKU item (has any non-zero quantity)
  const isSizingComplete = (blockKey: any, itemIdx: any) => {
    const sizing = getSizing(blockKey, itemIdx);
    return Object.values(sizing).some((v: any) => (parseInt(v) || 0) > 0);
  };

  // Check if sizing has any data entered
  const hasSizingData = (blockKey: any, itemIdx: any) => {
    return isSizingComplete(blockKey, itemIdx);
  };

  // Count sizing completion for a block
  const getSizingCount = (blockKey: any, items: any[]) => {
    let completed = 0;
    items.forEach((_: any, idx: number) => {
      if (isSizingComplete(blockKey, idx)) completed++;
    });
    return { completed, total: items.length };
  };

  const handleOpenLightbox = (key: string, tab: 'details' | 'storeOrder' | 'sizing', item: any, blockKey: string, idx: number, block: any) => {
    setLightbox({ open: true, key, tab, item, blockKey, idx, block });
  };

  // Fetch sizing history when lightbox sizing tab is shown
  useEffect(() => {
    if (!lightbox || lightbox.tab !== 'sizing') return;
    const brandId = lightbox.blockKey.split('_')[0] || '';
    const subCatName = (lightbox.block?.subCategory || '').toLowerCase();
    // Resolve subCategoryId
    let subCategoryId = '';
    const cats = brandCategoryMap[brandId] || [];
    for (const cat of cats) {
      const subs = cat.sub_categories || cat.subCategories || [];
      const found = subs.find((sc: any) => (sc.name || '').toLowerCase() === subCatName);
      if (found) { subCategoryId = String(found.id); break; }
    }
    if (!brandId || !subCategoryId) return;
    // Resolve year from fyFilter - 1 (lấy data năm trước)
    const year = fyFilter !== 'all' ? Number(fyFilter) - 1 : undefined;
    // Resolve seasonId from seasonFilter name
    let seasonId: string | undefined;
    if (seasonFilter !== 'all') {
      for (const sg of apiSeasonGroups) {
        const found = (sg.seasons || []).find((s: any) => (s.name || s.code) === seasonFilter);
        if (found) { seasonId = String(found.id); break; }
      }
    }
    const cacheKey = `${brandId}_${subCategoryId}_${year || 'all'}_${seasonId || 'all'}`;
    if (sizingHistoryMap[cacheKey]) return; // already cached
    proposalService.getSizingHistory({ brandId, subCategoryId, year, seasonId })
      .then((data: any) => {
        if (Array.isArray(data)) {
          setSizingHistoryMap(prev => ({ ...prev, [cacheKey]: data }));
        }
      })
      .catch((err: any) => console.error('[sizingHistory]', err));
  }, [lightbox?.tab, lightbox?.blockKey, fyFilter, seasonFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseLightbox = () => {
    setLightbox(null);
  };

  // FY options derived from budgets
  const fyOptions = useMemo(() => {
    const years = new Set(apiBudgets.map((b: any) => b.fiscalYear).filter(Boolean));
    const options = [{ value: 'all', label: 'All FY' }];
    Array.from(years).sort((a: any, b: any) => Number(b) - Number(a)).forEach((y: any) => {
      options.push({ value: String(y), label: `FY${y}` });
    });
    return options;
  }, [apiBudgets]);

  const filteredBudgets = useMemo(() => {
    return fyFilter === 'all' ? apiBudgets : apiBudgets.filter((b: any) => String(b.fiscalYear) === fyFilter);
  }, [apiBudgets, fyFilter]);

  const selectedBudget = useMemo(() => {
    if (budgetFilter === 'all') return null;
    return apiBudgets.find((b: any) => b.id === budgetFilter) || null;
  }, [apiBudgets, budgetFilter]);

  // Brand options from API
  const brandOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Brands' }];
    apiBrands.forEach((b: any) => {
      options.push({ value: String(b.id), label: b.name || b.code || `Brand ${b.id}` });
    });
    return options;
  }, [apiBrands]);

  // Season group options from API
  const seasonGroupOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All' }];
    apiSeasonGroups.forEach((sg: any) => {
      options.push({ value: sg.name || sg.code, label: sg.name || sg.code });
    });
    return options;
  }, [apiSeasonGroups]);

  // Season options from API (derived from selected season group's nested seasons)
  const seasonOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All' }];
    if (seasonGroupFilter === 'all') {
      // Collect all unique seasons from all season groups
      const seen = new Set<string>();
      apiSeasonGroups.forEach((sg: any) => {
        (sg.seasons || []).forEach((s: any) => {
          const name = s.name || s.code;
          if (name && !seen.has(name)) {
            seen.add(name);
            options.push({ value: name, label: name });
          }
        });
      });
    } else {
      const matchedSG = apiSeasonGroups.find((sg: any) => (sg.name || sg.code) === seasonGroupFilter);
      if (matchedSG) {
        (matchedSG.seasons || []).forEach((s: any) => {
          const name = s.name || s.code;
          if (name) options.push({ value: name, label: name });
        });
      }
    }
    return options;
  }, [seasonGroupFilter, apiSeasonGroups]);

  // Brands to display — filtered by brandFilter
  const displayBrands = useMemo(() => {
    // When budget is selected with complete season filters, only show brands that have allocateHeaders
    let brands = apiBrands;
    if (budgetFilter !== 'all' && filtersComplete && matchedAllocateHeaders.length > 0) {
      const allocatedBrandIds = new Set(matchedAllocateHeaders.map((ah: any) => String(ah.brandId)));
      brands = apiBrands.filter((b: any) => allocatedBrandIds.has(String(b.id)));
    }
    if (brandFilter === 'all') return brands;
    return brands.filter((b: any) => String(b.id) === brandFilter);
  }, [apiBrands, brandFilter, budgetFilter, filtersComplete, matchedAllocateHeaders]);

  // Auto-collapse all brand sections when brand filter is "all"
  useEffect(() => {
    if (brandFilter === 'all' && displayBrands.length > 0) {
      const next: Record<string, boolean> = {};
      displayBrands.forEach((b: any) => { next[String(b.id)] = true; });
      setCollapsedBrands(next);
    }
  }, [brandFilter, displayBrands]);

  // Fetch planning headers per brand to check final PlanningHeader existence
  // Also loads OTB category amounts from the final planning version
  useEffect(() => {
    if (displayBrands.length === 0 || !filtersComplete) {
      setBrandPlanningHeaders({});
      setBrandCategoryOtb({});
      setBrandPlanningSubcats({});
      return;
    }
    // Clean up stale brand data from previous filter selection
    const activeBrandIds = new Set(displayBrands.map((b: any) => String(b.id)));
    setBrandPlanningHeaders(prev => {
      const cleaned: Record<string, any[]> = {};
      activeBrandIds.forEach(id => { if (prev[id]) cleaned[id] = prev[id]; });
      return cleaned;
    });
    setBrandCategoryOtb(prev => {
      const cleaned: Record<string, Record<string, number>> = {};
      activeBrandIds.forEach(id => { if (prev[id]) cleaned[id] = prev[id]; });
      return cleaned;
    });
    setBrandPlanningSubcats(prev => {
      const cleaned: Record<string, { gender: string; category: string; subCategory: string }[]> = {};
      activeBrandIds.forEach(id => { if (prev[id]) cleaned[id] = prev[id]; });
      return cleaned;
    });
    displayBrands.forEach(async (brand: any) => {
      const brandId = String(brand.id);
      const matchedAH = matchedAllocateHeaders.find((ah: any) => String(ah.brandId) === brandId);
      if (!matchedAH) return; // no AllocateHeader = handled by warning banner
      setBrandLoadingPlanning(prev => ({ ...prev, [brandId]: true }));
      try {
        const list = await planningService.getAll({ brandId, allocateHeaderId: matchedAH.id });
        const mapped = (Array.isArray(list) ? list : []).map((v: any) => ({
          id: String(v.id),
          version: v.version,
          status: v.status || 'DRAFT',
          isFinal: v.is_final_version || false}));
        setBrandPlanningHeaders(prev => ({ ...prev, [brandId]: mapped }));

        // Load OTB amounts from final planning version's categories
        const finalHeader = mapped.find((h: any) => h.isFinal);
        if (finalHeader) {
          try {
            const detail = await planningService.getOne(finalHeader.id);
            const planningCats = detail?.planning_categories || detail?.planningCategories || [];
            const otbMap: Record<string, number> = {};
            planningCats.forEach((pc: any) => {
              const sc = pc.subcategory || pc.sub_category;
              const cat = sc?.category;
              const gender = cat?.gender;
              const key = [
                (gender?.name || '').toLowerCase(),
                (cat?.name || '').toLowerCase(),
                (sc?.name || '').toLowerCase(),
              ].join('_');
              if (key && key !== '__') {
                otbMap[key] = Number(pc.otb_proposed_amount ?? pc.otbProposedAmount) || 0;
              }
            });
            setBrandCategoryOtb(prev => ({ ...prev, [brandId]: otbMap }));

            // Extract sub-category list for side panel navigation
            const seen = new Set<string>();
            const subcats: { gender: string; category: string; subCategory: string }[] = [];
            planningCats.forEach((pc: any) => {
              const sc = pc.subcategory || pc.sub_category;
              const cat = sc?.category;
              const gender = cat?.gender;
              const subCatName = sc?.name || '';
              const catName = cat?.name || '';
              const genderName = gender?.name || '';
              const key = `${genderName}__${catName}__${subCatName}`;
              if (subCatName && !seen.has(key)) {
                seen.add(key);
                subcats.push({ gender: genderName, category: catName, subCategory: subCatName });
              }
            });
            setBrandPlanningSubcats(prev => ({ ...prev, [brandId]: subcats }));
          } catch (err: any) {
            console.error(`[SKU] Failed to load planning categories for brand ${brandId}:`, err?.message);
          }
        }
      } catch (err: any) {
        console.error(`[SKU] Failed to fetch planning headers for brand ${brandId}:`, err?.response?.data || err?.message);
        setBrandPlanningHeaders(prev => ({ ...prev, [brandId]: [] }));
      } finally {
        setBrandLoadingPlanning(prev => ({ ...prev, [brandId]: false }));
      }
    });
  }, [displayBrands, filtersComplete, matchedAllocateHeaders]);

  // All subcategory paths from masterCategories (gender → category → subCategory)
  // API returns snake_case (sub_categories) from Prisma
  const allSubcategoryPaths = useMemo(() => {
    const paths: { gender: string; category: string; subCategory: string }[] = [];
    const seen = new Set<string>();
    masterCategories.forEach((cat: any) => {
      const gender = (cat.genderName || '').toLowerCase();
      const category = (cat.name || cat.code || '').toLowerCase();
      const subCats = cat.sub_categories || cat.subCategories || [];
      subCats.forEach((sc: any) => {
        const subCategory = (sc.name || sc.code || '').toLowerCase();
        const key = `${gender}_${category}_${subCategory}`;
        if (subCategory && !seen.has(key)) {
          seen.add(key);
          paths.push({ gender, category, subCategory });
        }
      });
    });
    return paths;
  }, [masterCategories]);

  // Build gender options from block gender metadata
  const genderOptions = useMemo(() => {
    const map = new Map<string, string>();
    skuBlocks.forEach((b: any) => {
      const val = b.gender || '';
      if (val && !map.has(val.toLowerCase())) map.set(val.toLowerCase(), val);
    });
    return [
      { value: 'all', label: 'All Genders' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [skuBlocks]);

  // Build category options from items' division field (not block metadata)
  const categoryOptions = useMemo(() => {
    const activeBrandIds = new Set(displayBrands.map((b: any) => String(b.id)));
    const map = new Map<string, string>();
    skuBlocks.forEach((b: any) => {
      if (!activeBrandIds.has(String(b.brandId))) return;
      (b.items || []).forEach((item: any) => {
        const val = item.division || '';
        if (val && !map.has(val.toLowerCase())) map.set(val.toLowerCase(), val);
      });
    });
    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [skuBlocks, displayBrands]);

  // Build sub-category options from items' productType field, filtered by selected brand & category
  // Also merges planning sub-cats so panel-selected values always appear in the dropdown
  const subCategoryOptions = useMemo(() => {
    const activeBrandIds = new Set(displayBrands.map((b: any) => String(b.id)));
    const map = new Map<string, string>();
    // Seed from planning final version sub-cats (always present regardless of SKU data)
    activeBrandIds.forEach(brandId => {
      (brandPlanningSubcats[brandId] || []).forEach((sc: any) => {
        if (categoryFilter !== 'all' && (sc.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return;
        const val = sc.subCategory || '';
        if (val && !map.has(val.toLowerCase())) map.set(val.toLowerCase(), val);
      });
    });
    // Merge SKU block items (may override with exact casing from real data)
    skuBlocks.forEach((b: any) => {
      if (!activeBrandIds.has(String(b.brandId))) return;
      (b.items || []).forEach((item: any) => {
        if (categoryFilter !== 'all' && (item.division || '').toLowerCase() !== categoryFilter.toLowerCase()) return;
        const val = item.productType || '';
        if (val && !map.has(val.toLowerCase())) map.set(val.toLowerCase(), val);
      });
    });
    return [
      { value: 'all', label: 'All Sub Categories' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [categoryFilter, skuBlocks, displayBrands, brandPlanningSubcats]);

  const railOptions = useMemo(() => {
    const activeBrandIds = new Set(displayBrands.map((b: any) => String(b.id)));
    const seen = new Map<string, string>();
    skuBlocks.forEach((b: any) => {
      if (!b.rail) return;
      if (!activeBrandIds.has(String(b.brandId))) return;
      const key = b.rail.toLowerCase();
      if (!seen.has(key)) seen.set(key, b.rail);
    });
    return [
      { value: 'all', label: 'All Rails' },
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [skuBlocks, displayBrands]);

  const filteredSkuBlocks = useMemo(() => {
    return skuBlocks.filter((block: any) => {
      if (genderFilter !== 'all' && (block.gender || '').toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (railFilter !== 'all' && (block.rail || '').toLowerCase() !== railFilter.toLowerCase()) return false;
      if (categoryFilter !== 'all') {
        const hasMatch = (block.items || []).some((item: any) =>
          (item.division || '').toLowerCase() === categoryFilter.toLowerCase()
        );
        if (!hasMatch) return false;
      }
      if (subCategoryFilter !== 'all') {
        const hasMatch = (block.items || []).some((item: any) =>
          (item.productType || '').toLowerCase() === subCategoryFilter.toLowerCase()
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [genderFilter, railFilter, categoryFilter, subCategoryFilter, skuBlocks]);

  // Per-brand rail blocks: grouped by product.rail field
  const brandSubcategoryBlocks = useMemo(() => {
    const result: Record<string, any[]> = {};
    displayBrands.forEach((brand: any) => {
      const brandId = String(brand.id);
      const addedKeys = new Set<string>();
      const blocks: any[] = [];
      skuBlocks.forEach((block: any) => {
        if (String(block.brandId || 'all') !== brandId) return;
        const rail = (block.rail || '').toLowerCase();
        if (genderFilter !== 'all' && (block.gender || '').toLowerCase() !== genderFilter.toLowerCase()) return;
        if (railFilter !== 'all' && rail !== railFilter.toLowerCase()) return;
        if (categoryFilter !== 'all') {
          const hasMatch = (block.items || []).some((item: any) =>
            (item.division || '').toLowerCase() === categoryFilter.toLowerCase()
          );
          if (!hasMatch) return;
        }
        if (subCategoryFilter !== 'all') {
          const hasMatch = (block.items || []).some((item: any) =>
            (item.productType || '').toLowerCase() === subCategoryFilter.toLowerCase()
          );
          if (!hasMatch) return;
        }
        // Dedup by rail+subCategory so null-rail blocks with different subCategories are not merged
        const fullKey = `${rail}__${(block.subCategory || '').toLowerCase()}`;
        if (!addedKeys.has(fullKey)) {
          addedKeys.add(fullKey);
          blocks.push(block);
        }
      });
      result[brandId] = blocks;
    });
    return result;
  }, [displayBrands, skuBlocks, genderFilter, railFilter, categoryFilter, subCategoryFilter]);

  // Build products payload — only include SKUs that need DB writes:
  // already persisted (skuProposalId), user-ordered (order > 0), or manually added (isNew)
  const buildProductsPayload = useCallback((brandId: string) => {
    const currentBlocks = skuBlocksRef.current;
    const currentSizing = sizingDataRef.current;
    const blocks = currentBlocks.filter((b: any) =>
      String(b.brandId || 'all') === brandId && b.items?.length > 0
    );
    return blocks.flatMap((block: any) => {
      const blockKey = buildBlockKey(block);
      return block.items
        .filter((item: any, idx: number) => {
          if (!item.productId) return false;
          // Already in DB — must keep (delete+recreate will remove it otherwise)
          if (item.skuProposalId) return true;
          // User placed an order
          if ((Number(item.order) || 0) > 0) return true;
          // User manually added this item (not a recommendation)
          if (item.isNew) return true;
          // User has sizing data for this item
          const key = `${blockKey}_${idx}`;
          const itemSizing = currentSizing[key];
          if (itemSizing && Object.values(itemSizing).some((v: any) => (Number(v) || 0) > 0)) return true;
          return false;
        })
        .map((item: any) => ({
          productId: String(item.productId),
          customerTarget: String(item.customerTarget || 'New'),
          unitCost: Number(item.unitCost) || 0,
          srp: Number(item.srp) || 0,
          comment: item.comment || '',
          sizingComment: item.sizingComment || '',
          allocations: stores.map((store: any) => ({
            storeId: String(store.id),
            quantity: Number(item.storeQty?.[(store.code || '').toUpperCase()]) || 0,
          })).filter((a: any) => a.quantity > 0),
        }));
    });
  }, [stores]);

  // Resolve DB ID for a size name — checks ref first, then falls back to subCategorySizesMap
  const resolveSizeDbId = useCallback((sizeName: string, subCategoryName?: string): string | undefined => {
    // Primary: check the ref (populated from master data + hydrate)
    const fromRef = sizeKeyToIdRef.current[sizeName];
    if (fromRef) return String(fromRef);
    // Fallback: search subCategorySizesMap by subcategory name
    if (subCategoryName) {
      const sizes = subCategorySizesMap[(subCategoryName || '').toLowerCase()];
      const match = sizes?.find(s => s.name === sizeName);
      if (match?.id) {
        // Cache it in the ref for future lookups
        sizeKeyToIdRef.current[sizeName] = String(match.id);
        return String(match.id);
      }
    }
    // Last resort: search ALL subcategory sizes for this name
    for (const sizes of Object.values(subCategorySizesMap)) {
      const match = sizes.find(s => s.name === sizeName);
      if (match?.id) {
        sizeKeyToIdRef.current[sizeName] = String(match.id);
        return String(match.id);
      }
    }
    return undefined;
  }, [subCategorySizesMap]);

  // Build sizingRows payload — flat list of {skuProposalProductId, subcategorySizeId, proposalQuantity}
  // Reads from refs to guarantee latest state (avoids stale closure in save chain)
  const buildSizingsPayload = useCallback((brandId: string) => {
    const currentBlocks = skuBlocksRef.current;
    const currentSizing = sizingDataRef.current;
    const blocks = currentBlocks.filter((b: any) =>
      String(b.brandId || 'all') === brandId && b.items?.length > 0
    );

    const sizingRows: any[] = [];
    blocks.forEach((block: any) => {
      const blockKey = buildBlockKey(block);
      const subCatName = block.subCategory || '';
      (block.items || []).forEach((item: any, idx: number) => {
        if ((Number(item.order) || 0) <= 0) return; // sizing requires order
        const key = `${blockKey}_${idx}`;
        const itemSizing = currentSizing[key];
        if (!itemSizing) return;
        Object.entries(itemSizing).forEach(([sizeName, qty]) => {
          const numQty = Math.round(Number(qty) || 0);
          if (numQty <= 0) return;
          const sizeDbId = resolveSizeDbId(sizeName, subCatName || item.productType);
          if (sizeDbId) {
            sizingRows.push({
              skuProposalProductId: String(item.productId),
              subcategorySizeId: String(sizeDbId),
              proposalQuantity: numQty,
            });
          }
        });
      });
    });

    return sizingRows.length > 0 ? sizingRows : undefined;
  }, [resolveSizeDbId, subCategorySizesMap]);

  // Build bare sku_proposal records for recommended SKUs of OTHER sub-categories.
  // Called only on first-time save (no existing version). These records are saved
  // without sku_allocate or sizing so they serve as placeholders — the user fills
  // them in during subsequent sub-category sessions.
  const buildBareRecommendedPayload = useCallback((brandId: string) => {
    const currentSubcatFilter = subCategoryFilterRef.current;
    // Only inject when the user entered from OTB Analysis with a specific sub-category filter.
    // If 'all', the user sees all sub-categories and can work on them normally.
    if (currentSubcatFilter === 'all') return [];

    const currentBlocks = skuBlocksRef.current;
    return currentBlocks
      .filter((b: any) =>
        String(b.brandId || 'all') === brandId &&
        (b.subCategory || '').toLowerCase() !== currentSubcatFilter.toLowerCase()
      )
      .flatMap((block: any) =>
        (block.items || [])
          .filter((item: any) =>
            item.productId &&
            item.isRecommended === true &&
            !item.skuProposalId // not yet persisted
          )
          .map((item: any) => ({
            productId: String(item.productId),
            customerTarget: String(item.customerTarget || 'New'),
            unitCost: Number(item.unitCost) || 0,
            srp: Number(item.srp) || 0,
            comment: '',
            sizingComment: '',
            allocations: [], // bare record — no store allocations, no sizing
          }))
      );
  }, []); // reads refs only

  // Compute delta between current state and the DB snapshot for a brand
  const computeDelta = useCallback((brandId: string) => {
    const snapshot = brandSnapshotRef.current[brandId] || {};
    const currentBlocks = skuBlocksRef.current.filter((b: any) => String(b.brandId) === brandId);
    const currentSizing = sizingDataRef.current;

    const upserted: any[] = [];
    const sizingRows: any[] = [];
    const deletedProductIds: string[] = [];
    const currentProductIds = new Set<string>();

    currentBlocks.forEach((block: any) => {
      const blockKey = buildBlockKey(block);
      const subCatName = block.subCategory || '';
      (block.items || []).forEach((item: any, idx: number) => {
        if (!item.productId) return;
        const productId = String(item.productId);
        currentProductIds.add(productId);

        const key = `${blockKey}_${idx}`;
        const itemSizing = currentSizing[key] || {};
        const snap = snapshot[productId];
        const hasOrder = (Number(item.order) || 0) > 0;

        if (!snap) {
          // New item — only include if user has acted on it
          const hasSizing = Object.values(itemSizing).some((v: any) => (Number(v) || 0) > 0);
          if (!hasOrder && !item.isNew && !hasSizing) return;
        } else {
          // Existing DB item — skip if nothing changed
          const changed =
            (Number(item.order) || 0) !== (snap.order || 0) ||
            JSON.stringify(item.storeQty || {}) !== JSON.stringify(snap.storeQty || {}) ||
            (item.customerTarget || 'New') !== snap.customerTarget ||
            (item.comment || '') !== snap.comment ||
            (item.sizingComment || '') !== snap.sizingComment ||
            JSON.stringify(itemSizing) !== JSON.stringify(snap.sizing || {});
          if (!changed) return;
        }

        upserted.push({
          productId,
          customerTarget: item.customerTarget || 'New',
          unitCost: Number(item.unitCost) || 0,
          srp: Number(item.srp) || 0,
          comment: item.comment || '',
          sizingComment: item.sizingComment || '',
          allocations: stores.map((store: any) => ({
            storeId: String(store.id),
            quantity: Number(item.storeQty?.[(store.code || '').toUpperCase()]) || 0,
          })).filter((a: any) => a.quantity > 0),
        });

        if (hasOrder) {
          Object.entries(itemSizing).forEach(([sizeName, qty]) => {
            const numQty = Math.round(Number(qty) || 0);
            if (numQty <= 0) return;
            const sizeDbId = resolveSizeDbId(sizeName, subCatName || item.productType);
            if (sizeDbId) sizingRows.push({ skuProposalProductId: productId, subcategorySizeId: String(sizeDbId), proposalQuantity: numQty });
          });
        }
      });
    });

    // Items in snapshot but removed from UI
    Object.keys(snapshot).forEach(productId => {
      if (!currentProductIds.has(productId)) deletedProductIds.push(productId);
    });

    return { upserted, sizingRows, deletedProductIds };
  }, [stores, resolveSizeDbId]);

  // Save a single brand's proposal data
  const handleSaveBrand = useCallback(async (brandId: string, isNewVersion: boolean) => {
    let headerId = getBrandSkuVersion(brandId);
    setBrandSaving(prev => ({ ...prev, [brandId]: true }));
    showLoading(isNewVersion ? 'Saving as new version...' : 'Saving...');
    try {
      // ── Case 1: No existing version → create header + full save ────────
      if (!headerId) {
        const products = buildProductsPayload(brandId);
        const sizings = buildSizingsPayload(brandId);
        if (products.length === 0) {
          toast.error('Please add at least one SKU before saving');
          return;
        }
        // Bare sku_proposal records for recommended SKUs of other sub-categories.
        // These have no allocations/sizing — they act as placeholders for future sessions.
        const bareRecommended = buildBareRecommendedPayload(brandId);
        const allProducts = bareRecommended.length > 0 ? [...products, ...bareRecommended] : products;

        const matchedAH = matchedAllocateHeaders.find((ah: any) => String(ah.brandId) === brandId);
        const proposals = products.map((p: any) => ({ productId: p.productId, customerTarget: p.customerTarget || 'New', unitCost: p.unitCost || 0, srp: p.srp || 0 }));
        const createPayload: any = { proposals };
        if (matchedAH) createPayload.allocateHeaderId = String(matchedAH.id);
        if (resolvedSeasonIds.seasonGroupId) createPayload.seasonGroupId = resolvedSeasonIds.seasonGroupId;
        if (resolvedSeasonIds.seasonId) createPayload.seasonId = resolvedSeasonIds.seasonId;
        const created = await proposalService.create(createPayload);
        const newHeader = created?.data || created;
        if (newHeader) {
          const newId = String(newHeader.id);
          await proposalService.saveFullProposal(newId, { products: allProducts, sizingRows: sizings });
          setBrandProposalHeaders(prev => ({ ...prev, [brandId]: [{ id: newId, version: newHeader.version || 1, status: 'DRAFT', isFinal: false }, ...(prev[brandId] || [])] }));
          setBrandSkuVersion(prev => ({ ...prev, [brandId]: newId }));
          const detail = await proposalService.getOne(newId);
          const fullDetail = detail?.data || detail;
          if (fullDetail) {
            const brandBlocks = buildBlocksFromProposal(fullDetail, brandId);
            captureSnapshotFromBlocks(brandId, brandBlocks);
            hydrateSizingData(brandBlocks);
          }
        }
        invalidateCache('/proposals');
        toast.success('Created new version');
        return;
      }

      // ── Case 2: Save as new version — copy + full save of current state ─
      if (isNewVersion) {
        const products = buildProductsPayload(brandId);
        const sizings = buildSizingsPayload(brandId);
        const result = await proposalService.copyProposal(headerId);
        const newHeader = result?.data || result;
        if (newHeader) {
          const newId = String(newHeader.id);
          if (products.length > 0) {
            await proposalService.saveFullProposal(newId, { products, sizingRows: sizings });
          }
          setBrandProposalHeaders(prev => ({ ...prev, [brandId]: [{ id: newId, version: newHeader.version, status: 'DRAFT', isFinal: false }, ...(prev[brandId] || [])] }));
          setBrandSkuVersion(prev => ({ ...prev, [brandId]: newId }));
          const detail = await proposalService.getOne(newId);
          const fullDetail = detail?.data || detail;
          if (fullDetail) {
            const brandBlocks = buildBlocksFromProposal(fullDetail, brandId);
            captureSnapshotFromBlocks(brandId, brandBlocks);
            hydrateSizingData(brandBlocks);
          }
        }
        invalidateCache('/proposals');
        toast.success('Saved as new version');
        return;
      }

      // ── Case 3: Normal save — delta only (changed / new / deleted SKUs) ─
      const { upserted, sizingRows, deletedProductIds } = computeDelta(brandId);
      if (upserted.length === 0 && deletedProductIds.length === 0) {
        toast.success('No changes to save');
        return;
      }
      await proposalService.saveDeltaProposal(headerId, { upserted, sizingRows, deletedProductIds });
      invalidateCache('/proposals');
      const detail = await proposalService.getOne(headerId);
      const fullDetail = detail?.data || detail;
      if (fullDetail) {
        const brandBlocks = buildBlocksFromProposal(fullDetail, brandId);
        captureSnapshotFromBlocks(brandId, brandBlocks);
        setSkuBlocks(prev => {
          const other = prev.filter((b: any) => String(b.brandId) !== brandId);
          return [...other, ...brandBlocks];
        });
        hydrateSizingData(brandBlocks);
      }
      toast.success('Saved successfully');
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.userMessage || '';
      console.error(`Failed to ${isNewVersion ? 'save as new version' : 'save'} proposal:`, err, '\n  → server:', serverMsg);
      toast.error(`${isNewVersion ? 'Failed to save as new version' : 'Failed to save'}${serverMsg ? ': ' + serverMsg : ''}`);
    } finally {
      setBrandSaving(prev => ({ ...prev, [brandId]: false }));
      hideLoading();
    }
  }, [buildProductsPayload, buildSizingsPayload, computeDelta, captureSnapshotFromBlocks, getBrandSkuVersion, matchedAllocateHeaders, showLoading, hideLoading]);

  // Save all brands (used by AppContext header button)
  const handleSave = useCallback(async () => {
    for (const brand of displayBrands) {
      await handleSaveBrand(String(brand.id), false);
    }
  }, [displayBrands, handleSaveBrand]);

  const handleSaveAsNew = useCallback(async () => {
    for (const brand of displayBrands) {
      await handleSaveBrand(String(brand.id), true);
    }
  }, [displayBrands, handleSaveBrand]);

  // Register save handlers with AppContext
  useEffect(() => {
    registerSave(handleSave);
    registerSaveAsNew(handleSaveAsNew);
    return () => {
      unregisterSave();
      unregisterSaveAsNew();
    };
  }, [handleSave, handleSaveAsNew, registerSave, unregisterSave, registerSaveAsNew, unregisterSaveAsNew]);

  const grandTotals = useMemo(() => {
    return filteredSkuBlocks.reduce((acc: any, block: any) => {
      block.items.forEach((item: any) => {
        acc.skuCount += 1;
        acc.order += (item.order || 0);
        acc.ttlValue += ((item.order || 0) * (item.unitCost || 0));
        acc.srp += (item.srp || 0);
        acc.unitCost += (item.unitCost || 0);
        // Aggregate per-store quantities
        const sq = item.storeQty || {};
        Object.keys(sq).forEach((code: string) => {
          acc.storeQty[code] = (acc.storeQty[code] || 0) + (sq[code] || 0);
        });
      });
      return acc;
    }, { skuCount: 0, order: 0, storeQty: {} as Record<string, number>, ttlValue: 0, srp: 0, unitCost: 0 });
  }, [filteredSkuBlocks]);

  // Card view available when there's data to show
  const canShowCardView = filteredSkuBlocks.length > 0 && filteredSkuBlocks.some((b: any) => b.items.length > 0);

  // Submit validation: all brands must have final version + final sizing choice
  // Per-brand ticket submit readiness check
  const canSubmitTicketForBrand = useCallback((brandId: string) => {
    const brandBlocks = filteredSkuBlocks.filter((b: any) => String(b.brandId) === brandId);
    const brandOrder = brandBlocks.reduce((sum: number, block: any) =>
      sum + (block.items || []).reduce((s: number, item: any) => s + (Number(item.order) || 0), 0), 0);
    if (brandOrder === 0) return false;
    const hasFinalVersion = (brandProposalHeaders[brandId] || []).some((h: any) => h.isFinal);
    return hasFinalVersion;
  }, [filteredSkuBlocks, brandProposalHeaders]);

  const handleSubmitTicketForBrand = useCallback((brandId: string) => {
    if (!onSubmitTicket) return;
    const brandName = displayBrands.find((b: any) => String(b.id) === brandId)?.name || '';
    const finalHeaderId = getBrandSkuVersion(brandId);
    const brandBlocksAll = filteredSkuBlocks.filter((block: any) => {
      const bId = String(block.brandId || 'all');
      return bId === brandId && (!block.proposalHeaderId || block.proposalHeaderId === finalHeaderId);
    });
    // Enrich items with sizing data — only include items with order > 0 and sizing entered
    const enrichedBlocks = brandBlocksAll.map((block: any) => {
      const blockKey = buildBlockKey(block);
      const enrichedItems = (block.items || [])
        .map((item: any, origIdx: number) => {
          const totalOrder = Number(item.order) || 0;
          if (totalOrder <= 0) return null;
          if (!hasSizingData(blockKey, origIdx)) return null;
          const sizing = getSizing(blockKey, origIdx);
          return { ...item, sizing };
        })
        .filter(Boolean);
      return { ...block, items: enrichedItems };
    }).filter((block: any) => block.items.length > 0);
    // Brand totals
    const brandGrandTotals = {
      skuCount: enrichedBlocks.reduce((sum: number, b: any) => sum + (b.items?.length || 0), 0),
      order: enrichedBlocks.reduce((sum: number, b: any) =>
        sum + (b.items || []).reduce((s: number, i: any) => s + (Number(i.order) || 0), 0), 0),
      ttlValue: enrichedBlocks.reduce((sum: number, b: any) =>
        sum + (b.items || []).reduce((s: number, i: any) => s + (Number(i.ttlValue) || 0), 0), 0),
      storeQty: stores.reduce((acc: Record<string, number>, st: any) => {
        acc[st.code] = enrichedBlocks.reduce((sum: number, b: any) =>
          sum + (b.items || []).reduce((s: number, i: any) => s + (Number(i.storeQty?.[st.code]) || 0), 0), 0);
        return acc;
      }, {} as Record<string, number>),
    };
    const proposalHeaderIds = finalHeaderId ? [finalHeaderId] : [];
    const matchedAH = matchedAllocateHeaders.find((ah: any) => String(ah.brandId) === brandId);
    const brandAllocations = matchedAH && matchedAH.isFinal ? [{
      brandId, brandName: matchedAH.brandName || brandName,
      totalAllocation: (matchedAH.budgetAllocates || [])
        .filter((ba: any) => ba.seasonGroupName === seasonGroupFilter && ba.seasonName === seasonFilter)
        .reduce((sum: number, ba: any) => sum + (ba.budgetAmount || 0), 0),
    }] : [];
    const matchedSG = apiSeasonGroups.find((sg: any) => (sg.name || sg.code) === seasonGroupFilter);
    let resolvedSeasonId = '';
    if (matchedSG) {
      const matchedS = (matchedSG.seasons || []).find((s: any) => (s.name || s.code) === seasonFilter);
      if (matchedS) resolvedSeasonId = String(matchedS.id);
    }
    onSubmitTicket({
      budgetId: budgetFilter !== 'all' ? budgetFilter : '',
      proposalHeaderIds,
      skuBlocks: enrichedBlocks,
      grandTotals: brandGrandTotals,
      stores,
      fiscalYear: fyFilter !== 'all' ? fyFilter : '',
      budgetName: selectedBudget?.budgetName || '',
      budgetAmount: selectedBudget?.totalBudget || 0,
      seasonGroup: seasonGroupFilter !== 'all' ? seasonGroupFilter : '',
      season: seasonFilter !== 'all' ? seasonFilter : '',
      seasonGroupId: matchedSG ? String(matchedSG.id) : '',
      seasonId: resolvedSeasonId,
      brandAllocations,
      brandId,
      brandName,
    });
  }, [onSubmitTicket, displayBrands, filteredSkuBlocks, getBrandSkuVersion, getSizing, stores, matchedAllocateHeaders, apiSeasonGroups, seasonGroupFilter, seasonFilter, budgetFilter, fyFilter, selectedBudget]);

  // Export filtered SKU data to Excel (2 sheets: SKU Proposal + Sizing)
  const handleExportExcel = useCallback(async () => {
    const currentBlocks = skuBlocksRef.current;
    const currentSizing = sizingDataRef.current;
    const blocksToExport = filteredSkuBlocks.length > 0 ? filteredSkuBlocks : currentBlocks;

    if (blocksToExport.length === 0 || blocksToExport.every((b: any) => !b.items?.length)) {
      toast.error(t('skuProposal.noDataToExport') || 'No data to export');
      return;
    }

    // Determine brand name for filename
    const firstBrandId = blocksToExport[0]?.brandId;
    const brandObj = apiBrands.find((b: any) => String(b.id) === String(firstBrandId));
    const brandName = brandObj?.name || 'All';

    // Build SKU blocks payload
    const exportBlocks: SKUExportBlock[] = blocksToExport.map((block: any) => ({
      brandId: String(block.brandId || 'all'),
      brandName: apiBrands.find((b: any) => String(b.id) === String(block.brandId))?.name || '',
      rail: block.rail || '',
      gender: block.gender || '',
      category: block.category || '',
      subCategory: block.subCategory || '',
      items: (block.items || []).map((item: any) => ({
        productId: String(item.productId || ''),
        sku: item.sku || '',
        name: item.name || '',
        color: item.color || '',
        colorCode: item.colorCode || '',
        productType: item.productType || '',
        customerTarget: item.customerTarget || 'New',
        unitCost: item.unitCost || 0,
        srp: item.srp || 0,
        order: item.order || 0,
        ttlValue: item.ttlValue || 0,
        storeQty: item.storeQty || {},
      })),
    }));

    // Build sizing rows payload — one row per item that has sizing or order > 0
    const sizingExportRows: SizingExportRow[] = [];

    // Sort helper for size names
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
    const sortSizes = (names: string[]) => names.sort((a, b) => {
      const ia = sizeOrder.indexOf(a);
      const ib = sizeOrder.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });

    blocksToExport.forEach((block: any) => {
      const blockKey = buildBlockKey(block);
      // Get size keys for this block's subcategory
      const subCatSizes = subCategorySizesMap[(block.subCategory || '').toLowerCase()];
      const subCatSizeNames = subCatSizes ? subCatSizes.map(s => s.name) : [];

      (block.items || []).forEach((item: any, idx: number) => {
        const key = `${blockKey}_${idx}`;
        const itemSizing = currentSizing[key] || {};
        // Merge subcategory sizes + any extra sizes from sizing data
        const sizeSet = new Set([...subCatSizeNames, ...Object.keys(itemSizing)]);
        const sizeKeys = sortSizes(Array.from(sizeSet));
        // Skip sizing export if no sizes configured in master data
        if (sizeKeys.length === 0) return;

        sizingExportRows.push({
          productId: String(item.productId || ''),
          sku: item.sku || '',
          name: item.name || '',
          rail: block.rail || '',
          subCategory: block.subCategory || '',
          order: item.order || 0,
          sizes: itemSizing,
          sizeKeys,
        });
      });
    });

    const sizeColumns: string[] = []; // kept for payload compat

    const storeCodes = stores.map((s: any) => (s.code || '').toUpperCase()).filter(Boolean);

    try {
      const filename = await exportSKUProposalExcel({
        brandName,
        blocks: exportBlocks,
        storeCodes,
        sizingRows: sizingExportRows,
        sizeColumns,
      });
      const totalItems = exportBlocks.reduce((sum, b) => sum + b.items.length, 0);
      toast.success(`Exported ${totalItems} SKUs to ${filename}`);
    } catch (err: any) {
      console.error('[SKUProposal] Export failed:', err);
      toast.error('Failed to export Excel');
    }
  }, [filteredSkuBlocks, apiBrands, stores, subCategorySizesMap, t]);

  // Import Excel — compute diff preview, then show confirm modal before applying
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importFileRef.current) importFileRef.current.value = '';

    showLoading('Importing Excel...');
    try {
      const result: SKUProposalImportResult = await importSKUProposalExcel(file);
      if (result.errors.length > 0) {
        toast.error(`Import errors:\n${result.errors.join('\n')}`);
        return;
      }

      const skuMap = new Map(result.skuRows.map(r => [r.productId, r]));
      const sizingMap = new Map(result.sizingRows.map(r => [r.productId, r]));
      const currentBlocks = skuBlocksRef.current;
      const currentSizing = sizingDataRef.current;

      const previewItems: ImportPreviewItem[] = [];

      currentBlocks.forEach((block: any) => {
        const blockKey = buildBlockKey(block);
        (block.items || []).forEach((item: any, idx: number) => {
          const pid = String(item.productId);
          const importedSku = skuMap.get(pid);
          const importedSizing = sizingMap.get(pid);
          if (!importedSku && !importedSizing) return;

          // Compute per-store changes
          const oldStoreQty: Record<string, number> = item.storeQty || {};
          const newStoreQty = importedSku ? { ...oldStoreQty, ...importedSku.storeQty } : oldStoreQty;
          const storeChanges = stores
            .map((store: any) => {
              const code = (store.code || '').toUpperCase();
              return { code, oldQty: Number(oldStoreQty[code]) || 0, newQty: Number(newStoreQty[code]) || 0 };
            })
            .filter((s: any) => s.oldQty !== s.newQty || s.newQty > 0);

          const newOrder = importedSku
            ? Object.values(newStoreQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
            : Number(item.order) || 0;

          // Compute per-size changes
          const key = `${blockKey}_${idx}`;
          const oldSizing: Record<string, number> = currentSizing[key] || {};
          const newSizingData: Record<string, number> = importedSizing ? importedSizing.sizes : oldSizing;
          const allSizeNames = Array.from(new Set([...Object.keys(oldSizing), ...Object.keys(newSizingData)]));
          const sizeChanges = allSizeNames
            .map(name => ({ name, oldQty: Number(oldSizing[name]) || 0, newQty: Number(newSizingData[name]) || 0 }))
            .filter(s => s.oldQty !== s.newQty || s.newQty > 0);

          const oldOrder = Number(item.order) || 0;
          const oldSizingTotal = Object.values(oldSizing).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
          const newSizingTotal = Object.values(newSizingData).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
          const orderChanged = importedSku != null && newOrder !== oldOrder;
          const sizingChanged = importedSizing != null && newSizingTotal !== oldSizingTotal;

          if (!orderChanged && !sizingChanged) return;

          previewItems.push({
            productId: pid,
            skuCode: item.sku || item.skuCode || '',
            skuName: item.name || item.skuName || '',
            rail: block.rail || '',
            oldOrder,
            newOrder,
            oldSizingTotal,
            newSizingTotal,
            orderChanged,
            sizingChanged,
            sizingExceedsOrder: newSizingTotal > newOrder && newOrder > 0,
            storeChanges,
            sizeChanges,
          });
        });
      });

      if (previewItems.length === 0) {
        toast.success('Import complete (no changes)');
        return;
      }

      setImportPreview({ items: previewItems, result });
    } catch (err: any) {
      console.error('[SKUProposal] Import failed:', err);
      toast.error(`Import failed: ${err?.message || 'Unknown error'}`);
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  // Apply the confirmed import (skipping blocked SKUs)
  const handleConfirmImport = useCallback(() => {
    if (!importPreview) return;
    const { result, items } = importPreview;
    const blockedIds = new Set(items.filter(i => i.sizingExceedsOrder).map(i => i.productId));
    const skuMap = new Map(result.skuRows.map(r => [r.productId, r]));
    const sizingMap = new Map(result.sizingRows.map(r => [r.productId, r]));

    let updatedSKUs = 0;
    let updatedSizing = 0;

    setSkuBlocks((prev: any[]) => prev.map((block: any) => ({
      ...block,
      items: block.items.map((item: any) => {
        const pid = String(item.productId);
        if (blockedIds.has(pid)) return item;
        const imported = skuMap.get(pid);
        if (!imported) return item;
        updatedSKUs++;
        const newStoreQty = { ...(item.storeQty || {}), ...imported.storeQty };
        const newOrder = Object.values(newStoreQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
        return { ...item, storeQty: newStoreQty, order: newOrder, ttlValue: newOrder * (item.unitCost || 0), customerTarget: imported.customerTarget || item.customerTarget };
      }),
    })));

    if (sizingMap.size > 0) {
      setSizingData((prev: Record<string, any>) => {
        const next = { ...prev };
        skuBlocksRef.current.forEach((block: any) => {
          const blockKey = buildBlockKey(block);
          (block.items || []).forEach((item: any, idx: number) => {
            const pid = String(item.productId);
            if (blockedIds.has(pid)) return;
            const imported = sizingMap.get(pid);
            if (!imported) return;
            updatedSizing++;
            next[`${blockKey}_${idx}`] = { ...(next[`${blockKey}_${idx}`] || {}), ...imported.sizes };
          });
        });
        return next;
      });
    }

    setImportPreview(null);
    const msgs: string[] = [];
    if (updatedSKUs > 0) msgs.push(`${updatedSKUs} SKUs updated`);
    if (updatedSizing > 0) msgs.push(`${updatedSizing} sizing entries imported`);
    if (blockedIds.size > 0) msgs.push(`${blockedIds.size} SKUs skipped (sizing > order)`);
    toast.success(msgs.length > 0 ? `Import complete: ${msgs.join(', ')}` : 'Import complete');
  }, [importPreview]);

  // Register export handler with AppContext (for header Export button)
  useEffect(() => {
    registerExport(handleExportExcel);
    return () => { unregisterExport(); };
  }, [handleExportExcel, registerExport, unregisterExport]);

  // Register import handler with AppContext (for header Import button)
  useEffect(() => {
    registerImport(() => { importFileRef.current?.click(); });
    return () => { unregisterImport(); };
  }, [registerImport, unregisterImport]);

  // Register back navigate handler — carries current filters back to OTB Analysis
  useEffect(() => {
    registerBackNavigate(() => {
      const matchedBudget = apiBudgets.find((b: any) => b.id === budgetFilter);
      setOtbAnalysisContext({
        budgetId: budgetFilter !== 'all' ? budgetFilter : null,
        budgetName: matchedBudget?.budgetName || '',
        fiscalYear: matchedBudget?.fiscalYear || null,
        totalBudget: matchedBudget?.totalBudget || 0,
        status: matchedBudget?.status || 'draft',
        brandId: brandFilter !== 'all' ? brandFilter : null,
        brandIds: brandFilter !== 'all' ? [brandFilter] : [],
        seasonGroup: seasonGroupFilter !== 'all' ? seasonGroupFilter : null,
        season: seasonFilter !== 'all' ? seasonFilter : null,
      });
      router.push('/otb-analysis');
    });
    return () => { unregisterBackNavigate(); };
  }, [apiBudgets, budgetFilter, brandFilter, seasonGroupFilter, seasonFilter, setOtbAnalysisContext, router, registerBackNavigate, unregisterBackNavigate]);

  const handleStartEdit = (cellKey: any, currentValue: any) => {
    setEditingCell(cellKey);
    setEditValue(currentValue?.toString() ?? '');
  };

  const handleSaveEdit = (cellKey: any) => {
    const value = Number(editValue);
    const nextValue = Number.isFinite(value) ? value : 0;
    const [blockKey, itemIdx, field] = cellKey.split('|');

    setSkuBlocks((prev: any) => prev.map((block: any) => {
      const bKey = buildBlockKey(block);
      if (bKey !== blockKey) return block;
      const items = block.items.map((item: any, idx: any) => {
        if (String(idx) !== itemIdx) return item;
        // Handle store_XXX fields → update storeQty map
        if (field.startsWith('store_')) {
          const storeCode = field.replace('store_', '');
          const newStoreQty = { ...(item.storeQty || {}), [storeCode]: nextValue };
          const newOrder = Object.values(newStoreQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
          const newTtlValue = newOrder * (item.unitCost || 0);
          return { ...item, storeQty: newStoreQty, order: newOrder, ttlValue: newTtlValue };
        }
        return { ...item, [field]: nextValue };
      });
      return { ...block, items };
    }));
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: any, cellKey: any) => {
    if (e.key === 'Enter') {
      handleSaveEdit(cellKey);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSelectChange = (blockKey: any, itemIdx: any, field: any, value: any) => {
    setSkuBlocks((prev: any) => prev.map((block: any) => {
      const key = buildBlockKey(block);
      if (key !== blockKey) return block;
      const items = block.items.map((item: any, idx: any) => {
        if (String(idx) !== String(itemIdx)) return item;
        return { ...item, [field]: value };
      });
      return { ...block, items };
    }));
  };

  const handleNumberChange = (blockKey: any, itemIdx: any, field: any, value: any) => {
    const nextValue = Number(value);
    const safeValue = Number.isFinite(nextValue) ? nextValue : 0;
    setSkuBlocks((prev: any) => prev.map((block: any) => {
      const bKey = buildBlockKey(block);
      if (bKey !== blockKey) return block;
      const items = block.items.map((item: any, idx: any) => {
        if (String(idx) !== String(itemIdx)) return item;
        // Handle store_XXX fields → update storeQty map
        if (field.startsWith('store_')) {
          const storeCode = field.replace('store_', '');
          const newStoreQty = { ...(item.storeQty || {}), [storeCode]: safeValue };
          const newOrder = Object.values(newStoreQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
          const newTtlValue = newOrder * (item.unitCost || 0);
          return { ...item, storeQty: newStoreQty, order: newOrder, ttlValue: newTtlValue };
        }
        return { ...item, [field]: safeValue };
      });
      return { ...block, items };
    }));
  };

  const handleToggle = (key: any) => {
    setCollapsed((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAll = () => {
    const newState = !allCollapsed;
    setAllCollapsed(newState);
    const newCollapsed: Record<string, boolean> = {};
    filteredSkuBlocks.forEach((block: any) => {
      const key = buildBlockKey(block);
      newCollapsed[key] = newState;
    });
    setCollapsed(prev => ({ ...prev, ...newCollapsed }));
  };

  const handleAddSkuRow = (blockKey: any, blockInfo?: any) => {
    const newItem = {
      sku: '',
      name: '',
      collectionName: '',
      color: '',
      colorCode: '',
      division: '',
      productType: '',
      departmentGroup: '',
      fsr: '',
      carryForward: 'NEW',
      composition: '',
      unitCost: 0,
      importTaxPct: 0,
      srp: 0,
      wholesale: 0,
      rrp: 0,
      regionalRrp: 0,
      theme: '',
      size: '',
      order: 0,
      storeQty: {},
      ttlValue: 0,
      customerTarget: 'New',
      isNew: true
    };
    setSkuBlocks((prev: any) => {
      const existingBlock = prev.find((block: any) => buildBlockKey(block) === blockKey);
      if (existingBlock) {
        return prev.map((block: any) => {
          if (buildBlockKey(block) !== blockKey) return block;
          return { ...block, items: [...block.items, { ...newItem, division: block.category || '', productType: block.subCategory || '' }] };
        });
      }
      // Block doesn't exist yet (empty subcategory) — create it
      if (blockInfo) {
        return [...prev, {
          brandId: blockInfo.brandId || 'all',
          gender: blockInfo.gender || '',
          category: blockInfo.category || '',
          subCategory: blockInfo.subCategory || '',
          items: [{ ...newItem, division: blockInfo.category || '', productType: blockInfo.subCategory || '' }]}];
      }
      return prev;
    });
  };

  const handleSkuSelect = (blockKey: any, itemIdx: any, selectedSku: any) => {
    const skuData = skuCatalog.find((s: any) => s.sku === selectedSku);
    if (!skuData) return;

    setSkuBlocks((prev: any) => prev.map((block: any) => {
      const key = buildBlockKey(block);
      if (key !== blockKey) return block;
      const items = block.items.map((item: any, idx: any) => {
        if (idx !== itemIdx) return item;
        return {
          ...item,
          productId: skuData.productId || item.productId || '',
          sku: skuData.sku,
          name: skuData.name,
          collectionName: skuData.collectionName,
          color: skuData.color,
          colorCode: skuData.colorCode,
          division: skuData.division,
          productType: skuData.productType,
          departmentGroup: skuData.departmentGroup,
          fsr: skuData.fsr,
          carryForward: skuData.carryForward,
          composition: skuData.composition,
          unitCost: skuData.unitCost,
          importTaxPct: skuData.importTaxPct,
          srp: skuData.srp,
          wholesale: skuData.wholesale,
          rrp: skuData.rrp,
          regionalRrp: skuData.regionalRrp,
          theme: skuData.theme,
          size: skuData.size,
          imageUrl: skuData.imageUrl || '',
          isNew: false
        };
      });
      return { ...block, items };
    }));
  };

  const handleAddSkusFromModal = (blockKey: any, selectedSkus: any[], blockInfo?: any) => {
    const newItems = selectedSkus.map((sku: any) => ({
      productId: sku.productId || '',
      sku: sku.sku,
      name: sku.name,
      collectionName: sku.collectionName || '',
      color: sku.color || '',
      colorCode: sku.colorCode || '',
      division: sku.division || blockInfo?.category || '',
      productType: sku.productType || blockInfo?.subCategory || '',
      departmentGroup: sku.departmentGroup || '',
      fsr: sku.fsr || '',
      carryForward: sku.carryForward || 'NEW',
      composition: sku.composition || '',
      unitCost: sku.unitCost || 0,
      importTaxPct: sku.importTaxPct || 0,
      srp: sku.srp || 0,
      wholesale: sku.wholesale || 0,
      rrp: sku.rrp || 0,
      regionalRrp: sku.regionalRrp || 0,
      theme: sku.theme || '',
      size: sku.size || '',
      order: sku.order || 0,
      storeQty: sku.storeQty || {},
      ttlValue: sku.ttlValue || 0,
      customerTarget: sku.customerTarget || 'New',
      imageUrl: sku.imageUrl || '',
      isNew: false}));
    setSkuBlocks((prev: any) => {
      const existingBlock = prev.find((block: any) => buildBlockKey(block) === blockKey);
      if (existingBlock) {
        return prev.map((block: any) => {
          if (buildBlockKey(block) !== blockKey) return block;
          return { ...block, items: [...block.items, ...newItems] };
        });
      }
      // Block doesn't exist yet — create it
      if (blockInfo) {
        return [...prev, {
          brandId: blockInfo.brandId || 'all',
          gender: blockInfo.gender || '',
          category: blockInfo.category || '',
          subCategory: blockInfo.subCategory || '',
          items: newItems}];
      }
      return prev;
    });
  };

  const handleDeleteSkuRow = (blockKey: any, itemIdx: any) => {
    confirm({
      title: t('common.delete'),
      message: t('common.confirmDelete'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: () => doDeleteSkuRow(blockKey, itemIdx)});
  };
  const doDeleteSkuRow = (blockKey: any, itemIdx: any) => {
    setSkuBlocks((prev: any) => prev.map((block: any) => {
      const key = buildBlockKey(block);
      if (key !== blockKey) return block;
      const items = block.items.filter((_: any, idx: any) => idx !== itemIdx);
      return { ...block, items };
    }));
  };

  const filteredSkuItems = useMemo(() => {
    return filteredSkuBlocks.flatMap((block: any) => {
      const blockKey = buildBlockKey(block);
      return block.items.map((item: any, idx: any) => ({
        block,
        blockKey,
        item,
        idx,
        key: `${blockKey}_${item.sku || 'new'}_${idx}`
      }));
    });
  }, [filteredSkuBlocks]);

  const getCardBgClass = (index: any) => {
    const style = CARD_BG_CLASSES[index % CARD_BG_CLASSES.length];
    return style.light;
  };

  // Sub-category navigation panel — data from planning final version + completion from skuBlocks
  const activePanelBrandId = brandFilter !== 'all'
    ? brandFilter
    : (displayBrands.length === 1 ? String(displayBrands[0].id) : null);
  const planningSubcats = activePanelBrandId ? (brandPlanningSubcats[activePanelBrandId] || []) : [];
  const isPanelLoading = activePanelBrandId ? (brandLoadingPlanning[activePanelBrandId] ?? false) : false;

  const subCatNavItems = planningSubcats.map(sub => {
    const subCatLower = sub.subCategory.toLowerCase();
    const matchingBlocks = skuBlocks.filter((b: any) =>
      (b.subCategory || '').toLowerCase() === subCatLower &&
      (!activePanelBrandId || String(b.brandId) === activePanelBrandId)
    );
    const allItems: { item: any; blockKey: string; idx: number }[] = matchingBlocks.flatMap((b: any) =>
      (b.items || []).map((item: any, idx: number) => ({ item, blockKey: buildBlockKey(b), idx }))
    );
    const orderedItems = allItems.filter(({ item }) => (Number(item.order) || 0) > 0);
    const isDone = orderedItems.length > 0 &&
      orderedItems.every(({ blockKey, idx }) => isSizingComplete(blockKey, idx));
    return {
      ...sub,
      skuCount: allItems.length,
      orderedCount: orderedItems.length,
      status: isDone ? 'done' as const : 'pending' as const,
    };
  });
  const panelDoneCount = subCatNavItems.filter(s => s.status === 'done').length;
  const panelGenders = Array.from(new Set(subCatNavItems.map(s => s.gender)));

  return (
    <>
      <div ref={barRef} data-filter-bar className={`sticky -top-3 md:-top-6 z-[50] -mx-3 md:-mx-6 -mt-3 md:-mt-6 mb-2 md:mb-3 backdrop-blur-sm relative border-b ${'bg-white/95 border-[rgba(215,183,151,0.3)]'}`}>

        {/* ===== FILTER CONTENT ===== */}
        {/* Mobile Filter Button */}
        {isMobile && (
          <div className="px-3 py-1.5">
            <button
              onClick={openFilter}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.4)] text-[#6B4D30]'}`}
            >
              <SlidersHorizontal size={16} />
              {t('common.filters')}
            </button>
          </div>
        )}

        {!isMobile && <>
          {/* ── Group 1: Global Context Filters ── */}
          <div className="px-3 md:px-6 py-1.5">
            <div className="flex flex-wrap items-end gap-1.5">
              <FilterSelect
                label="FY"
                icon={Clock}
                value={fyFilter}
                options={fyOptions}
                onChange={(v: string) => { setFyFilter(v); setBudgetFilter('all'); }}
                placeholder="All FY"
              />
              {/* Budget Dropdown — matches BudgetAllocate design */}
              <div className="relative min-w-[140px]" ref={budgetDropdownRef}>
                <label className="block text-[10px] uppercase tracking-[0.06em] font-bold mb-0.5 text-[#8A6340]">
                  Budget
                </label>
                <button
                  type="button"
                  onClick={() => setIsBudgetDropdownOpen(!isBudgetDropdownOpen)}
                  className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedBudget
                    ? 'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749] hover:border-[#2A9E6A]'
                    : 'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText size={12} className={selectedBudget ? 'text-[#127749]' : 'text-[#666666]'} />
                    <span className="truncate">{selectedBudget?.budgetName || t('planning.selectBudget')}</span>
                  </div>
                  <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-200 ${isBudgetDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isBudgetDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 border rounded-xl shadow-xl z-[9999] overflow-hidden whitespace-nowrap w-max min-w-full animate-slideDown bg-white border-[#C4B5A5]">
                    <div className="max-h-72 overflow-y-auto py-0.5">
                      {loadingBudgets && (
                        <div className="px-4 py-6 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
                          <span className="ml-2 text-sm text-[#666666]">{t('common.loading')}...</span>
                        </div>
                      )}
                      {!loadingBudgets && filteredBudgets.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-[#666666]">
                          {t('budget.noMatchingBudgets')}
                        </div>
                      )}
                      {!loadingBudgets && filteredBudgets.length > 0 && (
                        <div
                          onClick={() => { setBudgetFilter('all'); setBrandFilter('all'); setIsBudgetDropdownOpen(false); }}
                          className={`px-4 py-0.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${budgetFilter === 'all'
                            ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'}`}
                        >
                          <span className="font-medium">{t('planning.selectBudget')}</span>
                          {budgetFilter === 'all' && <Check size={14} className="text-[#127749]" />}
                        </div>
                      )}
                      {!loadingBudgets && filteredBudgets.map((budget: any) => (
                        <div
                          key={budget.id}
                          onClick={() => {
                            setBudgetFilter(budget.id);
                            if (budget.fiscalYear) setFyFilter(String(budget.fiscalYear));
                            if (budget.brandId) setBrandFilter(String(budget.brandId));
                            setIsBudgetDropdownOpen(false);
                          }}
                          className={`px-4 py-0.5 cursor-pointer transition-colors border-t border-[#D4C8BB] ${budgetFilter === budget.id
                            ? 'bg-[rgba(18,119,73,0.1)]' : 'hover:bg-[rgba(160,120,75,0.18)]'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className={`font-semibold text-sm font-['Montserrat'] ${budgetFilter === budget.id ? 'text-[#127749]' : 'text-[#0A0A0A]'}`}>
                                {budget.budgetName}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-['JetBrains_Mono'] text-[#666666]">FY{budget.fiscalYear}</span>
                                <span className="text-[#2E2E2E]/30">&bull;</span>
                                <span className="text-xs font-medium font-['JetBrains_Mono'] text-[#127749]">{formatCurrency(budget.totalBudget)}</span>
                              </div>
                            </div>
                            {budgetFilter === budget.id && (
                              <div className="w-5 h-5 rounded-full bg-[#127749] flex items-center justify-center flex-shrink-0 ml-2">
                                <Check size={12} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <FilterSelect
                label={t('budget.brand') || 'Brand'}
                icon={Tag}
                value={brandFilter}
                options={brandOptions}
                onChange={setBrandFilter}
                placeholder={t('budget.allBrands') || 'All Brands'}
              />
              <FilterSelect
                label={t('budget.seasonGroup') || 'Season Group'}
                icon={Layers}
                value={seasonGroupFilter}
                options={seasonGroupOptions}
                onChange={(v: string) => { setSeasonGroupFilter(v); setSeasonFilter('all'); }}
                placeholder={t('budget.allSeasonGroups') || 'All Season Groups'}
              />
              <FilterSelect
                label={t('budget.season') || 'Season'}
                icon={Clock}
                value={seasonFilter}
                options={seasonOptions}
                onChange={setSeasonFilter}
                placeholder={t('budget.allSeasons') || 'All Seasons'}
              />

            </div>
          </div>
        </>}

        {/* ── Secondary Filters + Controls ── */}
        {!isMobile && (
          <div className="border-t border-[rgba(215,183,151,0.25)] px-3 md:px-6 py-1.5 flex items-center gap-1.5 flex-wrap">
            {/* Gender, Category, SubCategory, Rail */}
            <FilterSelect
              icon={Users}
              label={t('common.gender') || 'Gender'}
              value={genderFilter}
              options={genderOptions}
              onChange={(v: string) => { setGenderFilter(v); setCategoryFilter('all'); setSubCategoryFilter('all'); }}
              placeholder={t('common.allGenders') || 'All Genders'}
            />
            <FilterSelect
              icon={Tag}
              label={t('common.category') || 'Category'}
              value={categoryFilter}
              options={categoryOptions}
              onChange={(v: string) => { setCategoryFilter(v); setSubCategoryFilter('all'); }}
              placeholder={t('common.allCategories') || 'All Categories'}
            />
            <FilterSelect
              icon={Tag}
              label={t('common.subCategory') || 'Sub Category'}
              value={subCategoryFilter}
              options={subCategoryOptions}
              onChange={setSubCategoryFilter}
              placeholder={t('common.allSubCategories') || 'All SubCategories'}
            />
            <FilterSelect
              icon={Layers}
              label="Rail"
              value={railFilter}
              options={railOptions}
              onChange={setRailFilter}
              placeholder="All Rails"
            />
            {hasActiveSkuFilter && (
              <button
                type="button"
                onClick={() => { setGenderFilter('all'); setCategoryFilter('all'); setSubCategoryFilter('all'); setRailFilter('all'); }}
                className="shrink-0 p-1 rounded transition-colors text-[#666] hover:text-[#F85149] hover:bg-red-50"
                title="Clear filters"
              >
                <X size={14} />
              </button>
            )}

            <div className="flex-1" />

            {displayBrands.length > 0 && <>

            {/* Collapse/Expand (right) */}
            <button
              type="button"
              onClick={() => {
                const allCollapsedNow = displayBrands.every((b: any) => collapsedBrands[String(b.id)] === true);
                const shouldCollapse = !allCollapsedNow;
                // Collapse/expand brand sections
                const next: Record<string, boolean> = {};
                displayBrands.forEach((b: any) => { next[String(b.id)] = shouldCollapse; });
                setCollapsedBrands(next);
                // Also collapse/expand all block (subcategory) sections
                const blockState: Record<string, boolean> = {};
                filteredSkuBlocks.forEach((block: any) => {
                  blockState[buildBlockKey(block)] = shouldCollapse;
                });
                setCollapsed(prev => ({ ...prev, ...blockState }));
                setAllCollapsed(shouldCollapse);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-[#C4B5A5] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)] transition-colors shrink-0"
            >
              <ChevronDown size={12} className={`transition-transform ${displayBrands.every((b: any) => collapsedBrands[String(b.id)] === true) ? '-rotate-90' : ''}`} />
              {displayBrands.every((b: any) => collapsedBrands[String(b.id)] === true) ? 'Expand All' : 'Collapse All'}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 rounded-md p-0.5 bg-[rgba(160,120,75,0.10)]">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-[#6B4D30] shadow-sm' : 'text-[#888] hover:text-[#6B4D30]'}`}
              >
                <List size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
                className={`p-1 rounded transition-colors ${viewMode === 'kanban' ? 'bg-white text-[#6B4D30] shadow-sm' : 'text-[#888] hover:text-[#6B4D30]'}`}
              >
                <Columns2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => canShowCardView && setViewMode('card')}
                disabled={!canShowCardView}
                title={!canShowCardView ? 'Add SKUs to enable card view' : 'Card view'}
                className={`p-1 rounded transition-colors ${viewMode === 'card' ? 'bg-white text-[#6B4D30] shadow-sm' : 'text-[#888] hover:text-[#6B4D30]'} ${!canShowCardView ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <LayoutGrid size={13} />
              </button>
            </div>

            {/* Sub-category Panel Toggle */}
            <button
              type="button"
              onClick={() => setSubCatPanelOpen(prev => !prev)}
              title="Sub-category navigation panel"
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors shrink-0 ${
                subCatPanelOpen
                  ? 'bg-[rgba(18,119,73,0.1)] border-[#127749] text-[#127749]'
                  : 'border-[#C4B5A5] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'
              }`}
            >
              <PanelRight size={12} />
              Sub-cats
            </button>

            </>}

            {/* Hidden file input for import (triggered via header button) */}
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </div>
        )}
      </div>
      <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
      {!filtersComplete ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fadeIn">
          <div className="empty-state-rings mb-6">
            <span className="ring-3" />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[rgba(215,183,151,0.12)] relative z-10">
              <Package size={28} className="text-[#8A6340]" />
            </div>
          </div>
          <h3 className="text-base font-bold font-['Montserrat'] mb-1.5 text-[#4A3728]">
            {t('skuProposal.noFilterTitle') || 'No data to display'}
          </h3>
          <p className="text-sm text-[#999] text-center max-w-sm">
            {t('skuProposal.noFilterDesc') || 'Please select a budget, season group and season from the filters above to view SKU proposal data.'}
          </p>
        </div>
      ) : !skuDataLoading && skuCatalog.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center animate-fadeIn ${'bg-white border-[rgba(215,183,151,0.2)]'}`}>
          <Package size={36} className={`mx-auto mb-3 ${'text-[rgba(215,183,151,0.5)]'}`} />
          <p className={`font-medium font-['Montserrat'] ${'text-[#333333]'}`}>No SKU Catalog</p>
          <p className={`text-sm mt-1 mb-3 ${'text-[#666666]'}`}>Import SKU data first to begin creating proposals</p>
          <button
            onClick={() => router.push('/import-data')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-['Montserrat'] transition-colors ${'bg-[#C4A77D] text-white hover:bg-[#B8956D]'}`}
          >
            Go to Import
          </button>
        </div>
      ) : displayBrands.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center animate-fadeIn ${'bg-white border-[rgba(215,183,151,0.2)]'}`}>
          <Package size={36} className={`mx-auto mb-3 ${'text-[rgba(215,183,151,0.5)]'}`} />
          <p className={`font-medium font-['Montserrat'] ${'text-[#333333]'}`}>{t('skuProposal.noSkuData')}</p>
          <p className={`text-sm mt-1 ${'text-[#666666]'}`}>Select a brand filter or add brands first</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSkuItems.map(({ block, blockKey, item, idx, key }, cardIdx) => {
            return (
              <div key={key} className={`rounded-2xl border p-4 ${getCardBgClass(cardIdx)}`}>
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <ProductImage subCategory={block.subCategory} sku={item.sku} imageUrl={item.imageUrl} size={48} rounded="rounded-xl" />
                    <div>
                      <div className={`text-sm font-semibold ${'text-[#333333]'}`}>
                        <span className="font-['JetBrains_Mono']">{item.sku || 'New SKU'}</span> <span className={'text-[#666666]'}>•</span> {item.name || 'Select SKU'}
                      </div>
                      <div className={`text-xs ${'text-[#666666]'}`}>
                        {block.gender} • {block.category} • {block.subCategory}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenLightbox(key, 'details', item, blockKey, idx, block)}
                      className={`px-2 md:px-3 py-1 md:py-1 text-xs font-semibold rounded-full border transition-colors ${'border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      {t('skuProposal.showDetails')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLightbox(key, 'storeOrder', item, blockKey, idx, block)}
                      className={`px-2 md:px-3 py-1 md:py-1 text-xs font-semibold rounded-full border transition-colors ${'border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      {t('skuProposal.storeOrder')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLightbox(key, 'sizing', item, blockKey, idx, block)}
                      className={`px-2 md:px-3 py-1 md:py-1 text-xs font-semibold rounded-full border transition-colors flex items-center gap-1 ${
                        hasSizingData(blockKey, idx)
                          ? 'border-[#2A9E6A] text-[#2A9E6A] bg-[rgba(42,158,106,0.08)] hover:bg-[rgba(42,158,106,0.15)]'
                          : 'border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'
                      }`}
                    >
                      {hasSizingData(blockKey, idx) && <Check size={12} />}
                      {t('skuProposal.sizing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkuRow(blockKey, idx)}
                      className={`p-2 rounded-lg transition-colors ${'text-[#666666] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]'}`}
                      title={t('proposal.deleteSku')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.isNew && (
                  <div className="mt-3">
                    <select
                      value={item.sku}
                      onChange={(e) => handleSkuSelect(blockKey, idx, e.target.value)}
                      className={`w-full px-3 py-0.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 font-['JetBrains_Mono'] ${'border-[#127749] bg-white text-[#333333] focus:ring-[rgba(18,119,73,0.3)]'}`}
                    >
                      <option value="">{t('proposal.selectSku')}</option>
                      {skuCatalog.map((sku: any) => (
                        <option key={sku.sku} value={sku.sku}>
                          {sku.sku} - {sku.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add SKU Card */}
          {filteredSkuBlocks.length > 0 && (
            <button
              onClick={() => {
                const firstBlock = filteredSkuBlocks[0];
                const blockKey = buildBlockKey(firstBlock);
                setAddSkuModal({ open: true, blockKey, block: firstBlock });
              }}
              className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-colors duration-200 ${'border-[rgba(215,183,151,0.4)] hover:border-[#8A6340] hover:bg-[rgba(215,183,151,0.08)]'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${'bg-[rgba(215,183,151,0.2)]'}`}>
                <Plus size={24} className={'text-[#6B4D30]'} />
              </div>
              <span className={`text-sm font-semibold font-['Montserrat'] ${'text-[#6B4D30]'}`}>
                Add New SKU
              </span>
              <span className={`text-xs ${'text-[#999999]'}`}>
                Click to add a new SKU to {filteredSkuBlocks[0]?.subCategory}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Per-Brand Sections */}
          {displayBrands.map((brand: any) => {
            const brandId = String(brand.id);
            const isBrandCollapsed = collapsedBrands[brandId] === true;
            const brandBlocks = brandSubcategoryBlocks[brandId] || [];
            const brandSkuCount = brandBlocks.reduce((s: number, b: any) => s + (b.items?.length || 0), 0);

            // Allocation/Planning validation per brand
            const hasFinalAH = matchedAllocateHeaders.some(
              (ah: any) => String(ah.brandId) === brandId && ah.isFinal
            );
            const hasFinalPlanning = (brandPlanningHeaders[brandId] || []).some(
              (v: any) => v.isFinal
            );
            const isLoadingPlanning = brandLoadingPlanning[brandId];
            const brandReady = filtersComplete && hasFinalAH && hasFinalPlanning;

            return (
              <div key={brandId} className={`rounded-xl shadow-sm border overflow-hidden ${'bg-white border-[#C4B5A5]'}`}>
                {/* Brand Section Header */}
                <div
                  onClick={() => setCollapsedBrands(prev => ({ ...prev, [brandId]: !isBrandCollapsed }))}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-all ${'bg-gradient-to-r from-[rgba(215,183,151,0.14)] to-transparent hover:from-[rgba(215,183,151,0.22)]'}`}
                >
                  <span className={`p-0.5 rounded transition-colors ${'bg-[rgba(138,99,64,0.1)] hover:bg-[rgba(138,99,64,0.2)]'}`}>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${isBrandCollapsed ? '-rotate-90' : ''} ${'text-[#6B4D30]'}`} />
                  </span>
                  <Tag size={13} className={'text-[#6B4D30]'} />
                  <div className="flex items-baseline gap-2 min-w-0">
                    {brand.group_brand?.name || brand.groupBrand?.name ? (
                      <span className={`text-[9px] font-medium font-['Montserrat'] tracking-widest ${'text-[#6B4D30]/60'}`}>
                        {brand.group_brand?.name || brand.groupBrand?.name}
                      </span>
                    ) : null}
                    <span className={`font-semibold text-sm font-['Montserrat'] tracking-wide ${'text-[#1A1A1A]'}`}>
                      {brand.name || brand.code || `Brand ${brand.id}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-0.5 ${'text-[#888]'}`}>
                    {brandBlocks.length} Rails &middot; {brandSkuCount} SKUs
                  </span>
                  {/* Per-brand Version & Choice dropdown buttons — only when allocation+planning validated */}
                  {brandReady && <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Version dropdown button */}
                    {(() => {
                      const curVerId = getBrandSkuVersion(brandId);
                      const brandHeaders = brandProposalHeaders[brandId] || [];
                      const curVer = brandHeaders.find((h: any) => String(h.id) === String(curVerId));
                      const isFinal = curVer?.isFinal ?? false;
                      const isOpen = openDropdown?.type === 'version' && openDropdown?.brandId === brandId;
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isOpen) { setOpenDropdown(null); setDropdownAnchorEl(null); }
                            else { setOpenDropdown({ type: 'version', brandId }); setDropdownAnchorEl(e.currentTarget); }
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            curVer
                              ? isFinal
                                ?'bg-[rgba(215,183,151,0.25)] text-[#6B4D30]':'bg-[rgba(18,119,73,0.15)] text-[#127749]':'bg-[rgba(215,183,151,0.15)] text-[#666666] hover:text-[#333333]'}`}
                        >
                          <ChevronDown size={11} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          {curVer ? (
                            <>
                              {isFinal && <Star size={11} className="shrink-0 fill-current" />}
                              <span className="whitespace-nowrap">Version {curVer.version}</span>
                              {isFinal && <span className="px-1 text-[9px] font-bold rounded bg-[#D7B797] text-[#0A0A0A]">FINAL</span>}
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="shrink-0" />
                              <span className="whitespace-nowrap">{brandHeaders.length > 0 ? `${brandHeaders.length} Versions` : 'Version'}</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                    {/* Collapse Rails button */}
                    {brandBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allRailsCollapsed = brandBlocks.every((b: any) => collapsed[buildBlockKey(b)]);
                          const next: Record<string, boolean> = {};
                          brandBlocks.forEach((b: any) => { next[buildBlockKey(b)] = !allRailsCollapsed; });
                          setCollapsed(prev => ({ ...prev, ...next }));
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.1)] transition-colors"
                      >
                        <ChevronDown size={10} className={`transition-transform ${brandBlocks.every((b: any) => collapsed[buildBlockKey(b)]) ? '-rotate-90' : ''}`} />
                        {brandBlocks.every((b: any) => collapsed[buildBlockKey(b)]) ? 'Expand' : 'Collapse'}
                      </button>
                    )}
                  </div>}
                </div>

                {/* Brand Content — conditional on allocation/planning validation */}
                {!isBrandCollapsed && (() => {
                  // Case 1: Filters not complete — show prompt
                  if (!filtersComplete) {
                    return (
                      <div className={`flex flex-col items-center gap-2 px-4 py-6 border-t ${'border-[#C4B5A5]'}`}>
                        <span className={`text-xs font-['Montserrat'] font-medium ${'text-[#999999]'}`}>
                          Please select Season Group and Season to view proposals.
                        </span>
                      </div>
                    );
                  }

                  // Case 2: No final AllocateHeader — "not allocated" warning
                  if (!hasFinalAH) {
                    return (
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[#E8E0D8] bg-[#FEFCF9]">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={13} className="text-[#C9A036] shrink-0" />
                          <span className="text-[12px] font-['Montserrat'] font-medium text-[#8B7A5E]">
                            This brand has not been allocated yet.
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const matchedBudget = apiBudgets.find((b: any) => b.id === budgetFilter);
                            const groupBrandId = brand.group_brand_id || brand.groupBrandId || brand.group_brand?.id || null;
                            setAllocationData({
                              id: budgetFilter !== 'all' ? budgetFilter : null,
                              budgetName: matchedBudget?.budgetName || '',
                              year: matchedBudget?.fiscalYear || null,
                              totalBudget: matchedBudget?.totalBudget || 0,
                              groupBrandId,
                              brandId,
                              seasonGroupId: seasonGroupFilter !== 'all' ? seasonGroupFilter : null,
                              seasonId: seasonFilter !== 'all' ? seasonFilter : null});
                            router.push('/planning');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold font-['Montserrat'] border border-[#D7B797]/50 text-[#6B4D30] hover:bg-[rgba(160,120,75,0.08)] transition-colors shrink-0"
                        >
                          Go to Budget Allocation
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  }

                  // Case 3: Loading planning data
                  if (isLoadingPlanning) {
                    return (
                      <div className={`flex items-center justify-center gap-2 px-4 py-6 border-t ${'border-[#C4B5A5]'}`}>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ borderColor:'#6B4D30', borderTopColor: 'transparent' }} />
                        <span className={`text-xs font-['Montserrat'] ${'text-[#666666]'}`}>Loading planning data...</span>
                      </div>
                    );
                  }

                  // Case 4: No final PlanningHeader — "not planned" warning
                  if (!hasFinalPlanning) {
                    return (
                      <div className={`flex flex-col items-center gap-2 px-4 py-3 border-t ${'border-[#C4B5A5] bg-[rgba(227,179,65,0.08)]'}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className={'text-[#B8860B]'} />
                          <span className={`text-xs font-['Montserrat'] font-medium ${'text-[#8B6914]'}`}>
                            OTB Analysis has not been finalized for this brand. Please complete OTB Analysis first.
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const matchedBudgetOtb = apiBudgets.find((b: any) => b.id === budgetFilter);
                            setOtbAnalysisContext({
                              budgetId: budgetFilter !== 'all' ? budgetFilter : null,
                              budgetName: matchedBudgetOtb?.budgetName || '',
                              fiscalYear: matchedBudgetOtb?.fiscalYear || null,
                              totalBudget: matchedBudgetOtb?.totalBudget || 0,
                              status: matchedBudgetOtb?.status || 'draft',
                              brandId,
                              brandName: brand.name || brand.code || '',
                              seasonGroup: seasonGroupFilter,
                              season: seasonFilter});
                            router.push('/otb-analysis');
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] border transition-all ${'bg-[#6B4D30] border-[#6B4D30] text-white hover:bg-[#5C4028] hover:border-[#5C4028]'}`}
                        >
                          Go to OTB Analysis
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  }

                  // Case 5: All conditions met — show full content
                  const hasHistorical = brandBlocks.some((b: any) => b.isHistorical);
                  return (
                  <div className="space-y-2 p-2">
                    {/* Previous Year Template Banner */}
                    {hasHistorical && (
                      <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${'bg-[rgba(107,77,48,0.06)] border-[rgba(215,183,151,0.4)]'}`}>
                        <div className="flex items-center gap-2">
                          <FileText size={14} className={'text-[#6B4D30]'} />
                          <span className={`text-xs font-semibold font-['Montserrat'] ${'text-[#6B4D30]'}`}>
                            Previous Year Template
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${'bg-[rgba(215,183,151,0.3)] text-[#6B4D30]'}`}>
                            Read-only
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            // Copy historical blocks as new draft (remove isHistorical flag)
                            setSkuBlocks(prev => prev.map((b: any) =>
                              b.brandId === brandId && b.isHistorical ? { ...b, isHistorical: false } : b
                            ));
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all ${'bg-[#6B4D30] text-white hover:bg-[#5C4028]'}`}
                        >
                          <FilePlus size={12} />
                          Use as Template
                        </button>
                      </div>
                    )}
                    {brandBlocks.length === 0 ? (
                      <div className={`p-6 text-center ${'text-[#999999]'}`}>
                        <p className="text-sm">No rails available for this brand</p>
                      </div>
                    ) : (() => {
                      const renderBlock = (block: any) => {
                      const key = buildBlockKey(block);
                      const isCollapsed = collapsed[key];
                      const isEmpty = !block.items || block.items.length === 0;
                      return (
                        <div key={key} data-rail-card className={`rounded-xl border overflow-hidden ${'bg-white border-[rgba(215,183,151,0.2)]'}`}>
                          <button
                            type="button"
                            onClick={() => handleToggle(key)}
                            className={`w-full flex items-center gap-0 ${'bg-[rgba(215,183,151,0.18)] border-b border-[rgba(215,183,151,0.3)]'}`}
                          >
                            <div className={`w-1.5 self-stretch rounded-l-xl ${'bg-[#8A6340]'}`} />
                            <div className="flex items-center gap-2 px-3 py-1 flex-1">
                              {<ChevronDown size={14} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''} ${'text-[#6B4D30]'}`} />}
                              <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#8A6340]'}`}>RAIL</span>
                                  <span className={`font-semibold text-xs ${'text-[#6B4D30]'}`}>{block.rail || <span className="italic text-[#aaa] font-normal text-xs">No Rail</span>}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${'bg-[rgba(160,120,75,0.12)] text-[#6B5B4D]'}`}>
                                    {block.items?.length || 0} SKUs
                                  </span>
                                  {(() => {
                                    const otbKey = `${(block.gender || '').toLowerCase()}_${(block.category || '').toLowerCase()}_${(block.subCategory || '').toLowerCase()}`;
                                    const otbAmount = brandCategoryOtb[brandId]?.[otbKey];
                                    return otbAmount != null && otbAmount > 0 ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(18,119,73,0.1)] text-[#127749] font-semibold font-['JetBrains_Mono']">
                                        OTB {formatCurrency(otbAmount)}
                                      </span>
                                    ) : null;
                                  })()}
                                  {!isEmpty && (() => {
                                    const { completed, total } = getSizingCount(key, block.items);
                                    const allOrdered = block.items.every((i: any) => (i.order || 0) > 0);
                                    const allDone = allOrdered && total > 0 && completed === total;
                                    if (allDone) {
                                      return (
                                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold bg-[#2A9E6A]/15 text-[#2A9E6A]">
                                          <Check size={9} strokeWidth={2.5} />Done
                                        </span>
                                      );
                                    }
                                    if (completed > 0 && completed < total) {
                                      return (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-[#D97706]/15 text-[#D97706]">
                                          {completed}/{total} sized
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <div className={`text-[10px] ${'text-[#8A6340]'}`}>
                                  {block.gender} • {block.category}
                                </div>
                              </div>
                              {!isEmpty && (
                                <div className={`hidden md:flex items-center text-[11px] font-['JetBrains_Mono'] ${'text-[#6B5B4D]'}`}>
                                  <div className="flex flex-col items-center w-[42px]">
                                    <span className={`text-[9px] font-['Montserrat'] ${'text-[#999999]'}`}>Order</span>
                                    <span className={`font-semibold ${'text-[#6B4D30]'}`}>{block.items.reduce((s: number, i: any) => s + (i.order || 0), 0)}</span>
                                  </div>
                                  {stores.map((st: any) => (
                                    <div key={st.code} className="flex flex-col items-center w-[42px]">
                                      <span className={`text-[9px] font-['Montserrat'] ${'text-[#999999]'}`}>{st.code}</span>
                                      <span className="font-semibold">{block.items.reduce((s: number, i: any) => s + ((i.storeQty || {})[st.code] || 0), 0)}</span>
                                    </div>
                                  ))}
                                  <div className={`h-5 w-px mx-1 ${'bg-[rgba(215,183,151,0.4)]'}`} />
                                  <div className="flex flex-col items-center min-w-[60px]">
                                    <span className={`text-[9px] font-['Montserrat'] ${'text-[#999999]'}`}>Value</span>
                                    <span className={`font-semibold ${'text-[#127749]'}`}>{formatCurrency(block.items.reduce((s: number, i: any) => s + ((i.order || 0) * (i.unitCost || 0)), 0))}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>

                {/* Empty block — show row headers + Add New column */}
                {isEmpty && !isCollapsed && (
                  <div className="overflow-x-auto" style={{ overflowY: 'clip' }}>
                    {(() => {
                      const labelCls = `px-2 py-1 text-[11px] font-semibold font-['Montserrat'] whitespace-nowrap sticky left-0 z-10 ${'bg-white text-[#6B4D30] !border-r-[rgba(160,120,75,0.4)]'}`;
                      const emptyCls = `px-2 py-1 text-center min-w-[120px] ${'bg-white text-[#ccc]'}`;
                      const rowLabels = ['Actions', 'Image', 'SKU', 'Name', 'Product Type (L3)', 'Theme', 'Color', 'Composition', 'Unit cost', 'SRP', '% ST', 'Qty Rced', 'Qty SOld', 'Qty OH', 'Order', 'Customer Target', 'Comment'];
                      return (
                        <table className={`w-full text-xs border-separate border-spacing-0 ${'[&_td]:border-[rgba(215,183,151,0.2)]'} [&_td]:border`}>
                          <tbody>
                            {rowLabels.map((label, ri) => (
                              <tr key={label}>
                                <td className={labelCls}>{label}</td>
                                <td className={`${emptyCls} ${label === 'Image' ? 'py-2' : ''}`}>
                                  {label === 'Image' ? <span className="text-[11px] italic opacity-50">—</span> : <span className="opacity-30">—</span>}
                                </td>
                                {ri === 0 && (
                                  <td rowSpan={999} className={`border-l-2 ${'bg-[rgba(215,183,151,0.04)] border-l-[rgba(215,183,151,0.35)]'}`} style={{ minWidth: 52, verticalAlign: 'middle' }}>
                                    <div className="flex items-center justify-center h-full" style={{ minHeight: 140 }}>
                                      <button
                                        type="button"
                                        onClick={() => setAddSkuModal({ open: true, blockKey: key, block })}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-colors ${'text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)]'}`}
                                        style={{ writingMode: 'vertical-lr' }}
                                      >
                                        <Plus size={14} />
                                        <span className={`text-[10px] font-semibold font-['Montserrat'] uppercase tracking-wider`}>Add new</span>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                )}

                {/* Populated block — table + Add SKU button */}
                {!isEmpty && !isCollapsed && (<>
                  <div className="overflow-x-auto" data-table-wrapper style={{ overflowY: 'clip' }}>
                    {(() => {
                      const hlBg ='bg-[rgba(160,120,75,0.1)]';
                      const hlLabel ='bg-[#ede4d8]';
                      const normLabel ='bg-white';
                      const labelBase = `px-2 py-1 text-[11px] font-semibold font-['Montserrat'] whitespace-nowrap sticky left-0 z-10 cursor-pointer select-none transition-colors`;
                      const labelBorder ='!border-r-[rgba(160,120,75,0.4)]';
                      const labelColor ='text-[#6B4D30]';
                      const isHl = (rowId: string) => highlightedRow === `${key}_${rowId}`;
                      const toggleHl = (rowId: string) => setHighlightedRow(prev => prev === `${key}_${rowId}` ? null : `${key}_${rowId}`);
                      const trCls = (rowId: string, extra?: string) => `${isHl(rowId) ? hlBg : ''} ${extra || ''}`;
                      const tdLabel = (rowId: string, extra?: string) => `${labelBase} ${labelColor} ${isHl(rowId) ? hlLabel : normLabel} ${labelBorder} ${extra || ''}`;
                      return (
                    <table className={`w-full text-xs border-separate border-spacing-0 ${'[&_td]:border-[rgba(215,183,151,0.2)]'} [&_td]:border`}>
                      <tbody>
                        {/* Image row (with actions in top-right corner) */}
                        <tr className={trCls('image')}>
                          <td className={tdLabel('image', 'py-1')} onClick={() => toggleHl('image')}>Image</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 min-w-[120px] ${'bg-white'}`} style={{ position: 'relative' }}>
                              <div className="flex justify-end gap-0.5 absolute top-0.5 right-0.5">
                                <button type="button" onClick={() => handleOpenLightbox(`${key}_${String(item.sku) || 'new'}_${idx}`, 'sizing', item, key, idx, block)} className={`p-0.5 rounded-md transition-colors relative ${'text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`} title="Sizing">
                                  <Ruler size={13} />
                                  {hasSizingData(key, idx) && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#2A9E6A] rounded-full flex items-center justify-center">
                                      <Check size={7} className="text-white" />
                                    </span>
                                  )}
                                </button>
                                <button type="button" onClick={() => handleDeleteSkuRow(key, idx)} className={`p-0.5 rounded-md transition-colors ${'text-[#666666] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]'}`} title={t('proposal.deleteSku')}><Trash2 size={13} /></button>
                              </div>
                              <div className="mx-auto w-fit pt-4">
                                <ProductImage subCategory={block.subCategory} sku={item.sku} imageUrl={item.imageUrl} size={48} />
                              </div>
                            </td>
                          ))}
                          {/* Add New column */}
                          <td rowSpan={999} className={`border-l-2 ${'bg-[rgba(215,183,151,0.04)] border-l-[rgba(215,183,151,0.35)]'}`} style={{ minWidth: 52, verticalAlign: 'middle' }}>
                            <div className="flex items-center justify-center h-full" style={{ minHeight: 140 }}>
                              <button
                                type="button"
                                onClick={() => setAddSkuModal({ open: true, blockKey: key, block })}
                                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-colors ${'text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)]'}`}
                                style={{ writingMode: 'vertical-lr' }}
                              >
                                <Plus size={14} />
                                <span className={`text-[10px] font-semibold font-['Montserrat'] uppercase tracking-wider`}>Add new</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* SKU row */}
                        <tr className={trCls('sku')}>
                          <td className={tdLabel('sku')} onClick={() => toggleHl('sku')}>SKU</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-semibold font-['JetBrains_Mono'] ${'text-[#333333]'}`}>
                              {item.isNew ? (
                                <select
                                  value={item.sku}
                                  onChange={(e) => handleSkuSelect(key, idx, e.target.value)}
                                  className={`w-full px-1 py-0.5 rounded border text-xs font-['JetBrains_Mono'] ${'border-[#127749] bg-white text-[#333333]'}`}
                                >
                                  <option value="">{t('proposal.selectSku')}</option>
                                  {skuCatalog.map((sku: any) => (
                                    <option key={String(sku.sku)} value={sku.sku}>{sku.sku}</option>
                                  ))}
                                </select>
                              ) : String(item.sku)}
                            </td>
                          ))}
                        </tr>
                        {/* Name row */}
                        <tr className={trCls('name')}>
                          <td className={tdLabel('name')} onClick={() => toggleHl('name')}>Name</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center ${'text-[#333333]'}`}>{item.name}</td>
                          ))}
                        </tr>
                        {/* Product Type (L3) row */}
                        <tr className={trCls('productType')}>
                          <td className={tdLabel('productType')} onClick={() => toggleHl('productType')}>Product Type (L3)</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center ${'text-[#666666]'}`}>{item.productType}</td>
                          ))}
                        </tr>
                        {/* Theme row */}
                        <tr className={trCls('theme')}>
                          <td className={tdLabel('theme')} onClick={() => toggleHl('theme')}>Theme</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center ${'text-[#666666]'}`}>{item.theme}</td>
                          ))}
                        </tr>
                        {/* Color row */}
                        <tr className={trCls('color')}>
                          <td className={tdLabel('color')} onClick={() => toggleHl('color')}>Color</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center ${'text-[#666666]'}`}>{item.color}</td>
                          ))}
                        </tr>
                        {/* Composition row */}
                        <tr className={trCls('composition')}>
                          <td className={tdLabel('composition')} onClick={() => toggleHl('composition')}>Composition</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center max-w-[140px] ${'text-[#666666]'}`} title={item.composition}>{item.composition}</td>
                          ))}
                        </tr>
                        {/* Unit cost row */}
                        <tr className={trCls('unitCost')}>
                          <td className={tdLabel('unitCost')} onClick={() => toggleHl('unitCost')}>Unit cost</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-['JetBrains_Mono'] ${'text-[#333333]'}`}>{formatCurrency(item.unitCost)}</td>
                          ))}
                        </tr>
                        {/* SRP row */}
                        <tr className={trCls('srp')}>
                          <td className={tdLabel('srp')} onClick={() => toggleHl('srp')}>SRP</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-medium font-['JetBrains_Mono'] ${'text-[#127749]'}`}>{formatCurrency(item.srp)}</td>
                          ))}
                        </tr>
                        {/* % ST row */}
                        <tr className={trCls('stPct')}>
                          <td className={tdLabel('stPct')} onClick={() => toggleHl('stPct')}>% ST</td>
                          {block.items.map((_: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-['JetBrains_Mono'] text-[#aaa]`}>—</td>
                          ))}
                        </tr>
                        {/* Qty Rced row */}
                        <tr className={trCls('qtyRced')}>
                          <td className={tdLabel('qtyRced')} onClick={() => toggleHl('qtyRced')}>Qty Rced</td>
                          {block.items.map((_: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-['JetBrains_Mono'] text-[#333333]`}>0</td>
                          ))}
                        </tr>
                        {/* Qty SOld row */}
                        <tr className={trCls('qtySold')}>
                          <td className={tdLabel('qtySold')} onClick={() => toggleHl('qtySold')}>Qty SOld</td>
                          {block.items.map((_: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-['JetBrains_Mono'] text-[#333333]`}>0</td>
                          ))}
                        </tr>
                        {/* Qty OH row */}
                        <tr className={trCls('qtyOh')}>
                          <td className={tdLabel('qtyOh')} onClick={() => toggleHl('qtyOh')}>Qty OH</td>
                          {block.items.map((_: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-['JetBrains_Mono'] text-[#333333]`}>0</td>
                          ))}
                        </tr>
                        {/* Order row - always highlighted */}
                        <tr className={trCls('order','bg-[rgba(160,120,75,0.06)]')}>
                          <td className={`${labelBase} font-bold cursor-pointer select-none transition-colors ${labelBorder} ${'text-[#c0392b]'} ${isHl('order') ? hlLabel : ('bg-[#f5efe8]')}`} onClick={() => toggleHl('order')}>Order</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-bold font-['JetBrains_Mono'] ${'text-[#c0392b]'}`}>{item.order}</td>
                          ))}
                        </tr>
                        {/* Dynamic store rows */}
                        {stores.map((st: any) => (
                          <tr key={st.code} className={trCls(`store_${st.code}`)}>
                            <td className={tdLabel(`store_${st.code}`)} onClick={() => toggleHl(`store_${st.code}`)}>{st.code}</td>
                            {block.items.map((item: any, idx: number) => {
                              const storeKey = `${key}|${idx}|store_${st.code}`;
                              const isEditingStore = editingCell === storeKey;
                              const storeVal = (item.storeQty || {})[st.code] || 0;
                              return (
                                <td key={idx} className="px-2 py-1 text-center">
                                  {isEditingStore ? (
                                    <div className="relative group inline-block">
                                      <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleSaveEdit(storeKey)}
                                        onKeyDown={(e) => handleKeyDown(e, storeKey)}
                                        className={`w-14 pl-4 py-0.5 text-center border-2 rounded-md text-xs font-semibold font-['JetBrains_Mono'] ${'border-[#D7B797] bg-white text-[#333333]'}`}
                                        autoFocus
                                      />
                                      <Pencil size={8} className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A6340]/30" />
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(storeKey, storeVal)}
                                      className={`px-2 py-0.5 rounded-md font-['JetBrains_Mono'] transition-colors ${'text-[#333333] hover:bg-[rgba(160,120,75,0.12)]'}`}
                                    >
                                      {storeVal}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* TTL value row - always highlighted */}
                        <tr className={trCls('ttlValue','bg-[rgba(160,120,75,0.06)]')}>
                          <td className={`${labelBase} font-bold cursor-pointer select-none transition-colors ${labelBorder} ${'text-[#6B4D30]'} ${isHl('ttlValue') ? hlLabel : ('bg-[#f5efe8]')}`} onClick={() => toggleHl('ttlValue')}>TTL value</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className={`px-2 py-1 text-center font-bold font-['JetBrains_Mono'] ${'text-[#127749]'}`}>{formatCurrency(item.order * (item.unitCost || 0))}</td>
                          ))}
                        </tr>
                        {/* Customer Target row */}
                        <tr className={trCls('customerTarget')}>
                          <td className={tdLabel('customerTarget')} onClick={() => toggleHl('customerTarget')}>Customer Target</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className="px-2 py-1 text-center">
                              <CreatableSelect
                                value={item.customerTarget}
                                options={customerTargetOptions}
                                onChange={(val) => handleSelectChange(key, idx, 'customerTarget', val)}
                                onCreateOption={(val) => setCustomerTargetOptions(prev => [...prev, val])}
                                placeholder="Target..."
                              />
                            </td>
                          ))}
                        </tr>
                        {/* Comment row — last row */}
                        <tr className={trCls('comment')}>
                          <td className={tdLabel('comment')} onClick={() => toggleHl('comment')}>Comment</td>
                          {block.items.map((item: any, idx: number) => (
                            <td key={idx} className="px-2 py-1 text-center">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.comment || ''}
                                  onChange={(e) => handleSelectChange(key, idx, 'comment', e.target.value)}
                                  onClick={(e) => {
                                    if (item.comment) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setCommentPopup({ text: item.comment, blockKey: key, idx, rect });
                                    }
                                  }}
                                  placeholder="..."
                                  className={`w-full min-w-[80px] px-2 py-1 text-xs text-center border rounded-md outline-none transition-colors truncate ${'bg-transparent border-[rgba(215,183,151,0.3)] text-[#333333] placeholder-[#aaa] focus:border-[#C4A77D]'}`}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                      );
                    })()}
                  </div>
                </>)}
                        </div>
                      );
                    };
                    const doneBlocks = brandBlocks.filter((b: any) => {
                      if (!b.items || b.items.length === 0) return false;
                      const bk = buildBlockKey(b);
                      const { completed, total } = getSizingCount(bk, b.items);
                      return total > 0 && completed === total;
                    });
                    const todoBlocks = brandBlocks.filter((b: any) => {
                      if (!b.items || b.items.length === 0) return true;
                      const bk = buildBlockKey(b);
                      const { completed, total } = getSizingCount(bk, b.items);
                      return total === 0 || completed < total;
                    });
                    if (viewMode === 'list') {
                      return <div className="space-y-2">{brandBlocks.map(renderBlock)}</div>;
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start min-w-0">
                        <div className="rounded-xl border border-[#D97706]/20 bg-[rgba(217,119,6,0.03)] p-3 space-y-3 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-[#D97706]/20">
                            <Clock size={13} className="text-[#D97706]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#D97706]">In Progress</span>
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#D97706]/10 text-[#D97706] font-semibold">{todoBlocks.length} rails</span>
                          </div>
                          <div className="space-y-3">
                            {todoBlocks.length === 0 ? (
                              <div className="p-4 text-center text-[#999] text-xs italic rounded-lg border border-dashed border-[#D97706]/20">All rails completed</div>
                            ) : todoBlocks.map(renderBlock)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[#2A9E6A]/20 bg-[rgba(42,158,106,0.03)] p-3 space-y-3 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-[#2A9E6A]/20">
                            <Check size={13} className="text-[#2A9E6A]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#2A9E6A]">Completed</span>
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A9E6A]/10 text-[#2A9E6A] font-semibold">{doneBlocks.length} rails</span>
                          </div>
                          <div className="space-y-3">
                            {doneBlocks.length === 0 ? (
                              <div className="p-4 text-center text-[#999] text-xs italic rounded-lg border border-dashed border-[#2A9E6A]/20">No completed rails yet</div>
                            ) : doneBlocks.map(renderBlock)}
                          </div>
                        </div>
                      </div>
                    );
                    })()}
                  </div>
                  );
                })()}

                {/* Per-brand Save / Save as New Version footer */}
                {!isBrandCollapsed && brandReady && (
                  <div className={`flex items-center justify-end gap-2 px-4 py-2 border-t ${'border-[#C4B5A5] bg-[#F9F7F5]'}`}>
                    {brandSaving[brandId] && (
                      <span className={`text-xs font-['Montserrat'] ${'text-[#999999]'}`}>Saving...</span>
                    )}
                    <button
                      disabled={brandSaving[brandId]}
                      onClick={(e) => { e.stopPropagation(); handleSaveBrand(brandId, false); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${'bg-[rgba(160,120,75,0.1)] border-[rgba(160,120,75,0.35)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(160,120,75,0.5)]'}`}
                    >
                      <Save size={13} />
                      Save
                    </button>
                    <button
                      disabled={brandSaving[brandId]}
                      onClick={(e) => { e.stopPropagation(); handleSaveBrand(brandId, true); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Montserrat'] border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${'bg-[#6B4D30] border-[#6B4D30] text-white hover:bg-[#5C4028] hover:border-[#5C4028]'}`}
                    >
                      <FilePlus size={13} />
                      Save as New Version
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Sticky Grand Total Bar */}
          {grandTotals.skuCount > 0 && (
            <div className={`rounded-xl border overflow-hidden ${'bg-white border-[#D7B797]/40'}`}>
              <div className="flex items-center gap-0">
                <div className={`w-1.5 self-stretch ${'bg-[#127749]'}`} />
                <div className="flex flex-wrap items-center flex-1 px-4 py-2.5 gap-3">
                  <span className={`text-xs font-semibold font-['Montserrat'] uppercase tracking-wide ${'text-[#6B4D30]'}`}>
                    GRAND TOTAL — {displayBrands.length} Brands • {grandTotals.skuCount} SKUs
                  </span>
                  <div className="flex items-center gap-5 text-xs font-['JetBrains_Mono']">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-['Montserrat'] ${'text-[#999999]'}`}>Order</span>
                      <span className={`font-bold ${'text-[#6B4D30]'}`}>{grandTotals.order}</span>
                    </div>
                    {stores.map((st: any) => (
                      <div key={st.code} className="flex flex-col items-center">
                        <span className={`text-[10px] font-['Montserrat'] ${'text-[#999999]'}`}>{st.code}</span>
                        <span className={`font-bold ${'text-[#6B4D30]'}`}>{grandTotals.storeQty[st.code] || 0}</span>
                      </div>
                    ))}
                    <div className={`h-6 w-px ${'bg-[rgba(215,183,151,0.5)]'}`} />
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-['Montserrat'] uppercase tracking-wider ${'text-[#999999]'}`}>Total Value</span>
                      <span className={`font-bold text-xs font-['JetBrains_Mono'] ${'text-[#C4A77D]'}`}>{formatCurrency(grandTotals.ttlValue)}</span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    {(() => {
                      const isSingleBrand = displayBrands.length === 1;
                      const singleBrandId = isSingleBrand ? String(displayBrands[0].id) : '';
                      const canSubmit = isSingleBrand && canSubmitTicketForBrand(singleBrandId);
                      return (
                        <button
                          disabled={!canSubmit}
                          onClick={() => { if (canSubmit) handleSubmitTicketForBrand(singleBrandId); }}
                          title={!isSingleBrand ? 'Select a single brand to submit ticket' : !canSubmit ? 'Brand must have a final version and final sizing choice with orders' : ''}
                          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold font-['Montserrat'] transition-colors ${
                            canSubmit
                              ? 'bg-[#C4A77D] text-white hover:bg-[#B8956D]'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Send size={16} />
                          Submit Ticket
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>{/* end flex-1 main content */}

      {/* Sub-category Navigation Side Panel */}
      <div className={`transition-all duration-200 overflow-hidden shrink-0 ${subCatPanelOpen ? 'w-56' : 'w-0'}`}>
        {subCatPanelOpen && (
          <div className="sticky top-2 w-56 rounded-xl border border-[rgba(215,183,151,0.3)] bg-white shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="px-3 py-2 bg-[rgba(215,183,151,0.12)] border-b border-[rgba(215,183,151,0.3)] flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#6B4D30]">Sub Categories</span>
              <button
                type="button"
                onClick={() => setSubCatPanelOpen(false)}
                className="p-0.5 rounded hover:bg-[rgba(215,183,151,0.3)] text-[#999] transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Loading / no-brand states */}
            {!activePanelBrandId ? (
              <div className="px-3 py-4 text-center text-[11px] text-[#999] font-['Montserrat']">
                Select a single brand to view sub-categories
              </div>
            ) : isPanelLoading && subCatNavItems.length === 0 ? (
              <div className="px-3 py-4 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
                <span className="text-[11px] text-[#999] font-['Montserrat']">Loading...</span>
              </div>
            ) : subCatNavItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-[#999] font-['Montserrat'] italic">
                No planning final version found
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="px-3 py-2 border-b border-[rgba(215,183,151,0.2)] flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[rgba(215,183,151,0.25)]">
                    <div
                      className="h-full rounded-full bg-[#2A9E6A] transition-all"
                      style={{ width: `${subCatNavItems.length > 0 ? (panelDoneCount / subCatNavItems.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-[#666] font-['JetBrains_Mono'] shrink-0">
                    {panelDoneCount}/{subCatNavItems.length}
                  </span>
                </div>

                {/* Sub-category list grouped by Gender → Category */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {panelGenders.map(gender => (
                    <div key={gender}>
                      <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#999] font-['Montserrat'] bg-[rgba(215,183,151,0.1)] border-y border-[rgba(215,183,151,0.15)]">
                        {gender}
                      </div>
                      {Array.from(new Set(subCatNavItems.filter(s => s.gender === gender).map(s => s.category))).map(cat => (
                        <div key={cat}>
                          <div className="px-3 pt-2 pb-0.5 text-[10px] text-[#888] font-semibold font-['Montserrat']">
                            {cat}
                          </div>
                          {subCatNavItems.filter(s => s.gender === gender && s.category === cat).map(sub => {
                            const isActive = subCategoryFilter === sub.subCategory.toLowerCase();
                            const isDone = sub.status === 'done';
                            return (
                              <button
                                key={sub.subCategory}
                                type="button"
                                onClick={() => setSubCategoryFilter(isActive ? 'all' : sub.subCategory.toLowerCase())}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                                  isActive
                                    ? 'bg-[rgba(18,119,73,0.12)] text-[#127749]'
                                    : 'hover:bg-[rgba(160,120,75,0.1)] text-[#444]'
                                }`}
                              >
                                {isDone ? (
                                  <span className="w-3.5 h-3.5 rounded-full bg-[#2A9E6A] flex items-center justify-center shrink-0">
                                    <Check size={8} className="text-white" strokeWidth={3} />
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[rgba(215,183,151,0.5)] shrink-0" />
                                )}
                                <span className="flex-1 truncate text-[11px] font-['Montserrat']">{sub.subCategory}</span>
                                <span className={`text-[9px] font-['JetBrains_Mono'] shrink-0 ${isDone ? 'text-[#2A9E6A]' : 'text-[#bbb]'}`}>
                                  {sub.orderedCount > 0 ? sub.orderedCount : sub.skuCount > 0 ? sub.skuCount : '–'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      </div>{/* end flex wrapper */}

      {/* Version Portal Dropdown */}
      {openDropdown && dropdownAnchorEl && typeof document !== 'undefined' && (() => {
        const rect = dropdownAnchorEl.getBoundingClientRect();
        const items = brandProposalHeaders[openDropdown.brandId] || [];
        const selectedId = getBrandSkuVersion(openDropdown.brandId);
        const dropdownW = 220;
        const overflowRight = rect.right > window.innerWidth - dropdownW;
        return createPortal(
          <div
            className="sku-version-portal"
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              right: overflowRight ? Math.max(8, window.innerWidth - rect.right) : undefined,
              left: overflowRight ? undefined : rect.left,
              zIndex: 99999,
              minWidth: dropdownW}}
          >
            <div className={`border rounded-lg shadow-xl overflow-hidden ${'bg-white border-[#C4B5A5]'}`}>
              <div className={`px-2 py-1 border-b ${'border-[#D4C8BB] bg-[rgba(160,120,75,0.08)]'}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wide font-['Montserrat'] ${'text-[#666666]'}`}>
                  SKU Versions
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {items.map((item: any) => {
                  const isFinal = item.isFinal ?? false;
                  const isSelected = String(item.id) === String(selectedId);
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBrandSkuVersion(prev => ({ ...prev, [openDropdown.brandId]: String(item.id) }));
                        loadProposalVersion(openDropdown.brandId, String(item.id));
                        setOpenDropdown(null);
                        setDropdownAnchorEl(null);
                      }}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors text-xs border-t ${'border-[#E5E0DB]'} ${
                        isSelected
                          ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isFinal && <Star size={11} className={'text-[#6B4D30] fill-[#6B4D30] shrink-0'} />}
                        <span className="font-medium truncate">{`Version ${item.version}`}</span>
                        {isFinal && <span className="px-1 py-px text-[8px] font-bold bg-[#D7B797] text-[#0A0A0A] rounded shrink-0">FINAL</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isFinal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetFinalVersion(openDropdown.brandId, item.id, e);
                              setOpenDropdown(null);
                              setDropdownAnchorEl(null);
                            }}
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

      {/* SKU Lightbox Modal — Portal to body for full-screen blur */}
      {lightbox && lightbox.open && lightbox.item && createPortal(
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) handleCloseLightbox(); }}>
          <div ref={lightboxRef} className={`rounded-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col border ${'bg-white border-[rgba(215,183,151,0.3)]'}`} style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4), 0 10px 30px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${'bg-[rgba(160,120,75,0.18)] border-b border-[rgba(215,183,151,0.3)]'}`}>
              <div className="flex items-center gap-3">
                <ProductImage subCategory={lightbox.block?.subCategory || ''} sku={lightbox.item.sku} imageUrl={lightbox.item.imageUrl} size={40} rounded="rounded-xl" />
                <div>
                  <h3 className={`text-base font-bold font-['Montserrat'] ${'text-[#6B4D30]'}`}>
                    <span className="font-['JetBrains_Mono']">{lightbox.item.sku}</span> - {lightbox.item.name}
                  </h3>
                  <p className={`text-xs ${'text-[#6B5B4D]'}`}>
                    {lightbox.block?.gender} {lightbox.block?.category && `• ${lightbox.block.category}`} {lightbox.block?.subCategory && `• ${lightbox.block.subCategory}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseLightbox}
                className={`p-2 rounded-lg transition-colors ${'hover:bg-[rgba(215,183,151,0.2)]'}`}
              >
                <X size={20} className={'text-[#6B4D30]'} />
              </button>
            </div>

            {/* Tab Buttons */}
            <div className={`flex border-b ${'border-[rgba(215,183,151,0.3)]'}`}>
              {([['details', t('skuProposal.showDetails')], ['storeOrder', `${t('skuProposal.storeOrder')} (${(lightboxLiveItem || lightbox.item).order || 0})`], ['sizing', t('skuProposal.sizing')]] as const).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setLightbox(prev => prev ? { ...prev, tab: tabId as 'details' | 'storeOrder' | 'sizing' } : null)}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold font-['Montserrat'] transition-colors relative ${
                    lightbox.tab === tabId
                      ?'text-[#6B4D30]':'text-[#999999] hover:text-[#666666]'}`}
                >
                  {label}
                  {lightbox.tab === tabId && (
                    <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${'bg-[#6B4D30]'}`} />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              {/* Details Tab */}
              {lightbox.tab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>Product type</span>
                    <div className={`font-medium ${'text-[#333333]'}`}>{lightbox.item.productType}</div>
                  </div>
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>Theme</span>
                    <div className={`font-medium ${'text-[#333333]'}`}>{lightbox.item.theme}</div>
                  </div>
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>Color</span>
                    <div className={`font-medium ${'text-[#333333]'}`}>{lightbox.item.color}</div>
                  </div>
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>Composition</span>
                    <div className={`font-medium ${'text-[#333333]'}`}>{lightbox.item.composition}</div>
                  </div>
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>Unit cost</span>
                    <div className={`font-medium font-['JetBrains_Mono'] ${'text-[#333333]'}`}>{formatCurrency(lightbox.item.unitCost)}</div>
                  </div>
                  <div>
                    <span className={`text-xs ${'text-[#666666]'}`}>SRP</span>
                    <div className={`font-medium font-['JetBrains_Mono'] ${'text-[#127749]'}`}>{formatCurrency(lightbox.item.srp)}</div>
                  </div>
                  <div>
                    <CreatableSelect
                      value={lightbox.item.customerTarget}
                      options={customerTargetOptions}
                      onChange={(val) => handleSelectChange(lightbox.blockKey, lightbox.idx, 'customerTarget', val)}
                      onCreateOption={(val) => setCustomerTargetOptions(prev => [...prev, val])}
                      placeholder="Select target..."
                      label="Customer target"
                    />
                  </div>
                </div>
              )}

              {/* Store Order Tab */}
              {lightbox.tab === 'storeOrder' && (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className={'bg-[rgba(160,120,75,0.12)] text-[#666666]'}>
                        <th className="px-4 py-2 text-left">Store</th>
                        <th className="px-4 py-2 text-center font-['JetBrains_Mono']">ORDER</th>
                        <th className="px-4 py-2 text-right font-['JetBrains_Mono']">TTL VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stores.map((st: any, si: number) => {
                        const liveItem = lightboxLiveItem || lightbox.item;
                        const storeVal = (liveItem.storeQty || {})[st.code] || 0;
                        const colors = ['bg-[#D7B797]', 'bg-[#127749]', 'bg-[#58A6FF]', 'bg-[#A371F7]', 'bg-[#E3B341]'];
                        return (
                          <tr key={st.code} className={`border-t ${'border-gray-300'}`}>
                            <td className={`px-4 py-2 ${'text-gray-700'}`}>
                              <span className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${colors[si % colors.length]}`} />{st.code}</span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="relative group inline-block">
                                <input
                                  type="number"
                                  min="0"
                                  value={storeVal}
                                  onChange={(e) => handleNumberChange(lightbox.blockKey, lightbox.idx, `store_${st.code}`, e.target.value)}
                                  className={`w-20 pl-5 text-center font-['JetBrains_Mono'] text-sm rounded-lg border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${'bg-white border-[rgba(215,183,151,0.4)] text-gray-800 focus:border-[#D7B797]'}`}
                                />
                                <Pencil size={8} className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A6340]/30" />
                              </div>
                            </td>
                            <td className={`px-4 py-2 text-right font-['JetBrains_Mono'] ${'text-gray-800'}`}>{formatCurrency(storeVal * (liveItem.unitCost || 0))}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const liveItem = lightboxLiveItem || lightbox.item;
                        return (
                          <tr className={`border-t-2 ${'border-[#D7B797]/40 bg-[rgba(160,120,75,0.12)]'}`}>
                            <td className={`px-4 py-2 font-semibold ${'text-[#6B4D30]'}`}>{t('skuProposal.total')}</td>
                            <td className={`px-4 py-2 text-center font-bold font-['JetBrains_Mono'] ${'text-gray-800'}`}>{liveItem.order || 0}</td>
                            <td className={`px-4 py-2 text-right font-bold font-['JetBrains_Mono'] ${'text-gray-800'}`}>{formatCurrency((liveItem.order || 0) * (liveItem.unitCost || 0))}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sizing Tab */}
              {lightbox.tab === 'sizing' && (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
                  {/* Store Order Summary */}
                  <div className={`flex flex-wrap items-center gap-3 px-4 py-2 border-b ${'border-[rgba(215,183,151,0.3)] bg-[rgba(215,183,151,0.08)]'}`}>
                    <span className={`font-semibold text-xs font-['Montserrat'] ${'text-[#6B4D30]'}`}>Store Order:</span>
                    {(() => {
                      const liveItem = lightboxLiveItem || lightbox.item;
                      const sq = liveItem.storeQty || {};
                      const entries = Object.entries(sq).filter(([, v]) => true).sort(([a], [b]) => a.localeCompare(b));
                      const totalOrder = liveItem.order || 0;
                      if (entries.length === 0) return <span className="text-xs text-red-500 font-medium">No store orders</span>;
                      return (
                        <>
                          {entries.map(([code, qty]) => (
                            <span key={code} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-['JetBrains_Mono'] ${
                              (qty as number) > 0 ? 'bg-[rgba(18,119,73,0.08)] text-[#127749]' : 'bg-[#F2F2F2] text-[#999]'
                            }`}>
                              <span className="font-semibold">{code}</span>
                              <span>:</span>
                              <span className="font-bold">{qty as number}</span>
                            </span>
                          ))}
                          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-xs font-bold ${
                            totalOrder === 0 ? 'bg-red-50 text-red-500' : 'bg-[rgba(215,183,151,0.2)] text-[#6B4D30]'
                          }`}>
                            Total: {totalOrder}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  {getSizeKeysForSubCategory(lightbox.block?.subCategory || lightbox.item.productType).length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-['Montserrat']">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <span>Master Data chưa có danh sách size cho subcategory <strong>"{lightbox.block?.subCategory || lightbox.item.productType}"</strong>. Vui lòng cập nhật Size trong Master Data.</span>
                    </div>
                  ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className={'bg-[rgba(215,183,151,0.2)] text-[#6B4D30]'}>
                        <th className="px-4 py-2 text-left font-semibold font-['Montserrat'] w-[140px]">Size</th>
                        {getSizeKeysForSubCategory(lightbox.block?.subCategory || lightbox.item.productType).map((sz: string) => (
                          <th key={sz} className="px-1 py-2 text-center font-semibold font-['JetBrains_Mono'] text-xs w-[60px]">{sz}</th>
                        ))}
                        <th className={`px-4 py-2 text-center font-semibold font-['Montserrat'] w-[100px] ${'bg-[rgba(215,183,151,0.25)]'}`}>Sum</th>
                        <th className="px-2 py-2 text-center font-semibold font-['Montserrat'] w-[120px]">Comment</th>
                      </tr>
                    </thead>
                    <tbody className={'text-[#333333]'}>
                      {/* % Sales mix and % ST rows from sales_sub_category_size_history_agg */}
                      {(() => {
                        const shBrandId = lightbox.blockKey.split('_')[0] || '';
                        const shSubCatName = (lightbox.block?.subCategory || '').toLowerCase();
                        let shSubCatId = '';
                        const shCats = brandCategoryMap[shBrandId] || [];
                        for (const cat of shCats) {
                          const subs = cat.sub_categories || cat.subCategories || [];
                          const f = subs.find((sc: any) => (sc.name || '').toLowerCase() === shSubCatName);
                          if (f) { shSubCatId = String(f.id); break; }
                        }
                        const shYear = fyFilter !== 'all' ? fyFilter : 'all';
                        let shSeasonId = 'all';
                        if (seasonFilter !== 'all') {
                          for (const sg of apiSeasonGroups) {
                            const f2 = (sg.seasons || []).find((s: any) => (s.name || s.code) === seasonFilter);
                            if (f2) { shSeasonId = String(f2.id); break; }
                          }
                        }
                        const histData = sizingHistoryMap[`${shBrandId}_${shSubCatId}_${shYear}_${shSeasonId}`] || [];
                        const histBySize: Record<string, { salesMixPct: number; stPct: number | null }> = {};
                        histData.forEach((h: any) => { histBySize[h.size] = { salesMixPct: h.salesMixPct, stPct: h.stPct }; });
                        const lbSizes = getSizeKeysForSubCategory(lightbox.block?.subCategory || lightbox.item.productType);
                        const salesMixSum = lbSizes.reduce((sum, sz) => sum + (histBySize[sz]?.salesMixPct || 0), 0);
                        return (
                          <>
                            <tr className={'border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.08)]'}>
                              <td className={`px-4 py-2 font-medium ${'text-[#333333]'}`}>% Sales mix</td>
                              {lbSizes.map((sz: string) => (
                                <td key={sz} className="px-1 py-2 text-center font-['JetBrains_Mono'] text-xs text-[#666]">
                                  {`${parseFloat((histBySize[sz]?.salesMixPct || 0).toFixed(1))}%`}
                                </td>
                              ))}
                              <td className={`px-4 py-2 text-center font-semibold font-['JetBrains_Mono'] ${'bg-[rgba(160,120,75,0.12)]'}`}>
                                {`${parseFloat(salesMixSum.toFixed(1))}%`}
                              </td>
                              <td></td>
                            </tr>
                            <tr className={'border-b border-[rgba(215,183,151,0.2)]'}>
                              <td className={`px-4 py-2 font-medium ${'text-[#333333]'}`}>% ST</td>
                              {lbSizes.map((sz: string) => (
                                <td key={sz} className="px-1 py-2 text-center font-['JetBrains_Mono'] text-xs text-[#666]">
                                  {`${parseFloat((histBySize[sz]?.stPct ?? 0).toFixed(1))}%`}
                                </td>
                              ))}
                              <td className={`px-4 py-2 text-center font-['JetBrains_Mono'] ${'text-[#999999] bg-[rgba(160,120,75,0.12)]'}`}>0.0%</td>
                              <td></td>
                            </tr>
                          </>
                        );
                      })()}
                      {(() => {
                        const liveItem = lightboxLiveItem || lightbox.item;
                        const totalStoreOrder = liveItem.order || 0;
                        const sizing = getSizing(lightbox.blockKey, lightbox.idx);
                        const lbSizeKeys = getSizeKeysForSubCategory(lightbox.block?.subCategory || liveItem.productType);
                        const sizingSum = calculateSum(sizing);
                        const isOver = totalStoreOrder > 0 && sizingSum > totalStoreOrder;
                        return (
                          <>
                          <tr className="border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.06)]">
                            <td className="px-4 py-2 font-medium text-[#6B4D30]">% Sale mix OTB</td>
                            {lbSizeKeys.map((size: string) => {
                              const sizeQty = Number(sizing[size] || 0);
                              const pct = sizingSum > 0 ? (sizeQty / sizingSum) * 100 : 0;
                              return (
                                <td key={size} className="px-1 py-2 text-center font-['JetBrains_Mono'] text-xs text-[#6B4D30]">
                                  {`${parseFloat(pct.toFixed(1))}%`}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-center font-semibold font-['JetBrains_Mono'] text-[#6B4D30] bg-[rgba(215,183,151,0.2)]">
                              {sizingSum > 0 ? '100%' : '0%'}
                            </td>
                            <td></td>
                          </tr>
                          <tr className="border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.12)]">
                            <td className="px-4 py-2 font-medium text-[#6B4D30]">Sizing</td>
                            {lbSizeKeys.map((size: string) => (
                              <td key={size} className="px-1 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={parseInt(String(sizing[size] ?? 0)) || 0}
                                  onChange={(e) => updateSizing(lightbox.blockKey, lightbox.idx, size, e.target.value)}
                                  className={`w-full text-center font-['JetBrains_Mono'] text-sm rounded border py-1 px-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isOver
                                      ? 'bg-red-50 border-red-300 text-red-600'
                                      : 'bg-emerald-50 border-emerald-200 text-[#6B4D30]'
                                  }`}
                                />
                              </td>
                            ))}
                            <td className={`px-4 py-2 text-center font-semibold font-['JetBrains_Mono'] ${isOver ? 'text-red-600 bg-red-50' : 'text-[#6B4D30] bg-[rgba(215,183,151,0.2)]'}`}>
                              {sizingSum}
                              {isOver && <span className="block text-[9px] font-normal">/{totalStoreOrder}</span>}
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="text"
                                value={liveItem.sizingComment || ''}
                                onChange={(e) => handleSelectChange(lightbox.blockKey, lightbox.idx, 'sizingComment', e.target.value)}
                                placeholder="Sizing comment..."
                                className="w-full text-xs rounded border border-[#C4B5A5] py-1 px-2 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] bg-white text-[#333] placeholder-[#999]"
                              />
                            </td>
                          </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {(() => {
              // Check sizing warnings (only on sizing tab)
              let sizingOverAllocated = false;
              let sizingWithoutOrder = false;
              if (lightbox.tab === 'sizing') {
                const liveItem = lightboxLiveItem || lightbox.item;
                const totalStoreOrder = liveItem.order || 0;
                const sizing = getSizing(lightbox.blockKey, lightbox.idx);
                const sizingSum = calculateSum(sizing);
                if (sizingSum > 0 && totalStoreOrder === 0) { sizingWithoutOrder = true; }
                if (totalStoreOrder > 0 && sizingSum > totalStoreOrder) { sizingOverAllocated = true; }
              }
              return (
                <div className={`px-6 py-3 border-t ${'border-[rgba(215,183,151,0.3)]'}`}>
                  {sizingWithoutOrder && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <span>Store order is 0. Please set store order quantities before entering sizing.</span>
                    </div>
                  )}
                  {sizingOverAllocated && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <span>Sizing total exceeds store order ({(lightboxLiveItem || lightbox.item).order}). Please adjust before confirming.</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCloseLightbox}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${'text-[#666666] hover:bg-[rgba(160,120,75,0.12)] hover:text-[#6B4D30]'}`}
                    >
                      Close
                    </button>
                    <button
                      onClick={(sizingOverAllocated || sizingWithoutOrder) ? undefined : handleCloseLightbox}
                      disabled={sizingOverAllocated || sizingWithoutOrder}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                        (sizingOverAllocated || sizingWithoutOrder)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#D7B797] text-[#333333] hover:bg-[#C4A584]'
                      }`}
                    >
                      Done
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterOpen}
        onClose={closeFilter}
        filters={[
          {
            key: 'fy',
            label: 'FY',
            type: 'single',
            options: fyOptions.filter((o: any) => o.value !== 'all').map((o: any) => ({ label: o.label, value: o.value }))},
          {
            key: 'budget',
            label: t('skuProposal.budget') || 'Budget',
            type: 'single',
            options: filteredBudgets.map((b: any) => ({ label: b.budgetName, value: b.id }))},
          {
            key: 'brand',
            label: 'Brand',
            type: 'single',
            options: brandOptions.filter((b: any) => b.value !== 'all').map((b: any) => ({ label: b.label, value: b.value }))},
          {
            key: 'seasonGroup',
            label: t('otbAnalysis.seasonGroup'),
            type: 'single',
            options: seasonGroupOptions.filter((s: any) => s.value !== 'all').map((s: any) => ({ label: s.label, value: s.value }))},
          {
            key: 'season',
            label: t('otbAnalysis.season') || 'Season',
            type: 'single',
            options: seasonOptions.filter((s: any) => s.value !== 'all').map((s: any) => ({ label: s.label, value: s.value }))},
          {
            key: 'gender',
            label: t('common.gender') || 'Gender',
            type: 'single',
            options: genderOptions.filter((g: any) => g.value !== 'all').map((g: any) => ({ label: g.label, value: g.value }))},
          {
            key: 'category',
            label: t('common.category') || 'Category',
            type: 'single',
            options: categoryOptions.filter((c: any) => c.value !== 'all').map((c: any) => ({ label: c.label, value: c.value }))},
          {
            key: 'subCategory',
            label: t('common.subCategory') || 'Sub Category',
            type: 'single',
            options: subCategoryOptions.filter((s: any) => s.value !== 'all').map((s: any) => ({ label: s.label, value: s.value }))},
          {
            key: 'rail',
            label: 'Rail',
            type: 'single',
            options: railOptions.filter((r: any) => r.value !== 'all').map((r: any) => ({ label: r.label, value: r.value }))},
        ]}
        values={mobileFilterValues}
        onChange={(key, value) => setMobileFilterValues(prev => ({ ...prev, [key]: value }))}
        onApply={() => {
          setFyFilter((mobileFilterValues.fy as string) || 'all');
          setBudgetFilter((mobileFilterValues.budget as string) || 'all');
          setBrandFilter((mobileFilterValues.brand as string) || 'all');
          setSeasonGroupFilter((mobileFilterValues.seasonGroup as string) || 'all');
          setSeasonFilter((mobileFilterValues.season as string) || 'all');
          setGenderFilter((mobileFilterValues.gender as string) || 'all');
          setCategoryFilter((mobileFilterValues.category as string) || 'all');
          setSubCategoryFilter((mobileFilterValues.subCategory as string) || 'all');
          setRailFilter((mobileFilterValues.rail as string) || 'all');
        }}
        onReset={() => {
          setMobileFilterValues({});
          setFyFilter('all');
          setBudgetFilter('all');
          setBrandFilter('all');
          setSeasonGroupFilter('all');
          setSeasonFilter('all');
          setGenderFilter('all');
          setCategoryFilter('all');
          setSubCategoryFilter('all');
          setRailFilter('all');
        }}
      />
      <ConfirmDialog {...dialogProps} />

      {/* Add SKU Modal */}
      {addSkuModal && (() => {
        // Resolve subCategoryId from block's subCategory name
        const modalBrandId = addSkuModal.block?.brandId || 'all';
        const modalSubCatName = (addSkuModal.block?.subCategory || '').toLowerCase();
        let resolvedSubCategoryId: string | undefined;
        const cats = brandCategoryMap[modalBrandId] || [];
        for (const cat of cats) {
          const subCats = cat.sub_categories || cat.subCategories || [];
          const found = subCats.find((sc: any) => (sc.name || '').toLowerCase() === modalSubCatName);
          if (found) { resolvedSubCategoryId = String(found.id); break; }
        }
        return (
          <AddSKUModal
            isOpen={addSkuModal.open}
            onClose={() => setAddSkuModal(null)}
            subCategoryId={resolvedSubCategoryId}
            blockGender={addSkuModal.block?.gender}
            blockCategory={addSkuModal.block?.category}
            blockSubCategory={addSkuModal.block?.subCategory}
            existingSkus={
              skuBlocks
                .find((b: any) => buildBlockKey(b) === addSkuModal.blockKey)
                ?.items.map((i: any) => i.sku).filter(Boolean) || []
            }
            onAddSkus={(skus) => handleAddSkusFromModal(addSkuModal.blockKey, skus, addSkuModal.block)}
            stores={stores}
            customerTargetOptions={customerTargetOptions}
            onCreateCustomerTarget={(val) => setCustomerTargetOptions(prev => [...prev, val])}
          />
        );
      })()}

      {/* Comment popup — portal */}
      {commentPopup && createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={() => setCommentPopup(null)}
        >
          <div
            className={`fixed rounded-lg border px-4 py-3 max-w-xs shadow-xl animate-scalePop ${'bg-white border-[#D4CCC2] text-[#333333]'}`}
            style={{
              top: commentPopup.rect.top - 8,
              left: commentPopup.rect.left + commentPopup.rect.width / 2,
              transform: 'translate(-50%, -100%)',
              boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 font-['Montserrat'] ${'text-[#6B4D30]'}`}>Comment</div>
            <div className="text-sm whitespace-pre-wrap break-words">{commentPopup.text}</div>
            <div
              className={`absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 rotate-45 border-r border-b ${'bg-white border-[#D4CCC2]'}`}
            />
          </div>
        </div>,
        document.body
      )}
      <ScrollToHeader />

      {/* Import Preview Modal */}
      {importPreview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setImportPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E8DDD4] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-[#3D2B1A] text-sm">Import Preview</h3>
                <p className="text-xs text-[#888] mt-0.5">
                  {importPreview.items.length} SKUs with changes
                  {importPreview.items.filter(i => i.sizingExceedsOrder).length > 0 && (
                    <span className="ml-2 text-red-500 font-medium">
                      · {importPreview.items.filter(i => i.sizingExceedsOrder).length} blocked (sizing &gt; order)
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setImportPreview(null)} className="text-[#aaa] hover:text-[#666] text-lg leading-none">✕</button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 px-5 py-3">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {importPreview.items.map((item) => (
                    <tr key={item.productId} className={item.sizingExceedsOrder ? 'bg-red-50' : ''}>
                      <td colSpan={3} className="py-2 border-b border-[#F0EAE4]">
                        {/* SKU header row */}
                        <div className="flex items-start gap-1.5 mb-1.5">
                          {item.sizingExceedsOrder && <span className="text-red-500 font-bold text-[10px] mt-0.5">✕</span>}
                          <div className="flex-1 min-w-0">
                            <span className={`font-semibold text-xs ${item.sizingExceedsOrder ? 'text-red-600' : 'text-[#3D2B1A]'}`}>{item.skuCode}</span>
                            <span className="text-[10px] text-[#888] ml-2">{item.skuName}</span>
                            {item.sizingExceedsOrder && (
                              <div className="text-[10px] text-red-500 mt-0.5">Sizing total ({item.newSizingTotal}) exceeds order ({item.newOrder}) — skipped</div>
                            )}
                          </div>
                        </div>

                        {/* Detail grid: stores left, sizes right */}
                        <div className="grid grid-cols-2 gap-3 pl-4">
                          {/* Per-store breakdown */}
                          {item.orderChanged && item.storeChanges.length > 0 && (
                            <div>
                              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Order by store</div>
                              <table className="w-full text-[10px]">
                                <tbody>
                                  {item.storeChanges.map(s => (
                                    <tr key={s.code}>
                                      <td className="pr-2 text-[#666] font-medium">{s.code}</td>
                                      <td className="text-right font-mono">
                                        <span className="text-[#aaa]">{s.oldQty}</span>
                                        {s.oldQty !== s.newQty && <> → <span className={`font-semibold ${item.sizingExceedsOrder ? 'text-red-500' : 'text-[#3D2B1A]'}`}>{s.newQty}</span></>}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-[#E8DDD4] mt-0.5">
                                    <td className="pr-2 text-[#999] font-semibold pt-0.5">Total</td>
                                    <td className="text-right font-mono font-semibold pt-0.5">
                                      <span className="text-[#aaa]">{item.oldOrder}</span> → <span className={item.sizingExceedsOrder ? 'text-red-500' : 'text-[#3D2B1A]'}>{item.newOrder}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Per-size breakdown */}
                          {item.sizingChanged && item.sizeChanges.length > 0 && (
                            <div>
                              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Sizing</div>
                              <table className="w-full text-[10px]">
                                <tbody>
                                  {item.sizeChanges.map(s => (
                                    <tr key={s.name}>
                                      <td className="pr-2 text-[#666] font-medium">{s.name}</td>
                                      <td className="text-right font-mono">
                                        <span className="text-[#aaa]">{s.oldQty}</span>
                                        {s.oldQty !== s.newQty && <> → <span className={`font-semibold ${item.sizingExceedsOrder ? 'text-red-500' : 'text-[#3D2B1A]'}`}>{s.newQty}</span></>}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-[#E8DDD4] mt-0.5">
                                    <td className="pr-2 text-[#999] font-semibold pt-0.5">Total</td>
                                    <td className="text-right font-mono font-semibold pt-0.5">
                                      <span className="text-[#aaa]">{item.oldSizingTotal}</span> → <span className={item.sizingExceedsOrder ? 'text-red-500' : 'text-[#3D2B1A]'}>{item.newSizingTotal}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#E8DDD4] flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setImportPreview(null)} className="px-4 py-1.5 rounded-lg text-xs text-[#666] border border-[#ddd] hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importPreview.items.every(i => i.sizingExceedsOrder)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#5C4A3A] text-white hover:bg-[#3D2B1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply {importPreview.items.filter(i => !i.sizingExceedsOrder).length} changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SKUProposalScreen;
