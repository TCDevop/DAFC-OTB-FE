'use client';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ROUTE_MAP } from '@/utils/routeMap';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/contexts/AppContext';
import { notificationService, type Notification } from '@/services/notificationService';
import { budgetService } from '@/services/budgetService';
import { proposalService } from '@/services/proposalService';
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
  ChevronRight,
  Home,
  Search,
  Command,
  User,
  Settings,
  Save,
  Plus,
  ChevronDown,
  Layers,
  LineChart,
  PieChart,
  Activity,
  Loader2,
  Printer,
  Download
} from 'lucide-react';

// Screen configuration builder (uses t() for translations)
const getScreenConfig = (t: any) => ({
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
    shortLabel: 'Budget',
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
  },
  'analytics-sales': {
    label: t('analytics.salesPerformance', 'Sales Performance'),
    shortLabel: 'Sales',
    icon: LineChart,
    step: null,
    kpiLabel: t('analytics.salesPerformance', 'Sales'),
    kpiDescription: t('analytics.salesDesc', 'SKU performance analysis')
  },
  'analytics-budget': {
    label: t('analytics.budgetAnalytics', 'Budget Analytics'),
    shortLabel: 'Budget',
    icon: PieChart,
    step: null,
    kpiLabel: t('analytics.budgetAnalytics', 'Budget'),
    kpiDescription: t('analytics.budgetDesc', 'Budget utilization trends')
  },
  'analytics-trends': {
    label: t('analytics.categoryTrends', 'Category Trends'),
    shortLabel: 'Trends',
    icon: Activity,
    step: null,
    kpiLabel: t('analytics.categoryTrends', 'Trends'),
    kpiDescription: t('analytics.trendsDesc', 'Attribute trends and YoY comparison')
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

const AppHeader = ({
  currentScreen,
  kpiData = {}
}: any) => {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { isMobile } = useIsMobile();
  const { triggerSave, hasSaveHandler, triggerSaveAsNew, hasSaveAsNewHandler, triggerCreateBudget, triggerExport, hasExportHandler } = useAppContext();
  const SCREEN_CONFIG: any = useMemo(() => getScreenConfig(t), [t]);
  const onNavigate = (screenId: any) => {
    const route = ROUTE_MAP[screenId];
    if (route) {
      router.push(route);
    }
  };
  const currentConfig = SCREEN_CONFIG[currentScreen] || SCREEN_CONFIG['home'];
  const CurrentIcon = currentConfig.icon || Home;

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [openSaveMenu, setOpenSaveMenu] = useState(false);
  const saveButtonRef = useRef<any>(null);
  const saveMenuRef = useRef<any>(null);
  const [saveMenuPosition, setSaveMenuPosition] = useState({ top: 0, right: 0 });
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef<any>(null);
  const searchRef = useRef<any>(null);

  // Search results from screen config (always synchronous)
  const screenResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.entries(SCREEN_CONFIG)
      .filter(([id, cfg]: any) => {
        const label = (cfg.label || '').toLowerCase();
        const shortLabel = (cfg.shortLabel || '').toLowerCase();
        return label.includes(q) || shortLabel.includes(q) || id.includes(q);
      })
      .map(([id, cfg]: any) => ({ id, ...cfg }))
      .slice(0, 5);
  }, [searchQuery, SCREEN_CONFIG]);

  // Data search: budgets + proposals (debounced, 3+ chars)
  const [dataLoading, setDataLoading] = useState(false);
  const [budgetResults, setBudgetResults] = useState<any[]>([]);
  const [proposalResults, setProposalResults] = useState<any[]>([]);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3) {
      setBudgetResults([]);
      setProposalResults([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [budgets, proposals] = await Promise.all([
          budgetService.getAll().catch(() => []),
          proposalService.getAll().catch(() => []),
        ]);
        const bList = Array.isArray(budgets) ? budgets : [];
        const pList = Array.isArray(proposals) ? proposals : [];

        setBudgetResults(
          bList
            .filter((b: any) => {
              const name = (b.name || b.budgetName || '').toLowerCase();
              const code = (b.budgetCode || '').toLowerCase();
              return name.includes(q) || code.includes(q);
            })
            .slice(0, 5)
        );
        setProposalResults(
          pList
            .filter((p: any) => {
              const name = (p.name || p.ticketName || '').toLowerCase();
              const code = (p.proposalCode || p.ticketCode || '').toLowerCase();
              return name.includes(q) || code.includes(q);
            })
            .slice(0, 5)
        );
      } catch {
        setBudgetResults([]);
        setProposalResults([]);
      } finally {
        setDataLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const hasAnyResults = screenResults.length > 0 || budgetResults.length > 0 || proposalResults.length > 0;

  const isInPlanningWorkflow = PLANNING_STEPS.some((s: any) => s.id === currentScreen);
  const currentStepIndex = PLANNING_STEPS.findIndex((s: any) => s.id === currentScreen);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
        setSearchQuery('');
      }
      if (
        saveButtonRef.current && !saveButtonRef.current.contains(event.target) &&
        saveMenuRef.current && !saveMenuRef.current.contains(event.target)
      ) {
        setOpenSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications on mount and poll every 60s
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await notificationService.getAll(20);
      setNotifications(data);
    } catch { /* silent */ }
    finally { setNotifLoading(false); }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <div className="sticky top-0 z-40 shrink-0" style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf9 100%)',
    }}>
      {/* Main Header */}
      <div className="h-11 px-6 flex items-center justify-between" style={{
        borderBottom: '1px solid #D1D5DB',
        background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.04) 100%)',
      }}>
        {/* Left - Breadcrumb Navigation */}
        <div className="flex items-center gap-2.5">
          {/* Home Icon */}
          <button
            onClick={() => onNavigate('home')}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(215,183,151,0.12) 0%, rgba(215,183,151,0.22) 100%)',
              border: '1px solid rgba(215,183,151,0.25)',
            }}
          >
            <Home size={14} strokeWidth={2} className="text-[#6B4D30]" style={{ filter: 'none' }} />
          </button>

          {/* Breadcrumb Trail */}
          <nav className="flex items-center gap-1">
            <ChevronRight size={11} className="text-gray-300" />
            <span className="text-[11px] font-semibold font-['Montserrat'] text-gray-900">
              {currentConfig.label || 'Dashboard'}
            </span>
          </nav>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-0.5">
          {/* Search Button */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border transition-all duration-200 border-gray-300 hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.06)]"
            >
              <Search size={13} className="text-gray-600" />
              <span className="text-[11px] hidden sm:block text-gray-600">
                {t('header.searchPlaceholder')}
              </span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1 py-px rounded text-[9px] font-['JetBrains_Mono'] bg-gray-100 text-gray-500 border border-gray-300">
                <Command size={8} />K
              </kbd>
            </button>

            {/* Search Modal */}
            {showSearch && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] md:w-96 rounded-xl shadow-2xl border overflow-hidden z-[9999] bg-white border-gray-300">
                <div className="p-3 border-b border-gray-300">
                  <div className="flex items-center gap-3">
                    <Search size={18} className="text-gray-600" />
                    <input
                      type="text"
                      placeholder={t('header.searchScreens')}
                      autoFocus
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter' && screenResults.length > 0) {
                          onNavigate(screenResults[0].id);
                          setShowSearch(false);
                          setSearchQuery('');
                        }
                      }}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-500"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-0.5 rounded text-gray-500 hover:text-gray-700">
                        <span className="text-xs">{t('common.clearAll') || 'Clear'}</span>
                      </button>
                    )}
                  </div>
                </div>
                {/* Search Results */}
                {searchQuery.trim() ? (
                  <div className="py-0.5 max-h-80 overflow-y-auto">
                    {/* Screens group */}
                    {screenResults.length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider font-['JetBrains_Mono'] text-gray-400">
                          {t('header.searchCategoryScreens')}
                        </div>
                        {screenResults.map((result: any) => {
                          const ResultIcon = result.icon || Home;
                          return (
                            <button
                              key={result.id}
                              onClick={() => {
                                onNavigate(result.id);
                                setShowSearch(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-1.5 transition-colors hover:bg-gray-50 text-gray-900"
                            >
                              <ResultIcon size={16} className="text-[#6B4D30]" />
                              <div className="flex-1 text-left">
                                <div className={`text-sm font-medium font-['Montserrat']`}>{result.label}</div>
                                {result.step && (
                                  <div className="text-xs text-gray-600">Step {result.step}</div>
                                )}
                              </div>
                              <ChevronRight size={14} className="text-gray-300" />
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Budgets group */}
                    {budgetResults.length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider font-['JetBrains_Mono'] text-gray-400">
                          {t('header.searchCategoryBudgets')}
                        </div>
                        {budgetResults.map((b: any) => (
                          <button
                            key={b.id || b._id}
                            onClick={() => {
                              router.push('/budget-management');
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-1.5 transition-colors hover:bg-gray-50 text-gray-900"
                          >
                            <Wallet size={16} className="text-[#6B4D30]" />
                            <div className="flex-1 text-left">
                              <div className={`text-sm font-medium font-['Montserrat']`}>{b.name || b.budgetName || 'Untitled'}</div>
                              <div className="text-xs text-gray-600">
                                {b.budgetCode || b.status || ''}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300" />
                          </button>
                        ))}
                      </>
                    )}

                    {/* Proposals group */}
                    {proposalResults.length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider font-['JetBrains_Mono'] text-gray-400">
                          {t('header.searchCategoryProposals')}
                        </div>
                        {proposalResults.map((p: any) => (
                          <button
                            key={p.id || p._id}
                            onClick={() => {
                              router.push('/proposal');
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-1.5 transition-colors hover:bg-gray-50 text-gray-900"
                          >
                            <Package size={16} className="text-[#6B4D30]" />
                            <div className="flex-1 text-left">
                              <div className={`text-sm font-medium font-['Montserrat']`}>{p.name || p.ticketName || 'Untitled'}</div>
                              <div className="text-xs text-gray-600">
                                {p.proposalCode || p.ticketCode || p.status || ''}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300" />
                          </button>
                        ))}
                      </>
                    )}

                    {/* Loading spinner for data search */}
                    {dataLoading && (
                      <div className="px-4 py-3 flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">{t('common.loading')}...</span>
                      </div>
                    )}

                    {/* Hint for short queries */}
                    {searchQuery.trim().length < 3 && searchQuery.trim().length > 0 && screenResults.length === 0 && (
                      <div className="px-4 py-4 text-center text-xs text-gray-500">
                        {t('header.searchTyping')}
                      </div>
                    )}

                    {/* No results at all */}
                    {!dataLoading && !hasAnyResults && searchQuery.trim().length >= 3 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-600">
                        {t('header.searchNoResults')}
                      </div>
                    )}

                    {/* Short query, no screen matches, hint to type more */}
                    {!dataLoading && !hasAnyResults && searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                      <div className="px-4 py-4 text-center text-xs text-gray-500">
                        {t('header.searchTyping')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 text-center text-xs text-gray-600">
                    {t('header.typeToSearch')} <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-600">ESC</kbd> {t('header.toClose')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-4 mx-1" style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(215,183,151,0.25) 50%, transparent 100%)',
          }} />

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
            className="relative p-1.5 rounded-md transition-all duration-200 group hover:bg-[rgba(160,120,75,0.08)]"
            title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
          >
            <span className="text-[11px] font-bold font-['JetBrains_Mono'] text-[#6B4D30]">
              {language === 'en' ? 'EN' : 'VN'}
            </span>
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
              className={`relative p-1.5 rounded-md transition-all duration-200 ${
                showNotifications
                  ? 'bg-[rgba(215,183,151,0.12)]'
                  : 'hover:bg-[rgba(160,120,75,0.08)]'
              }`}
            >
              <Bell size={15} strokeWidth={2} className={
                showNotifications
                  ? 'text-[#D7B797]'
                  : 'text-gray-600'
              } style={showNotifications ? { filter: 'drop-shadow(0 0 3px rgba(215,183,151,0.4))' } : undefined} />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F85149] text-white text-[8px] font-bold flex items-center justify-center"
                  style={{ border: '1.5px solid #ffffff' }}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] md:w-80 rounded-xl shadow-2xl border overflow-hidden z-50 bg-white border-gray-300">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-[#6B4D30]" />
                    <h3 className="text-sm font-semibold font-['Montserrat'] text-gray-900">
                      {t('header.notifications') || 'Notifications'}
                    </h3>
                  </div>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-semibold font-['JetBrains_Mono'] px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                      {notifications.length}
                    </span>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifLoading && notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('header.noAlerts')}
                    </div>
                  ) : (
                    <div className="py-1">
                      {notifications.map((notif) => {
                        const severityColors: Record<string, string> = {
                          success: 'text-[#2A9E6A]',
                          error: 'text-[#F85149]',
                          warning: 'text-[#E3B341]',
                          info: 'text-[#58A6FF]',
                        };
                        const severityBg: Record<string, string> = {
                          success: 'bg-[rgba(42,158,106,0.12)]',
                          error: 'bg-[rgba(248,81,73,0.12)]',
                          warning: 'bg-[rgba(227,179,65,0.12)]',
                          info: 'bg-[rgba(88,166,255,0.12)]',
                        };
                        const timeAgo = (date: string) => {
                          const diff = Date.now() - new Date(date).getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 1) return 'just now';
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        };
                        return (
                          <div
                            key={notif.id}
                            className="px-4 py-2.5 border-b last:border-b-0 transition-colors border-gray-100 hover:bg-gray-50"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${severityBg[notif.severity] || severityBg.info}`}>
                                <Bell size={11} className={severityColors[notif.severity] || severityColors.info} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold font-['Montserrat'] text-gray-900">
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] font-['JetBrains_Mono'] text-gray-500">
                                    {timeAgo(notif.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[11px] mt-0.5 leading-snug text-gray-600">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Stepper Bar - Show for all Planning workflow screens */}
      {isInPlanningWorkflow && (
        <div className={`px-6 ${isMobile ? 'py-1' : 'py-3'}`} style={{
          borderBottom: '1px solid #D1D5DB',
          background: 'linear-gradient(90deg, #FAFAFA 0%, #ffffff 50%, #FAFAFA 100%)',
          minHeight: isMobile ? undefined : '56px',
        }}>
          <div className="flex items-center gap-4">
            {/* Back Arrow */}
            {currentStepIndex > 0 && !isMobile && (
              <button
                onClick={() => onNavigate(PLANNING_STEPS[currentStepIndex - 1].id)}
                className="p-1 rounded-md transition-colors shrink-0 hover:bg-gray-100 text-gray-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {/* Step Progress — dot + line, fills remaining width */}
            {isMobile ? (
              <div className="flex items-center gap-1.5 flex-1 justify-between">
                {PLANNING_STEPS.map((step: any, index: any) => {
                  const config = SCREEN_CONFIG[step.id];
                  const Icon = config.icon;
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <React.Fragment key={step.id}>
                      {index > 0 && (
                        <div className="flex-1 h-[2px] rounded-full" style={{ background: isCompleted ? '#127749' : '#E5E7EB' }} />
                      )}
                      <button
                        onClick={() => onNavigate(step.id)}
                        className="flex items-center justify-center rounded-lg p-1 transition-all duration-200"
                        style={{
                          background: isCurrent
                            ? 'rgba(18,119,73,0.12)'
                            : isCompleted ? 'rgba(18,119,73,0.08)' : 'transparent',
                          border: `1px solid ${isCurrent ? 'rgba(18,119,73,0.25)' : 'transparent'}`,
                        }}
                      >
                        <div className={`p-1.5 rounded-lg ${
                          isCurrent || isCompleted ? 'bg-[#127749]' : 'bg-gray-200'
                        }`}>
                          <Icon size={14} className={isCurrent || isCompleted ? 'text-white' : 'text-gray-500'} strokeWidth={2} />
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 relative flex items-start">
                {PLANNING_STEPS.map((step: any, index: any) => {
                  const config = SCREEN_CONFIG[step.id];
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isLast = index === PLANNING_STEPS.length - 1;
                  return (
                    <React.Fragment key={step.id}>
                      {/* Step node */}
                      <button
                        onClick={() => onNavigate(step.id)}
                        className="flex flex-col items-center shrink-0 group/step relative z-10"
                        style={{ width: 'auto' }}
                      >
                        {/* Dot */}
                        <div className="relative flex items-center justify-center">
                          {isCurrent && (
                            <span className="absolute w-3 h-3 rounded-full bg-[#127749] animate-[stepper-ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-0" />
                          )}
                          <div className={`w-3 h-3 rounded-full transition-all duration-200 relative z-10 ${
                            isCurrent || isCompleted
                              ? 'bg-[#127749] shadow-[0_0_0_3px_rgba(18,119,73,0.2)]'
                              : 'bg-[#D1D5DB] group-hover/step:bg-[#B0B0B0]'
                          }`} />
                        </div>
                        {/* Label */}
                        <span className={`mt-1.5 text-[11px] font-semibold font-['Montserrat'] whitespace-nowrap transition-colors ${
                          isCurrent ? 'text-[#6B4D30]' : isCompleted ? 'text-[#8B7355]' : 'text-gray-400 group-hover/step:text-gray-500'
                        }`}>
                          {config.shortLabel}
                        </span>
                      </button>
                      {/* Connector line — stretches between dots */}
                      {!isLast && (
                        <div className="flex-1 flex items-center px-0 mt-[5px]">
                          <div className="w-full h-[2px] rounded-full" style={{
                            background: index < currentStepIndex
                              ? '#127749'
                              : '#E5E7EB',
                          }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Export + Save/CreateBudget — hidden on Tickets pages */}
            {currentScreen !== 'tickets' && currentScreen !== 'ticket-detail' && (
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={hasExportHandler ? triggerExport : () => window.print()}
                className="no-print px-1.5 py-1 rounded-lg transition-colors text-[#666] hover:bg-[rgba(160,120,75,0.12)] hover:text-[#6B4D30]"
                title="Export"
              >
                <Download size={14} />
              </button>
              {currentScreen === 'budget-management' ? (
                <button
                  onClick={triggerCreateBudget}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#127749] text-white rounded-lg hover:bg-[#2A9E6A] transition-colors shadow-sm text-xs font-medium font-['Montserrat'] shrink-0"
                >
                  <Plus size={14} />
                  {t('budget.createBudget')}
                </button>
              ) : (
                <div className="relative" ref={saveButtonRef}>
                  <div className="inline-flex items-stretch rounded-lg border border-[rgba(215,183,151,0.3)] overflow-hidden">
                    <button
                      onClick={async () => {
                        if (hasSaveHandler) {
                          await triggerSave();
                        } else {
                          toast.success(t('header.save'));
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 transition-colors bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684] text-xs font-semibold font-['Montserrat']"
                      title={t('header.save')}
                    >
                      <Save size={13} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!openSaveMenu && saveButtonRef.current) {
                          const rect = saveButtonRef.current.getBoundingClientRect();
                          setSaveMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                        }
                        setOpenSaveMenu(!openSaveMenu);
                      }}
                      className="flex items-center px-1.5 py-1 border-l border-[rgba(26,26,26,0.15)] transition-colors bg-[#D7B797] text-[#0A0A0A] hover:bg-[#C4A684]"
                    >
                      <ChevronDown size={12} className={`transition-transform ${openSaveMenu ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Save Dropdown Menu - Portal to body */}
      {openSaveMenu && createPortal(
        <div
          ref={saveMenuRef}
          className="fixed w-56 border rounded-xl shadow-2xl overflow-hidden bg-white border-[#C4B5A5]"
          style={{
            top: saveMenuPosition.top,
            right: saveMenuPosition.right,
            zIndex: 99999
          }}
        >
          <button
            onClick={async () => {
              if (hasSaveHandler) {
                await triggerSave();
              } else {
                toast.success(t('header.save'));
              }
              setOpenSaveMenu(false);
            }}
            className="w-full px-4 py-0.5 flex items-center gap-3 text-left text-sm font-medium transition-colors hover:bg-[rgba(215,183,151,0.15)] text-[#0A0A0A]"
          >
            <Save size={14} className="shrink-0" />
            {t('header.save')}
          </button>
          <button
            onClick={async () => {
              if (hasSaveAsNewHandler) {
                await triggerSaveAsNew();
              } else {
                toast.success(t('header.saveAsNewVersion'));
              }
              setOpenSaveMenu(false);
            }}
            className="w-full px-4 py-0.5 flex items-center gap-3 text-left text-sm font-medium border-t transition-colors border-[#C4B5A5] hover:bg-[rgba(215,183,151,0.15)] text-[#0A0A0A]"
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
