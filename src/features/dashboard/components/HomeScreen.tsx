'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Crown,
  ChevronDown,
  RefreshCcw,
  DollarSign,
  Target,
  Percent,
  ShoppingCart,
  Building2,
  Boxes,
  ClipboardCheck,
  BarChart3,
  Bell,
  TrendingUp,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { budgetService, masterDataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import KPIDetailModal from '@/components/ui/KPIDetailModal';
import { FilterChips, useBottomSheet, FilterBottomSheet } from '@/components/mobile';
import { useIsMobile } from '@/hooks/useIsMobile';

const STAT_ACCENTS = {
  gold:    { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.18)', darkMid: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(160,120,70,0.38)', lightMid: 'rgba(180,140,95,0.16)', iconDark: 'rgba(215,183,151,0.12)', iconLight: 'rgba(140,100,55,0.26)', glowDark: 'rgba(215,183,151,0.15)', glowLight: 'rgba(160,120,70,0.20)' },
  emerald: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.18)',  darkMid: 'rgba(42,158,106,0.05)', lightGrad: 'rgba(15,100,55,0.35)',  lightMid: 'rgba(20,120,65,0.14)',  iconDark: 'rgba(42,158,106,0.12)', iconLight: 'rgba(15,100,55,0.24)', glowDark: 'rgba(42,158,106,0.15)', glowLight: 'rgba(15,100,55,0.18)' },
  blue:    { color: '#58A6FF', darkGrad: 'rgba(88,166,255,0.16)',   darkMid: 'rgba(88,166,255,0.04)', lightGrad: 'rgba(40,100,200,0.32)', lightMid: 'rgba(50,120,220,0.14)', iconDark: 'rgba(88,166,255,0.12)', iconLight: 'rgba(40,100,200,0.24)', glowDark: 'rgba(88,166,255,0.12)', glowLight: 'rgba(40,100,200,0.18)' },
  rose:    { color: '#F87171', darkGrad: 'rgba(248,113,113,0.16)', darkMid: 'rgba(248,113,113,0.04)', lightGrad: 'rgba(200,55,55,0.32)',  lightMid: 'rgba(220,70,70,0.14)',  iconDark: 'rgba(248,113,113,0.12)', iconLight: 'rgba(180,45,45,0.24)', glowDark: 'rgba(248,113,113,0.12)', glowLight: 'rgba(200,55,55,0.18)' },
  amber:   { color: '#F59E0B', darkGrad: 'rgba(245,158,11,0.16)',   darkMid: 'rgba(245,158,11,0.04)', lightGrad: 'rgba(180,100,5,0.35)', lightMid: 'rgba(200,120,10,0.14)', iconDark: 'rgba(245,158,11,0.12)', iconLight: 'rgba(160,90,5,0.24)', glowDark: 'rgba(245,158,11,0.12)', glowLight: 'rgba(180,100,5,0.18)' },
  teal:    { color: '#14B8A6', darkGrad: 'rgba(20,184,166,0.16)',   darkMid: 'rgba(20,184,166,0.04)', lightGrad: 'rgba(10,120,110,0.32)', lightMid: 'rgba(15,140,130,0.14)', iconDark: 'rgba(20,184,166,0.12)', iconLight: 'rgba(10,120,110,0.24)', glowDark: 'rgba(20,184,166,0.12)', glowLight: 'rgba(10,120,110,0.18)' },
  violet:  { color: '#A78BFA', darkGrad: 'rgba(167,139,250,0.16)', darkMid: 'rgba(167,139,250,0.04)', lightGrad: 'rgba(100,70,200,0.32)', lightMid: 'rgba(120,90,220,0.14)', iconDark: 'rgba(167,139,250,0.12)', iconLight: 'rgba(80,55,180,0.24)', glowDark: 'rgba(167,139,250,0.12)', glowLight: 'rgba(100,70,200,0.18)' },
  indigo:  { color: '#818CF8', darkGrad: 'rgba(129,140,248,0.16)', darkMid: 'rgba(129,140,248,0.04)', lightGrad: 'rgba(60,70,200,0.32)',  lightMid: 'rgba(80,90,220,0.14)', iconDark: 'rgba(129,140,248,0.12)', iconLight: 'rgba(60,70,200,0.24)', glowDark: 'rgba(129,140,248,0.12)', glowLight: 'rgba(60,70,200,0.18)' }};

const StatCard = ({ title, value, subtitle, trend, trendLabel, icon: Icon, chart, accent = 'gold', onClick, cardKey }: any) => {
  const a = (STAT_ACCENTS as any)[accent] || STAT_ACCENTS.gold;
  const borderColor ='border-gray-300';
  const textMuted ='text-gray-700';
  const textPrimary ='text-gray-900';

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-xl px-3 py-1 transition-all duration-200 hover:shadow-md group ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background:`linear-gradient(135deg, #ffffff 0%, ${a.lightMid} 35%, ${a.lightGrad} 100%)`,
        boxShadow: `inset 0 -1px 0 ${a.glowLight}`}}
      onClick={onClick}
    >
      {/* Watermark Icon */}
      <div
        className="absolute -bottom-1 -right-1 pointer-events-none"
        style={{ opacity:0.14}}
      >
        <Icon size={48} color={a.color} strokeWidth={1} />
      </div>

      {/* Expand hint */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <ArrowUpRight size={10} color={a.color} />
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted}`}>{title}</p>
          <div className={`mt-0.5 text-lg font-bold font-['JetBrains_Mono'] tabular-nums leading-tight ${textPrimary}`}>{value}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {trendLabel && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold font-['JetBrains_Mono'] rounded ${
                trend > 0
                  ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]'
                  : 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]'
              }`}>
                {trend > 0 ? '\u25B2' : '\u25BC'} {trendLabel}
              </span>
            )}
            <p className={`text-[10px] ${textMuted}`}>{subtitle}</p>
          </div>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm shrink-0"
          style={{ backgroundColor:a.iconLight}}
        >
          <Icon size={14} color={a.color} />
        </div>
      </div>
      {chart && <div className="relative z-10 mt-1.5">{chart}</div>}
    </div>
  );
};

const SmallCard = ({ title, value, subtitle, icon: Icon, accent = 'gold', onClick, cardKey }: any) => {
  const a = (STAT_ACCENTS as any)[accent] || STAT_ACCENTS.gold;
  const borderColor ='border-gray-300';
  const textMuted ='text-gray-700';
  const textPrimary ='text-gray-900';

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-xl px-3 py-1 transition-all duration-200 hover:shadow-md group ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background:`linear-gradient(135deg, #ffffff 0%, ${a.lightMid} 35%, ${a.lightGrad} 100%)`,
        boxShadow: `inset 0 -1px 0 ${a.glowLight}`}}
      onClick={onClick}
    >
      {/* Watermark Icon */}
      <div
        className="absolute -bottom-1 -right-1 pointer-events-none"
        style={{ opacity:0.13}}
      >
        <Icon size={44} color={a.color} strokeWidth={1} />
      </div>

      {/* Expand hint */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <ArrowUpRight size={10} color={a.color} />
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted}`}>{title}</p>
          <div className={`mt-0.5 text-lg font-bold font-['JetBrains_Mono'] tabular-nums leading-tight ${textPrimary}`}>{value}</div>
          <p className={`text-[10px] ${textMuted}`}>{subtitle}</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm shrink-0"
          style={{ backgroundColor:a.iconLight}}
        >
          <Icon size={14} color={a.color} />
        </div>
      </div>
    </div>
  );
};

const CARD_CONFIG = {
  totalSales: { icon: DollarSign, accent: 'gold' },
  budgetUtilization: { icon: Target, accent: 'emerald' },
  avgMargin: { icon: Percent, accent: 'blue' },
  sellThrough: { icon: ShoppingCart, accent: 'rose' },
  totalBrands: { icon: Building2, accent: 'amber' },
  categories: { icon: Boxes, accent: 'teal' },
  pendingApprovals: { icon: ClipboardCheck, accent: 'violet' },
  activePlans: { icon: BarChart3, accent: 'indigo' }};

const HomeScreen = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const router = useRouter();
  const panelBg ='bg-white border-gray-300';
  const textMuted ='text-gray-700';
  const textPrimary ='text-gray-900';

  // KPI expand state
  const [expandedCard, setExpandedCard] = useState<any>(null);
  // Alert expand state
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Stats from API
  const [stats, setStats] = useState({
    totalSales: '0',
    budgetUtilization: '0%',
    avgMargin: '0%',
    sellThrough: '0%',
    totalBrands: '0',
    categories: '0',
    pendingApprovals: '0',
    activePlans: '0'
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // UX-23: Real chart data from budget list
  const [chartData, setChartData] = useState<{ month: string; actual: number; target: number }[]>([]);

  // Dashboard filter state
  const REGION_OPTIONS = ['Vietnam', 'Global'];
  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('Vietnam');
  const [brandOptions, setBrandOptions] = useState<any[]>([]);
  const [openFilter, setOpenFilter] = useState<any>(null); // 'season' | 'brand' | 'region' | null
  const filterRef = useRef<any>(null);
  const { isOpen: mobileFilterOpen, open: openMobileFilter, close: closeMobileFilter } = useBottomSheet();
  const [mobileFilterValues, setMobileFilterValues] = useState<Record<string, string | string[]>>({});

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch brands and season groups for filters
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brands = await masterDataService.getBrands();
        const list = Array.isArray(brands) ? brands : ((brands as any)?.data || []);
        setBrandOptions(list.map((b: any) => b.name || b.code || 'Unknown'));
      } catch { setBrandOptions([]); }
    };
    const fetchSeasonOptions = async () => {
      try {
        const res = await masterDataService.getSeasonGroups();
        const data = Array.isArray(res) ? res : [];
        // Build combined labels like 'SS25', 'FW25' from season groups + fiscal years in budgets
        // Use current year and next year as a reasonable range
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1];
        const options: string[] = [];
        years.forEach(year => {
          const shortYear = String(year).slice(-2);
          data.forEach((sg: any) => {
            options.push(`${sg.name}${shortYear}`);
          });
        });
        setSeasonOptions(options);
        if (options.length > 0 && !selectedSeason) setSelectedSeason(options[0]);
      } catch {
        setSeasonOptions([]);
      }
    };
    fetchBrands();
    fetchSeasonOptions();
  }, []);

  // Format VND amount for display (e.g. 12500000000 → "12,5 T đ")
  const formatVND = (amount: number): string => {
    if (!amount || amount === 0) return '0 đ';
    const trillion = 1_000_000_000_000;
    const billion = 1_000_000_000;
    const million = 1_000_000;
    if (amount >= trillion) return `${(amount / trillion).toFixed(1).replace('.', ',')} T đ`;
    if (amount >= billion) return `${(amount / billion).toFixed(1).replace('.', ',')} tỷ đ`;
    if (amount >= million) return `${(amount / million).toFixed(0)} tr đ`;
    return `${amount.toLocaleString('vi-VN')} đ`;
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // UX-04: Pass dashboard filters to API
      const filters: { fiscalYear?: number; region?: string } = {};
      if (selectedSeason) {
        const yearMatch = selectedSeason.match(/\d{2,4}$/);
        if (yearMatch) {
          const yr = Number(yearMatch[0]);
          filters.fiscalYear = yr < 100 ? 2000 + yr : yr;
        }
      }
      if (selectedRegion) {
        filters.region = selectedRegion;
      }
      const data = await budgetService.getStatistics(filters);
      if (data) {
        const totalAmt = Number(data.totalAmount || data.totalBudget || 0);
        const utilPct = Number(data.utilization || data.budgetUtilization || 0);
        setStats({
          totalSales: formatVND(totalAmt),
          budgetUtilization: `${utilPct}%`,
          avgMargin: data.avgMargin || '--',
          sellThrough: data.sellThrough || '--',
          totalBrands: String(data.brandCount || data.totalBrands || 0),
          categories: String(data.categoryCount || data.categories || 0),
          pendingApprovals: String(data.pendingApprovals || data.pendingCount || 0),
          activePlans: String(data.activePlans || data.planCount || 0),
          // Raw values for summary row
          _totalAmount: totalAmt,
          _approvedAmount: Number(data.approvedAmount || 0),
          _totalBudgets: Number(data.totalBudgets || 0)} as any);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      toast.error('Không thể tải dữ liệu tổng quan.');
    } finally {
      setStatsLoading(false);
    }
  };

  // UX-23: Fetch budgets and compute monthly chart data
  const fetchChartData = useCallback(async () => {
    try {
      const budgets = await budgetService.getAll();
      const list = Array.isArray(budgets) ? budgets : [];
      if (list.length === 0) { setChartData([]); return; }

      // Group budgets by creation month → sum totalBudget (actual) and approved budgets (target)
      const monthMap = new Map<string, { actual: number; target: number }>();
      const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

      for (const b of list) {
        const d = new Date(b.createdAt || b.created_at);
        if (isNaN(d.getTime())) continue;
        const key = MONTH_KEYS[d.getMonth()];
        const entry = monthMap.get(key) || { actual: 0, target: 0 };
        const amt = Number(b.totalBudget || b.budgetAmount || 0);
        entry.actual += amt;
        if (b.status === 'approved' || b.status === 'APPROVED') {
          entry.target += amt;
        }
        monthMap.set(key, entry);
      }

      // Build sorted array for months that have data
      const sorted = MONTH_KEYS
        .filter(k => monthMap.has(k))
        .map(k => ({ month: k, ...monthMap.get(k)! }));

      // Compute cumulative values for trend line
      let cumActual = 0, cumTarget = 0;
      const cumulative = sorted.map(d => {
        cumActual += d.actual;
        cumTarget += d.target;
        return { month: d.month, actual: cumActual, target: cumTarget };
      });

      setChartData(cumulative);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setChartData([]);
    }
  }, []);

  // Re-fetch stats + chart when dashboard filters change
  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, [selectedSeason, selectedBrand, selectedRegion]);

  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div>
            <h2 className={`text-xl font-bold font-['Montserrat'] ${textPrimary}`}>{t('home.welcomeBack', { name: userName })}</h2>
            <p className={`text-sm ${textMuted}`}>{t('home.subtitle')}</p>
          </div>
        </div>
        <span className={`inline-flex px-4 py-1 text-xs font-semibold uppercase tracking-wider font-['Montserrat'] rounded-full ${'bg-[rgba(138,99,64,0.18)] text-[#5A3D22] border border-[rgba(138,99,64,0.45)]'}`}>
          {selectedSeason || '—'}
        </span>
      </div>

      {/* Mobile Filter Chips */}
      {isMobile && (
        <FilterChips
          chips={[
            { key: 'season', label: selectedSeason, icon: '📅' },
            { key: 'brand', label: selectedBrand === 'all' ? t('home.allBrands') : selectedBrand, icon: '🏷️' },
            { key: 'region', label: selectedRegion, icon: '🌍' },
          ]}
          activeValues={mobileFilterValues}
          onChipPress={() => openMobileFilter()}
          onMorePress={openMobileFilter}
        />
      )}

      {/* Desktop Filter Bar */}
      {!isMobile && <div className={`border ${panelBg} rounded-lg p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold uppercase rounded ${'bg-[rgba(9,84,49,0.14)] text-[#065F32] border border-[rgba(9,84,49,0.4)]'}`}>
            <span className="w-2 h-2 rounded-full bg-[#127749]"></span>
            {t('common.live').toUpperCase()}
          </span>
          {/* Filter Dropdowns */}
          <div ref={filterRef} className="flex flex-wrap items-center gap-3">
            {[
              { key: 'season', label: t('home.season'), value: selectedSeason, options: seasonOptions, onSelect: setSelectedSeason },
              { key: 'brand', label: t('home.brand'), value: selectedBrand === 'all' ? t('home.allBrands') : selectedBrand, options: ['all', ...brandOptions], onSelect: setSelectedBrand, displayFn: (v: any) => v === 'all' ? t('home.allBrands') : v },
              { key: 'region', label: t('home.region'), value: selectedRegion, options: REGION_OPTIONS, onSelect: setSelectedRegion }
            ].map((filter) => (
              <div key={filter.key} className="relative">
                <button
                  onClick={() => setOpenFilter(openFilter === filter.key ? null : filter.key)}
                  className={`flex items-center gap-2 px-4 py-1 rounded-full border text-xs font-semibold transition-all duration-150 ${
                    openFilter === filter.key
                      ?'border-[rgba(184,153,112,0.5)] bg-[rgba(215,183,151,0.15)] text-[#6B4D30]':'border-gray-300 text-gray-700 hover:bg-[rgba(215,183,151,0.15)] hover:border-[rgba(184,153,112,0.4)] hover:text-[#6B4D30]'}`}
                >
                  <span className="uppercase tracking-wide text-[10px]">{filter.label}</span>
                  <span className={`text-sm font-['JetBrains_Mono'] ${'text-gray-900'}`}>{filter.value}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${openFilter === filter.key ? 'rotate-180' : ''}`} />
                </button>
                {openFilter === filter.key && (
                  <div className={`absolute top-full left-0 mt-2 min-w-[160px] rounded-xl shadow-xl border overflow-hidden z-50 ${'bg-white border-gray-300'}`}>
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {filter.options.map((opt) => {
                        const display = filter.displayFn ? filter.displayFn(opt) : opt;
                        const isSelected = filter.key === 'brand' ? (opt === selectedBrand) : (opt === filter.value);
                        return (
                          <button
                            key={opt}
                            onClick={() => { filter.onSelect(opt); setOpenFilter(null); }}
                            className={`w-full flex items-center justify-between px-4 py-1 text-sm transition-colors ${
                              isSelected
                                ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'text-gray-900 hover:bg-gray-50'}`}
                          >
                            <span className="font-medium font-['Montserrat']">{display}</span>
                            {isSelected && <Check size={14} className="text-[#127749]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-2 ${textMuted}`}>
              <span className="w-2 h-2 rounded-full bg-[#127749]"></span>
              {t('common.updatedJustNow')}
            </span>
            <button
              onClick={fetchStats}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-150 ${'border-gray-300 text-gray-700 hover:bg-[rgba(215,183,151,0.15)] hover:text-[#6B4D30]'} ${statsLoading ? 'animate-spin' : ''}`}>
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
      </div>}

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          title={t('home.totalSales')}
          value={statsLoading ? '...' : stats.totalSales}
          subtitle={t('home.unitsVsLastSeason')}
          icon={DollarSign}
          accent="gold"
          cardKey="totalSales"
          onClick={() => setExpandedCard({ key: 'totalSales', title: t('home.totalSales'), value: stats.totalSales, subtitle: t('home.unitsVsLastSeason') })}
          chart={(
            <svg viewBox="0 0 160 40" className="w-full h-6">
              <polyline
                fill="none"
                stroke="#D7B797"
                strokeWidth="3"
                points="0,32 24,28 48,20 72,22 96,14 120,16 144,8 160,10"
              />
            </svg>
          )}
        />
        <StatCard
          title={t('home.budgetUtilization')}
          value={statsLoading ? '...' : stats.budgetUtilization}
          subtitle={t('home.thisMonth')}
          icon={Target}
          accent="emerald"
          cardKey="budgetUtilization"
          onClick={() => setExpandedCard({ key: 'budgetUtilization', title: t('home.budgetUtilization'), value: stats.budgetUtilization, subtitle: t('home.thisMonth') })}
          chart={(
            <svg viewBox="0 0 160 40" className="w-full h-6">
              <polyline
                fill="none"
                stroke="#2A9E6A"
                strokeWidth="3"
                points="0,30 30,26 60,22 90,18 120,16 150,12 160,10"
              />
            </svg>
          )}
        />
        <StatCard
          title={t('home.avgMargin')}
          value={statsLoading ? '...' : stats.avgMargin}
          subtitle={t('home.acrossCategories')}
          icon={Percent}
          accent="blue"
          cardKey="avgMargin"
          onClick={() => setExpandedCard({ key: 'avgMargin', title: t('home.avgMargin'), value: stats.avgMargin, subtitle: t('home.acrossCategories') })}
        />
        <StatCard
          title={t('home.sellThrough')}
          value={statsLoading ? '...' : stats.sellThrough}
          subtitle={t('home.currentSeasonPerformance')}
          icon={ShoppingCart}
          accent="rose"
          cardKey="sellThrough"
          onClick={() => setExpandedCard({ key: 'sellThrough', title: t('home.sellThrough'), value: stats.sellThrough, subtitle: t('home.currentSeasonPerformance') })}
        />
      </div>

      {/* Small Stats */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <SmallCard
          title={t('home.totalBrands')}
          value={stats.totalBrands}
          subtitle={t('home.activeBrands')}
          icon={Building2}
          accent="amber"
          cardKey="totalBrands"
          onClick={() => setExpandedCard({ key: 'totalBrands', title: t('home.totalBrands'), value: stats.totalBrands, subtitle: t('home.activeBrands') })}
        />
        <SmallCard
          title={t('home.categoriesTitle')}
          value={stats.categories}
          subtitle={t('home.productCategories')}
          icon={Boxes}
          accent="teal"
          cardKey="categories"
          onClick={() => setExpandedCard({ key: 'categories', title: t('home.categoriesTitle'), value: stats.categories, subtitle: t('home.productCategories') })}
        />
        <SmallCard
          title={t('home.pendingApprovals')}
          value={stats.pendingApprovals}
          subtitle={t('home.itemsAwaitingReview')}
          icon={ClipboardCheck}
          accent="violet"
          cardKey="pendingApprovals"
          onClick={() => setExpandedCard({ key: 'pendingApprovals', title: t('home.pendingApprovals'), value: stats.pendingApprovals, subtitle: t('home.itemsAwaitingReview') })}
        />
        <SmallCard
          title={t('home.activePlans')}
          value={stats.activePlans}
          subtitle={t('home.otbPlansInProgress')}
          icon={BarChart3}
          accent="indigo"
          cardKey="activePlans"
          onClick={() => setExpandedCard({ key: 'activePlans', title: t('home.activePlans'), value: stats.activePlans, subtitle: t('home.otbPlansInProgress') })}
        />
      </div>

      {/* Getting Started Card — shown when all stats are zero */}
      {!statsLoading && (stats as any)._totalBudgets === 0 && (
        <div className={`rounded-xl border p-5 ${'bg-white border-[rgba(215,183,151,0.3)]'}`}>
          <h3 className={`text-base font-semibold font-['Montserrat'] mb-3 ${'text-[#333333]'}`}>
            Getting Started
          </h3>
          <p className={`text-sm mb-4 ${'text-[#666666]'}`}>
            Follow these 5 steps to set up your first OTB plan:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { step: 1, label: 'Create Budget', path: '/budget-management' },
              { step: 2, label: 'Allocate Budget', path: '/budget-management' },
              { step: 3, label: 'OTB Analysis', path: '/otb-analysis' },
              { step: 4, label: 'SKU Proposal', path: '/sku-proposal' },
              { step: 5, label: 'Submit Ticket', path: '/tickets' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => router.push(item.path)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${'bg-[rgba(160,120,75,0.08)] hover:bg-[rgba(160,120,75,0.15)] text-[#6B4D30]'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${'bg-[#C4A77D] text-white'}`}>{item.step}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sales Performance Chart - Full Width Premium */}
      <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${'border-gray-200 bg-gradient-to-br from-white via-gray-50/50 to-white'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${'bg-gradient-to-br from-[rgba(215,183,151,0.15)] to-[rgba(215,183,151,0.05)]'}`}>
              <TrendingUp size={18} className={'text-[#8B6914]'} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold font-['Montserrat'] tracking-tight ${textPrimary}`}>{t('home.salesPerformance')}</h3>
              <p className={`text-xs ${textMuted} mt-0.5`}>{t('home.monthlyComparison')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-5 mr-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-[2.5px] rounded-full bg-[#D7B797]"></span>
                <span className={`text-[11px] font-medium font-['Montserrat'] ${textMuted}`}>{t('home.actualSales')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-[2.5px] rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #2A9E6A 0, #2A9E6A 4px, transparent 4px, transparent 7px)', backgroundSize: '7px 2.5px' }}></span>
                <span className={`text-[11px] font-medium font-['Montserrat'] ${textMuted}`}>{t('home.targetSales')}</span>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest font-['Montserrat'] rounded-full border ${'bg-[rgba(42,158,106,0.08)] text-[#1a7a4f] border-[rgba(42,158,106,0.2)]'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2A9E6A] animate-pulse"></span>
              {t('common.liveData')}
            </span>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 mt-4">
          {[
            { label: t('home.totalRevenue'), value: statsLoading ? '...' : stats.totalSales, trend: stats.budgetUtilization, up: true, icon: '₫' },
            { label: t('home.budgetUtilization'), value: statsLoading ? '...' : stats.budgetUtilization, trend: t('home.aboveTarget'), up: Number(stats.budgetUtilization?.replace('%','')) > 50, icon: '↗' },
            { label: t('home.pendingApprovals'), value: statsLoading ? '...' : stats.pendingApprovals, trend: t('home.itemsAwaitingReview'), up: false, icon: '⏳' },
            { label: t('home.activePlans'), value: statsLoading ? '...' : stats.activePlans, trend: t('home.otbPlansInProgress'), up: true, icon: '◎' },
          ].map((s, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 border transition-all duration-200 ${'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted} font-['Montserrat']`}>{s.label}</p>
                <span className={`text-[10px] ${'text-gray-300'}`}>{s.icon}</span>
              </div>
              <p className={`text-xl font-bold font-['JetBrains_Mono'] tabular-nums mt-1 ${textPrimary}`}>{s.value}</p>
              <span className={`text-[10px] font-semibold font-['JetBrains_Mono'] ${s.up ? 'text-[#2A9E6A]' : 'text-[#FF7B72]'}`}>
                {s.up ? '▲' : '▼'} {s.trend}
              </span>
            </div>
          ))}
        </div>

        {/* UX-23: Data-driven chart from real budget data */}
        <div className="px-2 sm:px-4 mt-4 pb-5">
          {chartData.length === 0 ? (
            statsLoading ? (
              <div className="animate-pulse h-[200px] bg-gray-200 rounded-xl" />
            ) : (
              <div className={`flex items-center justify-center py-12 text-sm ${textMuted}`}>
                {t('home.noChartData') || 'No budget data available for chart'}
              </div>
            )
          ) : (
            (() => {
              // Compute SVG coordinates from real data
              const CHART_LEFT = 92, CHART_RIGHT = 920, CHART_TOP = 30, CHART_BOTTOM = 255;
              const n = chartData.length;
              const maxVal = Math.max(...chartData.map(d => Math.max(d.actual, d.target)), 1);
              // Round up maxVal to a nice ceiling for Y-axis
              const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
              const niceMax = Math.ceil(maxVal / magnitude) * magnitude;
              const xStep = n > 1 ? (CHART_RIGHT - CHART_LEFT) / (n - 1) : 0;

              const toX = (i: number) => CHART_LEFT + i * xStep;
              const toY = (val: number) => CHART_BOTTOM - ((val / niceMax) * (CHART_BOTTOM - CHART_TOP));

              const actualPoints = chartData.map((d, i) => `${toX(i)},${toY(d.actual)}`).join(' ');
              const targetPoints = chartData.map((d, i) => `${toX(i)},${toY(d.target)}`).join(' ');

              const actualAreaPath = `M${chartData.map((d, i) => `${toX(i)},${toY(d.actual)}`).join(' L')} L${CHART_RIGHT},${CHART_BOTTOM} L${CHART_LEFT},${CHART_BOTTOM} Z`;
              const targetAreaPath = `M${chartData.map((d, i) => `${toX(i)},${toY(d.target)}`).join(' L')} L${CHART_RIGHT},${CHART_BOTTOM} L${CHART_LEFT},${CHART_BOTTOM} Z`;

              // Y-axis tick labels
              const yTicks = Array.from({ length: 5 }, (_, i) => {
                const val = niceMax * (1 - i / 4);
                const y = CHART_TOP + i * ((CHART_BOTTOM - CHART_TOP) / 4);
                const trillion = 1_000_000_000_000;
                const billion = 1_000_000_000;
                const million = 1_000_000;
                let label: string;
                if (niceMax >= trillion) label = `${(val / trillion).toFixed(1).replace('.', ',')}T`;
                else if (niceMax >= billion) label = `${(val / billion).toFixed(1).replace('.', ',')}tỷ`;
                else if (niceMax >= million) label = `${(val / million).toFixed(0)}tr`;
                else label = val.toLocaleString('vi-VN');
                return { y, label };
              });

              // Best month (highest actual)
              let bestIdx = 0;
              chartData.forEach((d, i) => { if (d.actual > chartData[bestIdx].actual) bestIdx = i; });

              return (
                <svg viewBox="0 0 960 300" className="w-full" preserveAspectRatio="xMidYMid meet" style={{ height: 'clamp(220px, 30vw, 340px)' }}>
                  <defs>
                    <linearGradient id="salesFillPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D7B797" stopOpacity="0.30" />
                      <stop offset="40%" stopColor="#D7B797" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#D7B797" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="targetFillPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2A9E6A" stopOpacity="0.12" />
                      <stop offset="60%" stopColor="#2A9E6A" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#2A9E6A" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="salesLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#C4A07A" />
                      <stop offset="50%" stopColor="#D7B797" />
                      <stop offset="100%" stopColor="#E8CDB0" />
                    </linearGradient>
                    <filter id="glowSales" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Y-axis labels + grid lines */}
                  {yTicks.map((tick) => (
                    <g key={tick.y}>
                      <text x="52" y={tick.y + 4} textAnchor="end" fontSize="10" fill={'#9CA3AF'} fontFamily="JetBrains Mono" fontWeight="500">{tick.label}</text>
                      <line x1="64" y1={tick.y} x2="920" y2={tick.y} stroke={'rgba(0,0,0,0.05)'} strokeWidth="1" />
                    </g>
                  ))}

                  {/* Area fills */}
                  <path d={targetAreaPath} fill="url(#targetFillPremium)" />
                  <path d={actualAreaPath} fill="url(#salesFillPremium)" />

                  {/* Target line (dashed) */}
                  <polyline fill="none" stroke="#2A9E6A" strokeDasharray="8 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={targetPoints} opacity="0.7" />
                  {/* Actual line */}
                  <polyline fill="none" stroke="url(#salesLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={actualPoints} filter="url(#glowSales)" />

                  {/* Target dots */}
                  {chartData.map((d, i) => (
                    <circle key={`dot-t-${i}`} cx={toX(i)} cy={toY(d.target)} r="3" fill={'#ffffff'} stroke="#2A9E6A" strokeWidth="1.5" opacity="0.7" />
                  ))}

                  {/* Actual dots */}
                  {chartData.map((d, i) => (
                    <g key={`dot-a-${i}`}>
                      <circle cx={toX(i)} cy={toY(d.actual)} r="6" fill={'#ffffff'} stroke="#D7B797" strokeWidth="2.5" />
                      {i === n - 1 && (
                        <circle cx={toX(i)} cy={toY(d.actual)} r="10" fill="none" stroke="#D7B797" strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  ))}

                  {/* Value labels on actual line */}
                  {chartData.map((d, i) => {
                    const x = toX(i), y = toY(d.actual);
                    const trillion = 1_000_000_000_000;
                    const billion = 1_000_000_000;
                    const million = 1_000_000;
                    let label: string;
                    if (d.actual >= trillion) label = `${(d.actual / trillion).toFixed(1).replace('.', ',')}T`;
                    else if (d.actual >= billion) label = `${(d.actual / billion).toFixed(1).replace('.', ',')}tỷ`;
                    else if (d.actual >= million) label = `${(d.actual / million).toFixed(0)}tr`;
                    else label = d.actual > 0 ? d.actual.toLocaleString('vi-VN') : '0';
                    return (
                      <g key={`val-${i}`} filter="url(#labelShadow)">
                        <rect x={x - 22} y={y - 24} width="44" height="17" rx="5"
                          fill={'rgba(215,183,151,0.18)'}
                          stroke={'rgba(215,183,151,0.25)'}
                          strokeWidth="0.5"
                        />
                        <text x={x} y={y - 12} textAnchor="middle" fontSize="9.5" fill="#D7B797" fontFamily="JetBrains Mono" fontWeight="700">{label}</text>
                      </g>
                    );
                  })}

                  {/* X-axis month labels */}
                  {chartData.map((d, i) => (
                    <text key={d.month} x={toX(i)} y={275} textAnchor="middle" fontSize="10" fill={'#9CA3AF'} fontFamily="Montserrat" fontWeight="600" letterSpacing="0.5">
                      {t(`home.${d.month}`)}
                    </text>
                  ))}

                  {/* Best month highlight line */}
                  <line x1={toX(bestIdx)} y1={toY(chartData[bestIdx].actual)} x2={toX(bestIdx)} y2={CHART_BOTTOM} stroke="#D7B797" strokeWidth="1" strokeDasharray="4 4" opacity="0.15" />
                </svg>
              );
            })()
          )}
        </div>
      </div>

      {/* Active Alerts */}
      <div className={`border ${panelBg} rounded-xl p-5 transition-all duration-150 hover:border-[rgba(215,183,151,0.25)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${'bg-[rgba(215,183,151,0.1)]'}`}>
              <Bell size={18} className={'text-[#6B4D30]'} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold font-['Montserrat'] ${textPrimary}`}>{t('home.activeAlerts')}</h3>
              <p className={`text-xs ${textMuted}`}>{t('home.activeAlertsCount', { count: Number(stats.pendingApprovals) || 0 })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {Number(stats.pendingApprovals) > 0 && (
              <span className="px-2 py-1 rounded-md bg-[rgba(248,81,73,0.15)] text-[#FF7B72] font-semibold font-['Montserrat']">{stats.pendingApprovals} {t('home.pending') || 'Chờ duyệt'}</span>
            )}
            {Number((stats as any)._totalAmount) > 0 && (
              <span className="px-2 py-1 rounded-md bg-[rgba(210,153,34,0.15)] text-[#E3B341] font-semibold font-['Montserrat']">{stats.budgetUtilization}</span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* UX-08: Alert items — computed from real stats */}
          {(() => {
            const s = stats as any;
            const totalAmt = Number(s._totalAmount || 0);
            const approvedAmt = Number(s._approvedAmount || 0);
            const utilPct = totalAmt > 0 ? Math.round((approvedAmt / totalAmt) * 100) : 0;
            const pendingCount = Number(s.pendingApprovals || 0);
            const alerts: any[] = [];

            // Alert 1: Pending approvals (always show if > 0)
            if (pendingCount > 0) {
              alerts.push({
                id: 'pendingApprovals',
                icon: Bell,
                iconColor: 'text-[#F85149]',
                iconBg: 'bg-[rgba(248,81,73,0.2)]',
                borderColor: 'border-[rgba(248,81,73,0.3)]',
                borderHover: 'hover:border-[rgba(248,81,73,0.5)]',
                bgColor: 'bg-[rgba(248,81,73,0.08)]',
                accentColor: '#FF7B72',
                accentHover: '#F85149',
                title: t('home.pendingApprovalsAlert') || `${pendingCount} mục chờ duyệt`,
                time: t('home.now') || 'Hiện tại',
                message: t('home.pendingApprovalsMessage') || `Có ${pendingCount} ngân sách/kế hoạch đang chờ phê duyệt.`,
                route: '/approvals',
                detailItems: [
                  { label: t('home.pending') || 'Chờ duyệt', value: String(pendingCount) },
                  { label: t('home.totalBudgets') || 'Tổng ngân sách', value: String(s._totalBudgets || 0) },
                ]});
            }

            // Alert 2: Budget utilization > 80%
            if (utilPct > 80 && totalAmt > 0) {
              alerts.push({
                id: 'budgetThreshold',
                icon: TrendingUp,
                iconColor: 'text-[#D29922]',
                iconBg: 'bg-[rgba(210,153,34,0.2)]',
                borderColor: 'border-[rgba(210,153,34,0.3)]',
                borderHover: 'hover:border-[rgba(210,153,34,0.5)]',
                bgColor: 'bg-[rgba(210,153,34,0.08)]',
                accentColor: '#E3B341',
                accentHover: '#D29922',
                title: t('home.budgetThresholdWarning') || 'Ngân sách gần đạt ngưỡng',
                time: `${utilPct}%`,
                message: t('home.budgetThresholdMessage') || `Đã sử dụng ${utilPct}% tổng ngân sách. Còn lại: ${formatVND(totalAmt - approvedAmt)}.`,
                route: '/budget-management',
                detailItems: [
                  { label: t('home.used') || 'Đã sử dụng', value: `${utilPct}%` },
                  { label: t('home.remaining') || 'Còn lại', value: formatVND(totalAmt - approvedAmt) },
                  { label: t('home.totalBudget') || 'Tổng ngân sách', value: formatVND(totalAmt) },
                ]});
            }

            // Alert 3: Active plans info
            const activePlans = Number(s.activePlans || 0);
            if (activePlans > 0) {
              alerts.push({
                id: 'activePlans',
                icon: BarChart3,
                iconColor: 'text-[#58A6FF]',
                iconBg: 'bg-[rgba(88,166,255,0.2)]',
                borderColor: 'border-[rgba(88,166,255,0.3)]',
                borderHover: 'hover:border-[rgba(88,166,255,0.5)]',
                bgColor: 'bg-[rgba(88,166,255,0.08)]',
                accentColor: '#79C0FF',
                accentHover: '#58A6FF',
                title: t('home.activePlansAlert') || `${activePlans} kế hoạch đang hoạt động`,
                time: t('home.now') || 'Hiện tại',
                message: t('home.activePlansMessage') || `Có ${activePlans} kế hoạch/đề xuất đang trong quy trình xử lý.`,
                route: '/otb-analysis',
                detailItems: [
                  { label: t('home.activePlans') || 'Kế hoạch', value: String(activePlans) },
                  { label: t('home.brands') || 'Thương hiệu', value: String(s.totalBrands || 0) },
                ]});
            }

            // If no alerts, show an empty state placeholder
            if (alerts.length === 0) {
              alerts.push({
                id: 'noAlerts',
                icon: Check,
                iconColor: 'text-[#2A9E6A]',
                iconBg: 'bg-[rgba(42,158,106,0.2)]',
                borderColor: 'border-[rgba(42,158,106,0.3)]',
                borderHover: 'hover:border-[rgba(42,158,106,0.5)]',
                bgColor: 'bg-[rgba(42,158,106,0.08)]',
                accentColor: '#2A9E6A',
                accentHover: '#1E7A4F',
                title: t('home.noAlerts') || 'Không có cảnh báo',
                time: '',
                message: t('home.noAlertsMessage') || 'Tất cả các chỉ số đều trong giới hạn bình thường.',
                route: '/budget-management',
                detailItems: []});
            }

            return alerts;
          })().map((alert) => {
            const AlertIcon = alert.icon;
            const isExpanded = expandedAlert === alert.id;
            return (
              <div key={alert.id} className={`border rounded-xl overflow-hidden transition-all duration-300 ${alert.borderColor} ${alert.bgColor} ${alert.borderHover}`}>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${alert.iconBg}`}>
                      <AlertIcon size={16} className={alert.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${textPrimary}`}>{alert.title}</span>
                        <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>{alert.time}</span>
                      </div>
                      <p className={`text-xs mt-1 ${'text-gray-600'}`}>
                        {alert.message}
                      </p>
                      <button
                        className="mt-2 text-xs font-semibold transition-colors flex items-center gap-1"
                        style={{ color: alert.accentColor }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = alert.accentHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = alert.accentColor)}
                      >
                        {t('common.viewDetails')}
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Detail Panel */}
                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className={`px-4 pb-4 pt-0 border-t ${'border-[rgba(0,0,0,0.06)]'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {alert.detailItems.map((item: any, idx: number) => (
                        <div key={idx} className={`rounded-lg px-3 py-2 ${'bg-[rgba(255,255,255,0.6)]'}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted} font-['Montserrat']`}>{item.label}</p>
                          <p className={`text-sm font-bold font-['JetBrains_Mono'] tabular-nums mt-0.5 ${textPrimary}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(alert.route); }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-['Montserrat'] transition-all duration-200"
                      style={{
                        backgroundColor: `${alert.accentColor}20`,
                        color: alert.accentColor,
                        border: `1px solid ${alert.accentColor}30`}}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${alert.accentColor}35`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${alert.accentColor}20`; }}
                    >
                      <ArrowUpRight size={14} />
                      {t('home.goToPage') || 'Đi đến trang chi tiết'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Detail Modal */}
      {expandedCard && (
        <KPIDetailModal
          isOpen={!!expandedCard}
          onClose={() => setExpandedCard(null)}
          cardKey={expandedCard.key}
          title={expandedCard.title}
          icon={(CARD_CONFIG as any)[expandedCard.key]?.icon}
          accent={(CARD_CONFIG as any)[expandedCard.key]?.accent}
          currentValue={expandedCard.value}
          trend={expandedCard.trend}
          trendLabel={expandedCard.trendLabel}
          subtitle={expandedCard.subtitle}
        />
      )}

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={mobileFilterOpen}
        onClose={closeMobileFilter}
        filters={[
          {
            key: 'season',
            label: t('home.season'),
            icon: '📅',
            type: 'single',
            options: seasonOptions.map(s => ({ value: s, label: s }))},
          {
            key: 'brand',
            label: t('home.brand'),
            icon: '🏷️',
            type: 'single',
            options: [{ value: 'all', label: t('home.allBrands') }, ...brandOptions.map(b => ({ value: b, label: b }))]},
          {
            key: 'region',
            label: t('home.region'),
            icon: '🌍',
            type: 'single',
            options: REGION_OPTIONS.map(r => ({ value: r, label: r }))},
        ]}
        values={mobileFilterValues}
        onChange={(key, value) => {
          setMobileFilterValues(prev => ({ ...prev, [key]: value }));
          if (key === 'season') setSelectedSeason(String(value) || 'SS25');
          if (key === 'brand') setSelectedBrand(String(value) || 'all');
          if (key === 'region') setSelectedRegion(String(value) || 'Vietnam');
        }}
        onApply={closeMobileFilter}
        onReset={() => {
          setMobileFilterValues({});
          setSelectedSeason('SS25');
          setSelectedBrand('all');
          setSelectedRegion('Vietnam');
        }}
      />
    </div>
  );
};

export default HomeScreen;
