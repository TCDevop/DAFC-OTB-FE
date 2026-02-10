'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, TrendingUp, Layers, Users, Tag, Info, Pencil, Filter,
  ChevronDown, Check, CheckCircle2, History, Clock, Sparkles, X,
  Calendar, User, MessageSquare, AlertCircle, CheckCircle, XCircle,
  Send, FileText, DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { GENDERS, STORES } from '../utils/constants';
import { masterDataService, planningService } from '../services';
import { useLanguage } from '@/contexts/LanguageContext';

const TABS = [
  { id: 'collection', label: 'Collection', icon: Layers },
  { id: 'gender', label: 'Gender', icon: Users },
  { id: 'category', label: 'Category', icon: Tag }
];

// Reusable editable cell component
const EditableCell = React.memo(({ cellKey, value, isEditing, editValue, onStartEdit, onSaveEdit, onChangeValue, onKeyDown, readOnly = false }) => {
  const { t } = useLanguage();
  if (isEditing && !readOnly) {
    return (
      <div className="flex items-center justify-center animate-in zoom-in duration-200">
        <input
          type="number"
          value={editValue}
          onChange={(e) => onChangeValue(e.target.value)}
          onBlur={() => onSaveEdit(cellKey)}
          onKeyDown={(e) => onKeyDown(e, cellKey)}
          className="w-20 px-2 py-1.5 text-center border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-700 font-medium transition-all"
          autoFocus
        />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg min-w-[70px] justify-center">
          <span className="text-slate-600 font-medium">{typeof value === 'number' ? value.toFixed(0) : value}%</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onStartEdit(cellKey, value)}
      className="group flex items-center justify-center gap-1 cursor-pointer"
      title={t ? t('planningDetail.clickToEdit') : 'Click to edit'}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all min-w-[70px] justify-center">
        <span className="text-slate-700 font-medium">{typeof value === 'number' ? value.toFixed(0) : value}%</span>
        <Pencil size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
});

// Approval Status Badge Component
const ApprovalStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, labelKey: 'pending' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, labelKey: 'approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, labelKey: 'rejected' },
    waiting: { bg: 'bg-slate-100', text: 'text-slate-500', icon: AlertCircle, labelKey: 'waiting' }
  };

  const config = statusConfig[status] || statusConfig.waiting;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.labelKey.charAt(0).toUpperCase() + config.labelKey.slice(1)}
    </span>
  );
};

const PlanningDetailPage = ({
  selectedBudgetDetail,
  planningDetailData,
  onBack,
  onSave
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('collection');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [localData, setLocalData] = useState({});

  // API data states
  const [categoryStructure, setCategoryStructure] = useState([]);
  const [level1Approvers, setLevel1Approvers] = useState([]);
  const [level2Approvers, setLevel2Approvers] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  // Fetch categories and planning versions from API
  useEffect(() => {
    const fetchData = async () => {
      setApiLoading(true);
      try {
        // Fetch categories from API
        const categoriesRes = await masterDataService.getCategories().catch(() => []);
        const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []);

        if (categories.length > 0) {
          // Transform API categories into categoryStructure format
          // API may return flat list or hierarchical — handle both
          const genderMap = {};
          categories.forEach(cat => {
            const genderId = (cat.gender?.id || cat.genderId || 'unknown').toLowerCase();
            const genderName = cat.gender?.name || cat.genderName || genderId;
            if (!genderMap[genderId]) {
              genderMap[genderId] = { gender: { id: genderId, name: genderName }, categories: [] };
            }
            const catId = cat.id || cat.categoryId;
            const catName = cat.name || cat.categoryName;
            let existingCat = genderMap[genderId].categories.find(c => c.id === catId);
            if (!existingCat) {
              existingCat = { id: catId, name: catName, subCategories: [] };
              genderMap[genderId].categories.push(existingCat);
            }
            if (cat.subCategories && cat.subCategories.length > 0) {
              cat.subCategories.forEach(sub => {
                if (!existingCat.subCategories.find(s => s.id === (sub.id || sub.subCategoryId))) {
                  existingCat.subCategories.push({ id: sub.id || sub.subCategoryId, name: sub.name || sub.subCategoryName });
                }
              });
            }
          });
          setCategoryStructure(Object.values(genderMap));
        }

        // Fetch planning versions if budgetDetailId available
        if (selectedBudgetDetail?.id) {
          const versionsRes = await planningService.getAll({ budgetDetailId: selectedBudgetDetail.id }).catch(() => ({ data: [] }));
          const versionsList = Array.isArray(versionsRes) ? versionsRes : (versionsRes?.data || []);
          if (versionsList.length > 0) {
            const mappedVersions = versionsList.map((v, idx) => ({
              id: v.id,
              versionNumber: v.versionNumber || idx + 1,
              createdAt: v.createdAt,
              createdBy: v.createdBy || { name: 'User', avatar: 'U' },
              data: v.data || {},
              status: v.status?.toLowerCase() || 'draft',
              approvals: v.approvals || { level1: [], level2: [] }
            }));
            setVersions(mappedVersions);

            // Extract approvers from version approval data
            const allL1 = new Map();
            const allL2 = new Map();
            mappedVersions.forEach(ver => {
              (ver.approvals?.level1 || []).forEach(a => {
                if (a.approver && !allL1.has(a.approver.id || a.approverId)) {
                  allL1.set(a.approver.id || a.approverId, {
                    id: a.approver.id || a.approverId,
                    name: a.approver.name || a.approverName || 'Approver',
                    role: a.approver.role || 'Manager',
                    avatar: (a.approver.name || 'AP').substring(0, 2).toUpperCase()
                  });
                }
              });
              (ver.approvals?.level2 || []).forEach(a => {
                if (a.approver && !allL2.has(a.approver.id || a.approverId)) {
                  allL2.set(a.approver.id || a.approverId, {
                    id: a.approver.id || a.approverId,
                    name: a.approver.name || a.approverName || 'Approver',
                    role: a.approver.role || 'Director',
                    avatar: (a.approver.name || 'AP').substring(0, 2).toUpperCase()
                  });
                }
              });
            });
            if (allL1.size > 0) setLevel1Approvers(Array.from(allL1.values()));
            if (allL2.size > 0) setLevel2Approvers(Array.from(allL2.values()));
          }
        }
      } catch (err) {
        console.error('Failed to fetch planning data:', err);
      } finally {
        setApiLoading(false);
      }
    };
    fetchData();
  }, [selectedBudgetDetail?.id]);

  // Version management states
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('draft');
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [approveAnimation, setApproveAnimation] = useState(false);

  // Category tab filters
  const [genderFilter, setGenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubCategoryDropdownOpen, setIsSubCategoryDropdownOpen] = useState(false);

  // Category hierarchy collapse states
  const [expandedGenders, setExpandedGenders] = useState({ female: true, male: true });
  const [expandedCategories, setExpandedCategories] = useState({});

  const versionDropdownRef = useRef(null);
  const genderDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const subCategoryDropdownRef = useRef(null);

  // Collection sections - defined early for useEffect
  const COLLECTION_SECTIONS = [
    { id: 'carryover', name: 'Carry Over/Commercial' },
    { id: 'seasonal', name: 'Seasonal' }
  ];

  // Initialize local data for editable cells
  useEffect(() => {
    const initialData = {};

    // Initialize Category tab data
    categoryStructure.forEach(genderGroup => {
      genderGroup.categories.forEach(cat => {
        cat.subCategories.forEach(subCat => {
          const key = `${genderGroup.gender.id}_${cat.id}_${subCat.id}`;
          initialData[key] = {
            buyPct: Math.floor(Math.random() * 15) + 1,
            salesPct: Math.floor(Math.random() * 15) + 1,
            stPct: Math.floor(Math.random() * 50) + 40,
            buyProposed: Math.floor(Math.random() * 15) + 1,
            otbProposed: Math.floor(Math.random() * 100000) + 10000,
            varPct: Math.floor(Math.random() * 10) - 5,
            otbSubmitted: Math.floor(Math.random() * 100000) + 10000,
            buyActual: Math.floor(Math.random() * 15) + 1
          };
        });
      });
    });

    // Initialize Collection tab data
    COLLECTION_SECTIONS.forEach(section => {
      STORES.forEach(store => {
        const key = `collection_${section.id}_${store.id}`;
        initialData[key] = {
          userBuyPct: Math.floor(Math.random() * 30) + 10
        };
      });
    });

    // Initialize Gender tab data
    GENDERS.forEach(gender => {
      STORES.forEach(store => {
        const key = `gender_${gender.id}_${store.id}`;
        initialData[key] = {
          userBuyPct: Math.floor(Math.random() * 30) + 10
        };
      });
    });

    setLocalData(initialData);
  }, [categoryStructure]);

  const handleStartEdit = (cellKey, currentValue) => {
    setEditingCell(cellKey);
    setEditValue(typeof currentValue === 'number' ? currentValue.toFixed(0) : currentValue.toString());
  };

  const handleSaveEdit = (cellKey) => {
    const newValue = parseFloat(editValue) || 0;

    // Determine which field to update based on the key type
    const isCollectionOrGender = cellKey.startsWith('collection_') || cellKey.startsWith('gender_');
    const fieldToUpdate = isCollectionOrGender ? 'userBuyPct' : 'buyProposed';

    setLocalData(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        [fieldToUpdate]: newValue
      }
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(event.target)) {
        setIsVersionDropdownOpen(false);
      }
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target)) {
        setIsGenderDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (subCategoryDropdownRef.current && !subCategoryDropdownRef.current.contains(event.target)) {
        setIsSubCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle approve - create new version
  const handleApprove = () => {
    const newVersion = {
      id: `v${versions.length + 1}`,
      versionNumber: versions.length + 1,
      createdAt: new Date().toISOString(),
      createdBy: { name: 'Current User', avatar: 'CU' },
      data: JSON.parse(JSON.stringify(localData)),
      status: 'pending_review',
      approvals: {
        level1: level1Approvers.map(a => ({
          approverId: a.id,
          status: 'pending',
          comment: '',
          approvedAt: null
        })),
        level2: level2Approvers.map(a => ({
          approverId: a.id,
          status: 'waiting',
          comment: '',
          approvedAt: null
        }))
      }
    };

    setVersions(prev => [...prev, newVersion]);
    setApproveAnimation(true);

    setTimeout(() => {
      setApproveAnimation(false);
      setSelectedVersion(newVersion.id);
    }, 1500);
  };

  // Check if current view is read-only
  const isReadOnly = selectedVersion !== 'draft';

  // Format date for display
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get current version data
  const currentVersion = selectedVersion === 'draft' ? null : versions.find(v => v.id === selectedVersion);

  // Get approver info by ID
  const getApproverInfo = (approverId, level) => {
    const approvers = level === 1 ? level1Approvers : level2Approvers;
    return approvers.find(a => a.id === approverId);
  };

  // Generate filter options from categoryStructure
  const filterOptions = useMemo(() => {
    const genders = [{ id: 'all', name: 'All Genders' }];
    const categories = [{ id: 'all', name: 'All Categories' }];
    const subCategories = [{ id: 'all', name: 'All Sub-Categories' }];

    categoryStructure.forEach(genderGroup => {
      genders.push({ id: genderGroup.gender.id, name: genderGroup.gender.name });
      genderGroup.categories.forEach(cat => {
        if (!categories.find(c => c.id === cat.id)) {
          categories.push({ id: cat.id, name: cat.name, genderId: genderGroup.gender.id });
        }
        cat.subCategories.forEach(subCat => {
          if (!subCategories.find(sc => sc.id === subCat.id)) {
            subCategories.push({ id: subCat.id, name: subCat.name, categoryId: cat.id, genderId: genderGroup.gender.id });
          }
        });
      });
    });

    return { genders, categories, subCategories };
  }, [categoryStructure]);

  // Get filtered categories based on gender selection
  const filteredCategoryOptions = useMemo(() => {
    if (genderFilter === 'all') return filterOptions.categories;
    return [
      { id: 'all', name: 'All Categories' },
      ...filterOptions.categories.filter(c => c.id !== 'all' && c.genderId === genderFilter)
    ];
  }, [genderFilter, filterOptions.categories]);

  // Get filtered sub-categories based on gender and category selection
  const filteredSubCategoryOptions = useMemo(() => {
    let options = filterOptions.subCategories;
    if (genderFilter !== 'all') {
      options = options.filter(sc => sc.id === 'all' || sc.genderId === genderFilter);
    }
    if (categoryFilter !== 'all') {
      options = options.filter(sc => sc.id === 'all' || sc.categoryId === categoryFilter);
    }
    return [{ id: 'all', name: 'All Sub-Categories' }, ...options.filter(o => o.id !== 'all')];
  }, [genderFilter, categoryFilter, filterOptions.subCategories]);

  // Reset dependent filters when parent filter changes
  const handleGenderFilterChange = (value) => {
    setGenderFilter(value);
    setCategoryFilter('all');
    setSubCategoryFilter('all');
    setIsGenderDropdownOpen(false);
  };

  const handleCategoryFilterChange = (value) => {
    setCategoryFilter(value);
    setSubCategoryFilter('all');
    setIsCategoryDropdownOpen(false);
  };

  const handleSubCategoryFilterChange = (value) => {
    setSubCategoryFilter(value);
    setIsSubCategoryDropdownOpen(false);
  };

  // Toggle expanded state for hierarchy
  const toggleGenderExpanded = (genderId) => {
    setExpandedGenders(prev => ({ ...prev, [genderId]: !prev[genderId] }));
  };

  const toggleCategoryExpanded = (genderId, categoryId) => {
    const key = `${genderId}_${categoryId}`;
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate totals for entire data
  const grandTotals = useMemo(() => {
    if (!planningDetailData || planningDetailData.length === 0) {
      return { buyPct: 0, salesPct: 0, userBuyPct: 0, otbValue: 0 };
    }

    const buyPct = planningDetailData.reduce((sum, item) => sum + item.systemBuyPct, 0);
    const salesPct = planningDetailData.reduce((sum, item) => sum + item.lastSeasonSalesPct, 0);
    const userBuyPct = planningDetailData.reduce((sum, item) => sum + item.userBuyPct, 0);
    const otbValue = planningDetailData.reduce((sum, item) => sum + item.otbValue, 0);

    return { buyPct, salesPct, userBuyPct, otbValue };
  }, [planningDetailData]);

  // Common table styles - DAFC Design System warm beige
  const headerClass = "bg-gradient-to-r from-[rgba(160,120,75,0.35)] to-[rgba(160,120,75,0.22)] text-[#5C4A32]";
  const headerCellClass = "px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide";
  const groupRowClass = "bg-gradient-to-r from-[rgba(160,120,75,0.18)] to-[rgba(160,120,75,0.1)] border-l-4 border-[#D7B797]";
  const sumRowClass = "bg-gradient-to-r from-[rgba(160,120,75,0.28)] to-[rgba(160,120,75,0.22)] text-[#5C4A32] font-semibold";

  // Render Collection Tab
  const renderCollectionTab = () => {
    const collectionData = COLLECTION_SECTIONS.map((section, sectionIdx) => {
      const items = planningDetailData.filter((_, idx) =>
        sectionIdx === 0 ? idx % 2 === 0 : idx % 2 === 1
      );

      const storeData = STORES.map(store => {
        const storeItems = items.filter((_, idx) =>
          store.id === 'rex' ? idx % 2 === 0 : idx % 2 === 1
        );

        const buyPct = storeItems.reduce((sum, item) => sum + item.systemBuyPct, 0) / (storeItems.length || 1);
        const salesPct = storeItems.reduce((sum, item) => sum + item.lastSeasonSalesPct, 0) / (storeItems.length || 1);
        const stPct = Math.random() * 30 + 40;
        const moc = Math.random() * 5 + 2;
        const userBuyPct = storeItems.reduce((sum, item) => sum + item.userBuyPct, 0) / (storeItems.length || 1);
        const otbValue = storeItems.reduce((sum, item) => sum + item.otbValue, 0);
        const variance = userBuyPct - salesPct;

        return { store, buyPct, salesPct, stPct, moc, userBuyPct, otbValue, variance };
      });

      return { section, storeData };
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={headerClass}>
              <th className={`${headerCellClass} text-left min-w-[200px]`}>{t('planningDetail.collection')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctBuy')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctSales')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctST')}</th>
              <th className={headerCellClass}>{t('planningDetail.moc')}</th>
              <th className={`${headerCellClass} bg-[rgba(160,120,75,0.35)]`}>{t('planningDetail.pctBuyProposed')}</th>
              <th className={headerCellClass}>{t('planningDetail.otbProposed')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctVarVsLastSeason')}</th>
            </tr>
          </thead>
          <tbody>
            {collectionData.map((colData) => (
              <React.Fragment key={`col-${colData.section.id}`}>
                <tr className={groupRowClass}>
                  <td className="px-4 py-3" colSpan={8}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{colData.section.name}</span>
                      <Info size={14} className="text-slate-400" />
                    </div>
                  </td>
                </tr>

                {colData.storeData.map((storeRow) => {
                  const cellKey = `collection_${colData.section.id}_${storeRow.store.id}`;
                  const isEditing = editingCell === cellKey;
                  const cellData = localData[cellKey] || {};
                  const userBuyPctValue = cellData.userBuyPct ?? storeRow.userBuyPct;
                  const variance = userBuyPctValue - storeRow.salesPct;

                  return (
                    <tr
                      key={cellKey}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 pl-8">
                        <span className="text-slate-600">{storeRow.store.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.buyPct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.salesPct.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.stPct.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.moc.toFixed(1)}</td>
                      <td className={`px-4 py-3 ${isReadOnly ? 'bg-[rgba(160,120,75,0.1)]' : 'bg-[rgba(160,120,75,0.18)]'}`}>
                        <EditableCell
                          cellKey={cellKey}
                          value={userBuyPctValue}
                          isEditing={isEditing}
                          editValue={editValue}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onChangeValue={setEditValue}
                          onKeyDown={handleKeyDown}
                          readOnly={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{formatCurrency(storeRow.otbValue)}</td>
                      <td className={`px-4 py-3 text-center font-medium ${
                        variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            <tr className={sumRowClass}>
              <td className="px-4 py-4 font-bold">{t('planningDetail.sum')}</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">-</td>
              <td className="px-4 py-4 text-center">-</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">{formatCurrency(grandTotals.otbValue)}</td>
              <td className="px-4 py-4 text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render Gender Tab
  const renderGenderTab = () => {
    const genderData = GENDERS.map(gen => {
      const items = planningDetailData.filter(item => item.genderId === gen.id);

      const storeData = STORES.map(store => {
        const storeItems = items.filter((_, idx) =>
          store.id === 'rex' ? idx % 2 === 0 : idx % 2 === 1
        );

        const buyPct = storeItems.reduce((sum, item) => sum + item.systemBuyPct, 0) / (storeItems.length || 1);
        const salesPct = storeItems.reduce((sum, item) => sum + item.lastSeasonSalesPct, 0) / (storeItems.length || 1);
        const stPct = Math.random() * 30 + 40;
        const userBuyPct = storeItems.reduce((sum, item) => sum + item.userBuyPct, 0) / (storeItems.length || 1);
        const otbValue = storeItems.reduce((sum, item) => sum + item.otbValue, 0);
        const variance = userBuyPct - salesPct;

        return { store, buyPct, salesPct, stPct, userBuyPct, otbValue, variance };
      });

      return { gender: gen, storeData };
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={headerClass}>
              <th className={`${headerCellClass} text-left min-w-[200px]`}>{t('planningDetail.gender')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctBuy')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctSales')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctST')}</th>
              <th className={`${headerCellClass} bg-[rgba(160,120,75,0.35)]`}>{t('planningDetail.pctBuyProposed')}</th>
              <th className={headerCellClass}>{t('planningDetail.otbProposed')}</th>
              <th className={headerCellClass}>{t('planningDetail.pctVarVsLastSeason')}</th>
            </tr>
          </thead>
          <tbody>
            {genderData.map((genData) => (
              <React.Fragment key={`gen-${genData.gender.id}`}>
                <tr className={groupRowClass}>
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{genData.gender.name}</span>
                      <Info size={14} className="text-slate-400" />
                    </div>
                  </td>
                </tr>

                {genData.storeData.map((storeRow) => {
                  const cellKey = `gender_${genData.gender.id}_${storeRow.store.id}`;
                  const isEditing = editingCell === cellKey;
                  const cellData = localData[cellKey] || {};
                  const userBuyPctValue = cellData.userBuyPct ?? storeRow.userBuyPct;
                  const variance = userBuyPctValue - storeRow.salesPct;

                  return (
                    <tr
                      key={cellKey}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 pl-8">
                        <span className="text-slate-600">{storeRow.store.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.buyPct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.salesPct.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center text-slate-600">{storeRow.stPct.toFixed(0)}%</td>
                      <td className={`px-4 py-3 ${isReadOnly ? 'bg-[rgba(160,120,75,0.1)]' : 'bg-[rgba(160,120,75,0.18)]'}`}>
                        <EditableCell
                          cellKey={cellKey}
                          value={userBuyPctValue}
                          isEditing={isEditing}
                          editValue={editValue}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onChangeValue={setEditValue}
                          onKeyDown={handleKeyDown}
                          readOnly={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{formatCurrency(storeRow.otbValue)}</td>
                      <td className={`px-4 py-3 text-center font-medium ${
                        variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            <tr className={sumRowClass}>
              <td className="px-4 py-4 font-bold">{t('planningDetail.sum')}</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">-</td>
              <td className="px-4 py-4 text-center">100%</td>
              <td className="px-4 py-4 text-center">{formatCurrency(grandTotals.otbValue)}</td>
              <td className="px-4 py-4 text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render Category Tab - Hierarchical Collapsible
  const renderCategoryTab = () => {
    const calculateGenderTotals = (genderGroup) => {
      let totals = { buyPct: 0, salesPct: 0, stPct: 0, buyProposed: 0, otbProposed: 0, varPct: 0, otbSubmitted: 0, buyActual: 0 };
      genderGroup.categories.forEach(cat => {
        cat.subCategories.forEach(subCat => {
          const key = `${genderGroup.gender.id}_${cat.id}_${subCat.id}`;
          const data = localData[key] || {};
          totals.buyPct += data.buyPct || 0;
          totals.salesPct += data.salesPct || 0;
          totals.buyProposed += data.buyProposed || 0;
          totals.otbProposed += data.otbProposed || 0;
          totals.otbSubmitted += data.otbSubmitted || 0;
          totals.buyActual += data.buyActual || 0;
        });
      });
      totals.stPct = 90;
      totals.varPct = totals.buyProposed - totals.salesPct;
      return totals;
    };

    const calculateCategoryTotals = (genderId, cat) => {
      let totals = { buyPct: 0, salesPct: 0, stPct: 0, buyProposed: 0, otbProposed: 0, varPct: 0, otbSubmitted: 0, buyActual: 0 };
      cat.subCategories.forEach(subCat => {
        const key = `${genderId}_${cat.id}_${subCat.id}`;
        const data = localData[key] || {};
        totals.buyPct += data.buyPct || 0;
        totals.salesPct += data.salesPct || 0;
        totals.buyProposed += data.buyProposed || 0;
        totals.otbProposed += data.otbProposed || 0;
        totals.otbSubmitted += data.otbSubmitted || 0;
        totals.buyActual += data.buyActual || 0;
      });
      totals.stPct = 47;
      totals.varPct = totals.buyProposed - totals.salesPct;
      return totals;
    };

    const filteredData = categoryStructure.filter(genderGroup => {
      if (genderFilter !== 'all' && genderGroup.gender.id !== genderFilter) return false;
      return true;
    }).map(genderGroup => ({
      ...genderGroup,
      categories: genderGroup.categories.filter(cat => {
        if (categoryFilter !== 'all' && cat.id !== categoryFilter) return false;
        return true;
      }).map(cat => ({
        ...cat,
        subCategories: cat.subCategories.filter(subCat => {
          if (subCategoryFilter !== 'all' && subCat.id !== subCategoryFilter) return false;
          return true;
        })
      })).filter(cat => cat.subCategories.length > 0)
    })).filter(genderGroup => genderGroup.categories.length > 0);

    const getSelectedLabel = (options, value) => {
      const option = options.find(o => o.id === value);
      return option ? option.name : 'Select...';
    };

    return (
      <div className="p-4 space-y-3">
        {/* Filter Section */}
        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter size={16} />
              <span className="font-medium text-sm">{t('planningDetail.filters')}</span>
            </div>

            {/* Gender Filter */}
            <div className="relative" ref={genderDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsGenderDropdownOpen(!isGenderDropdownOpen);
                  setIsCategoryDropdownOpen(false);
                  setIsSubCategoryDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-pink-300 transition-all min-w-[150px]"
              >
                <Users size={14} className="text-pink-500" />
                <span className="text-sm font-medium text-slate-700 flex-1 text-left truncate">
                  {getSelectedLabel(filterOptions.genders, genderFilter)}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isGenderDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGenderDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {filterOptions.genders.map(option => (
                    <div
                      key={option.id}
                      onClick={() => handleGenderFilterChange(option.id)}
                      className="px-4 py-2.5 flex items-center gap-2 hover:bg-pink-50 cursor-pointer transition-colors"
                    >
                      <span className={`text-sm ${genderFilter === option.id ? 'text-pink-600 font-semibold' : 'text-slate-700'}`}>
                        {option.name}
                      </span>
                      {genderFilter === option.id && <Check size={14} className="text-pink-500 ml-auto" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                  setIsGenderDropdownOpen(false);
                  setIsSubCategoryDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-violet-300 transition-all min-w-[180px]"
              >
                <Tag size={14} className="text-violet-500" />
                <span className="text-sm font-medium text-slate-700 flex-1 text-left truncate">
                  {getSelectedLabel(filterOptions.categories, categoryFilter)}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-[300px] overflow-y-auto">
                  {filteredCategoryOptions.map(option => (
                    <div
                      key={option.id}
                      onClick={() => handleCategoryFilterChange(option.id)}
                      className="px-4 py-2.5 flex items-center gap-2 hover:bg-violet-50 cursor-pointer transition-colors"
                    >
                      <span className={`text-sm ${categoryFilter === option.id ? 'text-violet-600 font-semibold' : 'text-slate-700'}`}>
                        {option.name}
                      </span>
                      {categoryFilter === option.id && <Check size={14} className="text-violet-500 ml-auto" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Category Filter */}
            <div className="relative" ref={subCategoryDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubCategoryDropdownOpen(!isSubCategoryDropdownOpen);
                  setIsGenderDropdownOpen(false);
                  setIsCategoryDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-emerald-300 transition-all min-w-[180px]"
              >
                <Layers size={14} className="text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 flex-1 text-left truncate">
                  {getSelectedLabel(filterOptions.subCategories, subCategoryFilter)}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSubCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSubCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-[300px] overflow-y-auto">
                  {filteredSubCategoryOptions.map(option => (
                    <div
                      key={option.id}
                      onClick={() => handleSubCategoryFilterChange(option.id)}
                      className="px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 cursor-pointer transition-colors"
                    >
                      <span className={`text-sm ${subCategoryFilter === option.id ? 'text-emerald-600 font-semibold' : 'text-slate-700'}`}>
                        {option.name}
                      </span>
                      {subCategoryFilter === option.id && <Check size={14} className="text-emerald-500 ml-auto" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(genderFilter !== 'all' || categoryFilter !== 'all' || subCategoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setGenderFilter('all');
                  setCategoryFilter('all');
                  setSubCategoryFilter('all');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg text-sm font-medium"
              >
                <X size={14} />
                {t('common.clearAll')}
              </button>
            )}
          </div>
        </div>

        {/* Hierarchical Content */}
        {filteredData.map((genderGroup) => {
          const genderTotals = calculateGenderTotals(genderGroup);
          const isGenderExpanded = expandedGenders[genderGroup.gender.id];
          const isFemale = genderGroup.gender.id === 'female';

          return (
            <div key={genderGroup.gender.id} className="rounded-xl border-2 border-slate-200 overflow-hidden">
              {/* Gender Header - Level 1 */}
              <div
                onClick={() => toggleGenderExpanded(genderGroup.gender.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                  isFemale
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                    : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600'
                }`}
              >
                <button className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <ChevronDown
                    size={18}
                    className={`text-white transition-transform duration-200 ${isGenderExpanded ? '' : '-rotate-90'}`}
                  />
                </button>
                <Users size={18} className="text-white" />
                <span className="font-bold text-white text-lg">{genderGroup.gender.name}</span>
                <span className="ml-auto text-white/80 text-sm">
                  {genderGroup.categories.length} {t('planningDetail.category').toLowerCase()}
                </span>
                <div className="flex items-center gap-4 ml-4 text-white/90 text-sm">
                  <span>Buy: <strong>{genderTotals.buyPct}%</strong></span>
                  <span>Sales: <strong>{genderTotals.salesPct}%</strong></span>
                  <span>OTB: <strong>{genderTotals.otbProposed.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Gender Content */}
              {isGenderExpanded && (
                <div className="p-3 space-y-2 bg-slate-50">
                  {genderGroup.categories.map((cat, catIdx) => {
                    const catKey = `${genderGroup.gender.id}_${cat.id}`;
                    const isCatExpanded = expandedCategories[catKey] !== false;
                    const catTotals = calculateCategoryTotals(genderGroup.gender.id, cat);

                    return (
                      <div key={cat.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                        {/* Category Header - Level 2 */}
                        <div
                          onClick={() => toggleCategoryExpanded(genderGroup.gender.id, cat.id)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all ${
                            catIdx % 2 === 0
                              ? 'bg-gradient-to-r from-violet-100 to-purple-50 hover:from-violet-200 hover:to-purple-100'
                              : 'bg-gradient-to-r from-amber-100 to-orange-50 hover:from-amber-200 hover:to-orange-100'
                          }`}
                        >
                          <button className={`p-1 rounded-lg transition-colors ${
                            catIdx % 2 === 0 ? 'bg-violet-200/50 hover:bg-violet-200' : 'bg-amber-200/50 hover:bg-amber-200'
                          }`}>
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${
                                catIdx % 2 === 0 ? 'text-violet-600' : 'text-amber-600'
                              } ${isCatExpanded ? '' : '-rotate-90'}`}
                            />
                          </button>
                          <Tag size={16} className={catIdx % 2 === 0 ? 'text-violet-600' : 'text-amber-600'} />
                          <span className={`font-semibold ${catIdx % 2 === 0 ? 'text-violet-800' : 'text-amber-800'}`}>
                            {cat.name}
                          </span>
                          <span className="ml-auto text-slate-500 text-sm">
                            {cat.subCategories.length} {t('planningDetail.subCategory').toLowerCase()}
                          </span>
                          <div className="flex items-center gap-4 ml-4 text-slate-600 text-sm">
                            <span>Buy: <strong>{catTotals.buyPct}%</strong></span>
                            <span>Proposed: <strong>{catTotals.buyProposed}%</strong></span>
                            <span>OTB: <strong>{catTotals.otbProposed.toLocaleString()}</strong></span>
                          </div>
                        </div>

                        {/* Sub-Categories Table - Level 3 */}
                        {isCatExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-[rgba(160,120,75,0.18)] border-b border-[rgba(160,120,75,0.25)]">
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.subCategory')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.pctBuy')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.pctSales')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.pctST')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#8A6340] uppercase bg-[rgba(160,120,75,0.28)]">{t('planningDetail.pctProposed')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.dollarOtbProposed')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.pctVar2025_2026')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.otbSubmitted')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-[#666666] uppercase">{t('planningDetail.pctBuyActual')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.subCategories.map((subCat, subIdx) => {
                                  const cellKey = `${genderGroup.gender.id}_${cat.id}_${subCat.id}`;
                                  const rowData = localData[cellKey] || {};
                                  const isEditing = editingCell === cellKey;

                                  return (
                                    <tr
                                      key={subCat.id}
                                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                                        subIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                      }`}
                                    >
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                          <span className="text-slate-700">{subCat.name}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-slate-600">{rowData.buyPct || 0}%</td>
                                      <td className="px-3 py-2.5 text-center text-slate-600">{rowData.salesPct || 0}%</td>
                                      <td className="px-3 py-2.5 text-center text-slate-600">{rowData.stPct || 0}%</td>
                                      <td className={`px-3 py-2.5 ${isReadOnly ? 'bg-[rgba(160,120,75,0.1)]' : 'bg-[rgba(160,120,75,0.18)]'}`}>
                                        <EditableCell
                                          cellKey={cellKey}
                                          value={rowData.buyProposed || 0}
                                          isEditing={isEditing}
                                          editValue={editValue}
                                          onStartEdit={handleStartEdit}
                                          onSaveEdit={handleSaveEdit}
                                          onChangeValue={setEditValue}
                                          onKeyDown={handleKeyDown}
                                          readOnly={isReadOnly}
                                        />
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-slate-700 font-medium">
                                        {(rowData.otbProposed || 0).toLocaleString()}
                                      </td>
                                      <td className={`px-3 py-2.5 text-center font-medium ${
                                        (rowData.varPct || 0) < 0 ? 'text-red-600' : 'text-emerald-600'
                                      }`}>
                                        {(rowData.varPct || 0) > 0 ? '+' : ''}{rowData.varPct || 0}%
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-slate-600">
                                        {(rowData.otbSubmitted || 0).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-slate-600">{rowData.buyActual || 0}%</td>
                                    </tr>
                                  );
                                })}
                                {/* Category Subtotal Row */}
                                <tr className="bg-gradient-to-r from-[rgba(160,120,75,0.28)] to-[rgba(160,120,75,0.18)] font-medium">
                                  <td className="px-4 py-2 text-[#5C4A32] font-semibold">{t('planningDetail.subtotal')}</td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32]">{catTotals.buyPct}%</td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32]">{catTotals.salesPct}%</td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32]">{catTotals.stPct}%</td>
                                  <td className="px-3 py-2 text-center text-[#8A6340] bg-[rgba(160,120,75,0.22)] font-bold">{catTotals.buyProposed}%</td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32] font-bold">{catTotals.otbProposed.toLocaleString()}</td>
                                  <td className={`px-3 py-2 text-center font-bold ${
                                    catTotals.varPct < 0 ? 'text-red-600' : 'text-[#5C4A32]'
                                  }`}>
                                    {catTotals.varPct > 0 ? '+' : ''}{catTotals.varPct}%
                                  </td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32]">{catTotals.otbSubmitted.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-center text-[#5C4A32]">{catTotals.buyActual}%</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Gender Total */}
                  <div className={`rounded-xl p-3 ${
                    isFemale
                      ? 'bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-200'
                      : 'bg-gradient-to-r from-sky-100 to-blue-100 border border-sky-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isFemale ? 'text-pink-800' : 'text-sky-800'}`}>
                        {t('planningDetail.total')} {genderGroup.gender.name.toUpperCase()}
                      </span>
                      <div className={`flex items-center gap-6 text-sm ${isFemale ? 'text-pink-700' : 'text-sky-700'}`}>
                        <span>% Buy: <strong>{genderTotals.buyPct}%</strong></span>
                        <span>% Sales: <strong>{genderTotals.salesPct}%</strong></span>
                        <span>% ST: <strong>{genderTotals.stPct}%</strong></span>
                        <span>% Proposed: <strong>{genderTotals.buyProposed}%</strong></span>
                        <span>$ OTB: <strong>{genderTotals.otbProposed.toLocaleString()}</strong></span>
                        <span className={genderTotals.varPct < 0 ? 'text-red-600' : ''}>
                          Var: <strong>{genderTotals.varPct > 0 ? '+' : ''}{genderTotals.varPct}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Approval History Section
  const renderApprovalHistory = () => {
    if (!currentVersion) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FileText size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">{t('planningDetail.noApprovedVersions')}</p>
          <p className="text-sm">{t('planningDetail.editHint')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
        {/* Version Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-blue-800">{t('common.version')} {currentVersion.versionNumber}</h4>
              <p className="text-sm text-blue-600">{formatDate(currentVersion.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <User size={14} />
            <span>{t('budget.createdBy')}: <strong>{currentVersion.createdBy.name}</strong></span>
          </div>
        </div>

        {/* Level 1 Approvers */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} />
              {t('planningDetail.approve')} L1
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {currentVersion.approvals.level1.map((approval, idx) => {
              const approver = getApproverInfo(approval.approverId, 1);
              return (
                <div
                  key={approval.approverId}
                  className="p-4 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {approver?.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-semibold text-slate-800">{approver?.name}</span>
                          <span className="text-sm text-slate-500 ml-2">({approver?.role})</span>
                        </div>
                        <ApprovalStatusBadge status={approval.status} />
                      </div>
                      {approval.approvedAt && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                          <Calendar size={12} />
                          {formatDate(approval.approvedAt)}
                        </div>
                      )}
                      {approval.comment && (
                        <div className="bg-slate-100 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <MessageSquare size={14} className="text-slate-400 mt-0.5" />
                            <p className="text-sm text-slate-600 italic">"{approval.comment}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level 2 Approvers */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} />
              {t('planningDetail.approve')} L2
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {currentVersion.approvals.level2.map((approval, idx) => {
              const approver = getApproverInfo(approval.approverId, 2);
              return (
                <div
                  key={approval.approverId}
                  className="p-4 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${(idx + 2) * 100}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {approver?.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-semibold text-slate-800">{approver?.name}</span>
                          <span className="text-sm text-slate-500 ml-2">({approver?.role})</span>
                        </div>
                        <ApprovalStatusBadge status={approval.status} />
                      </div>
                      {approval.approvedAt && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                          <Calendar size={12} />
                          {formatDate(approval.approvedAt)}
                        </div>
                      )}
                      {approval.comment && (
                        <div className="bg-slate-100 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <MessageSquare size={14} className="text-slate-400 mt-0.5" />
                            <p className="text-sm text-slate-600 italic">"{approval.comment}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!selectedBudgetDetail) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 shadow-xl relative z-50">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl"></div>
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="relative flex items-center justify-between">
          {/* Left - Back & Title */}
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all duration-300"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <TrendingUp size={28} className="animate-pulse" />
                {t('planningDetail.title')}
              </h1>
              <p className="text-blue-100 mt-1">
                {selectedBudgetDetail.budget?.groupBrandName} - {selectedBudgetDetail.budget?.seasonGroupId} {selectedBudgetDetail.budget?.seasonName}
              </p>
            </div>
          </div>

          {/* Center - Budget Info */}
          <div className="flex items-center gap-8">
            <div className="text-center px-6 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-blue-100 uppercase tracking-wide">{t('planningDetail.totalBudget')}</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(selectedBudgetDetail.budget?.totalBudget || 0)}
              </div>
            </div>
            <div className="text-center px-6 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-blue-100 uppercase tracking-wide">{t('planningDetail.allocated')}</div>
              <div className="text-2xl font-bold text-emerald-300">
                {formatCurrency(grandTotals.otbValue)}
              </div>
            </div>
          </div>

          {/* Right - Version Dropdown */}
          <div className="relative" ref={versionDropdownRef}>
            <button
              type="button"
              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedVersion === 'draft'
                  ? 'bg-amber-400 text-amber-900 hover:bg-amber-300 shadow-lg shadow-amber-500/30'
                  : 'bg-emerald-400 text-emerald-900 hover:bg-emerald-300 shadow-lg shadow-emerald-500/30'
              }`}
            >
              {selectedVersion === 'draft' ? (
                <>
                  <Sparkles size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                  <span>{t('planningDetail.draftEditing')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t('common.version')} {versions.find(v => v.id === selectedVersion)?.versionNumber}</span>
                </>
              )}
              <ChevronDown size={18} className={`transition-transform duration-200 ${isVersionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isVersionDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-slate-200 rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                {/* Draft Option */}
                <div
                  onClick={() => {
                    setSelectedVersion('draft');
                    setIsVersionDropdownOpen(false);
                  }}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:pl-6 ${
                    selectedVersion === 'draft'
                      ? 'bg-amber-50 border-l-4 border-amber-400'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedVersion === 'draft' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Sparkles size={18} className={selectedVersion === 'draft' ? 'text-amber-600' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${selectedVersion === 'draft' ? 'text-amber-700' : 'text-slate-700'}`}>
                      {t('planningDetail.draftCurrent')}
                    </div>
                    <div className="text-xs text-slate-500">{t('planningDetail.editableVersion')}</div>
                  </div>
                  {selectedVersion === 'draft' && <Check size={20} className="text-amber-500" />}
                </div>

                {/* Divider */}
                {versions.length > 0 && (
                  <div className="px-4 py-2 bg-slate-100 border-y border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                      <History size={14} />
                      {t('planningDetail.approvedVersions')} ({versions.length})
                    </span>
                  </div>
                )}

                {/* Version List */}
                <div className="max-h-[250px] overflow-y-auto">
                  {versions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('planningDetail.noApprovedVersions')}</p>
                    </div>
                  ) : (
                    versions.slice().reverse().map((version, idx) => (
                      <div
                        key={version.id}
                        onClick={() => {
                          setSelectedVersion(version.id);
                          setIsVersionDropdownOpen(false);
                        }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:pl-6 ${
                          selectedVersion === version.id
                            ? 'bg-emerald-50 border-l-4 border-emerald-400'
                            : 'hover:bg-slate-50'
                        }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className={`p-2 rounded-lg ${selectedVersion === version.id ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          <CheckCircle2 size={18} className={selectedVersion === version.id ? 'text-emerald-600' : 'text-slate-500'} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${selectedVersion === version.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {t('common.version')} {version.versionNumber}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(version.createdAt)}
                          </div>
                        </div>
                        {selectedVersion === version.id && <Check size={20} className="text-emerald-500" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-only indicator */}
      {isReadOnly && (
        <div className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center gap-3 text-sm font-medium animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={18} />
          <span>{t('planningDetail.viewingApprovedVersion').replace('{{version}}', versions.find(v => v.id === selectedVersion)?.versionNumber)}</span>
          <button
            onClick={() => setSelectedVersion('draft')}
            className="ml-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200"
          >
            {t('planningDetail.switchToDraft')}
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6 p-6 relative z-10 overflow-hidden">
        {/* Left - Tabs & Table Content */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-6 bg-slate-50">
            <div className="flex gap-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 text-blue-600 bg-white -mb-px rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint for editable cells */}
          {!isReadOnly && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-sm text-blue-600">
              <Pencil size={14} className="animate-bounce" style={{ animationDuration: '2s' }} />
              <span>{t('planningDetail.editHint')}</span>
            </div>
          )}

          {/* Content */}
          <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
            {activeTab === 'collection' && renderCollectionTab()}
            {activeTab === 'gender' && renderGenderTab()}
            {activeTab === 'category' && renderCategoryTab()}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-6">
              {versions.length > 0 && (
                <div className="text-sm">
                  <span className="text-slate-500">{t('planningDetail.versions')}</span>
                  <span className="ml-2 font-bold text-purple-600">{versions.length} {t('planningDetail.approved')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Approve Button - only show when in draft mode */}
              {!isReadOnly && (
                <button
                  onClick={handleApprove}
                  disabled={approveAnimation}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 relative overflow-hidden ${
                    approveAnimation
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20 hover:shadow-xl'
                  }`}
                >
                  {approveAnimation ? (
                    <>
                      <CheckCircle2 size={18} className="animate-bounce" />
                      <span>{t('planningDetail.versionCreated').replace('{{version}}', versions.length)}</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>{t('ticketDetail.submit')}</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onSave}
                disabled={isReadOnly}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg ${
                  isReadOnly
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 hover:shadow-xl'
                }`}
              >
                <Save size={18} />
                {t('planningDetail.savePlanning')}
              </button>
            </div>
          </div>
        </div>

        {/* Right - Approval History */}
        <div className="w-96 shrink-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 flex items-center gap-3">
            <History size={20} className="text-white" />
            <h3 className="font-bold text-white">{t('ticketDetail.approvalHistory')}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-280px)]">
            {renderApprovalHistory()}
          </div>
        </div>
      </div>

      {/* Approve Success Overlay Animation */}
      {approveAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/30">
          <div className="animate-in zoom-in duration-300 bg-emerald-500 text-white px-10 py-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 size={50} />
            </div>
            <div className="text-2xl font-bold">{t('planningDetail.versionCreated').replace('{{version}}', versions.length)}</div>
            <div className="text-emerald-100">{t('planningDetail.planningDataSaved')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningDetailPage;
