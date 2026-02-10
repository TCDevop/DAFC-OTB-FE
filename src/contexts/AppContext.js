'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Dark mode state
  const [darkMode, setDarkModeState] = useState(true);

  const setDarkMode = useCallback((value) => {
    setDarkModeState(value);
    if (typeof document !== 'undefined') {
      if (value) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Shared filter state between Budget Management and Planning screens
  const [sharedYear, setSharedYear] = useState(2025);
  const [sharedGroupBrand, setSharedGroupBrand] = useState(null);
  const [sharedBrand, setSharedBrand] = useState(null);

  // Cross-screen data passing
  const [allocationData, setAllocationData] = useState(null);
  const [otbAnalysisContext, setOtbAnalysisContext] = useState(null);
  const [skuProposalContext, setSkuProposalContext] = useState(null);

  // KPI data for header step bar
  const [kpiData, setKpiData] = useState({
    'budget-management': { value: 5, status: 'completed' },
    'planning': { value: 3, status: 'in-progress' },
    'otb-analysis': { value: 0, status: 'pending' },
    'proposal': { value: 0, status: 'pending' },
  });

  const value = {
    darkMode,
    setDarkMode,
    sharedYear,
    setSharedYear,
    sharedGroupBrand,
    setSharedGroupBrand,
    sharedBrand,
    setSharedBrand,
    allocationData,
    setAllocationData,
    otbAnalysisContext,
    setOtbAnalysisContext,
    skuProposalContext,
    setSkuProposalContext,
    kpiData,
    setKpiData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
