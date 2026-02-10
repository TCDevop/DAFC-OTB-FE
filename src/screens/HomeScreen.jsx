'use client';

import React, { useState, useEffect } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { budgetService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const STAT_ACCENTS = {
  gold:    { color: '#D7B797', darkGrad: 'rgba(215,183,151,0.06)', lightGrad: 'rgba(180,140,95,0.10)', iconDark: 'rgba(215,183,151,0.07)', iconLight: 'rgba(160,120,75,0.08)' },
  emerald: { color: '#2A9E6A', darkGrad: 'rgba(42,158,106,0.06)',  lightGrad: 'rgba(22,120,70,0.08)',  iconDark: 'rgba(42,158,106,0.07)', iconLight: 'rgba(22,120,70,0.07)' },
  blue:    { color: '#58A6FF', darkGrad: 'rgba(88,166,255,0.05)',   lightGrad: 'rgba(50,120,220,0.08)', iconDark: 'rgba(88,166,255,0.06)', iconLight: 'rgba(50,120,220,0.06)' },
  rose:    { color: '#F87171', darkGrad: 'rgba(248,113,113,0.05)',  lightGrad: 'rgba(220,70,70,0.07)',  iconDark: 'rgba(248,113,113,0.06)', iconLight: 'rgba(200,60,60,0.06)' },
  amber:   { color: '#F59E0B', darkGrad: 'rgba(245,158,11,0.05)',   lightGrad: 'rgba(200,120,10,0.08)', iconDark: 'rgba(245,158,11,0.06)', iconLight: 'rgba(180,110,10,0.06)' },
  teal:    { color: '#14B8A6', darkGrad: 'rgba(20,184,166,0.05)',   lightGrad: 'rgba(15,140,130,0.08)', iconDark: 'rgba(20,184,166,0.06)', iconLight: 'rgba(15,140,130,0.06)' },
  violet:  { color: '#A78BFA', darkGrad: 'rgba(167,139,250,0.05)', lightGrad: 'rgba(120,90,220,0.08)', iconDark: 'rgba(167,139,250,0.06)', iconLight: 'rgba(100,70,200,0.06)' },
  indigo:  { color: '#818CF8', darkGrad: 'rgba(129,140,248,0.05)', lightGrad: 'rgba(80,90,220,0.08)',  iconDark: 'rgba(129,140,248,0.06)', iconLight: 'rgba(80,90,200,0.06)' },
};

const StatCard = ({ title, value, subtitle, trend, trendLabel, icon: Icon, darkMode, chart, accent = 'gold' }) => {
  const a = STAT_ACCENTS[accent] || STAT_ACCENTS.gold;
  const borderColor = darkMode ? 'border-[#2E2E2E]' : 'border-gray-200';
  const textMuted = darkMode ? 'text-[#666666]' : 'text-gray-700';
  const textPrimary = darkMode ? 'text-[#F2F2F2]' : 'text-gray-900';

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-2xl p-5 transition-all duration-200 hover:shadow-lg group`}
      style={{
        background: darkMode
          ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${a.darkGrad} 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${a.lightGrad} 100%)`,
      }}
    >
      {/* Watermark Icon */}
      <div
        className="absolute -bottom-3 -right-3 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
        style={{ opacity: darkMode ? 0.05 : 0.07 }}
      >
        <Icon size={90} color={a.color} strokeWidth={1} />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{title}</p>
          <div className={`mt-2 text-2xl font-bold font-['JetBrains_Mono'] tabular-nums ${textPrimary}`}>{value}</div>
          {trendLabel && (
            <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-semibold font-['JetBrains_Mono'] rounded ${
              trend > 0
                ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]'
                : 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]'
            }`}>
              {trend > 0 ? '\u25B2' : '\u25BC'} {trendLabel}
            </span>
          )}
          <p className={`mt-2 text-xs ${textMuted}`}>{subtitle}</p>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: darkMode ? a.iconDark : a.iconLight }}
        >
          <Icon size={20} color={a.color} />
        </div>
      </div>
      {chart && <div className="relative z-10 mt-4">{chart}</div>}
    </div>
  );
};

const SmallCard = ({ title, value, subtitle, icon: Icon, darkMode, accent = 'gold' }) => {
  const a = STAT_ACCENTS[accent] || STAT_ACCENTS.gold;
  const borderColor = darkMode ? 'border-[#2E2E2E]' : 'border-gray-200';
  const textMuted = darkMode ? 'text-[#666666]' : 'text-gray-700';
  const textPrimary = darkMode ? 'text-[#F2F2F2]' : 'text-gray-900';

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-2xl p-4 transition-all duration-200 hover:shadow-lg group`}
      style={{
        background: darkMode
          ? `linear-gradient(135deg, #121212 0%, #121212 65%, ${a.darkGrad} 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #ffffff 60%, ${a.lightGrad} 100%)`,
      }}
    >
      {/* Watermark Icon */}
      <div
        className="absolute -bottom-2 -right-2 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] pointer-events-none"
        style={{ opacity: darkMode ? 0.04 : 0.06 }}
      >
        <Icon size={72} color={a.color} strokeWidth={1} />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{title}</p>
          <div className={`mt-2 text-xl font-bold font-['JetBrains_Mono'] tabular-nums ${textPrimary}`}>{value}</div>
          <p className={`mt-1 text-xs ${textMuted}`}>{subtitle}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: darkMode ? a.iconDark : a.iconLight }}
        >
          <Icon size={18} color={a.color} />
        </div>
      </div>
    </div>
  );
};

const HomeScreen = ({ darkMode = true }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const panelBg = darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200';
  const textMuted = darkMode ? 'text-[#666666]' : 'text-gray-700';
  const textPrimary = darkMode ? 'text-[#F2F2F2]' : 'text-gray-900';

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

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const data = await budgetService.getStatistics();
        if (data) {
          setStats({
            totalSales: data.totalSales || data.totalBudget || '0',
            budgetUtilization: data.budgetUtilization || data.utilization || '0%',
            avgMargin: data.avgMargin || '0%',
            sellThrough: data.sellThrough || '0%',
            totalBrands: String(data.totalBrands || data.brandCount || 0),
            categories: String(data.categories || data.categoryCount || 0),
            pendingApprovals: String(data.pendingApprovals || data.pendingCount || 0),
            activePlans: String(data.activePlans || data.planCount || 0)
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div>
            <h2 className={`text-xl font-bold font-['Montserrat'] ${textPrimary}`}>{t('home.welcomeBack', { name: userName })}</h2>
            <p className={`text-sm ${textMuted}`}>{t('home.subtitle')}</p>
          </div>
        </div>
        <span className="inline-flex px-4 py-2 text-xs font-semibold uppercase tracking-wider font-['Montserrat'] rounded-full bg-[rgba(215,183,151,0.15)] text-[#D7B797] border border-[rgba(215,183,151,0.3)]">
          {t('home.springSummer2025')}
        </span>
      </div>

      {/* Filter Bar */}
      <div className={`border ${panelBg} rounded-lg p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold uppercase rounded bg-[rgba(18,119,73,0.15)] text-[#2A9E6A] border border-[rgba(18,119,73,0.4)]">
            <span className="w-2 h-2 rounded-full bg-[#127749]"></span>
            {t('common.live').toUpperCase()}
          </span>
          {[
            { label: t('home.season'), value: 'SS25' },
            { label: t('home.brand'), value: t('home.allBrands') },
            { label: t('home.region'), value: t('home.vietnam') }
          ].map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-150 ${
                darkMode
                  ? 'border-[#2E2E2E] text-[#999999] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)] hover:text-[#D7B797]'
                  : 'border-gray-200 text-gray-600 hover:bg-[rgba(215,183,151,0.15)] hover:border-[rgba(184,153,112,0.4)] hover:text-[#8A6340]'
              }`}
            >
              <span className="uppercase tracking-wide text-[10px]">{item.label}</span>
              <span className={`text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'}`}>{item.value}</span>
              <ChevronDown size={14} />
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-2 ${textMuted}`}>
              <span className="w-2 h-2 rounded-full bg-[#127749]"></span>
              {t('common.updatedJustNow')}
            </span>
            <button className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-150 ${
              darkMode
                ? 'border-[#2E2E2E] text-[#999999] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)] hover:text-[#D7B797]'
                : 'border-gray-200 text-gray-600 hover:bg-[rgba(215,183,151,0.15)] hover:text-[#8A6340]'
            }`}>
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard
          title={t('home.totalSales')}
          value="12,5 T d"
          trend={12.5}
          trendLabel="12.5%"
          subtitle={t('home.unitsVsLastSeason')}
          icon={DollarSign}
          darkMode={darkMode}
          accent="gold"
          chart={(
            <svg viewBox="0 0 160 40" className="w-full h-10">
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
          value="57%"
          trend={8.2}
          trendLabel="8.2%"
          subtitle={t('home.thisMonth')}
          icon={Target}
          darkMode={darkMode}
          accent="emerald"
          chart={(
            <svg viewBox="0 0 160 40" className="w-full h-10">
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
          value="42.5%"
          trend={2.3}
          trendLabel="2.3%"
          subtitle={t('home.acrossCategories')}
          icon={Percent}
          darkMode={darkMode}
          accent="blue"
        />
        <StatCard
          title={t('home.sellThrough')}
          value="68.3%"
          trend={-1.5}
          trendLabel="1.5%"
          subtitle={t('home.currentSeasonPerformance')}
          icon={ShoppingCart}
          darkMode={darkMode}
          accent="rose"
        />
      </div>

      {/* Small Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SmallCard
          title={t('home.totalBrands')}
          value={stats.totalBrands}
          subtitle={t('home.activeBrands')}
          icon={Building2}
          darkMode={darkMode}
          accent="amber"
        />
        <SmallCard
          title={t('home.categoriesTitle')}
          value={stats.categories}
          subtitle={t('home.productCategories')}
          icon={Boxes}
          darkMode={darkMode}
          accent="teal"
        />
        <SmallCard
          title={t('home.pendingApprovals')}
          value={stats.pendingApprovals}
          subtitle={t('home.itemsAwaitingReview')}
          icon={ClipboardCheck}
          darkMode={darkMode}
          accent="violet"
        />
        <SmallCard
          title={t('home.activePlans')}
          value={stats.activePlans}
          subtitle={t('home.otbPlansInProgress')}
          icon={BarChart3}
          darkMode={darkMode}
          accent="indigo"
        />
      </div>

      {/* Charts & Alerts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Sales Performance Chart */}
        <div className={`border ${panelBg} rounded-lg p-5 transition-all duration-150 hover:border-[rgba(215,183,151,0.25)]`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold font-['Montserrat'] ${textPrimary}`}>{t('home.salesPerformance')}</h3>
              <p className={`text-xs ${textMuted}`}>{t('home.monthlyComparison')}</p>
            </div>
            <span className="inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-wider font-['Montserrat'] rounded-full bg-[rgba(215,183,151,0.15)] text-[#D7B797] border border-[rgba(215,183,151,0.3)]">
              {t('common.liveData')}
            </span>
          </div>
          <div className="mt-5">
            <svg viewBox="0 0 520 220" className="w-full h-56">
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D7B797" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D7B797" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="30" y1="180" x2="500" y2="180" stroke={darkMode ? '#2E2E2E' : '#e5e7eb'} strokeDasharray="6 6" />
              <line x1="30" y1="120" x2="500" y2="120" stroke={darkMode ? '#2E2E2E' : '#e5e7eb'} strokeDasharray="6 6" />
              <line x1="30" y1="60" x2="500" y2="60" stroke={darkMode ? '#2E2E2E' : '#e5e7eb'} strokeDasharray="6 6" />
              <path
                d="M30 180 L90 160 L150 140 L210 130 L270 115 L330 100 L390 85 L450 70 L500 60 L500 200 L30 200 Z"
                fill="url(#salesFill)"
              />
              <polyline
                fill="none"
                stroke="#D7B797"
                strokeWidth="3"
                points="30,180 90,160 150,140 210,130 270,115 330,100 390,85 450,70 500,60"
              />
              <polyline
                fill="none"
                stroke="#127749"
                strokeDasharray="6 6"
                strokeWidth="2"
                points="30,190 90,170 150,155 210,140 270,130 330,118 390,108 450,98 500,88"
              />
            </svg>
          </div>
        </div>

        {/* Active Alerts */}
        <div className={`border ${panelBg} rounded-lg p-5 transition-all duration-150 hover:border-[rgba(215,183,151,0.25)]`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(215,183,151,0.1)]'
              }`}>
                <Bell size={18} className="text-[#D7B797]" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold font-['Montserrat'] ${textPrimary}`}>{t('home.activeAlerts')}</h3>
                <p className={`text-xs ${textMuted}`}>{t('home.activeAlertsCount', { count: 4 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-[rgba(248,81,73,0.15)] text-[#FF7B72] font-semibold">1</span>
              <span className="px-2 py-1 rounded bg-[rgba(210,153,34,0.15)] text-[#E3B341] font-semibold">1</span>
              <span className="px-2 py-1 rounded bg-[rgba(88,166,255,0.15)] text-[#79C0FF] font-semibold">1</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Critical Alert */}
            <div className={`border rounded-lg p-4 transition-all duration-150 border-[rgba(248,81,73,0.3)] bg-[rgba(248,81,73,0.08)] hover:border-[rgba(248,81,73,0.5)]`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(248,81,73,0.2)]">
                  <Bell size={16} className="text-[#F85149]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${textPrimary}`}>{t('home.lowStockAlert')}</span>
                    <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>{t('home.timeAgo15m')}</span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {t('home.lowStockMessage')}
                  </p>
                  <button className="mt-2 text-xs font-semibold text-[#FF7B72] hover:text-[#F85149] transition-colors">{t('common.viewDetails')}</button>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <div className={`border rounded-lg p-4 transition-all duration-150 border-[rgba(210,153,34,0.3)] bg-[rgba(210,153,34,0.08)] hover:border-[rgba(210,153,34,0.5)]`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(210,153,34,0.2)]">
                  <TrendingUp size={16} className="text-[#D29922]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${textPrimary}`}>{t('home.budgetThresholdWarning')}</span>
                    <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>{t('home.timeAgo1h')}</span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {t('home.budgetThresholdMessage')}
                  </p>
                  <button className="mt-2 text-xs font-semibold text-[#E3B341] hover:text-[#D29922] transition-colors">{t('common.viewDetails')}</button>
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <div className={`border rounded-lg p-4 transition-all duration-150 border-[rgba(88,166,255,0.3)] bg-[rgba(88,166,255,0.08)] hover:border-[rgba(88,166,255,0.5)]`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(88,166,255,0.2)]">
                  <BarChart3 size={16} className="text-[#58A6FF]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${textPrimary}`}>{t('home.salesSpike')}</span>
                    <span className={`text-xs font-['JetBrains_Mono'] ${textMuted}`}>{t('home.timeAgo3h')}</span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                    {t('home.salesSpikeMessage')}
                  </p>
                  <button className="mt-2 text-xs font-semibold text-[#79C0FF] hover:text-[#58A6FF] transition-colors">{t('common.viewDetails')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
