'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface KpiItem {
  value: number;
  status: string;
}

type SaveHandler = () => Promise<void> | void;

interface AppContextType {
  sharedYear: number;
  setSharedYear: React.Dispatch<React.SetStateAction<number>>;
  allocationData: any;
  setAllocationData: React.Dispatch<React.SetStateAction<any>>;
  otbAnalysisContext: any;
  setOtbAnalysisContext: React.Dispatch<React.SetStateAction<any>>;
  skuProposalContext: any;
  setSkuProposalContext: React.Dispatch<React.SetStateAction<any>>;
  kpiData: Record<string, KpiItem>;
  setKpiData: React.Dispatch<React.SetStateAction<Record<string, KpiItem>>>;
  registerSave: (handler: SaveHandler) => void;
  unregisterSave: () => void;
  triggerSave: () => Promise<void>;
  hasSaveHandler: boolean;
  registerSaveAsNew: (handler: SaveHandler) => void;
  unregisterSaveAsNew: () => void;
  triggerSaveAsNew: () => Promise<void>;
  hasSaveAsNewHandler: boolean;
  registerCreateBudget: (handler: () => void) => void;
  unregisterCreateBudget: () => void;
  triggerCreateBudget: () => void;
  headerSubtitle: string | null;
  setHeaderSubtitle: (subtitle: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Shared filter state between Budget Management and Planning screens
  const [sharedYear, setSharedYear] = useState(2025);

  // Cross-screen data passing
  const [allocationData, setAllocationData] = useState(null);
  const [otbAnalysisContext, setOtbAnalysisContext] = useState(null);
  const [skuProposalContext, setSkuProposalContext] = useState(null);

  // KPI data for header step bar
  const [kpiData, setKpiData] = useState<Record<string, KpiItem>>({
    'budget-management': { value: 5, status: 'completed' },
    'planning': { value: 3, status: 'completed' },
    'otb-analysis': { value: 3, status: 'in-progress' },
    'proposal': { value: 27, status: 'in-progress' },
    'tickets': { value: 4, status: 'in-progress' },
  });

  // Save handler: screens register their save callback, AppHeader triggers it
  const saveHandlerRef = useRef<SaveHandler | null>(null);
  const [hasSaveHandler, setHasSaveHandler] = useState(false);

  const registerSave = useCallback((handler: SaveHandler) => {
    saveHandlerRef.current = handler;
    setHasSaveHandler(true);
  }, []);

  const unregisterSave = useCallback(() => {
    saveHandlerRef.current = null;
    setHasSaveHandler(false);
  }, []);

  const triggerSave = useCallback(async () => {
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
    }
  }, []);

  // Save-as-new handler: same pattern as save handler
  const saveAsNewHandlerRef = useRef<SaveHandler | null>(null);
  const [hasSaveAsNewHandler, setHasSaveAsNewHandler] = useState(false);

  const registerSaveAsNew = useCallback((handler: SaveHandler) => {
    saveAsNewHandlerRef.current = handler;
    setHasSaveAsNewHandler(true);
  }, []);

  const unregisterSaveAsNew = useCallback(() => {
    saveAsNewHandlerRef.current = null;
    setHasSaveAsNewHandler(false);
  }, []);

  const triggerSaveAsNew = useCallback(async () => {
    if (saveAsNewHandlerRef.current) {
      await saveAsNewHandlerRef.current();
    }
  }, []);

  // Create budget handler: BudgetManagementScreen registers its open-modal callback
  const createBudgetHandlerRef = useRef<(() => void) | null>(null);

  const registerCreateBudget = useCallback((handler: () => void) => {
    createBudgetHandlerRef.current = handler;
  }, []);

  const unregisterCreateBudget = useCallback(() => {
    createBudgetHandlerRef.current = null;
  }, []);

  const triggerCreateBudget = useCallback(() => {
    if (createBudgetHandlerRef.current) {
      createBudgetHandlerRef.current();
    }
  }, []);

  // Header subtitle — screens can set to show e.g. "Ferragamo - Brand X" in breadcrumb
  const [headerSubtitle, setHeaderSubtitle] = useState<string | null>(null);

  const value = {
    sharedYear,
    setSharedYear,
    allocationData,
    setAllocationData,
    otbAnalysisContext,
    setOtbAnalysisContext,
    skuProposalContext,
    setSkuProposalContext,
    kpiData,
    setKpiData,
    registerSave,
    unregisterSave,
    triggerSave,
    hasSaveHandler,
    registerSaveAsNew,
    unregisterSaveAsNew,
    triggerSaveAsNew,
    hasSaveAsNewHandler,
    registerCreateBudget,
    unregisterCreateBudget,
    triggerCreateBudget,
    headerSubtitle,
    setHeaderSubtitle,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
