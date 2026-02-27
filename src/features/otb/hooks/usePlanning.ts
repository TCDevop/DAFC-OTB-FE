'use client';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { masterDataService, planningService } from '../../../services';
import { invalidateCache } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export const usePlanning = () => {
  const { isAuthenticated } = useAuth();
  const [plannings, setPlannings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlanningDetail, setShowPlanningDetail] = useState(false);
  const [selectedBudgetDetail, setSelectedBudgetDetail] = useState<any>(null);
  const [planningDetailData, setPlanningDetailData] = useState<any[]>([]);
  const [currentPlanningId, setCurrentPlanningId] = useState<string | null>(null);

  // Master data for planning dimensions
  const [seasonTypes, setSeasonTypes] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch master data on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const fetchMasterData = async () => {
      try {
        const [seasonTypesRes, gendersRes, categoriesRes] = await Promise.all([
          masterDataService.getSeasonTypes(),
          masterDataService.getGenders(),
          masterDataService.getCategories(),
        ]);
        if (controller.signal.aborted) return;
        setSeasonTypes(seasonTypesRes || []);
        setGenders(gendersRes || []);
        setCategories(categoriesRes || []);
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        console.error('Failed to fetch master data:', err);
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
      }
    };
    fetchMasterData();
    return () => controller.abort();
  }, [isAuthenticated]);

  // Fetch plannings
  const fetchPlannings = useCallback(async (budgetId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = budgetId ? { budgetId } : {};
      const response = await planningService.getAll(params);
      const data = Array.isArray(response) ? response : [];
      const transformedPlannings = data.map((p: any) => ({
        id: p.id,
        planningCode: p.planningCode,
        budgetDetailId: p.budgetDetailId,
        versionName: p.versionName,
        versionNumber: p.versionNumber,
        status: p.status?.toLowerCase() || 'draft',
        isFinal: p.isFinal,
        details: (p.details || []).map((d: any) => ({
          id: d.id,
          dimensionType: d.dimensionType,
          seasonTypeId: d.seasonTypeId,
          seasonTypeName: d.seasonType?.name,
          genderId: d.genderId,
          genderName: d.gender?.name,
          categoryId: d.categoryId,
          categoryName: d.category?.name,
          lastSeasonSalesValue: Number(d.lastSeasonSales),
          lastSeasonSalesPct: Number(d.lastSeasonPct) * 100,
          systemBuyPct: Number(d.systemBuyPct) * 100,
          userBuyPct: Number(d.userBuyPct) * 100,
          otbValue: Number(d.otbValue),
          userComment: d.userComment,
          varianceVsLastSeasonPct: Number(d.variancePct) * 100
        })),
        budgetDetail: p.budgetDetail,
        createdAt: p.createdAt
      }));
      setPlannings(transformedPlannings);
    } catch (err: any) {
      console.error('Failed to fetch plannings:', err);
      toast.error('Không thể tải danh sách kế hoạch.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlanningStatus = (budgetDetailId: string) => {
    return plannings.find(p => p.budgetDetailId === budgetDetailId);
  };

  const handleOpenPlanningDetail = async (budgetDetail: any, budget: any) => {
    setSelectedBudgetDetail({ ...budgetDetail, budget });

    const existingPlanning = getPlanningStatus(budgetDetail.id);

    if (existingPlanning) {
      // Load existing planning details from API
      try {
        const response = await planningService.getOne(existingPlanning.id);
        const planning = response.data;
        setCurrentPlanningId(planning.id);
        setPlanningDetailData((planning.details || []).map((d: any) => ({
          id: d.id,
          dimensionType: d.dimensionType,
          seasonTypeId: d.seasonTypeId,
          seasonTypeName: d.seasonType?.name,
          genderId: d.genderId,
          genderName: d.gender?.name,
          categoryId: d.categoryId,
          categoryName: d.category?.name,
          lastSeasonSalesValue: Number(d.lastSeasonSales),
          lastSeasonSalesPct: Number(d.lastSeasonPct) * 100,
          systemBuyPct: Number(d.systemBuyPct) * 100,
          userBuyPct: Number(d.userBuyPct) * 100,
          otbValue: Number(d.otbValue),
          userComment: d.userComment,
          varianceVsLastSeasonPct: Number(d.variancePct) * 100
        })));
      } catch (err: any) {
        console.error('Failed to load planning:', err);
        toast.error('Không thể tải chi tiết kế hoạch.');
        setPlanningDetailData(existingPlanning.details);
        setCurrentPlanningId(existingPlanning.id);
      }
    } else {
      // Generate initial data from season types
      setCurrentPlanningId(null);
      const budgetAmount = Number(budgetDetail.budgetAmount);
      const initialData: any[] = [];

      // Create one row per season type with precise distribution summing to exactly 1.0
      const count = seasonTypes.length;
      const basePct = Math.floor((1 / count) * 10000) / 10000; // 4 decimal precision
      const remainder = 1 - basePct * (count - 1); // assign remainder to last item

      seasonTypes.forEach((col: any, index: number) => {
        const pct = index === count - 1 ? remainder : basePct;
        initialData.push({
          id: `new_${col.id}`,
          dimensionType: 'seasonType',
          seasonTypeId: col.id,
          seasonTypeName: col.name,
          genderId: null,
          genderName: null,
          categoryId: null,
          categoryName: null,
          lastSeasonSalesValue: budgetAmount * pct,
          lastSeasonSalesPct: pct * 100,
          systemBuyPct: pct * 100,
          userBuyPct: pct * 100,
          otbValue: budgetAmount * pct,
          userComment: '',
          varianceVsLastSeasonPct: 0
        });
      });

      setPlanningDetailData(initialData);
    }

    setShowPlanningDetail(true);
  };

  const handleSavePlanning = async () => {
    if (!selectedBudgetDetail) return;

    try {
      setLoading(true);

      // Convert percentages to decimals for API
      const details = planningDetailData.map((d: any) => ({
        dimensionType: d.dimensionType,
        seasonTypeId: d.seasonTypeId,
        genderId: d.genderId,
        categoryId: d.categoryId,
        subCategoryId: d.subCategoryId,
        lastSeasonSales: d.lastSeasonSalesValue,
        lastSeasonPct: d.lastSeasonSalesPct / 100,
        systemBuyPct: d.systemBuyPct / 100,
        userBuyPct: d.userBuyPct / 100,
        userComment: d.userComment
      }));

      if (currentPlanningId) {
        // Update existing
        await planningService.update(currentPlanningId, {
          details
        });
      } else {
        // Create new — auto-increment version name based on existing plannings
        const existingCount = plannings.filter(
          (p: any) => p.budgetDetailId === selectedBudgetDetail.id
        ).length;
        await planningService.create({
          budgetDetailId: selectedBudgetDetail.id,
          versionName: `Version ${existingCount + 1}`,
          details
        });
      }

      invalidateCache('/planning');
      await fetchPlannings();

      setShowPlanningDetail(false);
      setSelectedBudgetDetail(null);
      setCurrentPlanningId(null);
    } catch (err: any) {
      console.error('Failed to save planning:', err);
      toast.error('Lưu kế hoạch thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlanningDetail = (id: string, field: string, value: any) => {
    setPlanningDetailData(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: parseFloat(value) || 0 };

        if (field === 'userBuyPct' && selectedBudgetDetail) {
          updated.otbValue = (updated.userBuyPct / 100) * Number(selectedBudgetDetail.budgetAmount);
          updated.varianceVsLastSeasonPct = updated.userBuyPct - updated.lastSeasonSalesPct;
        }

        return updated;
      }
      return item;
    }));
  };

  const submitPlanning = async (planningId: string) => {
    try {
      setLoading(true);
      await planningService.submit(planningId);
      invalidateCache('/planning');
      await fetchPlannings();
    } catch (err: any) {
      console.error('Failed to submit planning:', err);
      toast.error('Gửi duyệt kế hoạch thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approvePlanning = async (planningId: string, level: number, action: string, comment?: string) => {
    try {
      setLoading(true);
      if (level === 1) {
        if (action === 'APPROVED') {
          await planningService.approveL1(planningId, comment);
        } else {
          await planningService.rejectL1(planningId, comment);
        }
      } else {
        if (action === 'APPROVED') {
          await planningService.approveL2(planningId, comment);
        } else {
          await planningService.rejectL2(planningId, comment);
        }
      }
      invalidateCache('/planning');
      await fetchPlannings();
    } catch (err: any) {
      console.error('Failed to approve planning:', err);
      toast.error('Phê duyệt kế hoạch thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markPlanningFinal = async (planningId: string) => {
    try {
      setLoading(true);
      await planningService.finalize(planningId);
      invalidateCache('/planning');
      await fetchPlannings();
    } catch (err: any) {
      console.error('Failed to mark planning as final:', err);
      toast.error('Đánh dấu phiên bản cuối thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPlanning = async (planningId: string) => {
    try {
      setLoading(true);
      await planningService.copy(planningId);
      invalidateCache('/planning');
      await fetchPlannings();
    } catch (err: any) {
      console.error('Failed to copy planning:', err);
      toast.error('Sao chép kế hoạch thất bại.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closePlanningDetail = () => {
    setShowPlanningDetail(false);
    setSelectedBudgetDetail(null);
    setCurrentPlanningId(null);
  };

  return {
    plannings,
    loading,
    error,
    showPlanningDetail,
    selectedBudgetDetail,
    planningDetailData,
    seasonTypes,
    genders,
    categories,
    getPlanningStatus,
    handleOpenPlanningDetail,
    handleSavePlanning,
    handleUpdatePlanningDetail,
    submitPlanning,
    approvePlanning,
    markPlanningFinal,
    copyPlanning,
    closePlanningDetail,
    refreshPlannings: fetchPlannings
  };
};
