'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Wallet,
  DollarSign,
  BarChart3,
  Package,
  ArrowRight,
  Code,
  Database,
  Layers,
  GitBranch,
  CheckCircle,
  Circle,
  AlertCircle,
  ExternalLink,
  CircleCheckBig,
  Code2,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Planning Group Pages Data
const PLANNING_PAGES = [
  {
    id: 'budget-management',
    name: 'Budget Management',
    icon: Wallet,
    color: 'success',
    description: 'Create and manage budget allocations for each season. Entry point for the planning workflow.',
    route: '/budget-management',
    component: 'BudgetManagementScreen',
    file: 'src/screens/BudgetManagementScreen.jsx',
    props: [
      { name: 'budgets', type: 'Array', description: 'List of budget data' },
      { name: 'selectedYear', type: 'Number', description: 'Currently selected fiscal year' },
      { name: 'setSelectedYear', type: 'Function', description: 'Handler to update selected year' },
      { name: 'selectedGroupBrand', type: 'String|null', description: 'Selected group brand filter' },
      { name: 'setSelectedGroupBrand', type: 'Function', description: 'Handler to update group brand' },
      { name: 'selectedBrand', type: 'String|null', description: 'Selected brand filter' },
      { name: 'setSelectedBrand', type: 'Function', description: 'Handler to update brand' },
      { name: 'onAllocate', type: 'Function', description: 'Callback when user clicks Allocate button' },
      { name: 'darkMode', type: 'Boolean', description: 'Dark mode toggle state' }
    ],
    features: [
      'View all budgets in table or chart format',
      'Filter by fiscal year, group brand, and brand',
      'Search budgets by name',
      'Create new budget with modal form',
      'Navigate to Budget Allocation via "Allocate" button'
    ],
    navigationTo: ['planning'],
    navigationFrom: [],
    status: 'completed'
  },
  {
    id: 'planning',
    name: 'Budget Allocation',
    icon: DollarSign,
    color: 'success',
    description: 'Allocate budget by season and store. Manage Rex/TTP values and track allocation progress.',
    route: '/planning',
    component: 'BudgetAllocateScreen',
    file: 'src/screens/BudgetAllocateScreen.jsx',
    props: [
      { name: 'budgets', type: 'Array', description: 'List of budget data' },
      { name: 'plannings', type: 'Array', description: 'Planning data for each budget' },
      { name: 'getPlanningStatus', type: 'Function', description: 'Get status of a planning item' },
      { name: 'handleOpenPlanningDetail', type: 'Function', description: 'Open planning detail modal' },
      { name: 'onOpenOtbAnalysis', type: 'Function', description: 'Navigate to OTB Analysis' },
      { name: 'allocationData', type: 'Object|null', description: 'Pre-selected budget from Budget Management' },
      { name: 'onAllocationDataUsed', type: 'Function', description: 'Callback when allocation data is consumed' },
      { name: 'availableBudgets', type: 'Array', description: 'Available budgets for selection' },
      { name: 'darkMode', type: 'Boolean', description: 'Dark mode toggle state' }
    ],
    features: [
      'Select budget from dropdown or receive from Budget Management',
      'Filter by year, group brand, brand, season group',
      'Collapsible group/brand sections',
      'Edit Rex and TTP values inline',
      'Version management (save as new version)',
      'Navigate to OTB Analysis via "OTB" button'
    ],
    navigationTo: ['otb-analysis'],
    navigationFrom: ['budget-management'],
    status: 'completed'
  },
  {
    id: 'otb-analysis',
    name: 'OTB Analysis',
    icon: BarChart3,
    color: 'warning',
    description: 'Open-to-buy performance analysis. Analyze collection and category data with detailed breakdown.',
    route: '/otb-analysis',
    component: 'OTBAnalysisScreen',
    file: 'src/screens/OTBAnalysisScreen.jsx',
    props: [
      { name: 'otbContext', type: 'Object|null', description: 'Context data from Budget Allocation (budget, season info)' },
      { name: 'onOpenSkuProposal', type: 'Function', description: 'Navigate to SKU Proposal with context' },
      { name: 'darkMode', type: 'Boolean', description: 'Dark mode toggle state' }
    ],
    features: [
      'Two tabs: Collection and Category analysis',
      'Filter by budget, season group, season, gender, category',
      'Collection tab: View %Buy, %Sales, %ST, %Proposed values',
      'Category tab: Expandable gender > category > sub-category hierarchy',
      'Edit % Proposed values inline',
      'Calculate $OTB and variance automatically',
      'Navigate to SKU Proposal via "SKU" button'
    ],
    navigationTo: ['proposal'],
    navigationFrom: ['planning'],
    status: 'completed'
  },
  {
    id: 'proposal',
    name: 'SKU Proposal',
    icon: Package,
    color: 'gold',
    description: 'Build and review SKU proposals by category. Manage individual SKU items with detailed specifications.',
    route: '/proposal',
    component: 'SKUProposalScreen',
    file: 'src/screens/SKUProposalScreen.jsx',
    props: [
      { name: 'onCreateProposal', type: 'Function', description: 'Handler for creating new proposal' },
      { name: 'onEditProposal', type: 'Function', description: 'Handler for editing existing proposal' },
      { name: 'skuContext', type: 'Object|null', description: 'Context from OTB Analysis (gender, category, sub-category)' },
      { name: 'onContextUsed', type: 'Function', description: 'Callback when context is consumed' },
      { name: 'darkMode', type: 'Boolean', description: 'Dark mode toggle state' }
    ],
    features: [
      'Filter by budget, season group, season',
      'Filter by gender, category, sub-category',
      'Collapsible SKU blocks by sub-category',
      'View SKU details: image, name, product type, theme, color, composition',
      'Edit Order, Rex, TTP values inline',
      'Add new SKU rows',
      'Delete SKU items',
      'Sizing popup for detailed size breakdown',
      'Context banner showing origin from OTB Analysis'
    ],
    navigationTo: [],
    navigationFrom: ['otb-analysis'],
    status: 'completed'
  }
];

const CARD_ACCENTS = {
  pages:    { color: '#58A6FF', Icon: FileText,      darkGrad: 'rgba(88,166,255,0.05)',   lightGrad: 'rgba(50,120,220,0.08)', iconDark: 'rgba(88,166,255,0.06)', iconLight: 'rgba(50,120,220,0.06)' },
  done:     { color: '#2A9E6A', Icon: CircleCheckBig, darkGrad: 'rgba(42,158,106,0.06)',  lightGrad: 'rgba(22,120,70,0.08)',  iconDark: 'rgba(42,158,106,0.07)', iconLight: 'rgba(22,120,70,0.07)' },
  props:    { color: '#A78BFA', Icon: Code2,          darkGrad: 'rgba(167,139,250,0.05)', lightGrad: 'rgba(120,90,220,0.08)', iconDark: 'rgba(167,139,250,0.06)', iconLight: 'rgba(100,70,200,0.06)' },
  features: { color: '#F59E0B', Icon: Sparkles,       darkGrad: 'rgba(245,158,11,0.05)',  lightGrad: 'rgba(200,120,10,0.08)', iconDark: 'rgba(245,158,11,0.06)', iconLight: 'rgba(180,110,10,0.06)' },
};

const DevTicketScreen = ({ darkMode = false }) => {
  const { t } = useLanguage();
  const [expandedPages, setExpandedPages] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  const togglePage = (pageId) => {
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const toggleSection = (pageId, section) => {
    const key = `${pageId}_${section}`;
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getColorClasses = (color) => {
    const colors = {
      success: {
        bg: 'bg-[#127749]',
        bgLight: darkMode ? 'bg-[rgba(18,119,73,0.15)]' : 'bg-[rgba(42,158,106,0.1)]',
        text: 'text-[#2A9E6A]',
        border: 'border-[rgba(18,119,73,0.4)]'
      },
      warning: {
        bg: 'bg-[#E3B341]',
        bgLight: darkMode ? 'bg-[rgba(210,153,34,0.15)]' : 'bg-[rgba(227,179,65,0.1)]',
        text: 'text-[#E3B341]',
        border: 'border-[rgba(210,153,34,0.4)]'
      },
      gold: {
        bg: 'bg-[#D7B797]',
        bgLight: darkMode ? 'bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(160,120,75,0.12)]',
        text: 'text-[#D7B797]',
        border: 'border-[rgba(215,183,151,0.4)]'
      }
    };
    return colors[color] || colors.success;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-[#2A9E6A]" />;
      case 'in-progress':
        return <AlertCircle size={16} className="text-[#E3B341]" />;
      default:
        return <Circle size={16} className="text-[#666666]" />;
    }
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A] border border-[rgba(18,119,73,0.4)]';
      case 'in-progress':
        return 'bg-[rgba(210,153,34,0.15)] text-[#E3B341] border border-[rgba(210,153,34,0.4)]';
      default:
        return darkMode
          ? 'bg-[#1A1A1A] text-[#999999] border border-[#2E2E2E]'
          : 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl shadow-sm border p-6 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-[rgba(215,183,151,0.15)]' : 'bg-[rgba(160,120,75,0.12)]'}`}>
            <FileText size={28} className="text-[#D7B797]" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
              {t('devTicket.title')}
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>
              {t('devTicket.subtitle')}
            </p>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
            <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
              {t('devTicket.navigationFlow')}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {PLANNING_PAGES.map((page, idx) => {
              const Icon = page.icon;
              const colors = getColorClasses(page.color);
              return (
                <React.Fragment key={page.id}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.bgLight} ${colors.border}`}>
                    <Icon size={16} className={colors.text} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>
                      {page.name}
                    </span>
                  </div>
                  {idx < PLANNING_PAGES.length - 1 && (
                    <ArrowRight size={20} className={darkMode ? 'text-[#666666]' : 'text-gray-600'} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pages Detail */}
      <div className="space-y-4">
        {PLANNING_PAGES.map((page) => {
          const Icon = page.icon;
          const colors = getColorClasses(page.color);
          const isExpanded = expandedPages[page.id];

          return (
            <div
              key={page.id}
              className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}
            >
              {/* Page Header */}
              <button
                type="button"
                onClick={() => togglePage(page.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 ${colors.bgLight} border-b transition-colors ${
                  darkMode
                    ? 'border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.08)]'
                    : 'border-gray-200 hover:bg-[rgba(160,120,75,0.18)]'
                }`}
              >
                <ChevronRight
                  size={20}
                  className={`transition-transform ${darkMode ? 'text-[#999999]' : 'text-gray-700'} ${isExpanded ? 'rotate-90' : ''}`}
                />
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <h2 className={`text-lg font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                      {page.name}
                    </h2>
                    {getStatusIcon(page.status)}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClasses(page.status)}`}>
                      {page.status}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>
                    {page.description}
                  </p>
                </div>
              </button>

              {/* Page Content */}
              {isExpanded && (
                <div className="p-5 space-y-4">
                  {/* Basic Info */}
                  <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                    <div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.component')}</span>
                      <p className={`text-sm font-['JetBrains_Mono'] mt-1 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>{page.component}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.filePath')}</span>
                      <p className={`text-sm font-['JetBrains_Mono'] mt-1 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>{page.file}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.route')}</span>
                      <p className={`text-sm font-['JetBrains_Mono'] mt-1 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>{page.route}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.screenId')}</span>
                      <p className={`text-sm font-['JetBrains_Mono'] mt-1 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>{page.id}</p>
                    </div>
                  </div>

                  {/* Props Section */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection(page.id, 'props')}
                      className={`flex items-center gap-2 mb-3 transition-colors ${
                        darkMode
                          ? 'text-[#999999] hover:text-[#D7B797]'
                          : 'text-gray-700 hover:text-[#8A6340]'
                      }`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedSections[`${page.id}_props`] ? '' : '-rotate-90'}`}
                      />
                      <Code size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
                      <span className="text-sm font-semibold font-['Montserrat']">{t('devTicket.props')} ({page.props.length})</span>
                    </button>
                    {expandedSections[`${page.id}_props`] && (
                      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.18)]'}>
                              <th className={`px-4 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.name')}</th>
                              <th className={`px-4 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>Type</th>
                              <th className={`px-4 py-2 text-left text-xs font-semibold font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.description')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {page.props.map((prop, idx) => (
                              <tr key={prop.name} className={`${idx % 2 === 0 ? (darkMode ? 'bg-[#121212]' : 'bg-white') : (darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50')}`}>
                                <td className={`px-4 py-2 font-['JetBrains_Mono'] text-xs ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{prop.name}</td>
                                <td className={`px-4 py-2 font-['JetBrains_Mono'] text-xs ${darkMode ? 'text-[#E3B341]' : 'text-amber-600'}`}>{prop.type}</td>
                                <td className={`px-4 py-2 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{prop.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Features Section */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection(page.id, 'features')}
                      className={`flex items-center gap-2 mb-3 transition-colors ${
                        darkMode
                          ? 'text-[#999999] hover:text-[#D7B797]'
                          : 'text-gray-700 hover:text-[#8A6340]'
                      }`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedSections[`${page.id}_features`] ? '' : '-rotate-90'}`}
                      />
                      <Layers size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
                      <span className="text-sm font-semibold font-['Montserrat']">{t('devTicket.features')} ({page.features.length})</span>
                    </button>
                    {expandedSections[`${page.id}_features`] && (
                      <ul className={`space-y-2 pl-6 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                        {page.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={14} className="text-[#2A9E6A] mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Navigation Section */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection(page.id, 'navigation')}
                      className={`flex items-center gap-2 mb-3 transition-colors ${
                        darkMode
                          ? 'text-[#999999] hover:text-[#D7B797]'
                          : 'text-gray-700 hover:text-[#8A6340]'
                      }`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedSections[`${page.id}_navigation`] ? '' : '-rotate-90'}`}
                      />
                      <ExternalLink size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
                      <span className="text-sm font-semibold font-['Montserrat']">{t('devTicket.navigation')}</span>
                    </button>
                    {expandedSections[`${page.id}_navigation`] && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                          <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.navigateFrom')}</span>
                          <div className="mt-2 space-y-1">
                            {page.navigationFrom.length > 0 ? (
                              page.navigationFrom.map(nav => {
                                const navPage = PLANNING_PAGES.find(p => p.id === nav);
                                return navPage ? (
                                  <div key={nav} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                                    <ArrowRight size={14} className="text-[#2A9E6A]" />
                                    {navPage.name}
                                  </div>
                                ) : null;
                              })
                            ) : (
                              <span className={`text-sm ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>{t('common.entryPointSidebar')}</span>
                            )}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                          <span className={`text-xs font-medium ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.navigateTo')}</span>
                          <div className="mt-2 space-y-1">
                            {page.navigationTo.length > 0 ? (
                              page.navigationTo.map(nav => {
                                const navPage = PLANNING_PAGES.find(p => p.id === nav);
                                return navPage ? (
                                  <div key={nav} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                                    <ArrowRight size={14} className="text-[#D7B797]" />
                                    {navPage.name}
                                  </div>
                                ) : null;
                              })
                            ) : (
                              <span className={`text-sm ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>{t('common.endOfFlow')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className={`rounded-xl border p-5 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
          <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{t('devTicket.summary')}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {/* Total Pages */}
          <div
            className={`relative overflow-hidden border rounded-2xl p-4 text-center transition-all duration-200 hover:shadow-lg group ${
              darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
            }`}
            style={{
              background: darkMode
                ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.pages.darkGrad} 100%)`
                : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.pages.lightGrad} 100%)`,
            }}
          >
            <div
              className="absolute -bottom-2 -right-2 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.10] pointer-events-none"
              style={{ opacity: darkMode ? 0.04 : 0.06 }}
            >
              <FileText size={65} color={CARD_ACCENTS.pages.color} strokeWidth={1} />
            </div>
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: darkMode ? CARD_ACCENTS.pages.iconDark : CARD_ACCENTS.pages.iconLight }}
            >
              <FileText size={14} color={CARD_ACCENTS.pages.color} />
            </div>
            <div className="relative z-10">
              <p className={`text-2xl font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{PLANNING_PAGES.length}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.totalPages')}</p>
            </div>
          </div>

          {/* Completed */}
          <div
            className={`relative overflow-hidden border rounded-2xl p-4 text-center transition-all duration-200 hover:shadow-lg group ${
              darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
            }`}
            style={{
              background: darkMode
                ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.done.darkGrad} 100%)`
                : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.done.lightGrad} 100%)`,
            }}
          >
            <div
              className="absolute -bottom-2 -right-2 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.10] pointer-events-none"
              style={{ opacity: darkMode ? 0.04 : 0.06 }}
            >
              <CircleCheckBig size={65} color={CARD_ACCENTS.done.color} strokeWidth={1} />
            </div>
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: darkMode ? CARD_ACCENTS.done.iconDark : CARD_ACCENTS.done.iconLight }}
            >
              <CircleCheckBig size={14} color={CARD_ACCENTS.done.color} />
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-bold font-['JetBrains_Mono'] text-[#2A9E6A]">
                {PLANNING_PAGES.filter(p => p.status === 'completed').length}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.completed')}</p>
            </div>
          </div>

          {/* Total Props */}
          <div
            className={`relative overflow-hidden border rounded-2xl p-4 text-center transition-all duration-200 hover:shadow-lg group ${
              darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
            }`}
            style={{
              background: darkMode
                ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.props.darkGrad} 100%)`
                : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.props.lightGrad} 100%)`,
            }}
          >
            <div
              className="absolute -bottom-2 -right-2 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.10] pointer-events-none"
              style={{ opacity: darkMode ? 0.04 : 0.06 }}
            >
              <Code2 size={65} color={CARD_ACCENTS.props.color} strokeWidth={1} />
            </div>
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: darkMode ? CARD_ACCENTS.props.iconDark : CARD_ACCENTS.props.iconLight }}
            >
              <Code2 size={14} color={CARD_ACCENTS.props.color} />
            </div>
            <div className="relative z-10">
              <p className={`text-2xl font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                {PLANNING_PAGES.reduce((sum, p) => sum + p.props.length, 0)}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.totalProps')}</p>
            </div>
          </div>

          {/* Total Features */}
          <div
            className={`relative overflow-hidden border rounded-2xl p-4 text-center transition-all duration-200 hover:shadow-lg group ${
              darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'
            }`}
            style={{
              background: darkMode
                ? `linear-gradient(135deg, #121212 0%, #121212 60%, ${CARD_ACCENTS.features.darkGrad} 100%)`
                : `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${CARD_ACCENTS.features.lightGrad} 100%)`,
            }}
          >
            <div
              className="absolute -bottom-2 -right-2 transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.10] pointer-events-none"
              style={{ opacity: darkMode ? 0.04 : 0.06 }}
            >
              <Sparkles size={65} color={CARD_ACCENTS.features.color} strokeWidth={1} />
            </div>
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: darkMode ? CARD_ACCENTS.features.iconDark : CARD_ACCENTS.features.iconLight }}
            >
              <Sparkles size={14} color={CARD_ACCENTS.features.color} />
            </div>
            <div className="relative z-10">
              <p className={`text-2xl font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                {PLANNING_PAGES.reduce((sum, p) => sum + p.features.length, 0)}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('devTicket.totalFeatures')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTicketScreen;
