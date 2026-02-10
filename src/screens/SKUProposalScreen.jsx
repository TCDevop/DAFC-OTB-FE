'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Filter, ChevronDown, Package, Image as ImageIcon, Pencil, X, Plus, Trash2, Ruler,
  Star, Layers, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils';
import { budgetService, masterDataService, proposalService } from '../services';
import SizeCurveAdvisor from '../components/SizeCurveAdvisor';
import SkuRecommenderPanel from '../components/SkuRecommenderPanel';
import { useLanguage } from '@/contexts/LanguageContext';

const SEASON_GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'SS', label: 'Spring Summer' },
  { id: 'FW', label: 'Fall Winter' }
];

const SEASONS = [
  { id: 'all', label: 'All' },
  { id: 'Pre', label: 'Pre' },
  { id: 'Main/Show', label: 'Main/Show' }
];

// DAFC Design System card backgrounds - warm gold tints
const CARD_BG_CLASSES = [
  { light: 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.3)]', dark: 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.2)]' },
  { light: 'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.35)]', dark: 'bg-[rgba(215,183,151,0.1)] border-[rgba(215,183,151,0.25)]' },
  { light: 'bg-[rgba(18,119,73,0.08)] border-[rgba(18,119,73,0.2)]', dark: 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)]' },
  { light: 'bg-[rgba(215,183,151,0.12)] border-[rgba(215,183,151,0.32)]', dark: 'bg-[rgba(215,183,151,0.06)] border-[rgba(215,183,151,0.18)]' },
  { light: 'bg-[rgba(18,119,73,0.06)] border-[rgba(18,119,73,0.18)]', dark: 'bg-[rgba(42,158,106,0.08)] border-[rgba(42,158,106,0.2)]' },
  { light: 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)]', dark: 'bg-[rgba(215,183,151,0.05)] border-[rgba(215,183,151,0.15)]' }
];

const SKU_VERSIONS = [
  { id: 'v1', name: 'Version 1', createdAt: '2025-01-15', isFinal: false },
  { id: 'v2', name: 'Version 2', createdAt: '2025-01-20', isFinal: false },
  { id: 'v3', name: 'Version 3', createdAt: '2025-01-25', isFinal: true },
];

const SIZING_CHOICES = [
  { id: 'choice-a', name: 'Choice A', isFinal: true },
  { id: 'choice-b', name: 'Choice B', isFinal: false },
  { id: 'choice-c', name: 'Choice C', isFinal: false },
];

const SKUProposalScreen = ({ skuContext, onContextUsed, darkMode = false }) => {
  const { t } = useLanguage();
  // SKU catalog and proposal data from API
  const [skuCatalog, setSkuCatalog] = useState([]);
  const [skuDataLoading, setSkuDataLoading] = useState(true);

  // Fetch SKU catalog and proposals from API
  useEffect(() => {
    const fetchSkuData = async () => {
      setSkuDataLoading(true);
      try {
        const [catalogRes, proposalsRes] = await Promise.all([
          masterDataService.getSkuCatalog().catch(() => ({ data: [] })),
          proposalService.getAll().catch(() => ({ data: [] }))
        ]);

        // Transform SKU catalog
        const catalog = Array.isArray(catalogRes) ? catalogRes : (catalogRes?.data || []);
        setSkuCatalog(catalog.map(s => ({
          sku: s.skuCode || s.sku || s.code || s.id,
          name: s.productName || s.name,
          productType: s.productType || s.category || '',
          theme: s.theme || '',
          color: s.color || '',
          composition: s.composition || '',
          srp: Number(s.srp || s.unitCost) || 0
        })));

        // Transform proposals into SKU blocks grouped by gender/category
        const proposals = Array.isArray(proposalsRes) ? proposalsRes : (proposalsRes?.data || []);
        const blocks = [];
        proposals.forEach(p => {
          (p.products || []).forEach(prod => {
            const gender = (prod.gender || '').toLowerCase();
            const category = prod.category || '';
            const subCategory = prod.subCategory || '';
            let block = blocks.find(b => b.gender === gender && b.category === category && b.subCategory === subCategory);
            if (!block) {
              block = { gender, category, subCategory, items: [] };
              blocks.push(block);
            }
            block.items.push({
              sku: prod.skuCode || prod.sku,
              name: prod.productName || prod.name,
              productType: prod.productType || prod.subCategory || '',
              theme: prod.theme || '',
              color: prod.color || '',
              composition: prod.composition || '',
              unitCost: Number(prod.unitCost) || 0,
              srp: Number(prod.srp) || 0,
              order: prod.orderQty || 0,
              rex: prod.rex || 0,
              ttp: prod.ttp || 0,
              ttlValue: Number(prod.totalValue) || 0,
              customerTarget: prod.customerTarget || 'New'
            });
          });
        });
        if (blocks.length > 0) {
          setSkuBlocks(blocks);
        }
      } catch (err) {
        console.error('Failed to fetch SKU data:', err);
      } finally {
        setSkuDataLoading(false);
      }
    };
    fetchSkuData();
  }, []);

  // API state for fetching budgets
  const [apiBudgets, setApiBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // Fetch budgets from API
  const fetchBudgets = useCallback(async () => {
    setLoadingBudgets(true);
    try {
      const response = await budgetService.getAll({ status: 'APPROVED' });
      const budgetList = (response.data || response || []).map(budget => ({
        id: budget.id,
        fiscalYear: budget.fiscalYear,
        groupBrand: typeof budget.groupBrand === 'object' ? (budget.groupBrand?.name || budget.groupBrand?.code || 'A') : (budget.groupBrand || 'A'),
        brandId: budget.brandId,
        brandName: budget.Brand?.name || budget.brandName || 'Unknown',
        totalBudget: budget.totalAmount || budget.totalBudget || 0,
        budgetName: budget.name || budget.budgetName || 'Untitled',
        status: (budget.status || 'DRAFT').toLowerCase()
      }));
      setApiBudgets(budgetList);
    } catch (err) {
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

  const [budgetFilter, setBudgetFilter] = useState('all');
  const [seasonGroupFilter, setSeasonGroupFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('all');

  const [genderFilter, setGenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');

  const [collapsed, setCollapsed] = useState({});
  const [contextBanner, setContextBanner] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [cardDetailsOpen, setCardDetailsOpen] = useState({});
  const [cardStoreOrderOpen, setCardStoreOrderOpen] = useState({});
  const [cardSizingOpen, setCardSizingOpen] = useState({});
  const [skuVersion, setSkuVersion] = useState('v3');
  const [skuVersions, setSkuVersions] = useState(SKU_VERSIONS);
  const [isSkuVersionOpen, setIsSkuVersionOpen] = useState(false);
  const [sizingVersion, setSizingVersion] = useState('choice-a');
  const [sizingChoices, setSizingChoices] = useState(SIZING_CHOICES);
  const [isSizingVersionOpen, setIsSizingVersionOpen] = useState(false);
  const skuVersionDropdownRef = useRef(null);
  const sizingVersionDropdownRef = useRef(null);

  // Close version dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (skuVersionDropdownRef.current && !skuVersionDropdownRef.current.contains(e.target)) {
        setIsSkuVersionOpen(false);
      }
      if (sizingVersionDropdownRef.current && !sizingVersionDropdownRef.current.contains(e.target)) {
        setIsSizingVersionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSetFinalVersion = (versionId, e) => {
    e.stopPropagation();
    setSkuVersions(prev => prev.map(v => ({ ...v, isFinal: v.id === versionId })));
  };

  const handleSetFinalSizing = (choiceId, e) => {
    e.stopPropagation();
    setSizingChoices(prev => prev.map(c => ({ ...c, isFinal: c.id === choiceId })));
  };

  const selectedSkuVersion = skuVersions.find(v => v.id === skuVersion) || skuVersions[0];
  const selectedSizingChoice = sizingChoices.find(c => c.id === sizingVersion) || sizingChoices[0];

  // Apply context from OTB Analysis when navigating here
  useEffect(() => {
    if (skuContext) {
      // Set filters based on context
      if (skuContext.budgetId) {
        setBudgetFilter(skuContext.budgetId);
      }
      if (skuContext.seasonGroup) {
        setSeasonGroupFilter(skuContext.seasonGroup);
      }
      if (skuContext.season) {
        setSeasonFilter(skuContext.season);
      }
      // Use lowercase gender id to match SKU data (e.g., 'female', 'male')
      if (skuContext.gender?.id) {
        setGenderFilter(skuContext.gender.id.toLowerCase());
      }
      // Use category name to match SKU data (e.g., 'RTW', 'Accessories')
      if (skuContext.category?.name) {
        setCategoryFilter(skuContext.category.name);
      }
      // Use subCategory name to match SKU data (e.g., 'W Outerwear', 'M Bags')
      if (skuContext.subCategory?.name) {
        setSubCategoryFilter(skuContext.subCategory.name);
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
  const [skuBlocks, setSkuBlocks] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sizingPopup, setSizingPopup] = useState({ open: false, blockKey: null, itemIdx: null, item: null });
  const [sizingData, setSizingData] = useState({});

  const getDefaultSizing = () => ({
    choiceA: { s0002: 0, s0004: 3, s0006: 3, s0008: 2 },
    choiceB: { s0002: 0, s0004: 2, s0006: 2, s0008: 2 },
    choiceC: { s0002: 0, s0004: 2, s0006: 1, s0008: 1 }
  });

  const getSizingKey = (blockKey, itemIdx) => `${blockKey}_${itemIdx}`;

  const getSizing = (blockKey, itemIdx) => {
    const key = getSizingKey(blockKey, itemIdx);
    return sizingData[key] || getDefaultSizing();
  };

  const updateSizing = (blockKey, itemIdx, choice, size, value) => {
    const key = getSizingKey(blockKey, itemIdx);
    const currentSizing = sizingData[key] || getDefaultSizing();
    setSizingData(prev => ({
      ...prev,
      [key]: {
        ...currentSizing,
        [choice]: {
          ...currentSizing[choice],
          [size]: parseInt(value) || 0
        }
      }
    }));
  };

  const calculateSum = (choiceData) => {
    return Object.values(choiceData).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const handleOpenSizing = (blockKey, itemIdx, item) => {
    setSizingPopup({ open: true, blockKey, itemIdx, item });
  };

  const handleCloseSizing = () => {
    setSizingPopup({ open: false, blockKey: null, itemIdx: null, item: null });
  };

  const budgetOptions = useMemo(() => {
    const options = [{ id: 'all', label: 'All Budgets' }];
    apiBudgets.forEach(b => options.push({ id: b.id, label: b.budgetName }));
    return options;
  }, [apiBudgets]);

  const genderOptions = useMemo(() => {
    const genders = new Set(skuBlocks.map(s => s.gender));
    return ['all', ...Array.from(genders)];
  }, [skuBlocks]);

  const categoryOptions = useMemo(() => {
    const categories = skuBlocks.filter(s => genderFilter === 'all' || s.gender === genderFilter)
      .map(s => s.category);
    return ['all', ...Array.from(new Set(categories))];
  }, [genderFilter, skuBlocks]);

  const subCategoryOptions = useMemo(() => {
    const subs = skuBlocks.filter(s => (genderFilter === 'all' || s.gender === genderFilter)
        && (categoryFilter === 'all' || s.category === categoryFilter))
      .map(s => s.subCategory);
    return ['all', ...Array.from(new Set(subs))];
  }, [genderFilter, categoryFilter, skuBlocks]);

  const filteredSkuBlocks = useMemo(() => {
    return skuBlocks.filter(block => {
      if (genderFilter !== 'all' && block.gender !== genderFilter) return false;
      if (categoryFilter !== 'all' && block.category !== categoryFilter) return false;
      if (subCategoryFilter !== 'all' && block.subCategory !== subCategoryFilter) return false;
      return true;
    });
  }, [genderFilter, categoryFilter, subCategoryFilter, skuBlocks]);

  // Card view available when there's data to show
  const canShowCardView = filteredSkuBlocks.length > 0 && filteredSkuBlocks.some(b => b.items.length > 0);

  const handleStartEdit = (cellKey, currentValue) => {
    setEditingCell(cellKey);
    setEditValue(currentValue?.toString() ?? '');
  };

  const handleSaveEdit = (cellKey) => {
    const value = Number(editValue);
    const nextValue = Number.isFinite(value) ? value : 0;
    const [blockKey, itemIdx, field] = cellKey.split('|');

    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const items = block.items.map((item, idx) => {
        if (String(idx) !== itemIdx) return item;
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

  const handleKeyDown = (e, cellKey) => {
    if (e.key === 'Enter') {
      handleSaveEdit(cellKey);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSelectChange = (blockKey, itemIdx, field, value) => {
    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const items = block.items.map((item, idx) => {
        if (String(idx) !== String(itemIdx)) return item;
        return { ...item, [field]: value };
      });
      return { ...block, items };
    }));
  };

  const handleNumberChange = (blockKey, itemIdx, field, value) => {
    const nextValue = Number(value);
    const safeValue = Number.isFinite(nextValue) ? nextValue : 0;
    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const items = block.items.map((item, idx) => {
        if (String(idx) !== String(itemIdx)) return item;
        return { ...item, [field]: safeValue };
      });
      return { ...block, items };
    }));
  };

  const handleToggle = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddSkuRow = (blockKey) => {
    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const newItem = {
        sku: '',
        name: '',
        productType: block.subCategory.toUpperCase(),
        theme: '',
        color: '',
        composition: '',
        unitCost: 0,
        srp: 0,
        order: 0,
        rex: 0,
        ttp: 0,
        ttlValue: 0,
        customerTarget: 'New',
        isNew: true
      };
      return { ...block, items: [...block.items, newItem] };
    }));
  };

  const handleSkuSelect = (blockKey, itemIdx, selectedSku) => {
    const skuData = skuCatalog.find(s => s.sku === selectedSku);
    if (!skuData) return;

    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const items = block.items.map((item, idx) => {
        if (idx !== itemIdx) return item;
        return {
          ...item,
          sku: skuData.sku,
          name: skuData.name,
          productType: skuData.productType,
          theme: skuData.theme,
          color: skuData.color,
          composition: skuData.composition,
          srp: skuData.srp,
          isNew: false
        };
      });
      return { ...block, items };
    }));
  };

  const handleDeleteSkuRow = (blockKey, itemIdx) => {
    setSkuBlocks(prev => prev.map(block => {
      const key = `${block.gender}_${block.category}_${block.subCategory}`;
      if (key !== blockKey) return block;
      const items = block.items.filter((_, idx) => idx !== itemIdx);
      return { ...block, items };
    }));
  };

  const filteredSkuItems = useMemo(() => {
    return filteredSkuBlocks.flatMap(block => {
      const blockKey = `${block.gender}_${block.category}_${block.subCategory}`;
      return block.items.map((item, idx) => ({
        block,
        blockKey,
        item,
        idx,
        key: `${blockKey}_${item.sku || 'new'}_${idx}`
      }));
    });
  }, [filteredSkuBlocks]);

  const getCardBgClass = (index) => {
    const style = CARD_BG_CLASSES[index % CARD_BG_CLASSES.length];
    return darkMode ? style.dark : style.light;
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl shadow-sm border p-5 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.3)]'}`}>
        <div className="flex items-center justify-between mb-4">
          

          {/* Context Banner from OTB Analysis */}
          {contextBanner && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${darkMode ? 'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.25)]' : 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.3)]'}`}>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex flex-col">
                  <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.budget')}</span>
                  <span className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{contextBanner.budgetName || 'N/A'}</span>
                </div>
                <div className={`w-px h-8 ${darkMode ? 'bg-[rgba(215,183,151,0.25)]' : 'bg-[rgba(215,183,151,0.4)]'}`}></div>
                <div className="flex flex-col">
                  <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.season')}</span>
                  <span className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{contextBanner.seasonGroup} - {contextBanner.season}</span>
                </div>
                <div className={`w-px h-8 ${darkMode ? 'bg-[rgba(215,183,151,0.25)]' : 'bg-[rgba(215,183,151,0.4)]'}`}></div>
                <div className="flex flex-col">
                  <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.category')}</span>
                  <span className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{contextBanner.gender} / {contextBanner.category} / {contextBanner.subCategory}</span>
                </div>
                {contextBanner.otbData && (
                  <>
                    <div className={`w-px h-8 ${darkMode ? 'bg-[rgba(215,183,151,0.25)]' : 'bg-[rgba(215,183,151,0.4)]'}`}></div>
                    <div className="flex flex-col">
                      <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.totalValue')}</span>
                      <span className={`font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(contextBanner.otbData.otbProposed || 0)}</span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setContextBanner(null)}
                className={`ml-2 p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.15)]' : 'hover:bg-[rgba(215,183,151,0.2)]'}`}
                title="Dismiss"
              >
                <X size={16} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
            <div className={`flex items-center gap-2 mb-3 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>
              <Filter size={14} />
              <span className="text-sm font-semibold font-['Montserrat']">{t('skuProposal.filters')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.budget')}</label>
                <select
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {budgetOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.seasonGroup')}</label>
                <select
                  value={seasonGroupFilter}
                  onChange={(e) => setSeasonGroupFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {SEASON_GROUPS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.season')}</label>
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {SEASONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.2)]'}`}>
            <div className={`flex items-center gap-2 mb-3 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>
              <Filter size={14} />
              <span className="text-sm font-semibold font-['Montserrat']">{t('common.filters')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.gender')}</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {genderOptions.map(g => (
                    <option key={g} value={g}>{g === 'all' ? 'All' : g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.category')}</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.subCategory')}</label>
                <select
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                >
                  {subCategoryOptions.map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'All' : s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Versions Section */}
        <div className={`mt-4 rounded-xl border p-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
          <div className={`flex items-center gap-2 mb-3 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>
            <Package size={14} />
            <span className="text-sm font-semibold font-['Montserrat']">{t('skuProposal.version')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {/* SKU Version Dropdown */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.version')}</span>
              <div className="relative" ref={skuVersionDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSkuVersionOpen(!isSkuVersionOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    darkMode
                      ? 'bg-[rgba(215,183,151,0.1)] border-[rgba(215,183,151,0.3)] text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.15)]'
                      : 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.4)] text-[#333333] hover:bg-[rgba(160,120,75,0.18)]'
                  }`}
                >
                  {selectedSkuVersion?.isFinal && <Star size={14} className="text-[#D7B797] fill-[#D7B797]" />}
                  <span>{selectedSkuVersion?.name || t('common.version')}</span>
                  {selectedSkuVersion?.isFinal && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${darkMode ? 'bg-[#D7B797] text-[#0A0A0A]' : 'bg-[#D7B797] text-white'}`}>FINAL</span>
                  )}
                  <ChevronDown size={14} className={`transition-transform ${isSkuVersionOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSkuVersionOpen && (
                  <div className={`absolute top-full left-0 mt-1 w-72 rounded-xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.3)]'}`}>
                    <div className={`px-3 py-2 border-b ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide font-['Montserrat'] ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('common.version')}</span>
                    </div>
                    {skuVersions.map(version => (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => { setSkuVersion(version.id); setIsSkuVersionOpen(false); }}
                        className={`w-full px-3 py-3 flex items-center justify-between transition-colors ${
                          version.id === skuVersion
                            ? darkMode ? 'bg-[rgba(215,183,151,0.1)]' : 'bg-[rgba(160,120,75,0.12)]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.05)]' : 'hover:bg-[rgba(160,120,75,0.08)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {version.isFinal
                            ? <Star size={14} className="text-[#D7B797] fill-[#D7B797]" />
                            : <Layers size={14} className={darkMode ? 'text-[#666666]' : 'text-[#999999]'} />
                          }
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{version.name}</span>
                              {version.isFinal && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]">FINAL</span>
                              )}
                            </div>
                            <span className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>Created: {version.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!version.isFinal && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleSetFinalVersion(version.id, e)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSetFinalVersion(version.id, e); }}
                              className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${darkMode ? 'text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'text-[#8A6340] hover:bg-[rgba(160,120,75,0.12)]'}`}
                            >
                              {t('planning.latestVersion')}
                            </span>
                          )}
                          {version.id === skuVersion && <Check size={16} className="text-[#2A9E6A]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className={`h-8 w-px hidden sm:block ${darkMode ? 'bg-[#2E2E2E]' : 'bg-[rgba(215,183,151,0.3)]'}`} />

            {/* Sizing Choice Dropdown */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.sizingChoice')}</span>
              <div className="relative" ref={sizingVersionDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSizingVersionOpen(!isSizingVersionOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    darkMode
                      ? 'bg-[rgba(215,183,151,0.1)] border-[rgba(215,183,151,0.3)] text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.15)]'
                      : 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.4)] text-[#333333] hover:bg-[rgba(160,120,75,0.18)]'
                  }`}
                >
                  {selectedSizingChoice?.isFinal && <Star size={14} className="text-[#D7B797] fill-[#D7B797]" />}
                  <span>{selectedSizingChoice?.name || t('skuProposal.sizing')}</span>
                  {selectedSizingChoice?.isFinal && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${darkMode ? 'bg-[#D7B797] text-[#0A0A0A]' : 'bg-[#D7B797] text-white'}`}>FINAL</span>
                  )}
                  <ChevronDown size={14} className={`transition-transform ${isSizingVersionOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSizingVersionOpen && (
                  <div className={`absolute top-full left-0 mt-1 w-64 rounded-xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.3)]'}`}>
                    <div className={`px-3 py-2 border-b ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide font-['Montserrat'] ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>{t('skuProposal.sizing')}</span>
                    </div>
                    {sizingChoices.map(choice => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => { setSizingVersion(choice.id); setIsSizingVersionOpen(false); }}
                        className={`w-full px-3 py-3 flex items-center justify-between transition-colors ${
                          choice.id === sizingVersion
                            ? darkMode ? 'bg-[rgba(215,183,151,0.1)]' : 'bg-[rgba(160,120,75,0.12)]'
                            : darkMode ? 'hover:bg-[rgba(215,183,151,0.05)]' : 'hover:bg-[rgba(160,120,75,0.08)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {choice.isFinal
                            ? <Star size={14} className="text-[#D7B797] fill-[#D7B797]" />
                            : <Layers size={14} className={darkMode ? 'text-[#666666]' : 'text-[#999999]'} />
                          }
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{choice.name}</span>
                            {choice.isFinal && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]">FINAL</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!choice.isFinal && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleSetFinalSizing(choice.id, e)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSetFinalSizing(choice.id, e); }}
                              className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${darkMode ? 'text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'text-[#8A6340] hover:bg-[rgba(160,120,75,0.12)]'}`}
                            >
                              {t('planning.latestVersion')}
                            </span>
                          )}
                          {choice.id === sizingVersion && <Check size={16} className="text-[#2A9E6A]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-3 justify-between mt-4">
          <div className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
            {canShowCardView ? `${filteredSkuItems.length} SKUs found. Card view available.` : 'No SKU data. Add SKUs to enable card view.'}
          </div>
          <div className={`flex items-center gap-1 rounded-lg p-1 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.12)]'}`}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#999999] hover:text-[#D7B797]' : 'text-[#666666] hover:text-[#8A6340]'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => canShowCardView && setViewMode('card')}
              disabled={!canShowCardView}
              title={!canShowCardView ? 'Add SKUs to enable card view' : 'View SKUs as cards'}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'card'
                  ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#999999] hover:text-[#D7B797]' : 'text-[#666666] hover:text-[#8A6340]'
              } ${!canShowCardView ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Card
            </button>
          </div>
        </div>
      </div>

      {/* AI SKU Recommender Panel */}
      {budgetFilter !== 'all' && categoryFilter !== 'all' && (
        <SkuRecommenderPanel
          budgetDetailId={budgetFilter}
          category={categoryFilter}
          subCategory={subCategoryFilter !== 'all' ? subCategoryFilter : undefined}
          budgetAmount={
            (apiBudgets.find(b => String(b.id) === String(budgetFilter))?.totalBudget) || 0
          }
          seasonGroup={seasonGroupFilter !== 'all' ? seasonGroupFilter : undefined}
          fiscalYear={
            contextBanner?.fiscalYear ||
            (apiBudgets.find(b => String(b.id) === String(budgetFilter))?.fiscalYear) ||
            undefined
          }
          storeId="all"
          proposalId={budgetFilter}
          existingSkuIds={skuBlocks.flatMap(b => b.items.map(i => i.sku)).filter(Boolean)}
          onSkusAdded={(addedSkus) => {
            toast.success(`${addedSkus.length} SKU${addedSkus.length !== 1 ? 's' : ''} added to proposal`);
            // Re-fetch proposal data to reflect added SKUs
            const refetch = async () => {
              try {
                const proposalsRes = await proposalService.getAll();
                const proposals = Array.isArray(proposalsRes) ? proposalsRes : (proposalsRes?.data || []);
                const blocks = [];
                proposals.forEach(p => {
                  (p.products || []).forEach(prod => {
                    const gender = (prod.gender || '').toLowerCase();
                    const cat = prod.category || '';
                    const sub = prod.subCategory || '';
                    let block = blocks.find(bl => bl.gender === gender && bl.category === cat && bl.subCategory === sub);
                    if (!block) {
                      block = { gender, category: cat, subCategory: sub, items: [] };
                      blocks.push(block);
                    }
                    block.items.push({
                      sku: prod.skuCode || prod.sku,
                      name: prod.productName || prod.name,
                      productType: prod.productType || prod.subCategory || '',
                      theme: prod.theme || '',
                      color: prod.color || '',
                      composition: prod.composition || '',
                      unitCost: Number(prod.unitCost) || 0,
                      srp: Number(prod.srp) || 0,
                      order: prod.orderQty || 0,
                      rex: prod.rex || 0,
                      ttp: prod.ttp || 0,
                      ttlValue: Number(prod.totalValue) || 0,
                      customerTarget: prod.customerTarget || 'New'
                    });
                  });
                });
                if (blocks.length > 0) setSkuBlocks(blocks);
              } catch (err) {
                console.error('Failed to refresh proposals:', err);
              }
            };
            refetch();
          }}
          darkMode={darkMode}
        />
      )}

      {filteredSkuBlocks.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.2)]'}`}>
          <Package size={36} className={`mx-auto mb-3 ${darkMode ? 'text-[#666666]' : 'text-[rgba(215,183,151,0.5)]'}`} />
          <p className={`font-medium font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{t('skuProposal.noSkuData')}</p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Try adjusting the filters above</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSkuItems.map(({ block, blockKey, item, idx, key }, cardIdx) => {
            const detailsOpen = !!cardDetailsOpen[key];
            const sizingOpen = !!cardSizingOpen[key];
            return (
              <div key={key} className={`rounded-2xl border p-4 ${getCardBgClass(cardIdx)}`}>
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.25)]'}`}>
                      <ImageIcon size={18} className={darkMode ? 'text-[#666666]' : 'text-[#999999]'} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>
                        <span className="font-['JetBrains_Mono']">{item.sku || 'New SKU'}</span> <span className={darkMode ? 'text-[#999999]' : 'text-[#666666]'}>•</span> {item.name || 'Select SKU'}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                        {block.gender} • {block.category} • {block.subCategory}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardDetailsOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${darkMode ? 'border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      {detailsOpen ? t('skuProposal.hideDetails') : t('skuProposal.showDetails')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardStoreOrderOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${darkMode ? 'border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      {cardStoreOrderOpen[key] ? t('skuProposal.hideStores') : t('skuProposal.storeOrder')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardSizingOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${darkMode ? 'border-[rgba(215,183,151,0.25)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'border-[rgba(215,183,151,0.4)] text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'}`}
                    >
                      {sizingOpen ? t('skuProposal.hideSizing') : t('skuProposal.sizing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkuRow(blockKey, idx)}
                      className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-[#999999] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]' : 'text-[#666666] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]'}`}
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
                      className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 font-['JetBrains_Mono'] ${darkMode ? 'border-[#2A9E6A] bg-[#121212] text-[#F2F2F2] focus:ring-[rgba(42,158,106,0.3)]' : 'border-[#127749] bg-white text-[#333333] focus:ring-[rgba(18,119,73,0.3)]'}`}
                    >
                      <option value="">{t('proposal.selectSku')}</option>
                      {skuCatalog.map(sku => (
                        <option key={sku.sku} value={sku.sku}>
                          {sku.sku} - {sku.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={`rounded-xl border p-3 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                    <p className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.rex')}</p>
                    <input
                      type="number"
                      value={item.rex}
                      onChange={(e) => handleNumberChange(blockKey, idx, 'rex', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm font-['JetBrains_Mono'] focus:outline-none ${
                        darkMode
                          ? 'bg-[#121212] border-[rgba(215,183,151,0.3)] text-[#F2F2F2] placeholder-[#666666] focus:ring-2 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                          : 'bg-white border-[rgba(215,183,151,0.4)] text-[#333333] focus:ring-2 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                      }`}
                    />
                  </div>
                  <div className={`rounded-xl border p-3 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                    <p className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.ttp')}</p>
                    <input
                      type="number"
                      value={item.ttp}
                      onChange={(e) => handleNumberChange(blockKey, idx, 'ttp', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm font-['JetBrains_Mono'] focus:outline-none ${
                        darkMode
                          ? 'bg-[#121212] border-[rgba(215,183,151,0.3)] text-[#F2F2F2] placeholder-[#666666] focus:ring-2 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                          : 'bg-white border-[rgba(215,183,151,0.4)] text-[#333333] focus:ring-2 focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'
                      }`}
                    />
                  </div>
                  <div className={`rounded-xl border p-3 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                    <p className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.order')}</p>
                    <div className={`mt-1 text-sm font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.order}</div>
                  </div>
                  <div className={`rounded-xl border p-3 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                    <p className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('skuProposal.totalValue')}</p>
                    <div className={`mt-1 text-sm font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(item.ttlValue)}</div>
                  </div>
                </div>

                {detailsOpen && (
                  <div className={`mt-4 rounded-xl border p-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.08)] border-[rgba(215,183,151,0.2)]'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Product type</span>
                        <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.productType}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Theme</span>
                        <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.theme}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Color</span>
                        <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.color}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Composition</span>
                        <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.composition}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Unit cost</span>
                        <div className={`font-medium font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{formatCurrency(item.unitCost)}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>SRP</span>
                        <div className={`font-medium font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(item.srp)}</div>
                      </div>
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Customer target</span>
                        <select
                          value={item.customerTarget}
                          onChange={(e) => handleSelectChange(blockKey, idx, 'customerTarget', e.target.value)}
                          className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-[#121212] border-[#2E2E2E] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'bg-white border-[rgba(215,183,151,0.3)] text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                        >
                          <option value="New">New</option>
                          <option value="Existing">Existing</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {cardStoreOrderOpen[key] && (
                  <div className={`mt-4 rounded-xl border overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.2)]'}`}>
                    <div className={`px-4 py-2 text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797] bg-[rgba(215,183,151,0.1)]' : 'text-[#8A6340] bg-[rgba(160,120,75,0.12)]'}`}>
                      Store Order
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={darkMode ? 'bg-[#121212] text-[#999999]' : 'bg-[rgba(160,120,75,0.12)] text-[#666666]'}>
                            <th className="px-3 py-2 text-left">Store</th>
                            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">ORDER</th>
                            <th className="px-3 py-2 text-right font-['JetBrains_Mono']">TTL VALUE</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>
                              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D7B797]" />REX</span>
                            </td>
                            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.rex || Math.floor((item.order || 0) / 2)}</td>
                            <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency((item.rex || Math.floor((item.order || 0) / 2)) * (item.srp || 0))}</td>
                          </tr>
                          <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>
                              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#127749]" />TTP</span>
                            </td>
                            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.ttp || Math.ceil((item.order || 0) / 2)}</td>
                            <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency((item.ttp || Math.ceil((item.order || 0) / 2)) * (item.srp || 0))}</td>
                          </tr>
                          <tr className={`border-t-2 ${darkMode ? 'border-[#D7B797]/30 bg-[rgba(215,183,151,0.05)]' : 'border-[#D7B797]/40 bg-[rgba(160,120,75,0.12)]'}`}>
                            <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{t('skuProposal.total')}</td>
                            <td className={`px-3 py-2 text-center font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.order || 0}</td>
                            <td className={`px-3 py-2 text-right font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency(item.ttlValue || (item.order || 0) * (item.srp || 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {sizingOpen && (
                  <div className={`mt-4 rounded-xl border overflow-hidden ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.2)]'}`}>
                    <div className={`px-4 py-2 text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797] bg-[rgba(215,183,151,0.1)]' : 'text-[#8A6340] bg-[rgba(160,120,75,0.12)]'}`}>
                      Sizing
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={darkMode ? 'bg-[rgba(215,183,151,0.08)] text-[#D7B797]' : 'bg-[rgba(160,120,75,0.12)] text-[#8A6340]'}>
                            <th className="px-3 py-2 text-left font-['Montserrat']">{item.productType}</th>
                            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0002</th>
                            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0004</th>
                            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0006</th>
                            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0008</th>
                            <th className="px-3 py-2 text-center font-['Montserrat']">Sum</th>
                          </tr>
                        </thead>
                        <tbody className={darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}>
                          <tr className={darkMode ? 'border-t border-[#2E2E2E]' : 'border-t border-[rgba(215,183,151,0.2)]'}>
                            <td className="px-3 py-2">% Sales mix</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">6%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">33%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">33%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">28%</td>
                            <td className="px-3 py-2 text-center font-semibold font-['JetBrains_Mono']">100%</td>
                          </tr>
                          <tr className={darkMode ? 'border-t border-[#2E2E2E]' : 'border-t border-[rgba(215,183,151,0.2)]'}>
                            <td className="px-3 py-2">% ST</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">50%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">43%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">30%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">63%</td>
                            <td className="px-3 py-2 text-center font-['JetBrains_Mono']">-</td>
                          </tr>
                          <tr className={darkMode ? 'border-t border-[#2E2E2E] bg-[rgba(215,183,151,0.08)]' : 'border-t border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.08)]'}>
                            <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Choice A</td>
                            {['s0002', 's0004', 's0006', 's0008'].map(size => (
                              <td key={size} className="px-1 py-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={getSizing(blockKey, idx).choiceA[size]}
                                  onChange={(e) => updateSizing(blockKey, idx, 'choiceA', size, e.target.value)}
                                  className={`w-10 text-center font-['JetBrains_Mono'] text-xs rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#D7B797]' : 'bg-emerald-50 border-emerald-200 text-[#8A6340]'}`}
                                />
                              </td>
                            ))}
                            <td className={`px-3 py-2 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{calculateSum(getSizing(blockKey, idx).choiceA)}</td>
                          </tr>
                          <tr className={darkMode ? 'border-t border-[#2E2E2E] bg-[rgba(42,158,106,0.08)]' : 'border-t border-[rgba(215,183,151,0.2)] bg-[rgba(18,119,73,0.03)]'}>
                            <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>Choice B</td>
                            {['s0002', 's0004', 's0006', 's0008'].map(size => (
                              <td key={size} className="px-1 py-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={getSizing(blockKey, idx).choiceB[size]}
                                  onChange={(e) => updateSizing(blockKey, idx, 'choiceB', size, e.target.value)}
                                  className={`w-10 text-center font-['JetBrains_Mono'] text-xs rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#2A9E6A]' : 'bg-emerald-50 border-emerald-200 text-[#127749]'}`}
                                />
                              </td>
                            ))}
                            <td className={`px-3 py-2 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{calculateSum(getSizing(blockKey, idx).choiceB)}</td>
                          </tr>
                          <tr className={darkMode ? 'border-t border-[#2E2E2E] bg-[rgba(42,158,106,0.05)]' : 'border-t border-[rgba(215,183,151,0.2)] bg-[rgba(18,119,73,0.02)]'}>
                            <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>Choice C</td>
                            {['s0002', 's0004', 's0006', 's0008'].map(size => (
                              <td key={size} className="px-1 py-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={getSizing(blockKey, idx).choiceC[size]}
                                  onChange={(e) => updateSizing(blockKey, idx, 'choiceC', size, e.target.value)}
                                  className={`w-10 text-center font-['JetBrains_Mono'] text-xs rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#2A9E6A]' : 'bg-emerald-50 border-emerald-200 text-[#127749]'}`}
                                />
                              </td>
                            ))}
                            <td className={`px-3 py-2 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{calculateSum(getSizing(blockKey, idx).choiceC)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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
                const blockKey = `${firstBlock.gender}_${firstBlock.category}_${firstBlock.subCategory}`;
                handleAddSkuRow(blockKey);
              }}
              className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] ${
                darkMode
                  ? 'border-[rgba(215,183,151,0.3)] hover:border-[#D7B797] hover:bg-[rgba(215,183,151,0.05)]'
                  : 'border-[rgba(215,183,151,0.4)] hover:border-[#8A6340] hover:bg-[rgba(215,183,151,0.08)]'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(215,183,151,0.2)]'
              }`}>
                <Plus size={24} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
              </div>
              <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>
                Add New SKU
              </span>
              <span className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>
                Click to add a new SKU to {filteredSkuBlocks[0]?.subCategory}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSkuBlocks.map((block) => {
            const key = `${block.gender}_${block.category}_${block.subCategory}`;
            const isCollapsed = collapsed[key];
            return (
              <div key={key} className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[rgba(215,183,151,0.2)]'}`}>
                <button
                  type="button"
                  onClick={() => handleToggle(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${
                    darkMode
                      ? 'bg-[rgba(215,183,151,0.15)] border-b border-[rgba(215,183,151,0.25)]'
                      : 'bg-[rgba(215,183,151,0.2)] border-b border-[rgba(215,183,151,0.3)]'
                  }`}
                >
                  <ChevronDown size={16} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''} ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
                  <div className="text-left">
                    <div className={`font-semibold ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{block.subCategory}</div>
                    <div className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-[#6B5B4D]'}`}>
                      {block.gender} • {block.category} • {block.items.length} SKUs
                    </div>
                  </div>
                  <div className={`ml-auto text-xs ${darkMode ? 'text-[#999999]' : 'text-[#6B5B4D]'}`}>
                    Total SRP: {formatCurrency(block.items.reduce((sum, i) => sum + i.srp, 0))}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={darkMode ? 'bg-[rgba(215,183,151,0.08)] border-b border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.12)] border-b border-[rgba(215,183,151,0.2)]'}>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Image</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>SKU</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Name</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Product type (L3)</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Theme</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Color</th>
                          <th className={`px-3 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Composition</th>
                          <th className={`px-3 py-2 text-right text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Unit cost</th>
                          <th className={`px-3 py-2 text-right text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>SRP</th>
                          <th className={`px-3 py-2 text-center text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Order</th>
                          <th className={`px-3 py-2 text-center text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Rex</th>
                          <th className={`px-3 py-2 text-center text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>TTP</th>
                          <th className={`px-3 py-2 text-right text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>TTL value</th>
                          <th className={`px-3 py-2 text-center text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Customer target</th>
                          <th className={`px-3 py-2 text-center text-xs font-semibold w-16 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.items.map((item, idx) => {
                          const rexKey = `${key}|${idx}|rex`;
                          const ttpKey = `${key}|${idx}|ttp`;
                          const isEditingRex = editingCell === rexKey;
                          const isEditingTtp = editingCell === ttpKey;
                          return (
                          <tr key={`${item.sku}_${idx}`} className={`${darkMode ? 'border-b border-[#2E2E2E]' : 'border-b border-[rgba(215,183,151,0.15)]'} ${item.isNew ? (darkMode ? 'bg-[rgba(42,158,106,0.1)]' : 'bg-[rgba(18,119,73,0.05)]') : ''}`}>
                            <td className="px-3 py-2">
                              <div className={`w-10 h-10 rounded-md border flex items-center justify-center ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.25)]'}`}>
                                <ImageIcon size={16} className={darkMode ? 'text-[#666666]' : 'text-[#999999]'} />
                              </div>
                            </td>
                            {item.isNew ? (
                              <>
                                <td colSpan={2} className="px-3 py-2">
                                  <select
                                    value={item.sku}
                                    onChange={(e) => handleSkuSelect(key, idx, e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 font-['JetBrains_Mono'] ${darkMode ? 'border-[#2A9E6A] bg-[#121212] text-[#F2F2F2] focus:ring-[rgba(42,158,106,0.3)]' : 'border-[#127749] bg-white text-[#333333] focus:ring-[rgba(18,119,73,0.3)]'}`}
                                  >
                                    <option value="">{t('proposal.selectSku')}</option>
                                    {skuCatalog.map(sku => (
                                      <option key={sku.sku} value={sku.sku}>
                                        {sku.sku} - {sku.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className={`px-3 py-2 font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.sku}</td>
                                <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>{item.name}</td>
                              </>
                            )}
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{item.productType}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{item.theme}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{item.color}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{item.composition}</td>
                            <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{formatCurrency(item.unitCost)}</td>
                            <td className={`px-3 py-2 text-right font-medium font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(item.srp)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className={`px-2.5 py-1.5 rounded-md font-semibold font-['JetBrains_Mono'] inline-block ${darkMode ? 'bg-[rgba(215,183,151,0.1)] text-[#D7B797]' : 'bg-[rgba(160,120,75,0.18)] text-[#8A6340]'}`}>
                                {item.order}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isEditingRex ? (
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleSaveEdit(rexKey)}
                                  onKeyDown={(e) => handleKeyDown(e, rexKey)}
                                  className={`w-20 px-2 py-1.5 text-center border-2 rounded-md focus:outline-none focus:ring-2 text-sm font-semibold font-['JetBrains_Mono'] ${darkMode ? 'border-[#D7B797] bg-[#121212] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)]' : 'border-[#D7B797] bg-white text-[#333333] focus:ring-[rgba(215,183,151,0.3)]'}`}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(rexKey, item.rex)}
                                  className={`px-2.5 py-1.5 rounded-md inline-flex items-center gap-1 font-['JetBrains_Mono'] transition-colors ${darkMode ? 'bg-[rgba(215,183,151,0.1)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(160,120,75,0.18)] text-[#8A6340] hover:bg-[rgba(215,183,151,0.25)]'}`}
                                  title="Edit Rex"
                                >
                                  {item.rex}
                                  <Pencil size={12} className={darkMode ? 'text-[#999999]' : 'text-[#8A6340]'} />
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isEditingTtp ? (
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleSaveEdit(ttpKey)}
                                  onKeyDown={(e) => handleKeyDown(e, ttpKey)}
                                  className={`w-20 px-2 py-1.5 text-center border-2 rounded-md focus:outline-none focus:ring-2 text-sm font-semibold font-['JetBrains_Mono'] ${darkMode ? 'border-[#D7B797] bg-[#121212] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)]' : 'border-[#D7B797] bg-white text-[#333333] focus:ring-[rgba(215,183,151,0.3)]'}`}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(ttpKey, item.ttp)}
                                  className={`px-2.5 py-1.5 rounded-md inline-flex items-center gap-1 font-['JetBrains_Mono'] transition-colors ${darkMode ? 'bg-[rgba(215,183,151,0.1)] text-[#D7B797] hover:bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(160,120,75,0.18)] text-[#8A6340] hover:bg-[rgba(215,183,151,0.25)]'}`}
                                  title="Edit TTP"
                                >
                                  {item.ttp}
                                  <Pencil size={12} className={darkMode ? 'text-[#999999]' : 'text-[#8A6340]'} />
                                </button>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>{formatCurrency(item.ttlValue)}</td>
                            <td className="px-3 py-2 text-center">
                              <select
                                value={item.customerTarget}
                                onChange={(e) => handleSelectChange(key, idx, 'customerTarget', e.target.value)}
                                className={`px-2.5 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 ${darkMode ? 'border-[#2E2E2E] bg-[#1A1A1A] text-[#F2F2F2] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]' : 'border-[rgba(215,183,151,0.3)] bg-white text-[#333333] focus:ring-[rgba(215,183,151,0.3)] focus:border-[#D7B797]'}`}
                              >
                                <option value="New">New</option>
                                <option value="Existing">Existing</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSizing(key, idx, item)}
                                  className={`p-1.5 rounded-md transition-colors ${darkMode ? 'text-[#999999] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.1)]' : 'text-[#666666] hover:text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'}`}
                                  title="Sizing"
                                >
                                  <Ruler size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSkuRow(key, idx)}
                                  className={`p-1.5 rounded-md transition-colors ${darkMode ? 'text-[#999999] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]' : 'text-[#666666] hover:text-[#F85149] hover:bg-[rgba(248,81,73,0.1)]'}`}
                                  title={t('proposal.deleteSku')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                        {/* Add new row button */}
                        <tr className={`border-t border-dashed ${darkMode ? 'border-[#2E2E2E] bg-[rgba(215,183,151,0.03)]' : 'border-[rgba(215,183,151,0.3)] bg-[rgba(215,183,151,0.03)]'}`}>
                          <td colSpan={15} className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => handleAddSkuRow(key)}
                              className={`w-full flex items-center justify-center gap-2 py-2 text-sm rounded-lg transition-colors border border-dashed ${darkMode ? 'text-[#999999] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)] border-[#2E2E2E] hover:border-[rgba(215,183,151,0.5)]' : 'text-[#666666] hover:text-[#8A6340] hover:bg-[rgba(160,120,75,0.12)] border-[rgba(215,183,151,0.3)] hover:border-[rgba(215,183,151,0.5)]'}`}
                            >
                              <Plus size={16} />
                              <span>Add new SKU</span>
                            </button>
                          </td>
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

      {/* Sizing Popup Modal */}
      {sizingPopup.open && sizingPopup.item && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${darkMode ? 'bg-[rgba(215,183,151,0.1)] border-b border-[rgba(215,183,151,0.2)]' : 'bg-[rgba(160,120,75,0.18)] border-b border-[rgba(215,183,151,0.3)]'}`}>
              <div>
                <h3 className={`text-lg font-bold font-['Montserrat'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{sizingPopup.item.productType}</h3>
                <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-[#6B5B4D]'}`}>
                  <span className="font-['JetBrains_Mono']">{sizingPopup.item.sku}</span> - {sizingPopup.item.name}
                </p>
              </div>
              <button
                onClick={handleCloseSizing}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.15)]' : 'hover:bg-[rgba(215,183,151,0.2)]'}`}
              >
                <X size={20} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
              </button>
            </div>

            {/* Sizing Table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-[rgba(215,183,151,0.2)] text-[#8A6340]'}>
                      <th className="px-4 py-3 text-left font-semibold font-['Montserrat']">{sizingPopup.item.productType}</th>
                      <th className="px-4 py-3 text-center font-semibold font-['JetBrains_Mono']">0002</th>
                      <th className="px-4 py-3 text-center font-semibold font-['JetBrains_Mono']">0004</th>
                      <th className="px-4 py-3 text-center font-semibold font-['JetBrains_Mono']">0006</th>
                      <th className="px-4 py-3 text-center font-semibold font-['JetBrains_Mono']">0008</th>
                      <th className={`px-4 py-3 text-center font-semibold font-['Montserrat'] ${darkMode ? 'bg-[rgba(215,183,151,0.2)]' : 'bg-[rgba(215,183,151,0.25)]'}`}>Sum</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}>
                    <tr className={darkMode ? 'border-b border-[#2E2E2E] bg-[#1A1A1A]' : 'border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.08)]'}>
                      <td className={`px-4 py-2.5 font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>% Sales mix</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">6%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">33%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">33%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">28%</td>
                      <td className={`px-4 py-2.5 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'bg-[rgba(215,183,151,0.08)]' : 'bg-[rgba(160,120,75,0.12)]'}`}>100%</td>
                    </tr>
                    <tr className={darkMode ? 'border-b border-[#2E2E2E]' : 'border-b border-[rgba(215,183,151,0.2)]'}>
                      <td className={`px-4 py-2.5 font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-[#333333]'}`}>% ST</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">50%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">43%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">30%</td>
                      <td className="px-4 py-2.5 text-center font-['JetBrains_Mono']">63%</td>
                      <td className={`px-4 py-2.5 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666] bg-[rgba(215,183,151,0.08)]' : 'text-[#999999] bg-[rgba(160,120,75,0.12)]'}`}>-</td>
                    </tr>
                    <tr className={darkMode ? 'border-b border-[#2E2E2E] bg-[rgba(215,183,151,0.08)]' : 'border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.12)]'}>
                      <td className={`px-4 py-2.5 font-medium ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Choice A:</td>
                      {['s0002', 's0004', 's0006', 's0008'].map(size => (
                        <td key={size} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA[size]}
                            onChange={(e) => updateSizing(sizingPopup.blockKey, sizingPopup.itemIdx, 'choiceA', size, e.target.value)}
                            className={`w-14 text-center font-['JetBrains_Mono'] text-sm rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#D7B797]' : 'bg-emerald-50 border-emerald-200 text-[#8A6340]'}`}
                          />
                        </td>
                      ))}
                      <td className={`px-4 py-2.5 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797] bg-[rgba(215,183,151,0.15)]' : 'text-[#8A6340] bg-[rgba(215,183,151,0.2)]'}`}>{calculateSum(getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA)}</td>
                    </tr>
                    <tr className={darkMode ? 'border-b border-[#2E2E2E] bg-[rgba(42,158,106,0.08)]' : 'border-b border-[rgba(215,183,151,0.2)] bg-[rgba(18,119,73,0.05)]'}>
                      <td className={`px-4 py-2.5 font-medium ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>Choice B:</td>
                      {['s0002', 's0004', 's0006', 's0008'].map(size => (
                        <td key={size} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceB[size]}
                            onChange={(e) => updateSizing(sizingPopup.blockKey, sizingPopup.itemIdx, 'choiceB', size, e.target.value)}
                            className={`w-14 text-center font-['JetBrains_Mono'] text-sm rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#2A9E6A]' : 'bg-emerald-50 border-emerald-200 text-[#127749]'}`}
                          />
                        </td>
                      ))}
                      <td className={`px-4 py-2.5 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A] bg-[rgba(42,158,106,0.15)]' : 'text-[#127749] bg-[rgba(18,119,73,0.1)]'}`}>{calculateSum(getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceB)}</td>
                    </tr>
                    <tr className={darkMode ? 'bg-[rgba(42,158,106,0.05)]' : 'bg-[rgba(18,119,73,0.03)]'}>
                      <td className={`px-4 py-2.5 font-medium ${darkMode ? 'text-[#2A9E6A]' : 'text-[#127749]'}`}>Choice C:</td>
                      {['s0002', 's0004', 's0006', 's0008'].map(size => (
                        <td key={size} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceC[size]}
                            onChange={(e) => updateSizing(sizingPopup.blockKey, sizingPopup.itemIdx, 'choiceC', size, e.target.value)}
                            className={`w-14 text-center font-['JetBrains_Mono'] text-sm rounded border py-1 focus:outline-none focus:ring-2 focus:ring-[rgba(215,183,151,0.4)] ${darkMode ? 'bg-[rgba(42,158,106,0.1)] border-[rgba(42,158,106,0.25)] text-[#2A9E6A]' : 'bg-emerald-50 border-emerald-200 text-[#127749]'}`}
                          />
                        </td>
                      ))}
                      <td className={`px-4 py-2.5 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#2A9E6A] bg-[rgba(42,158,106,0.1)]' : 'text-[#127749] bg-[rgba(18,119,73,0.08)]'}`}>{calculateSum(getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceC)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* AI Size Curve Advisor */}
              <SizeCurveAdvisor
                skuId={sizingPopup.item.id}
                category={sizingPopup.item.productType}
                storeId="all"
                userSizing={{
                  '0002': getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA.s0002 || 0,
                  '0004': getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA.s0004 || 0,
                  '0006': getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA.s0006 || 0,
                  '0008': getSizing(sizingPopup.blockKey, sizingPopup.itemIdx).choiceA.s0008 || 0,
                }}
                onApplyRecommendation={(newSizing) => {
                  ['s0002', 's0004', 's0006', 's0008'].forEach(size => {
                    const sizeCode = size.replace('s', '');
                    updateSizing(sizingPopup.blockKey, sizingPopup.itemIdx, 'choiceA', size, newSizing[sizeCode] || 0);
                  });
                }}
                darkMode={darkMode}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseSizing}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${darkMode ? 'text-[#999999] hover:bg-[rgba(215,183,151,0.1)] hover:text-[#D7B797]' : 'text-[#666666] hover:bg-[rgba(160,120,75,0.12)] hover:text-[#8A6340]'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseSizing}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${darkMode ? 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A584]' : 'bg-[#D7B797] text-[#333333] hover:bg-[#C4A584]'}`}
                >
                  Save Sizing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKUProposalScreen;
