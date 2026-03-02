'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { STORES, CURRENT_YEAR } from '../../../utils/constants';
import toast from 'react-hot-toast';
import { masterDataService, budgetService } from '../../../services';
import { invalidateCache } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export const useBudget = () => {
  const { isAuthenticated } = useAuth();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedSeasonGroups, setSelectedSeasonGroups] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [budgetFormData, setBudgetFormData] = useState<{ comment: string; storeAllocations: any[] }>({
    comment: '',
    storeAllocations: []
  });

  // Master data
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);

  const availableSeasons = useMemo(() => {
    if (seasons.length === 0 || selectedSeasonGroups.length === 0) return [];
    // Filter API seasons by selected season groups, map to expected format
    return seasons
      .filter((s: any) => selectedSeasonGroups.includes(s.seasonGroupId || s.seasonGroup?.name))
      .map((s: any) => ({
        id: s.id || `${s.seasonGroupId}_${s.name}_${selectedYear}`,
        name: s.name,
        fiscalYear: selectedYear,
        seasonGroupId: s.seasonGroupId || s.seasonGroup?.name,
        type: (s.name || '').toLowerCase().includes('pre') ? 'pre' : 'main' as 'pre' | 'main'
      }));
  }, [selectedSeasonGroups, selectedYear, seasons]);

  // Fetch master data on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const fetchMasterData = async () => {
      try {
        const [brandsRes, storesRes, seasonsRes, seasonGroupsRes] = await Promise.all([
          masterDataService.getBrands(),
          masterDataService.getStores(),
          masterDataService.getSeasons(),
          masterDataService.getSeasonGroups(),
        ]);
        if (controller.signal.aborted) return;
        setBrands(brandsRes || []);
        // Use all stores from API; fall back to constants if empty
        const allStores = storesRes || [];
        setStores(allStores.length > 0 ? allStores : STORES);
        setSeasons(seasonsRes || []);
        // Auto-select first season group if none selected
        const sgData = Array.isArray(seasonGroupsRes) ? seasonGroupsRes : [];
        if (sgData.length > 0 && selectedSeasonGroups.length === 0) {
          setSelectedSeasonGroups([sgData[0].name]);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        console.error('Failed to fetch master data:', err);
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
      }
    };
    fetchMasterData();
    return () => controller.abort();
  }, [isAuthenticated]);

  // Fetch budgets when year changes
  const fetchBudgets = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const response = await budgetService.getAll({ fiscalYear: selectedYear });
      // Transform API response to match local format
      const data = Array.isArray(response) ? response : [];
      const transformedBudgets = data.map((b: any) => ({
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
        details: (b.details || []).map((d: any) => ({
          id: d.id,
          storeId: d.storeId,
          storeName: d.store?.name,
          storeCode: d.store?.code,
          budgetAmount: Number(d.budgetAmount)
        })),
        createdAt: b.createdAt
      }));
      setBudgets(transformedBudgets);
    } catch (err: any) {
      console.error('Failed to fetch budgets:', err);
      toast.error('Không thể tải danh sách ngân sách.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, isAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();
    const fetch = async () => {
      try {
        await fetchBudgets();
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        // Error already handled inside fetchBudgets
      }
    };
    fetch();
    return () => controller.abort();
  }, [fetchBudgets]);

  const getBudgetStatus = (brandId: string, seasonId: string) => {
    return budgets.find(b =>
      b.groupBrandId === brandId &&
      b.seasonId === seasonId &&
      b.fiscalYear === selectedYear
    );
  };

  const handleCellClick = (brand: any, season: any) => {
    const existingBudget = getBudgetStatus(brand.id, season.id);
    const storeList = stores.length > 0 ? stores : STORES;

    if (existingBudget) {
      const storeAllocations = storeList.map((store: any) => {
        const existingAllocation = existingBudget.details.find((d: any) => d.storeId === store.id);
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
        storeAllocations: storeList.map((store: any) => ({
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

  const handleStoreAllocationChange = (storeId: string, value: string) => {
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
      .filter((sa: any) => sa.budgetAmount > 0)
      .map((sa: any) => ({
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

      invalidateCache('/budgets');
      await fetchBudgets();

      setShowBudgetForm(false);
      setSelectedCell(null);
    } catch (err: any) {
      console.error('Failed to save budget:', err);
      toast.error('Lưu ngân sách thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitBudget = async (budgetId: string) => {
    try {
      setLoading(true);
      await budgetService.submit(budgetId);
      invalidateCache('/budgets');
      await fetchBudgets();
    } catch (err: any) {
      console.error('Failed to submit budget:', err);
      toast.error('Gửi duyệt ngân sách thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveBudget = async (budgetId: string, level: number, action: string, comment?: string) => {
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
      invalidateCache('/budgets');
      await fetchBudgets();
    } catch (err: any) {
      console.error('Failed to approve budget:', err);
      toast.error('Phê duyệt ngân sách thất bại.');
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
