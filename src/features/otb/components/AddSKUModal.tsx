'use client';

import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Package, ArrowLeft, ArrowRight, ShoppingCart, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/utils';
import { ProductImage } from '@/components/ui';
import CreatableSelect from '@/components/ui/CreatableSelect';
import masterDataService from '@/services/masterDataService';

interface AddSKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  subCategoryId?: string;
  blockGender?: string;
  blockCategory?: string;
  blockSubCategory?: string;
  existingSkus: string[];
  onAddSkus: (skus: any[]) => void;
  stores?: { code: string; name: string }[];
  customerTargetOptions?: string[];
  onCreateCustomerTarget?: (value: string) => void;
}

interface SkuFormData {
  order: number;
  storeQty: Record<string, number>;
  customerTarget: string;
  unitCost: number;
  composition: string;
}

const AddSKUModal = ({
  isOpen,
  onClose,
  subCategoryId,
  blockGender = '',
  blockCategory = '',
  blockSubCategory = '',
  existingSkus,
  onAddSkus,
  stores: propStores,
  customerTargetOptions = ['New', 'Existing'],
  onCreateCustomerTarget}: AddSKUModalProps) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<Record<string, SkuFormData>>({});
  const [activeSkuIndex, setActiveSkuIndex] = useState(0);

  // Fetch SKU catalog filtered by subCategoryId from API
  const [skuCatalog, setSkuCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !subCategoryId) {
      setSkuCatalog([]);
      return;
    }
    let cancelled = false;
    const fetchSkus = async () => {
      setCatalogLoading(true);
      try {
        const allItems: any[] = [];
        let page = 1;
        const pageSize = 200;
        while (true) {
          const res = await masterDataService.getSkuCatalog({ subCategoryId, page, pageSize }).catch(() => null);
          const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          allItems.push(...items);
          const totalPages = res?.meta?.totalPages || 1;
          if (page >= totalPages || items.length === 0) break;
          page++;
        }
        if (!cancelled) {
          setSkuCatalog(allItems.map((s: any) => ({
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
          })));
        }
      } catch (err) {
        console.error('Failed to fetch SKU catalog for subcategory:', err);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    fetchSkus();
    return () => { cancelled = true; };
  }, [isOpen, subCategoryId]);

  const storeList = propStores && propStores.length > 0
    ? propStores
    : [{ code: 'REX', name: 'REX' }, { code: 'TTP', name: 'TTP' }];

  // Filter by search query and exclude existing SKUs
  const filteredCatalog = useMemo(() => {
    let items = skuCatalog.filter((s: any) => !existingSkus.includes(s.sku));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s: any) =>
        (s.sku || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.color || '').toLowerCase().includes(q) ||
        (s.theme || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [skuCatalog, existingSkus, searchQuery]);

  const selectedSkuItems = useMemo(() => {
    return skuCatalog.filter((s: any) => selectedSkus.has(s.sku));
  }, [skuCatalog, selectedSkus]);

  const toggleSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const initFormData = useCallback(() => {
    const data: Record<string, SkuFormData> = {};
    selectedSkuItems.forEach((sku: any) => {
      if (!formData[sku.sku]) {
        const defaultStoreQty: Record<string, number> = {};
        storeList.forEach(s => { defaultStoreQty[s.code] = 0; });
        data[sku.sku] = {
          order: 0,
          storeQty: defaultStoreQty,
          customerTarget: 'New',
          unitCost: sku.unitCost || sku.srp || 0,
          composition: sku.composition || ''};
      } else {
        data[sku.sku] = formData[sku.sku];
      }
    });
    setFormData(data);
  }, [selectedSkuItems, formData, storeList]);

  const goToStep2 = () => {
    initFormData();
    setActiveSkuIndex(0);
    setStep(2);
  };

  const goBackToStep1 = () => {
    setStep(1);
  };

  const updateFormField = (skuCode: string, field: keyof SkuFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [skuCode]: { ...prev[skuCode], [field]: value }
    }));
  };

  const updateStoreQty = (skuCode: string, storeCode: string, qty: number) => {
    setFormData(prev => ({
      ...prev,
      [skuCode]: {
        ...prev[skuCode],
        storeQty: { ...prev[skuCode].storeQty, [storeCode]: qty }
      }
    }));
  };

  const calcTtlValue = (skuCode: string): number => {
    const fd = formData[skuCode];
    if (!fd) return 0;
    const totalQty = fd.order + Object.values(fd.storeQty).reduce((s, v) => s + v, 0);
    return totalQty * fd.unitCost;
  };

  const handleAdd = () => {
    const skusToAdd = selectedSkuItems.map((sku: any) => {
      const fd = formData[sku.sku];
      const storeQty = fd?.storeQty || {};
      const totalStoreQty = Object.values(storeQty).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      const unitCost = fd?.unitCost ?? sku.unitCost ?? 0;
      return {
        ...sku,
        order: totalStoreQty,
        storeQty,
        customerTarget: fd?.customerTarget || 'New',
        unitCost,
        composition: fd?.composition || sku.composition || '',
        ttlValue: totalStoreQty * unitCost};
    });
    onAddSkus(skusToAdd);
    setSelectedSkus(new Set());
    setSearchQuery('');
    setFormData({});
    setStep(1);
    onClose();
  };

  const handleClose = () => {
    setSelectedSkus(new Set());
    setSearchQuery('');
    setFormData({});
    setStep(1);
    setActiveSkuIndex(0);
    onClose();
  };

  if (!isOpen) return null;
  const bg ='bg-white';
  const border ='border-[#C4B5A5]';
  const borderLight ='border-[rgba(215,183,151,0.3)]';
  const textPrimary ='text-[#0A0A0A]';
  const textSecondary ='text-[#666]';
  const textMuted ='text-[#999]';
  const inputBg ='bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999]';
  const accentGreen ='bg-[rgba(18,119,73,0.12)] text-[#127749]';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={handleClose}>
      <div
        className={`w-full mx-0 md:mx-4 max-h-[100dvh] md:max-h-[85vh] h-[100dvh] md:h-auto rounded-none md:rounded-xl border shadow-2xl flex flex-col animate-scalePop ${
          step === 2 ? 'max-w-3xl' : 'max-w-lg'
        } ${bg} ${border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${borderLight} shrink-0`}>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={goBackToStep1} className={`p-1.5 rounded-lg transition-colors ${'hover:bg-gray-100 text-[#666]'}`}>
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h3 className={`font-semibold font-['Montserrat'] ${textPrimary}`}>
                {step === 1 ? (t('proposal.addSku')) : (t('proposal.skuDetails') || 'SKU Details')}
              </h3>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                {step === 1
                  ? (blockSubCategory ? `${blockGender} • ${blockCategory} • ${blockSubCategory}` : (t('proposal.selectSkus') || 'Select SKUs to add'))
                  : `${selectedSkus.size} SKU${selectedSkus.size > 1 ? 's' : ''} — ${t('proposal.fillDetails') || 'Fill in order details'}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* SKU selector dropdown — always visible in Step 2 */}
            {step === 2 && (
              <select
                value={selectedSkuItems[activeSkuIndex]?.sku || ''}
                onChange={(e) => {
                  const idx = selectedSkuItems.findIndex((s: any) => s.sku === e.target.value);
                  if (idx >= 0) setActiveSkuIndex(idx);
                }}
                className={`px-2 py-1 text-[10px] border rounded-lg font-['JetBrains_Mono'] max-w-[180px] focus:outline-none focus:ring-1 focus:ring-[#D7B797] ${inputBg}`}
              >
                {selectedSkuItems.map((s: any) => (
                  <option key={s.sku} value={s.sku}>{s.sku} - {s.name || 'Unnamed'}</option>
                ))}
              </select>
            )}
            {/* Step indicator */}
            <div className="flex items-center gap-1 mr-2">
              <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-[#2A9E6A]' : ('bg-[#C4B5A5]')}`} />
              <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-[#2A9E6A]' : ('bg-[#C4B5A5]')}`} />
            </div>
            <button onClick={handleClose} className={`p-2.5 md:p-1.5 rounded-lg transition-colors ${'hover:bg-gray-100 text-[#666]'}`}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ==================== STEP 1: Select SKUs ==================== */}
        {step === 1 && (
          <>
            {/* Search */}
            <div className={`px-4 py-2 border-b ${borderLight} shrink-0`}>
              <div className="relative">
                <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  className={`w-full pl-8 pr-3 py-2.5 md:py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D7B797] ${inputBg}`}
                  autoFocus
                />
              </div>
            </div>

            {/* SKU List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
              {catalogLoading ? (
                <div className={`text-center py-8 ${textMuted}`}>
                  <Loader2 size={32} className="mx-auto mb-2 opacity-40 animate-spin" />
                  <p className="text-xs">Loading SKUs...</p>
                </div>
              ) : !subCategoryId ? (
                <div className={`text-center py-8 ${textMuted}`}>
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold mb-1">No subcategory selected</p>
                </div>
              ) : skuCatalog.length === 0 ? (
                <div className={`text-center py-8 ${textMuted}`}>
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold mb-1">{t('proposal.noCatalogData') || 'No SKU catalog data'}</p>
                  <p className="text-[10px] opacity-70">{t('proposal.importCatalogHint') || 'Import SKU catalog via master data to add items'}</p>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className={`text-center py-8 ${textMuted}`}>
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">{searchQuery ? (t('common.noResults') || 'No results') : (t('proposal.allSkusAdded') || 'All available SKUs already added')}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCatalog.map((sku: any, idx: number) => {
                    const isSelected = selectedSkus.has(sku.sku);
                    return (
                      <button
                        key={`${sku.sku}_${idx}`}
                        type="button"
                        onClick={() => toggleSku(sku.sku)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ?'bg-[rgba(18,119,73,0.08)] border border-[#127749]/20':'hover:bg-[rgba(215,183,151,0.08)] border border-transparent'}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#2A9E6A] border-[#2A9E6A]'
                            :'border-[#C4B5A5] bg-transparent'}`}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                        <ProductImage subCategory={sku.productType || blockSubCategory} sku={sku.sku} imageUrl={sku.imageUrl} size={40} rounded="rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold truncate ${'text-[#333]'}`}>
                            <span className="font-['JetBrains_Mono']">{sku.sku}</span>
                            <span className={`mx-1.5 ${'text-[#C4B5A5]'}`}>&bull;</span>
                            {sku.name || 'Unnamed'}
                          </div>
                          <div className={`text-[10px] ${textSecondary}`}>
                            {[sku.color, sku.theme, sku.productType].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                        {sku.srp > 0 && (
                          <span className={`text-[10px] font-['JetBrains_Mono'] shrink-0 ${'text-[#6B4D30]'}`}>
                            {formatNumber(sku.srp)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Step 1 */}
            <div className={`flex items-center justify-between px-4 py-3 border-t ${borderLight} shrink-0`}>
              <span className={`text-xs ${textSecondary}`}>
                {selectedSkus.size} {t('common.of')} {filteredCatalog.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className={`px-3 py-2.5 md:py-1.5 text-xs font-semibold rounded-lg transition-colors ${'text-[#666] hover:bg-gray-100'}`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={goToStep2}
                  disabled={selectedSkus.size === 0}
                  className={`flex items-center gap-1.5 px-4 py-2.5 md:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedSkus.size > 0
                      ?'bg-[rgba(18,119,73,0.12)] text-[#127749] hover:bg-[rgba(18,119,73,0.2)]':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  {t('common.next') || 'Next'} ({selectedSkus.size})
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================== STEP 2: Fill Details (Redesigned) ==================== */}
        {step === 2 && (() => {
          const skuArr = selectedSkuItems;
          const activeSku: any = skuArr[activeSkuIndex];
          const fd = activeSku ? formData[activeSku.sku] : null;
          if (!activeSku || !fd) return null;
          const totalStoreQty = Object.values(fd.storeQty).reduce((s, v) => s + v, 0);
          const totalOrder = totalStoreQty;
          const totalValue = totalOrder * fd.unitCost;

          return (
            <>
              {/* Single-SKU detail view */}
              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-3">
                {/* SKU Header Card — Image + Info + Customer Target */}
                <div className="flex items-start gap-3">
                  <ProductImage subCategory={activeSku.productType || blockSubCategory} sku={activeSku.sku} imageUrl={activeSku.imageUrl} size={56} rounded="rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>{activeSku.sku}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${'bg-gray-100 text-gray-500'}`}>{activeSku.productType}</span>
                    </div>
                    <div className={`text-sm font-semibold mt-0.5 ${textPrimary}`}>{activeSku.name || 'Unnamed'}</div>
                    <div className={`text-[10px] mt-0.5 ${textSecondary}`}>
                      {[activeSku.color, activeSku.theme].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0 min-w-[120px]">
                    <CreatableSelect
                      value={fd.customerTarget}
                      options={customerTargetOptions}
                      onChange={(val) => updateFormField(activeSku.sku, 'customerTarget', val)}
                      onCreateOption={onCreateCustomerTarget}
                      placeholder="Target..."
                    />
                    <div className={`text-sm font-bold font-['JetBrains_Mono'] mt-1 ${'text-[#6B4D30]'}`}>
                      {formatNumber(fd.unitCost)}
                    </div>
                  </div>
                </div>

                {/* SKU Details Grid */}
                <div className={`rounded-lg border p-3 ${'border-[rgba(215,183,151,0.3)] bg-[#FAFAF8]'}`}>
                  <div className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                    {t('proposal.skuDetails') || 'SKU Details'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>SKU</span>
                      <span className={`text-[10px] font-medium font-['JetBrains_Mono'] ${textPrimary}`}>{activeSku.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.productType') || 'Product Type'}</span>
                      <span className={`text-[10px] font-medium ${textPrimary}`}>{activeSku.productType || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.productName') || 'Name'}</span>
                      <span className={`text-[10px] font-medium truncate max-w-[120px] ${textPrimary}`}>{activeSku.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.theme') || 'Theme'}</span>
                      <span className={`text-[10px] font-medium ${textPrimary}`}>{activeSku.theme || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.color') || 'Color'}</span>
                      <span className={`text-[10px] font-medium ${textPrimary}`}>{activeSku.color || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.composition') || 'Composition'}</span>
                      <span className={`text-[10px] font-medium ${textPrimary}`}>{activeSku.composition || fd.composition || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>{t('proposal.unitCost') || 'Unit Cost'}</span>
                      <span className={`text-[10px] font-medium font-['JetBrains_Mono'] ${textPrimary}`}>{formatNumber(activeSku.unitCost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-[10px] ${textMuted}`}>SRP</span>
                      <span className={`text-[10px] font-bold font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>{formatNumber(fd.unitCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Store Quantities */}
                <div>
                  <label className={`block text-[9px] uppercase tracking-wider mb-1 font-semibold ${textMuted}`}>
                    {t('proposal.storeQuantities') || 'Store Quantities'}
                  </label>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(storeList.length, 6)}, minmax(0, 1fr))` }}>
                    {storeList.map(store => (
                      <div key={store.code} className="text-center">
                        <div className={`text-[8px] font-semibold mb-0.5 ${textSecondary}`}>{store.code}</div>
                        <input
                          type="number"
                          min="0"
                          value={fd.storeQty[store.code] || ''}
                          onChange={(e) => updateStoreQty(activeSku.sku, store.code, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={`w-full px-1 py-1.5 text-xs text-center border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D7B797] font-['JetBrains_Mono'] ${inputBg}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary (replaces Composition input) */}
                <div className={`rounded-lg border p-3 ${'border-[rgba(215,183,151,0.35)] bg-[rgba(215,183,151,0.06)]'}`}>
                  <div className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                    {t('proposal.orderSummary') || 'Order Summary'}
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${textSecondary}`}>{t('proposal.totalOrder') || 'Total Order'}</span>
                    <span className={`text-lg font-bold font-['JetBrains_Mono'] ${textPrimary}`}>
                      {totalOrder} <span className={`text-[10px] font-normal ${textMuted}`}>units</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textSecondary}`}>{t('proposal.totalValue') || 'Total Value'}</span>
                    <span className={`text-xl font-bold font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>
                      {formatNumber(totalValue)}
                    </span>
                  </div>
                  {totalOrder > 0 && (
                    <p className={`text-[9px] mt-1.5 text-right font-['JetBrains_Mono'] ${textMuted}`}>
                      = {totalOrder} x {formatNumber(fd.unitCost)}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Step 2 */}
              <div className={`flex items-center justify-between px-4 py-3 border-t ${borderLight} shrink-0`}>
                <div className={`text-xs ${textSecondary}`}>
                  <ShoppingCart size={12} className="inline mr-1" />
                  {selectedSkus.size} SKU{selectedSkus.size > 1 ? 's' : ''}
                  {' · TTL: '}
                  <span className={`font-['JetBrains_Mono'] font-semibold ${'text-[#6B4D30]'}`}>
                    {formatNumber(selectedSkuItems.reduce((sum: number, sku: any) => sum + calcTtlValue(sku.sku), 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Prev/Next SKU navigation */}
                  {selectedSkuItems.length > 1 && (
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={() => setActiveSkuIndex(Math.max(0, activeSkuIndex - 1))}
                        disabled={activeSkuIndex === 0}
                        className={`p-1.5 rounded-lg transition-colors ${activeSkuIndex > 0 ? ('hover:bg-gray-100 text-[#666]') : ('text-gray-300 cursor-not-allowed')}`}
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <span className={`text-[10px] font-['JetBrains_Mono'] ${textMuted}`}>{activeSkuIndex + 1}/{selectedSkuItems.length}</span>
                      <button
                        onClick={() => setActiveSkuIndex(Math.min(selectedSkuItems.length - 1, activeSkuIndex + 1))}
                        disabled={activeSkuIndex >= selectedSkuItems.length - 1}
                        className={`p-1.5 rounded-lg transition-colors ${activeSkuIndex < selectedSkuItems.length - 1 ? ('hover:bg-gray-100 text-[#666]') : ('text-gray-300 cursor-not-allowed')}`}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={goBackToStep1}
                    className={`px-3 py-2.5 md:py-1.5 text-xs font-semibold rounded-lg transition-colors ${'text-[#666] hover:bg-gray-100'}`}
                  >
                    {t('common.back') || 'Back'}
                  </button>
                  <button
                    onClick={handleAdd}
                    className={`flex items-center gap-1.5 px-4 py-2.5 md:py-1.5 text-xs font-semibold rounded-lg transition-colors ${'bg-[rgba(18,119,73,0.12)] text-[#127749] hover:bg-[rgba(18,119,73,0.2)]'}`}
                  >
                    <Check size={14} />
                    {t('proposal.addSku')} ({selectedSkus.size})
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>,
    document.body,
  );
};

export default memo(AddSKUModal);
