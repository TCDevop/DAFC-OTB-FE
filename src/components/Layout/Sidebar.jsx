'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Package, BarChart3, Sparkles, TrendingUp,
  CheckCircle, ChevronRight, ShoppingCart,
  Edit, Filter, ChevronDown, Wallet, FileCheck,
  ClipboardList, Receipt, Ticket, Home, LogOut,
  Settings, Crown, PanelLeftClose,
  Database, Building2, FolderTree, Tag
} from 'lucide-react';
import { ROUTE_MAP } from '@/utils/routeMap';
import { useLanguage } from '@/contexts/LanguageContext';

const Sidebar = ({ currentScreen, darkMode, setDarkMode, user, onLogout }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const navigateTo = (screenId) => {
    const route = ROUTE_MAP[screenId];
    if (route) {
      router.push(route);
    }
  };
  const [isAIFeaturesOpen, setIsAIFeaturesOpen] = useState(false);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [openGroups, setOpenGroups] = useState({ planning: true, approval: false, confirmation: false });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isCollapsed = !isExpanded;

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const menuGroups = useMemo(() => [
    {
      id: 'planning',
      label: t('nav.planning'),
      icon: TrendingUp,
      items: [
        { id: 'budget-management', label: t('nav.budgetManagement'), icon: Wallet },
        { id: 'planning', label: t('nav.budgetAllocation'), icon: DollarSign },
        { id: 'otb-analysis', label: t('nav.otbAnalysis'), icon: BarChart3 },
        { id: 'proposal', label: t('nav.skuProposal'), icon: Package },
      ]
    },
    {
      id: 'approval',
      label: t('nav.approvalHub'),
      icon: CheckCircle,
      items: [
        { id: 'tickets', label: t('nav.tickets'), icon: Ticket },
        { id: 'approvals', label: t('nav.approvals'), icon: FileCheck },
        { id: 'approval-config', label: t('nav.workflowConfig'), icon: Settings },
      ]
    },
    {
      id: 'confirmation',
      label: t('nav.confirmation'),
      icon: ClipboardList,
      items: [
        { id: 'order-confirmation', label: t('nav.orderConfirm'), icon: ShoppingCart },
        { id: 'receipt-confirmation', label: t('nav.receiptConfirm'), icon: Receipt },
      ]
    }
  ], [t]);

  const getIconClass = (itemId) => {
    const isActive = currentScreen === itemId;
    if (isActive) {
      return 'text-[#D7B797]';
    }
    return darkMode
      ? 'text-[#666666] group-hover:text-[#D7B797]'
      : 'text-gray-600 group-hover:text-[#8A6340]';
  };

  const getTextClass = (itemId) => {
    const isActive = currentScreen === itemId;
    if (isActive) {
      return 'text-[#D7B797] font-bold';
    }
    return darkMode
      ? 'text-[#999999] font-semibold group-hover:text-[#D7B797]'
      : 'text-gray-600 font-semibold group-hover:text-[#8A6340]';
  };

  // Collapsed sidebar item with tooltip
  const CollapsedMenuItem = ({ item, showDividerAfter = false }) => {
    const isActive = currentScreen === item.id;
    const Icon = item.icon;

    return (
      <>
        <div className="relative">
          <button
            onClick={() => navigateTo(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`group relative w-full flex items-center justify-center h-10 rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-[rgba(215,183,151,0.12)]'
                : 'hover:bg-[rgba(215,183,151,0.08)]'
              }`}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#D7B797] rounded-r-full" />
            )}

            <Icon
              size={18}
              strokeWidth={isActive ? 2.5 : 2}
              className={`transition-all duration-200 ${
                isActive
                  ? 'text-[#D7B797]'
                  : 'text-[#666666] group-hover:text-[#D7B797]'
              }`}
            />
          </button>

          {/* Tooltip */}
          {hoveredItem === item.id && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className={`px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap text-xs font-medium font-['Montserrat']
                ${darkMode
                  ? 'bg-[#1A1A1A] text-[#F2F2F2] border border-[#2E2E2E]'
                  : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {item.label}
              </div>
              {/* Tooltip arrow */}
              <div className={`absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent
                ${darkMode ? 'border-r-[#1A1A1A]' : 'border-r-white'}`}
              />
            </div>
          )}
        </div>
        {showDividerAfter && (
          <div className="my-2 mx-2">
            <div className={`h-px ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`} />
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className={`${isCollapsed ? 'w-[60px]' : 'w-[264px]'} h-screen ${
        darkMode ? 'bg-[#0A0A0A] border-[#1A1A1A]' : 'bg-white border-gray-200'
      } border-r flex flex-col sticky top-0 transition-all duration-300 ease-in-out`}
    >
      {/* Logo Header */}
      <div className={`h-14 flex items-center justify-center border-b ${darkMode ? 'border-[#1A1A1A]' : 'border-gray-200'}`}>
        {isCollapsed ? (
          /* Collapsed - Click logo to expand */
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded-lg transition-all hover:bg-[rgba(215,183,151,0.08)]"
            title={t('components.expandSidebar')}
          >
            <img
              src="/dafc-logo.png"
              alt="DAFC"
              className="h-8 w-auto object-contain"
            />
          </button>
        ) : (
          /* Expanded - Show logo + collapse button */
          <div className="flex items-center gap-3 px-4 w-full">
            <img
              src="/dafc-logo.png"
              alt="DAFC"
              className="h-11 w-auto object-contain"
            />
            <div className="flex-1">
              <div className={`text-xs font-bold tracking-wider whitespace-nowrap ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
                {t('components.otbSystem')}
              </div>
            </div>
            {/* Collapse button */}
            <button
              onClick={() => setIsExpanded(false)}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                darkMode
                  ? 'text-[#666666] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)]'
                  : 'text-gray-500 hover:text-[#8A6340] hover:bg-[rgba(215,183,151,0.1)]'
              }`}
              title={t('components.collapseSidebar')}
            >
              <PanelLeftClose size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-3">
        {isCollapsed ? (
          /* Collapsed View - Clean icon list */
          <div className="px-2 space-y-1">
            {/* Home */}
            <CollapsedMenuItem item={{ id: 'home', label: t('nav.homeDashboard'), icon: Home }} showDividerAfter />

            {/* Main menu items */}
            {menuGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {group.items.map((item, itemIndex) => (
                  <CollapsedMenuItem
                    key={item.id}
                    item={item}
                    showDividerAfter={groupIndex < menuGroups.length - 1 && itemIndex === group.items.length - 1}
                  />
                ))}
              </div>
            ))}

            {/* Divider */}
            <div className="my-2 mx-2">
              <div className={`h-px ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`} />
            </div>

            {/* Master Data & Analytics */}
            <CollapsedMenuItem item={{ id: 'master-brands', label: t('nav.masterData'), icon: Database }} />
            <CollapsedMenuItem item={{ id: 'analytics', label: t('nav.analytics'), icon: BarChart3 }} showDividerAfter />

            {/* AI Features */}
            <div className="relative">
              <button
                onMouseEnter={() => setHoveredItem('ai')}
                onMouseLeave={() => setHoveredItem(null)}
                className="group w-full flex items-center justify-center h-10 rounded-lg transition-all duration-200 hover:bg-[rgba(163,113,247,0.08)]"
              >
                <Sparkles size={18} strokeWidth={2} className="text-[#A371F7]" />
              </button>
              {hoveredItem === 'ai' && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className={`px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap text-xs font-medium font-['Montserrat']
                    ${darkMode ? 'bg-[#1A1A1A] text-[#A371F7] border border-[#2E2E2E]' : 'bg-white text-[#A371F7] border border-gray-200'}`}
                  >
                    {t('nav.aiFeatures')}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="px-3 space-y-0.5">
            {/* Home */}
            <button
              onClick={() => navigateTo('home')}
              className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150`}
            >
              <Home size={18} strokeWidth={2.5} className={`transition-colors duration-150 ${getIconClass('home')}`} />
              <span className={`text-sm font-['Montserrat'] transition-colors duration-150 whitespace-nowrap ${getTextClass('home')}`}>{t('nav.homeDashboard')}</span>
            </button>

            {/* Menu Groups */}
            {menuGroups.map((group) => (
              <div key={group.id} className="pt-3">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="group w-full px-3 py-1.5 flex items-center justify-between rounded-lg transition-all duration-150"
                >
                  <div className="flex items-center gap-2">
                    <group.icon size={16} strokeWidth={2.5} className={`transition-colors duration-150 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
                    <span className={`font-bold text-xs uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>
                      {group.label}
                    </span>
                  </div>
                  <ChevronDown
                    size={12}
                    strokeWidth={2.5}
                    className={`${darkMode ? 'text-[#666666]' : 'text-gray-600'} transition-transform duration-200 ${
                      openGroups[group.id] ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Group Items */}
                {openGroups[group.id] && (
                  <div className="space-y-0.5 ml-2 pl-3 mt-1 border-l border-[rgba(215,183,151,0.15)]">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        className={`group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150`}
                      >
                        <item.icon size={16} strokeWidth={2.5} className={`transition-colors duration-150 ${getIconClass(item.id)}`} />
                        <span className={`text-sm font-['Montserrat'] transition-colors duration-150 whitespace-nowrap ${getTextClass(item.id)}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="py-2">
              <div className={`h-px ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`}></div>
            </div>

            {/* Master Data - Expandable */}
            <div>
              <button
                onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                className="group w-full px-3 py-1.5 flex items-center justify-between rounded-lg transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <Database size={16} strokeWidth={2.5} className={`transition-colors duration-150 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
                  <span className={`font-bold text-xs uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>
                    {t('nav.masterData')}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  className={`${darkMode ? 'text-[#666666]' : 'text-gray-600'} transition-transform duration-200 ${
                    isMasterDataOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isMasterDataOpen && (
                <div className="space-y-0.5 ml-2 pl-3 mt-1 border-l border-[rgba(215,183,151,0.15)]">
                  {[
                    { id: 'master-brands', label: t('nav.brands'), icon: Building2 },
                    { id: 'master-skus', label: t('nav.skuCatalog'), icon: Package },
                    { id: 'master-categories', label: t('nav.categories'), icon: FolderTree },
                    { id: 'master-subcategories', label: t('nav.subCategories'), icon: Tag },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150`}
                    >
                      <item.icon size={16} strokeWidth={2.5} className={`transition-colors duration-150 ${getIconClass(item.id)}`} />
                      <span className={`text-sm font-['Montserrat'] transition-colors duration-150 whitespace-nowrap ${getTextClass(item.id)}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Analytics */}
            <button className="group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150">
              <BarChart3 size={16} strokeWidth={2.5} className={`transition-colors duration-150 ${darkMode ? 'text-[#666666] group-hover:text-[#D7B797]' : 'text-gray-600 group-hover:text-[#8A6340]'}`} />
              <span className={`text-sm font-semibold font-['Montserrat'] transition-colors duration-150 whitespace-nowrap ${darkMode ? 'text-[#999999] group-hover:text-[#D7B797]' : 'text-gray-600 group-hover:text-[#8A6340]'}`}>{t('nav.analytics')}</span>
              <ChevronRight size={12} strokeWidth={2.5} className={`ml-auto transition-colors duration-150 ${darkMode ? 'text-[#666666] group-hover:text-[#D7B797]' : 'text-gray-600 group-hover:text-[#8A6340]'}`} />
            </button>

            {/* Divider */}
            <div className="py-2">
              <div className={`h-px ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`}></div>
            </div>

            {/* AI Section */}
            <div>
              <button
                onClick={() => setIsAIFeaturesOpen(!isAIFeaturesOpen)}
                className="group w-full px-3 py-1.5 flex items-center justify-between rounded-lg transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} strokeWidth={2.5} className="text-[#A371F7]" />
                  <span className={`text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
                    {t('nav.aiFeatures')}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  className={`${darkMode ? 'text-[#666666]' : 'text-gray-600'} transition-transform duration-200 ${
                    isAIFeaturesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAIFeaturesOpen && (
                <div className="space-y-0.5 ml-2 pl-3 mt-1 border-l border-[rgba(163,113,247,0.2)]">
                  {[
                    { icon: Sparkles, label: t('nav.aiAssistant') },
                    { icon: TrendingUp, label: t('nav.smartSuggestions') },
                    { icon: Edit, label: t('nav.autoPlanning') },
                    { icon: Filter, label: t('nav.predictiveAlerts') },
                  ].map((item, index) => (
                    <button
                      key={index}
                      className="group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150"
                    >
                      <item.icon size={16} strokeWidth={2.5} className="text-[#A371F7] transition-colors duration-150" />
                      <span className={`text-sm font-semibold font-['Montserrat'] transition-colors duration-150 whitespace-nowrap ${darkMode ? 'text-[#999999] group-hover:text-[#A371F7]' : 'text-gray-600 group-hover:text-[#A371F7]'}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer Section - User Profile */}
      <div className={`p-3 border-t relative ${darkMode ? 'border-[#1A1A1A]' : 'border-gray-200'}`}>
        {/* User Menu Popup */}
        {showUserMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            {/* Menu */}
            <div className={`absolute ${isCollapsed ? 'left-full ml-2 bottom-0' : 'left-3 right-3 bottom-full mb-2'} z-50 rounded-xl shadow-xl border overflow-hidden ${
              darkMode
                ? 'bg-[#121212] border-[#2E2E2E]'
                : 'bg-white border-gray-200'
            }`}
            style={{ minWidth: isCollapsed ? '220px' : 'auto' }}
            >
              {/* User Info Header */}
              <div className={`p-4 border-b ${darkMode ? 'border-[#2E2E2E] bg-[#0A0A0A]' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold font-['Montserrat'] border-2 ${
                    darkMode
                      ? 'border-[#D7B797] text-[#D7B797]'
                      : 'border-[#8A6340] text-[#8A6340]'
                  }`}>
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold font-['Montserrat'] truncate ${
                      darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
                    }`}>
                      {user?.name || 'User'}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                      {user?.email || user?.role?.name || 'User'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#2A9E6A]" />
                      <span className={`text-[10px] font-medium ${darkMode ? 'text-[#2A9E6A]' : 'text-green-600'}`}>
                        {t('common.online')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                {/* Profile */}
                <button
                  onClick={() => {
                    navigateTo('profile');
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    darkMode
                      ? 'text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.08)]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                    <Crown size={16} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium font-['Montserrat']">{t('userMenu.myProfile')}</div>
                    <div className={`text-[11px] ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                      {t('userMenu.viewAndEditProfile')}
                    </div>
                  </div>
                </button>

                {/* Settings */}
                <button
                  onClick={() => {
                    navigateTo('settings');
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    darkMode
                      ? 'text-[#F2F2F2] hover:bg-[rgba(215,183,151,0.08)]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                    <Settings size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium font-['Montserrat']">{t('userMenu.settings')}</div>
                    <div className={`text-[11px] ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                      {t('userMenu.appPreferences')}
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div className={`my-2 h-px ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`} />

                {/* Logout */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      darkMode
                        ? 'text-[#FF7B72] hover:bg-[rgba(248,81,73,0.08)]'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-[rgba(248,81,73,0.1)]' : 'bg-red-100'}`}>
                      <LogOut size={16} className={darkMode ? 'text-[#FF7B72]' : 'text-red-500'} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium font-['Montserrat']">{t('userMenu.logout')}</div>
                      <div className={`text-[11px] ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                        {t('userMenu.signOutOfAccount')}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* User Avatar Button - Click to open menu */}
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative group"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold font-['Montserrat'] transition-all duration-200 border-2 ${
                  showUserMenu
                    ? darkMode
                      ? 'border-[#D7B797] text-[#D7B797] bg-[rgba(215,183,151,0.15)]'
                      : 'border-[#8A6340] text-[#8A6340] bg-[rgba(215,183,151,0.15)]'
                    : darkMode
                      ? 'border-[#D7B797] text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)]'
                      : 'border-[#8A6340] text-[#8A6340] hover:bg-[rgba(215,183,151,0.08)]'
                }`}
              >
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              {/* Online status */}
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2A9E6A] border-2 ${
                darkMode ? 'border-[#0A0A0A]' : 'border-white'
              }`} />
            </button>
          </div>
        ) : (
          /* Expanded - Avatar + Name + Role */
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-200 ${
              showUserMenu
                ? darkMode
                  ? 'bg-[rgba(215,183,151,0.1)] border border-[rgba(215,183,151,0.2)]'
                  : 'bg-[rgba(215,183,151,0.12)] border border-[rgba(215,183,151,0.3)]'
                : darkMode
                  ? 'bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[rgba(215,183,151,0.2)]'
                  : 'bg-gray-50 border border-gray-200 hover:border-[rgba(215,183,151,0.3)]'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold font-['Montserrat'] border-2 ${
                  darkMode
                    ? 'border-[#D7B797] text-[#D7B797]'
                    : 'border-[#8A6340] text-[#8A6340]'
                }`}
              >
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              {/* Online status */}
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2A9E6A] border-2 ${
                darkMode ? 'border-[#0D0D0D]' : 'border-gray-50'
              }`} />
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0 text-left">
              <div className={`text-sm font-semibold font-['Montserrat'] truncate ${
                darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
              }`}>
                {user?.name || 'User'}
              </div>
              <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                {user?.role?.name || 'User'}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight
              size={16}
              className={`transition-transform duration-200 ${
                showUserMenu ? 'rotate-90' : ''
              } ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
