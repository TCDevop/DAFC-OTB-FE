'use client';
import { useState, useEffect, useCallback } from 'react';
import { masterDataService, planningService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export const usePlanning = () => {
  const { isAuthenticated } = useAuth();
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPlanningDetail, setShowPlanningDetail] = useState(false);
  const [selectedBudgetDetail, setSelectedBudgetDetail] = useState(null);
  const [planningDetailData, setPlanningDetailData] = useState([]);
  const [currentPlanningId, setCurrentPlanningId] = useState(null);

  // Master data for planning dimensions
  const [collections, setCollections] = useState([]);
  const [genders, setGenders] = useState([]);
  const [categories, setCategories] = useState([]);

  // Fetch master data on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMasterData = async () => {
      try {
        const [collectionsRes, gendersRes, categoriesRes] = await Promise.all([
          masterDataService.getCollections(),
          masterDataService.getGenders(),
          masterDataService.getCategories(),
        ]);
        setCollections(collectionsRes || []);
        setGenders(gendersRes || []);
        setCategories(categoriesRes || []);
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();
  }, [isAuthenticated]);

  // Fetch plannings
  const fetchPlannings = useCallback(async (budgetId) => {
    setLoading(true);
    setError(null);
    try {
      const params = budgetId ? { budgetId } : {};
      const response = await planningService.getAll(params);
      const transformedPlannings = (response.data || []).map(p => ({
        id: p.id,
        planningCode: p.planningCode,
        budgetDetailId: p.budgetDetailId,
        versionName: p.versionName,
        versionNumber: p.versionNumber,
        status: p.status?.toLowerCase() || 'draft',
        isFinal: p.isFinal,
        details: (p.details || []).map(d => ({
          id: d.id,
          dimensionType: d.dimensionType,
          collectionId: d.collectionId,
          collectionName: d.collection?.name,
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
    } catch (err) {
      console.error('Failed to fetch plannings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlanningStatus = (budgetDetailId) => {
    return plannings.find(p => p.budgetDetailId === budgetDetailId);
  };

  const handleOpenPlanningDetail = async (budgetDetail, budget) => {
    setSelectedBudgetDetail({ ...budgetDetail, budget });

    const existingPlanning = getPlanningStatus(budgetDetail.id);

    if (existingPlanning) {
      // Load existing planning details from API
      try {
        const response = await planningService.getOne(existingPlanning.id);
        const planning = response.data;
        setCurrentPlanningId(planning.id);
        setPlanningDetailData((planning.details || []).map(d => ({
          id: d.id,
          dimensionType: d.dimensionType,
          collectionId: d.collectionId,
          collectionName: d.collection?.name,
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
      } catch (err) {
        console.error('Failed to load planning:', err);
        setPlanningDetailData(existingPlanning.details);
        setCurrentPlanningId(existingPlanning.id);
      }
    } else {
      // Generate initial data from collections
      setCurrentPlanningId(null);
      const budgetAmount = Number(budgetDetail.budgetAmount);
      const initialData = [];

      // Create one row per collection for simplicity
      collections.forEach((col, index) => {
        const pct = 1 / collections.length; // Equal distribution
        initialData.push({
          id: `new_${col.id}`,
          dimensionType: 'collection',
          collectionId: col.id,
          collectionName: col.name,
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
      const details = planningDetailData.map(d => ({
        dimensionType: d.dimensionType,
        collectionId: d.collectionId,
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
        // Create new
        await planningService.create({
          budgetDetailId: selectedBudgetDetail.id,
          versionName: 'Version 1',
          details
        });
      }

      // Refresh plannings
      await fetchPlannings();

      setShowPlanningDetail(false);
      setSelectedBudgetDetail(null);
      setCurrentPlanningId(null);
    } catch (err) {
      console.error('Failed to save planning:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlanningDetail = (id, field, value) => {
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

  const submitPlanning = async (planningId) => {
    try {
      setLoading(true);
      await planningService.submit(planningId);
      await fetchPlannings();
    } catch (err) {
      console.error('Failed to submit planning:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approvePlanning = async (planningId, level, action, comment) => {
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
      await fetchPlannings();
    } catch (err) {
      console.error('Failed to approve planning:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markPlanningFinal = async (planningId) => {
    try {
      setLoading(true);
      await planningService.finalize(planningId);
      await fetchPlannings();
    } catch (err) {
      console.error('Failed to mark planning as final:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPlanning = async (planningId) => {
    try {
      setLoading(true);
      await planningService.copy(planningId);
      await fetchPlannings();
    } catch (err) {
      console.error('Failed to copy planning:', err);
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
    collections,
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
