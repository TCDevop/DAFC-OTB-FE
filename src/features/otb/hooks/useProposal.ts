'use client';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { proposalService, masterDataService } from '../../../services';
import { invalidateCache } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export const useProposal = () => {
  const { isAuthenticated } = useAuth();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);

  // SKU catalog for adding products
  const [skuCatalog, setSkuCatalog] = useState<any[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);

  // Fetch proposals
  const fetchProposals = useCallback(async (budgetId?: string) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const params = budgetId ? { budgetId } : {};
      const response = await proposalService.getAll(params);
      const data = Array.isArray(response) ? response : [];
      const transformedProposals = data.map((p: any) => ({
        id: p.id,
        ticketName: p.ticketName,
        budgetId: p.budgetId,
        planningVersionId: p.planningVersionId,
        status: p.status?.toLowerCase() || 'draft',
        totalSkuCount: p.totalSkuCount,
        totalOrderQty: p.totalOrderQty,
        totalValue: Number(p.totalValue),
        products: (p.products || []).map((prod: any) => ({
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
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
      toast.error('Không thể tải danh sách đề xuất.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch SKU catalog
  const fetchSkuCatalog = useCallback(async (params: any = {}) => {
    setSkuLoading(true);
    try {
      const response = await masterDataService.getSkuCatalog(params);
      const data = Array.isArray(response) ? response : (response.data || []);
      setSkuCatalog(data);
    } catch (err: any) {
      console.error('Failed to fetch SKU catalog:', err);
      toast.error('Không thể tải danh mục SKU.');
    } finally {
      setSkuLoading(false);
    }
  }, []);

  // Create proposal
  const createProposal = async (data: any) => {
    try {
      setLoading(true);
      const result = await proposalService.create(data);
      invalidateCache('/proposals');
      await fetchProposals(data.budgetId);
      return result;
    } catch (err: any) {
      console.error('Failed to create proposal:', err);
      toast.error('Tạo đề xuất thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add product to proposal
  const addProduct = async (proposalId: string, productData: any) => {
    try {
      setLoading(true);
      await proposalService.addProduct(proposalId, productData);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to add product:', err);
      toast.error('Thêm sản phẩm thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Bulk add products
  const bulkAddProducts = async (proposalId: string, products: any[]) => {
    try {
      setLoading(true);
      await proposalService.bulkAddProducts(proposalId, products);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to bulk add products:', err);
      toast.error('Thêm hàng loạt sản phẩm thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (proposalId: string, productId: string, data: any) => {
    try {
      setLoading(true);
      await proposalService.updateProduct(proposalId, productId, data);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to update product:', err);
      toast.error('Cập nhật sản phẩm thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove product
  const removeProduct = async (proposalId: string, productId: string) => {
    try {
      setLoading(true);
      await proposalService.removeProduct(proposalId, productId);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to remove product:', err);
      toast.error('Xoá sản phẩm thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit proposal
  const submitProposal = async (proposalId: string) => {
    try {
      setLoading(true);
      await proposalService.submit(proposalId);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to submit proposal:', err);
      toast.error('Gửi duyệt đề xuất thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Approve proposal
  const approveProposal = async (proposalId: string, level: number, action: string, comment?: string) => {
    try {
      setLoading(true);
      const isReject = action === 'REJECTED' || action === 'reject';
      if (level === 1) {
        await (isReject ? proposalService.rejectL1(proposalId, comment) : proposalService.approveL1(proposalId, comment));
      } else {
        await (isReject ? proposalService.rejectL2(proposalId, comment) : proposalService.approveL2(proposalId, comment));
      }
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to approve proposal:', err);
      toast.error('Phê duyệt đề xuất thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete proposal
  const deleteProposal = async (proposalId: string) => {
    try {
      setLoading(true);
      await proposalService.delete(proposalId);
      invalidateCache('/proposals');
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to delete proposal:', err);
      toast.error('Xoá đề xuất thất bại.');
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Open proposal detail
  const openProposalDetail = async (proposal: any) => {
    if (proposal?.id) {
      try {
        const result = await proposalService.getOne(proposal.id);
        setSelectedProposal(result);
        setCurrentProposalId(proposal.id);
      } catch (err: any) {
        console.error('Failed to load proposal:', err);
        toast.error('Không thể tải chi tiết đề xuất.');
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
