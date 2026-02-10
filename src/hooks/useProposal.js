'use client';
import { useState, useCallback } from 'react';
import { proposalService, masterDataService } from '../services';

export const useProposal = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [currentProposalId, setCurrentProposalId] = useState(null);

  // SKU catalog for adding products
  const [skuCatalog, setSkuCatalog] = useState([]);
  const [skuLoading, setSkuLoading] = useState(false);

  // Fetch proposals
  const fetchProposals = useCallback(async (budgetId) => {
    setLoading(true);
    setError(null);
    try {
      const params = budgetId ? { budgetId } : {};
      const response = await proposalService.getAll(params);
      const data = Array.isArray(response) ? response : (response.data || []);
      const transformedProposals = data.map(p => ({
        id: p.id,
        ticketName: p.ticketName,
        budgetId: p.budgetId,
        planningVersionId: p.planningVersionId,
        status: p.status?.toLowerCase() || 'draft',
        totalSkuCount: p.totalSkuCount,
        totalOrderQty: p.totalOrderQty,
        totalValue: Number(p.totalValue),
        products: (p.products || []).map(prod => ({
          id: prod.id,
          skuId: prod.skuId,
          skuCode: prod.skuCode,
          productName: prod.productName,
          collection: prod.collection,
          gender: prod.gender,
          category: prod.category,
          subCategory: prod.subCategory,
          theme: prod.theme,
          color: prod.color,
          unitCost: Number(prod.unitCost),
          srp: Number(prod.srp),
          orderQty: prod.orderQty,
          totalValue: Number(prod.totalValue),
          customerTarget: prod.customerTarget,
          imageUrl: prod.imageUrl
        })),
        budget: p.budget,
        planningVersion: p.planningVersion,
        createdAt: p.createdAt
      }));
      setProposals(transformedProposals);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch SKU catalog
  const fetchSkuCatalog = useCallback(async (params = {}) => {
    setSkuLoading(true);
    try {
      const response = await masterDataService.getSkuCatalog(params);
      const data = Array.isArray(response) ? response : (response.data || []);
      setSkuCatalog(data);
    } catch (err) {
      console.error('Failed to fetch SKU catalog:', err);
    } finally {
      setSkuLoading(false);
    }
  }, []);

  // Create proposal
  const createProposal = async (data) => {
    try {
      setLoading(true);
      const result = await proposalService.create(data);
      await fetchProposals(data.budgetId);
      return result;
    } catch (err) {
      console.error('Failed to create proposal:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add product to proposal
  const addProduct = async (proposalId, productData) => {
    try {
      setLoading(true);
      await proposalService.addProduct(proposalId, productData);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to add product:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Bulk add products
  const bulkAddProducts = async (proposalId, products) => {
    try {
      setLoading(true);
      await proposalService.bulkAddProducts(proposalId, products);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to bulk add products:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (proposalId, productId, data) => {
    try {
      setLoading(true);
      await proposalService.updateProduct(proposalId, productId, data);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to update product:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove product
  const removeProduct = async (proposalId, productId) => {
    try {
      setLoading(true);
      await proposalService.removeProduct(proposalId, productId);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to remove product:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit proposal
  const submitProposal = async (proposalId) => {
    try {
      setLoading(true);
      await proposalService.submit(proposalId);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to submit proposal:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Approve proposal
  const approveProposal = async (proposalId, level, action, comment) => {
    try {
      setLoading(true);
      const isReject = action === 'REJECTED' || action === 'reject';
      if (level === 1) {
        await (isReject ? proposalService.rejectL1(proposalId, comment) : proposalService.approveL1(proposalId, comment));
      } else {
        await (isReject ? proposalService.rejectL2(proposalId, comment) : proposalService.approveL2(proposalId, comment));
      }
      await fetchProposals();
    } catch (err) {
      console.error('Failed to approve proposal:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete proposal
  const deleteProposal = async (proposalId) => {
    try {
      setLoading(true);
      await proposalService.delete(proposalId);
      await fetchProposals();
    } catch (err) {
      console.error('Failed to delete proposal:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Open proposal detail
  const openProposalDetail = async (proposal) => {
    if (proposal?.id) {
      try {
        const result = await proposalService.getOne(proposal.id);
        setSelectedProposal(result);
        setCurrentProposalId(proposal.id);
      } catch (err) {
        console.error('Failed to load proposal:', err);
        setSelectedProposal(proposal);
        setCurrentProposalId(proposal.id);
      }
    } else {
      setSelectedProposal(proposal);
      setCurrentProposalId(null);
    }
    setShowProposalDetail(true);
  };

  // Close proposal detail
  const closeProposalDetail = () => {
    setShowProposalDetail(false);
    setSelectedProposal(null);
    setCurrentProposalId(null);
  };

  return {
    proposals,
    loading,
    error,
    showProposalDetail,
    selectedProposal,
    currentProposalId,
    skuCatalog,
    skuLoading,
    // Actions
    fetchProposals,
    fetchSkuCatalog,
    createProposal,
    addProduct,
    bulkAddProducts,
    updateProduct,
    removeProduct,
    submitProposal,
    approveProposal,
    deleteProposal,
    openProposalDetail,
    closeProposalDetail
  };
};
