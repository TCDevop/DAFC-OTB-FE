'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { aiService } from '../../services/aiService';
import { ROUTE_MAP } from '@/utils/routeMap';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Wallet,
  DollarSign,
  BarChart3,
  Package,
  FileText,
  Ticket,
  FileCheck,
  ShoppingCart,
  Receipt,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Bell,
  XCircle,
  Sun,
  Moon,
  ChevronRight,
  Sparkles,
  Home,
  Search,
  Command,
  User,
  Settings,
  Save,
  ChevronDown,
  Layers
} from 'lucide-react';

// Screen configuration builder (uses t() for translations)
const getScreenConfig = (t) => ({
  'home': {
    label: t('screenConfig.dashboard'),
    shortLabel: 'Home',
    icon: Home,
    step: null,
    kpiLabel: t('header.kpiOverview'),
    kpiDescription: t('header.kpiSystemOverview')
  },
  'budget-management': {
    label: t('screenConfig.budgetManagement'),
    shortLabel: t('budget.title'),
    icon: Wallet,
    step: 1,
    kpiLabel: t('header.kpiBudgets'),
    kpiDescription: t('header.kpiBudgetsDesc')
  },
  'planning': {
    label: t('screenConfig.budgetAllocation'),
    shortLabel: t('header.kpiAllocated'),
    icon: DollarSign,
    step: 2,
    kpiLabel: t('header.kpiAllocated'),
    kpiDescription: t('header.kpiAllocatedDesc')
  },
  'otb-analysis': {
    label: t('screenConfig.otbAnalysis'),
    shortLabel: 'OTB',
    icon: BarChart3,
    step: 3,
    kpiLabel: t('header.kpiAnalyzed'),
    kpiDescription: t('header.kpiAnalyzedDesc')
  },
  'proposal': {
    label: t('screenConfig.skuProposal'),
    shortLabel: 'SKU',
    icon: Package,
    step: 4,
    kpiLabel: t('header.kpiSKUs'),
    kpiDescription: t('header.kpiSKUsDesc')
  },
  'dev-ticket': {
    label: t('screenConfig.devTicket'),
    shortLabel: 'Dev',
    icon: FileText,
    step: null,
    kpiLabel: t('header.kpiPages'),
    kpiDescription: t('header.kpiDocumentation')
  },
  'tickets': {
    label: t('screenConfig.tickets'),
    shortLabel: t('screenConfig.tickets'),
    icon: Ticket,
    step: 5,
    kpiLabel: t('header.kpiTicket'),
    kpiDescription: t('header.kpiTicketsPending')
  },
  'ticket-detail': {
    label: t('screenConfig.ticketDetail'),
    shortLabel: t('screenConfig.ticketDetail'),
    icon: Ticket,
    step: null,
    kpiLabel: t('header.kpiPending'),
    kpiDescription: t('header.kpiTicketsPending')
  },
  'approvals': {
    label: t('screenConfig.approvals'),
    shortLabel: t('screenConfig.approvals'),
    icon: FileCheck,
    step: null,
    kpiLabel: t('header.kpiPending'),
    kpiDescription: t('header.kpiAwaitingApproval')
  },
  'order-confirmation': {
    label: t('screenConfig.orderConfirmation'),
    shortLabel: t('header.kpiOrders'),
    icon: ShoppingCart,
    step: null,
    kpiLabel: t('header.kpiOrders'),
    kpiDescription: t('header.kpiOrdersConfirm')
  },
  'receipt-confirmation': {
    label: t('screenConfig.receiptConfirmation'),
    shortLabel: t('header.kpiReceipts'),
    icon: Receipt,
    step: null,
    kpiLabel: t('header.kpiReceipts'),
    kpiDescription: t('header.kpiReceiptsConfirm')
  },
  'profile': {
    label: t('screenConfig.myProfile'),
    shortLabel: t('header.kpiProfile'),
    icon: User,
    step: null,
    kpiLabel: t('header.kpiProfile'),
    kpiDescription: t('header.kpiUserProfile')
  },
  'settings': {
    label: t('screenConfig.settings'),
    shortLabel: t('header.kpiSettings'),
    icon: Settings,
    step: null,
    kpiLabel: t('header.kpiSettings'),
    kpiDescription: t('header.kpiAppSettings')
  }
});

// Planning workflow steps
const PLANNING_STEPS = [
  { id: 'budget-management', step: 1 },
  { id: 'planning', step: 2 },
  { id: 'otb-analysis', step: 3 },
  { id: 'proposal', step: 4 },
  { id: 'tickets', step: 5 }
];

const getAlertIcon = (severity) => {
  switch (severity) {
    case 'critical':
      return <XCircle size={14} className="text-[#F85149]" />;
    case 'warning':
      return <Clock size={14} className="text-[#E3B341]" />;
    case 'info':
      return <CheckCircle size={14} className="text-[#2A9E6A]" />;
    default:
      return <Bell size={14} className="text-[#D7B797]" />;
  }
};

const getAlertBg = (severity, darkMode) => {
  const styles = {
    critical: darkMode ? 'bg-[rgba(248,81,73,0.08)]' : 'bg-red-50',
    warning: darkMode ? 'bg-[rgba(227,179,65,0.08)]' : 'bg-amber-50',
    info: darkMode ? 'bg-[rgba(42,158,106,0.08)]' : 'bg-green-50',
  };
  return styles[severity] || '';
};

const AppHeader = ({
  currentScreen,
  darkMode = true,
  setDarkMode,
  kpiData = {}
}) => {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const SCREEN_CONFIG = useMemo(() => getScreenConfig(t), [t]);
  const onNavigate = (screenId) => {
    const route = ROUTE_MAP[screenId];
    if (route) {
      router.push(route);
    }
  };
  const currentConfig = SCREEN_CONFIG[currentScreen] || SCREEN_CONFIG['home'];
  const CurrentIcon = currentConfig.icon || Home;

  const [showNotifications, setShowNotifications] = useState(false);
  const [openSaveMenu, setOpenSaveMenu] = useState(false);
  const saveButtonRef = useRef(null);
  const [saveMenuPosition, setSaveMenuPosition] = useState({ top: 0, right: 0 });
  const [showSearch, setShowSearch] = useState(false);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);

  // Budget alerts state
  const [budgetAlerts, setBudgetAlerts] = useState([]);

  const fetchBudgetAlerts = useCallback(async () => {
    try {
      const data = await aiService.getBudgetAlerts({ unreadOnly: true });
      setBudgetAlerts(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail — alerts are non-critical
    }
  }, []);

  useEffect(() => {
    fetchBudgetAlerts();
    const interval = setInterval(fetchBudgetAlerts, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchBudgetAlerts]);

  const hasCritical = budgetAlerts.some(a => a.severity === 'critical');

  const isInPlanningWorkflow = PLANNING_STEPS.some(s => s.id === currentScreen);
  const currentStepIndex = PLANNING_STEPS.findIndex(s => s.id === currentScreen);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
      if (saveButtonRef.current && !saveButtonRef.current.contains(event.target)) {
        setOpenSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`sticky top-0 z-40 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
      {/* Main Header */}
      <div className={`h-14 px-6 flex items-center justify-between border-b ${
        darkMode ? 'border-[#1A1A1A]' : 'border-gray-200'
      }`}>
        {/* Left - Page Title */}
        <div className="flex items-center gap-4">
          {/* Icon with gradient background */}
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-[rgba(215,183,151,0.15)] to-[rgba(215,183,151,0.05)] border border-[rgba(215,183,151,0.2)]'
                : 'bg-gradient-to-br from-[rgba(215,183,151,0.2)] to-[rgba(215,183,151,0.08)] border border-[rgba(215,183,151,0.3)]'
            }`}>
              <CurrentIcon size={20} strokeWidth={2} className="text-[#D7B797]" />
            </div>
            {/* Active pulse indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#2A9E6A] border-2 border-[#0A0A0A]" />
          </div>

          {/* Title & Breadcrumb */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-semibold font-['Montserrat'] tracking-tight ${
                darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
              }`}>
                {currentConfig.label || 'Dashboard'}
              </h1>
              {currentConfig.step && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-['JetBrains_Mono'] uppercase tracking-wider ${
                  darkMode
                    ? 'bg-[rgba(215,183,151,0.12)] text-[#D7B797] border border-[rgba(215,183,151,0.2)]'
                    : 'bg-[rgba(215,183,151,0.15)] text-[#8A6340] border border-[rgba(215,183,151,0.3)]'
                }`}>
                  {t('common.step')} {currentConfig.step}
                </span>
              )}
            </div>
            {currentConfig.step && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>{t('header.planningBreadcrumb')}</span>
                <ChevronRight size={12} className={darkMode ? 'text-[#444444]' : 'text-gray-300'} />
                <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                  {currentConfig.shortLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {/* Search Button */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                darkMode
                  ? 'border-[#2E2E2E] hover:border-[rgba(215,183,151,0.3)] hover:bg-[rgba(160,120,75,0.08)]'
                  : 'border-gray-200 hover:border-[rgba(215,183,151,0.5)] hover:bg-[rgba(160,120,75,0.08)]'
              }`}
            >
              <Search size={16} className={darkMode ? 'text-[#666666]' : 'text-gray-600'} />
              <span className={`text-sm hidden sm:block ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
                {t('header.searchPlaceholder')}
              </span>
              <kbd className={`hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] ${
                darkMode
                  ? 'bg-[#1A1A1A] text-[#666666] border border-[#2E2E2E]'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <Command size={10} />K
              </kbd>
            </button>

            {/* Search Modal */}
            {showSearch && (
              <div className={`absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl border overflow-hidden ${
                darkMode
                  ? 'bg-[#121212] border-[#2E2E2E]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`p-3 border-b ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <Search size={18} className={darkMode ? 'text-[#666666]' : 'text-gray-600'} />
                    <input
                      type="text"
                      placeholder={t('header.searchScreens')}
                      autoFocus
                      className={`flex-1 bg-transparent text-sm outline-none ${
                        darkMode ? 'text-[#F2F2F2] placeholder:text-[#666666]' : 'text-gray-900 placeholder:text-gray-400'
                      }`}
                    />
                  </div>
                </div>
                <div className={`p-2 text-center text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
                  {t('header.typeToSearch')} <kbd className="px-1 py-0.5 rounded bg-[#1A1A1A] text-[#999999]">ESC</kbd> {t('header.toClose')}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`w-px h-6 mx-2 ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`} />

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
            className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
              darkMode
                ? 'hover:bg-[rgba(215,183,151,0.08)]'
                : 'hover:bg-[rgba(160,120,75,0.12)]'
            }`}
            title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
          >
            <span className={`text-sm font-semibold font-['JetBrains_Mono'] ${
                darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'
              }`}>
                {language === 'en' ? 'EN' : 'VN'}
              </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode && setDarkMode(!darkMode)}
            className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
              darkMode
                ? 'hover:bg-[rgba(215,183,151,0.08)]'
                : 'hover:bg-[rgba(160,120,75,0.12)]'
            }`}
            title={darkMode ? t('header.darkModeTitle') : t('header.lightModeTitle')}
          >
            <div className="relative w-5 h-5">
              {darkMode ? (
                <Moon size={20} strokeWidth={2} className="text-[#D7B797] transition-transform group-hover:-rotate-12" />
              ) : (
                <Sun size={20} strokeWidth={2} className="text-[#8A6340] transition-transform group-hover:rotate-45" />
              )}
            </div>
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                showNotifications
                  ? darkMode
                    ? 'bg-[rgba(215,183,151,0.12)] border border-[rgba(215,183,151,0.25)]'
                    : 'bg-[rgba(215,183,151,0.15)] border border-[rgba(215,183,151,0.3)]'
                  : darkMode
                    ? 'hover:bg-[rgba(215,183,151,0.08)] border border-transparent'
                    : 'hover:bg-[rgba(160,120,75,0.12)] border border-transparent'
              }`}
            >
              <Bell size={20} strokeWidth={2} className={
                showNotifications
                  ? 'text-[#D7B797]'
                  : darkMode ? 'text-[#999999]' : 'text-gray-700'
              } />

              {/* Badge */}
              {budgetAlerts.length > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] flex items-center justify-center font-['JetBrains_Mono'] font-bold shadow-lg ${
                  hasCritical
                    ? 'bg-gradient-to-r from-[#F85149] to-[#FF6B6B] shadow-[rgba(248,81,73,0.3)] animate-pulse'
                    : 'bg-gradient-to-r from-[#D7B797] to-[#C4A584] shadow-[rgba(215,183,151,0.3)]'
                }`}>
                  {budgetAlerts.length > 9 ? '9+' : budgetAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden ${
                darkMode
                  ? 'bg-[#121212] border-[#2E2E2E]'
                  : 'bg-white border-gray-200'
              }`}>
                {/* Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  darkMode ? 'border-[#2E2E2E] bg-[#0A0A0A]' : 'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#D7B797]" />
                    <h3 className={`text-sm font-semibold font-['Montserrat'] ${
                      darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
                    }`}>
                      {t('header.budgetAlerts')}
                    </h3>
                  </div>
                  {budgetAlerts.length > 0 && (
                    <span className={`text-xs font-['JetBrains_Mono'] px-2 py-0.5 rounded-full ${
                      hasCritical
                        ? darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-600'
                        : darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {budgetAlerts.length} {budgetAlerts.length !== 1 ? t('header.alerts') : t('header.alert')}
                    </span>
                  )}
                </div>

                {/* Alert List */}
                <div className="max-h-80 overflow-y-auto">
                  {budgetAlerts.length === 0 ? (
                    <div className={`px-4 py-8 text-center text-sm ${darkMode ? 'text-[#666666]' : 'text-gray-400'}`}>
                      {t('header.noAlerts')}
                    </div>
                  ) : (
                    budgetAlerts.slice(0, 8).map((alert, idx) => (
                      <div
                        key={alert.id}
                        className={`px-4 py-3 flex gap-3 cursor-pointer transition-all duration-200 border-l-2 ${
                          darkMode
                            ? `hover:bg-[rgba(160,120,75,0.08)] border-transparent hover:border-[#D7B797] ${getAlertBg(alert.severity, darkMode)}`
                            : `hover:bg-[rgba(215,183,151,0.08)] border-transparent hover:border-[#D7B797] ${getAlertBg(alert.severity, darkMode)}`
                        } ${idx !== Math.min(budgetAlerts.length, 8) - 1 ? (darkMode ? 'border-b border-b-[#1A1A1A]' : 'border-b border-b-gray-100') : ''}`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          alert.severity === 'critical'
                            ? 'bg-[rgba(248,81,73,0.15)]'
                            : alert.severity === 'warning'
                              ? 'bg-[rgba(227,179,65,0.15)]'
                              : 'bg-[rgba(42,158,106,0.15)]'
                        }`}>
                          {getAlertIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
                          }`}>
                            {alert.title}
                          </div>
                          <div className={`text-xs mt-0.5 line-clamp-2 ${
                            darkMode ? 'text-[#999999]' : 'text-gray-700'
                          }`}>
                            {alert.message}
                          </div>
                          {alert.budget && (
                            <div className={`text-[10px] font-['JetBrains_Mono'] mt-1.5 ${
                              darkMode ? 'text-[#666666]' : 'text-gray-600'
                            }`}>
                              {alert.budget.groupBrand?.name} — {alert.budget.budgetCode}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className={`px-4 py-2.5 border-t ${
                  darkMode ? 'border-[#2E2E2E] bg-[#0A0A0A]' : 'border-gray-100 bg-gray-50'
                }`}>
                  <button className="w-full text-center text-xs font-semibold font-['Montserrat'] text-[#D7B797] hover:text-[#B89970] transition-colors py-1">
                    {t('header.viewAllAlerts')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Tracking Bar - Only show for Planning workflow */}
      {currentScreen !== 'budget-management' && isInPlanningWorkflow && (
        <div className={`px-6 py-2.5 border-b ${
          darkMode
            ? 'border-[#1A1A1A] bg-gradient-to-r from-[#0A0A0A] via-[#0D0D0D] to-[#0A0A0A]'
            : 'border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50'
        }`}>
          <div className="flex items-center gap-4">
            {/* Step Progress */}
            <div className="flex items-center gap-1.5">
              {PLANNING_STEPS.map((step, index) => {
                const config = SCREEN_CONFIG[step.id];
                const Icon = config.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const kpi = kpiData[step.id] || { value: 0, status: 'pending' };

                return (
                  <React.Fragment key={step.id}>
                    {index > 0 && (
                      <div className={`w-6 h-[2px] rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-[#127749] to-[#2A9E6A]'
                          : darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'
                      }`} />
                    )}
                    <button
                      onClick={() => onNavigate(step.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border ${
                        isCurrent
                          ? 'bg-gradient-to-r from-[rgba(215,183,151,0.15)] to-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.3)] shadow-sm shadow-[rgba(215,183,151,0.1)]'
                          : isCompleted
                            ? 'bg-gradient-to-r from-[rgba(18,119,73,0.12)] to-[rgba(18,119,73,0.05)] border-[rgba(18,119,73,0.3)]'
                            : darkMode
                              ? 'bg-[#121212] border-[#2E2E2E] hover:bg-[rgba(160,120,75,0.08)] hover:border-[rgba(215,183,151,0.2)]'
                              : 'bg-white border-gray-200 hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.3)]'
                      }`}
                    >
                      <div className={`p-1 rounded-md ${
                        isCurrent
                          ? 'bg-[#D7B797]'
                          : isCompleted
                            ? 'bg-[#127749]'
                            : darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle size={12} className="text-white" strokeWidth={2.5} />
                        ) : (
                          <Icon size={12} className={
                            isCurrent ? 'text-[#0A0A0A]' : darkMode ? 'text-[#666666]' : 'text-gray-700'
                          } strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="text-left">
                        <div className={`text-xs font-semibold font-['Montserrat'] ${
                          isCurrent
                            ? 'text-[#D7B797]'
                            : isCompleted
                              ? 'text-[#2A9E6A]'
                              : darkMode ? 'text-[#999999]' : 'text-gray-600'
                        }`}>
                          {config.shortLabel}
                        </div>
                        <div className="flex items-center gap-1">
                          {kpi.status === 'completed' ? (
                            <CheckCircle size={9} className="text-[#2A9E6A]" />
                          ) : kpi.status === 'in-progress' ? (
                            <Clock size={9} className="text-[#E3B341]" />
                          ) : (
                            <Target size={9} className={darkMode ? 'text-[#666666]' : 'text-gray-600'} />
                          )}
                          <span className={`text-[10px] font-['JetBrains_Mono'] ${
                            darkMode ? 'text-[#666666]' : 'text-gray-600'
                          }`}>
                            {kpi.value} {config.kpiLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Save Button - moved from BudgetAllocateScreen */}
            <div className="ml-auto relative" ref={saveButtonRef}>
              <div className="inline-flex rounded-xl shadow-lg shadow-[rgba(215,183,151,0.3)]">
                {/* Primary Save */}
                <button
                  onClick={() => console.log('Save')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-['Montserrat'] rounded-l-xl transition-colors ${
                    darkMode
                      ? 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684]'
                      : 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684]'
                  }`}
                >
                  <Save size={16} />
                  {t('header.save')}
                </button>

                {/* Dropdown Toggle */}
                <button
                  onClick={() => {
                    if (!openSaveMenu && saveButtonRef.current) {
                      const rect = saveButtonRef.current.getBoundingClientRect();
                      setSaveMenuPosition({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right
                      });
                    }
                    setOpenSaveMenu(!openSaveMenu);
                  }}
                  className={`px-3 py-2.5 rounded-r-xl border-l border-[rgba(26,26,26,0.2)] transition-colors ${
                    darkMode
                      ? 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684]'
                      : 'bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684]'
                  }`}
                >
                  <ChevronDown size={16} className={`transition-transform ${openSaveMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Dropdown Menu - Portal to body */}
      {openSaveMenu && createPortal(
        <div
          className={`fixed w-56 border rounded-xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
          }`}
          style={{
            top: saveMenuPosition.top,
            right: saveMenuPosition.right,
            zIndex: 99999
          }}
        >
          <button
            onClick={() => {
              console.log('Save');
              setOpenSaveMenu(false);
            }}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-medium transition-colors ${
              darkMode
                ? 'hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]'
                : 'hover:bg-[rgba(215,183,151,0.15)] text-[#0A0A0A]'
            }`}
          >
            <Save size={14} className="shrink-0" />
            {t('header.save')}
          </button>
          <button
            onClick={() => {
              console.log('Save As New Version');
              setOpenSaveMenu(false);
            }}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-medium border-t transition-colors ${
              darkMode
                ? 'border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.08)] text-[#F2F2F2]'
                : 'border-[#C4B5A5] hover:bg-[rgba(215,183,151,0.15)] text-[#0A0A0A]'
            }`}
          >
            <Layers size={14} className="shrink-0" />
            {t('header.saveAsNewVersion')}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AppHeader;
