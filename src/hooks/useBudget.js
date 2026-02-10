'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { STORES, CURRENT_YEAR, CURRENT_SEASON_GROUP } from '../utils/constants';
import { generateSeasonsMultiple } from '../utils/formatters';
import { masterDataService, budgetService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export const useBudget = () => {
  const { isAuthenticated } = useAuth();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedSeasonGroups, setSelectedSeasonGroups] = useState([CURRENT_SEASON_GROUP]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [budgetFormData, setBudgetFormData] = useState({
    comment: '',
    storeAllocations: []
  });

  // Master data
  const [brands, setBrands] = useState([]);
  const [stores, setStores] = useState([]);
  const [seasons, setSeasons] = useState([]);

  const availableSeasons = useMemo(() => {
    return generateSeasonsMultiple(selectedSeasonGroups, selectedYear);
  }, [selectedSeasonGroups, selectedYear]);

  // Fetch master data on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMasterData = async () => {
      try {
        const [brandsRes, storesRes, seasonsRes] = await Promise.all([
          masterDataService.getBrands(),
          masterDataService.getStores(),
          masterDataService.getSeasons(),
        ]);
        setBrands(brandsRes || []);
        setStores(storesRes || []);
        setSeasons(seasonsRes || []);
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();
  }, [isAuthenticated]);

  // Fetch budgets when year changes
  const fetchBudgets = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const response = await budgetService.getAll({ fiscalYear: selectedYear });
      // Transform API response to match local format
      const transformedBudgets = (response.data || response || []).map(b => ({
        id: b.id,
        budgetCode: b.budgetCode,
        groupBrandId: b.groupBrandId,
        groupBrandName: b.groupBrand?.name,
        seasonGroupId: b.seasonGroupId,
        seasonType: b.seasonType,
        seasonId: `${b.seasonGroupId}-${b.seasonType}`,
        seasonName: `${b.seasonGroupId} ${b.seasonType}`,
        fiscalYear: b.fiscalYear,
        totalBudget: Number(b.totalBudget),
        comment: b.comment,
        status: b.status?.toLowerCase() || 'draft',
        details: (b.details || []).map(d => ({
          id: d.id,
          storeId: d.storeId,
          storeName: d.store?.name,
          storeCode: d.store?.code,
          budgetAmount: Number(d.budgetAmount)
        })),
        createdAt: b.createdAt
      }));
      setBudgets(transformedBudgets);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, isAuthenticated]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const getBudgetStatus = (brandId, seasonId) => {
    return budgets.find(b =>
      b.groupBrandId === brandId &&
      b.seasonId === seasonId &&
      b.fiscalYear === selectedYear
    );
  };

  const handleCellClick = (brand, season) => {
    const existingBudget = getBudgetStatus(brand.id, season.id);
    const storeList = stores.length > 0 ? stores : STORES;

    if (existingBudget) {
      const storeAllocations = storeList.map(store => {
        const existingAllocation = existingBudget.details.find(d => d.storeId === store.id);
        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          budgetAmount: existingAllocation?.budgetAmount || 0
        };
      });

      setBudgetFormData({
        comment: existingBudget.comment,
        storeAllocations
      });
    } else {
      setBudgetFormData({
        comment: '',
        storeAllocations: storeList.map(store => ({
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          budgetAmount: 0
        }))
      });
    }

    setSelectedCell({ brand, season, existingBudget });
    setShowBudgetForm(true);
  };

  const handleStoreAllocationChange = (storeId, value) => {
    setBudgetFormData(prev => ({
      ...prev,
      storeAllocations: prev.storeAllocations.map(sa =>
        sa.storeId === storeId
          ? { ...sa, budgetAmount: parseFloat(value) || 0 }
          : sa
      )
    }));
  };

  const calculateTotalBudget = () => {
    return budgetFormData.storeAllocations.reduce((sum, sa) => sum + sa.budgetAmount, 0);
  };

  const handleSaveBudget = async () => {
    if (!selectedCell) return;

    const totalBudget = calculateTotalBudget();
    const details = budgetFormData.storeAllocations
      .filter(sa => sa.budgetAmount > 0)
      .map(sa => ({
        storeId: sa.storeId,
        budgetAmount: sa.budgetAmount
      }));

    try {
      setLoading(true);

      if (selectedCell.existingBudget) {
        // Update existing budget
        await budgetService.update(selectedCell.existingBudget.id, {
          totalBudget,
          comment: budgetFormData.comment,
          details
        });
      } else {
        // Create new budget
        await budgetService.create({
          groupBrandId: selectedCell.brand.id,
          seasonGroupId: selectedCell.season.seasonGroupId,
          seasonType: selectedCell.season.seasonType || 'main',
          fiscalYear: selectedYear,
          totalBudget,
          comment: budgetFormData.comment,
          details
        });
      }

      // Refresh budgets
      await fetchBudgets();

      setShowBudgetForm(false);
      setSelectedCell(null);
    } catch (err) {
      console.error('Failed to save budget:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitBudget = async (budgetId) => {
    try {
      setLoading(true);
      await budgetService.submit(budgetId);
      await fetchBudgets();
    } catch (err) {
      console.error('Failed to submit budget:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveBudget = async (budgetId, level, action, comment) => {
    try {
      setLoading(true);
      if (level === 1) {
        if (action === 'APPROVED') {
          await budgetService.approveL1(budgetId, comment);
        } else {
          await budgetService.rejectL1(budgetId, comment);
        }
      } else {
        if (action === 'APPROVED') {
          await budgetService.approveL2(budgetId, comment);
        } else {
          await budgetService.rejectL2(budgetId, comment);
        }
      }
      await fetchBudgets();
    } catch (err) {
      console.error('Failed to approve budget:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeBudgetForm = () => {
    setShowBudgetForm(false);
    setSelectedCell(null);
  };

  return {
    // State
    selectedYear,
    setSelectedYear,
    selectedSeasonGroups,
    setSelectedSeasonGroups,
    budgets,
    setBudgets,
    showBudgetForm,
    selectedCell,
    budgetFormData,
    setBudgetFormData,
    availableSeasons,
    loading,
    error,
    // Master data
    brands,
    stores,
    seasons,
    // Actions
    getBudgetStatus,
    handleCellClick,
    handleStoreAllocationChange,
    calculateTotalBudget,
    handleSaveBudget,
    submitBudget,
    approveBudget,
    closeBudgetForm,
    refreshBudgets: fetchBudgets
  };
};
