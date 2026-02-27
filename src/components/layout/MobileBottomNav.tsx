'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Wallet, DollarSign, FileCheck, MoreHorizontal, X, Ticket, Package, BarChart3, ShoppingCart, Receipt, Settings, Upload, Database, Crown, LineChart, PieChart, Activity } from 'lucide-react';
import { ROUTE_MAP } from '@/utils/routeMap';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const PRIMARY_TABS = [
  { id: 'home', icon: Home, labelKey: 'nav.homeDashboard', shortLabel: 'Home' },
  { id: 'budget-management', icon: Wallet, labelKey: 'nav.budgetManagement', shortLabel: 'Budget' },
  { id: 'planning', icon: DollarSign, labelKey: 'nav.budgetAllocation', shortLabel: 'Planning' },
  { id: 'tickets', icon: Ticket, labelKey: 'nav.tickets', shortLabel: 'Tickets' },
];

const MORE_ITEMS = [
  { id: 'otb-analysis', icon: BarChart3, labelKey: 'nav.otbAnalysis' },
  { id: 'proposal', icon: Package, labelKey: 'nav.skuProposal' },
  { id: 'tickets', icon: Ticket, labelKey: 'nav.tickets' },
  { id: 'order-confirmation', icon: ShoppingCart, labelKey: 'nav.orderConfirm' },
  { id: 'receipt-confirmation', icon: Receipt, labelKey: 'nav.receiptConfirm' },
  { id: 'master-brands', icon: Database, labelKey: 'nav.masterData' },
  { id: 'analytics-sales', icon: LineChart, labelKey: 'nav.salesPerformance' },
  { id: 'analytics-budget', icon: PieChart, labelKey: 'nav.budgetAnalytics' },
  { id: 'analytics-trends', icon: Activity, labelKey: 'nav.categoryTrends' },
  { id: 'import-data', icon: Upload, labelKey: 'nav.importData' },
  { id: 'profile', icon: Crown, labelKey: 'userMenu.myProfile' },
  { id: 'settings', icon: Settings, labelKey: 'userMenu.settings' },
];

export default function MobileBottomNav({ currentScreen, darkMode }: any) {
  const router = useRouter();
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);

  const navigateTo = (screenId: any) => {
    const route = ROUTE_MAP[screenId];
    if (route) {
      router.push(route);
      setShowMore(false);
    }
  };

  const isActive = (id: any) => {
    if (id === 'home') return currentScreen === 'home';
    return currentScreen === id;
  };

  const isMoreActive = MORE_ITEMS.some((item: any) => currentScreen === item.id);

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              className={`fixed left-3 right-3 z-[91] rounded-2xl border overflow-hidden ${
                darkMode ? 'bg-surface-secondary border-border' : 'bg-white border-gray-200'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.3)', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                darkMode ? 'border-border' : 'border-gray-100'
              }`}>
                <span className={`text-sm font-semibold font-['Montserrat'] ${
                  darkMode ? 'text-content' : 'text-gray-900'
                }`}>
                  More
                </span>
                <button onClick={() => setShowMore(false)} className={`p-2 rounded-lg ${
                  darkMode ? 'text-content-muted hover:bg-surface-elevated' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 p-3 max-h-[50vh] overflow-y-auto">
                {MORE_ITEMS.map((item: any) => {
                  const Icon = item.icon;
                  const active = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                        active
                          ? darkMode
                            ? 'bg-[rgba(215,183,151,0.12)]'
                            : 'bg-[rgba(215,183,151,0.15)]'
                          : darkMode
                            ? 'active:bg-surface-elevated'
                            : 'active:bg-gray-100'
                      }`}
                    >
                      <Icon
                        size={20}
                        strokeWidth={active ? 2.5 : 2}
                        className={active
                          ? 'text-dafc-gold'
                          : darkMode ? 'text-content-secondary' : 'text-gray-500'
                        }
                      />
                      <span className={`text-[10px] font-medium font-['Montserrat'] text-center leading-tight ${
                        active
                          ? 'text-dafc-gold'
                          : darkMode ? 'text-content-secondary' : 'text-gray-600'
                      }`}>
                        {t(item.labelKey, item.labelKey.split('.').pop())}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[80] border-t md:hidden ${
          darkMode ? 'border-border' : 'border-gray-200'
        }`}
        style={{
          background: darkMode
            ? 'linear-gradient(180deg, #0A0A0A 0%, #080808 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #fdfbf9 100%)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around h-[60px]">
          {PRIMARY_TABS.map((tab: any) => {
            const Icon = tab.icon;
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
              >
                <div className={`p-1 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  active
                    ? darkMode
                      ? 'bg-[rgba(215,183,151,0.15)]'
                      : 'bg-[rgba(215,183,151,0.2)]'
                    : ''
                }`}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={`transition-colors ${
                      active
                        ? 'text-dafc-gold'
                        : darkMode ? 'text-content-muted' : 'text-gray-400'
                    }`}
                    style={active && darkMode ? { filter: 'drop-shadow(0 0 4px rgba(215,183,151,0.4))' } : undefined}
                  />
                </div>
                <span className={`text-[10px] font-medium font-['Montserrat'] ${
                  active
                    ? 'text-dafc-gold'
                    : darkMode ? 'text-content-muted' : 'text-gray-400'
                }`}>
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          >
            <div className={`p-1 rounded-lg transition-colors ${
              showMore || isMoreActive
                ? darkMode
                  ? 'bg-[rgba(215,183,151,0.15)]'
                  : 'bg-[rgba(215,183,151,0.2)]'
                : ''
            }`}>
              <MoreHorizontal
                size={20}
                strokeWidth={showMore || isMoreActive ? 2.5 : 2}
                className={`transition-colors ${
                  showMore || isMoreActive
                    ? 'text-dafc-gold'
                    : darkMode ? 'text-content-muted' : 'text-gray-400'
                }`}
              />
            </div>
            <span className={`text-[10px] font-medium font-['Montserrat'] ${
              showMore || isMoreActive
                ? 'text-dafc-gold'
                : darkMode ? 'text-content-muted' : 'text-gray-400'
            }`}>
              More
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
