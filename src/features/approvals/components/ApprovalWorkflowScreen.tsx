'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Edit2, Trash2, Save, X,
  ChevronRight, Users, Building2, RefreshCw,
  LayoutList, GitBranch, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { approvalWorkflowService } from '@/services/approvalWorkflowService';
import { masterDataService } from '@/services';
import { MobileDataCard, ConfirmDialog } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const ApprovalWorkflowScreen = ({}: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { dialogProps, confirm } = useConfirmDialog();
  const [steps, setSteps] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<string>('table');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    brandId: '',
    stepNumber: 1,
    roleName: '',
    roleCode: '',
    description: ''});

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    try {
      const brandId = selectedBrandId === 'all' ? null : selectedBrandId;
      const result = await approvalWorkflowService.getAll(brandId);
      setSteps(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch steps:', err);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [brandsRes, rolesRes] = await Promise.all([
          masterDataService.getBrands(),
          approvalWorkflowService.getAvailableRoles().catch(() => []),
        ]);
        const brandList = Array.isArray(brandsRes) ? brandsRes : (brandsRes?.data || []);
        setBrands(brandList);
        setAvailableRoles(Array.isArray(rolesRes) ? rolesRes : []);
      } catch (err: any) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const getNextStepNumber = () => {
    const brandSteps = selectedBrandId === 'all' ? steps : steps.filter((s: any) => s.brandId === selectedBrandId);
    return brandSteps.length > 0 ? Math.max(...brandSteps.map((s: any) => s.stepNumber)) + 1 : 1;
  };

  const openAddModal = () => {
    setEditingStep(null);
    setFormData({
      brandId: selectedBrandId !== 'all' ? selectedBrandId : '',
      stepNumber: getNextStepNumber(),
      roleName: '',
      roleCode: '',
      description: ''});
    setIsModalOpen(true);
  };

  const openEditModal = (step: any) => {
    setEditingStep(step);
    setFormData({
      brandId: step.brandId,
      stepNumber: step.stepNumber,
      roleName: step.roleName,
      roleCode: step.roleCode || '',
      description: step.description || ''});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.brandId || !formData.roleName) return;
    setSaving(true);
    try {
      if (editingStep) {
        await approvalWorkflowService.update(editingStep.id, formData);
        toast.success(t('approval.stepUpdated'));
      } else {
        await approvalWorkflowService.create(formData);
        toast.success(t('approval.stepCreated'));
      }
      setIsModalOpen(false);
      fetchSteps();
    } catch (err: any) {
      console.error('Failed to save:', err);
      toast.error(err.response?.data?.message || t('approval.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: any) => {
    confirm({
      title: t('common.delete'),
      message: t('approval.confirmDelete'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      promptRequired: 'delete',
      onConfirm: async () => {
        try {
          await approvalWorkflowService.delete(id);
          toast.success(t('approval.stepDeleted'));
          fetchSteps();
        } catch (err: any) {
          console.error('Failed to delete:', err);
          toast.error(t('approval.failedToDeleteStep'));
        }
      }});
  };

  // Group steps by brand for progress view
  const stepsByBrand = steps.reduce((acc: any, step: any) => {
    const brandName = step.brand?.name || 'Unknown';
    if (!acc[brandName]) acc[brandName] = [];
    acc[brandName].push(step);
    return acc;
  }, {});

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Compact Header + Filters */}
      <div className={`rounded-xl border px-2 md:px-3 py-2 ${'border-[#C4B5A5]'}`} style={{
        background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.04) 35%, rgba(215,183,151,0.12) 100%)',
        boxShadow: `inset 0 -1px 0 ${'rgba(215,183,151,0.05)'}`}}>
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${'bg-[rgba(160,120,75,0.18)]'}`}>
              <Settings size={14} className={'text-[#6B4D30]'} />
            </div>
            <div className="flex-shrink-0">
              <h1 className={`text-sm font-semibold font-['Montserrat'] ${'text-[#0A0A0A]'} leading-tight`}>
                {t('approval.title')}
              </h1>
              <p className={`text-[10px] font-['Montserrat'] ${'text-[#666666]'} leading-tight`}>
                {t('approval.subtitle')}
              </p>
            </div>
          </div>

          {/* Inline Filters */}
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <select
              value={selectedBrandId}
              onChange={(e: any) => setSelectedBrandId(e.target.value)}
              className={`flex-1 md:flex-none px-2 py-1 border rounded-lg text-xs font-['Montserrat'] transition-all focus:outline-none focus:ring-1 focus:ring-[#D7B797] ${'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
            >
              <option value="all">{t('approval.allBrands')}</option>
              {brands.map((brand: any) => (
                <option key={brand.id} value={brand.id}>{brand.name || brand.code}</option>
              ))}
            </select>

            <button
              onClick={fetchSteps}
              disabled={loading}
              className={`p-1.5 rounded-lg transition-colors ${'text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* View Toggle */}
            <div className={`flex items-center gap-0.5 p-0.5 rounded-lg ${'bg-[rgba(160,120,75,0.12)]'}`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ?'bg-white text-[#6B4D30] shadow-sm':'text-[#999999]'}`}
                title={t('approval.tableView')}
              >
                <LayoutList size={13} />
              </button>
              <button
                onClick={() => setViewMode('progress')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'progress'
                    ?'bg-white text-[#6B4D30] shadow-sm':'text-[#999999]'}`}
                title={t('approval.progressView')}
              >
                <GitBranch size={13} />
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-[#D7B797] hover:bg-[#C4A480] text-[#0A0A0A] font-semibold text-xs font-['Montserrat'] rounded-lg transition-colors"
            >
              <Plus size={13} />
              {t('approval.addStep')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 md:p-16 text-center">
          <RefreshCw size={32} className={`animate-spin mx-auto mb-4 ${'text-[#6B4D30]'}`} />
          <p className={`text-sm font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.loadingSteps')}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        isMobile ? (
          /* Mobile Card View */
          <div className="space-y-2">
            {steps.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${'bg-white border-[#C4B5A5]'}`}>
                <p className={`text-xs font-['Montserrat'] ${'text-[#666666]'}`}>
                  {t('approval.noStepsConfigured')}
                </p>
              </div>
            ) : (
              steps.map((step: any) => (
                <MobileDataCard
                  key={step.id}
                  title={step.roleName}
                  subtitle={step.brand?.name || '-'}
                  metrics={[
                    { label: t('approval.step'), value: `#${step.stepNumber}` },
                    { label: t('common.description'), value: step.description || '-' },
                  ]}
                  actions={[
                    { label: t('common.edit'), primary: true, onClick: () => openEditModal(step) },
                    { label: t('common.delete'), onClick: () => handleDelete(step.id) },
                  ]}
                >
                  {step.user && (
                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-['Montserrat'] ${'text-[#666666]'}`}>
                      <Users size={12} />
                      <span>{step.user.name}</span>
                    </div>
                  )}
                </MobileDataCard>
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className={`rounded-xl border overflow-hidden ${'border-[#C4B5A5]'}`} style={{
            background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)'}}>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={'bg-[rgba(160,120,75,0.12)]'}>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.brand')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] w-16 ${'text-[#666666]'}`}>{t('approval.step')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.roleUser')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('common.description')}</th>
                  <th className={`px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] w-24 ${'text-[#666666]'}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {steps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-3 py-12 text-center text-xs font-['Montserrat'] ${'text-[#666666]'}`}>
                      {t('approval.noStepsConfigured')}
                    </td>
                  </tr>
                ) : (
                  steps.map((step: any) => (
                    <tr key={step.id} className={`border-t transition-colors ${'border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.06)]'}`}>
                      <td className={`px-3 py-1 text-xs font-semibold font-['Montserrat'] ${'text-[#0A0A0A]'}`}>
                        {step.brand?.name || '-'}
                      </td>
                      <td className="px-3 py-1">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] font-['JetBrains_Mono'] ${'bg-[rgba(215,183,151,0.2)] text-[#6B4D30]'}`}>
                          {step.stepNumber}
                        </span>
                      </td>
                      <td className={`px-3 py-1 text-xs font-['Montserrat'] ${'text-[#0A0A0A]'}`}>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className={'text-[#666666]'} />
                          {step.roleName}
                          {step.user && (
                            <span className={`text-[10px] ${'text-[#999999]'}`}>({step.user.name})</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-1 text-xs font-['Montserrat'] ${'text-[#666666]'}`}>
                        {step.description || '-'}
                      </td>
                      <td className="px-3 py-1 text-right">
                        <button
                          onClick={() => openEditModal(step)}
                          className={`p-2 rounded-lg transition-colors ${'text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(step.id)}
                          className={`p-2 rounded-lg transition-colors ml-1 ${'text-[#666666] hover:text-red-600 hover:bg-red-50'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )
      ) : (
        /* Progress View */
        <div className="space-y-2 md:space-y-3">
          {Object.entries(stepsByBrand).map(([brandName, brandSteps]: any) => (
            <div key={brandName} className={`rounded-xl border p-3 md:p-4 ${'border-[#C4B5A5]'}`} style={{
              background:'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)'}}>
              <h3 className={`text-sm font-semibold font-['Montserrat'] mb-3 flex items-center gap-2 ${'text-[#0A0A0A]'}`}>
                <Building2 size={15} className={'text-[#6B4D30]'} />
                {brandName}
              </h3>
              {isMobile ? (
                /* Mobile: Vertical timeline */
                <div className="flex flex-col gap-2">
                  {brandSteps.sort((a: any, b: any) => a.stepNumber - b.stepNumber).map((step: any, index: any) => (
                    <div key={step.id}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${'bg-[rgba(160,120,75,0.18)] border-[#D7B797]'}`}>
                          <span className={`font-bold text-sm font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>{step.stepNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium font-['Montserrat'] ${'text-[#0A0A0A]'}`}>
                            {step.roleName}
                          </span>
                          {step.description && (
                            <p className={`text-xs font-['Montserrat'] truncate ${'text-[#666666]'}`}>
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {index < brandSteps.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <ChevronRight size={16} className={`rotate-90 ${'text-[#2E2E2E]/30'}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop: Horizontal timeline */
                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                  {brandSteps.sort((a: any, b: any) => a.stepNumber - b.stepNumber).map((step: any, index: any) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${'bg-[rgba(160,120,75,0.18)] border-[#D7B797]'}`}>
                          <span className={`font-bold font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>{step.stepNumber}</span>
                        </div>
                        <span className={`mt-2 text-sm font-medium font-['Montserrat'] text-center max-w-[100px] ${'text-[#0A0A0A]'}`}>
                          {step.roleName}
                        </span>
                      </div>
                      {index < brandSteps.length - 1 && (
                        <ChevronRight size={20} className={'text-[#2E2E2E]/30'} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {Object.keys(stepsByBrand).length === 0 && (
            <div className={`p-8 md:p-16 text-center rounded-xl border ${'bg-white border-[#C4B5A5]'}`}>
              <Settings size={isMobile ? 36 : 48} className={`mx-auto mb-4 ${'text-[#2E2E2E]/30'}`} />
              <p className={`text-sm font-['Montserrat'] ${'text-[#666666]'}`}>
                {t('approval.noStepsProgress')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex ${isMobile ? 'items-end' : 'items-center'} justify-center z-50`} onClick={() => setIsModalOpen(false)}>
          <div
            className={`w-full ${isMobile ? 'rounded-t-2xl max-h-[90vh] overflow-y-auto' : 'rounded-2xl max-w-md m-4'} p-4 md:p-6 shadow-2xl ${'bg-white border border-[#C4B5A5]'}`}
            onClick={(e: any) => e.stopPropagation()}
          >
            {/* Mobile drag indicator */}
            {isMobile && (
              <div className="flex justify-center mb-3">
                <div className={`w-10 h-1 rounded-full ${'bg-[#C4B5A5]'}`} />
              </div>
            )}

            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className={`text-lg md:text-xl font-bold font-['Montserrat'] ${'text-[#0A0A0A]'}`}>
                {editingStep ? t('approval.editStep') : t('approval.addNewStep')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Brand */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.brand')}</label>
                <select
                  value={formData.brandId}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, brandId: e.target.value }))}
                  disabled={!!editingStep}
                  className={`w-full px-3 py-0.5 border rounded-lg text-sm font-['Montserrat'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] disabled:opacity-50 ${'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                >
                  <option value="">{t('approval.selectBrand')}</option>
                  {brands.map((brand: any) => (
                    <option key={brand.id} value={brand.id}>{brand.name || brand.code}</option>
                  ))}
                </select>
              </div>

              {/* Step Number */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.stepNumber')}</label>
                <input
                  type="number"
                  min="1"
                  value={formData.stepNumber}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, stepNumber: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-0.5 border rounded-lg text-sm font-['JetBrains_Mono'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                />
              </div>

              {/* Role */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.role')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(availableRoles.length > 0 ? availableRoles : [
                    { code: 'BRAND_MANAGER', name: 'Brand Manager' },
                    { code: 'GROUP_HEAD', name: 'Group Head' },
                    { code: 'FINANCE', name: 'Finance Lead' },
                    { code: 'CEO', name: 'CEO' },
                    { code: 'ADMIN', name: 'Admin' },
                  ]).map((role: any) => (
                    <button
                      key={role.code}
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, roleName: role.name, roleCode: role.code }))}
                      className={`px-3 py-0.5 text-sm font-['Montserrat'] rounded-lg border transition-colors ${
                        formData.roleCode === role.code
                          ?'bg-[rgba(215,183,151,0.2)] border-[#D7B797] text-[#6B4D30]':'border-[#C4B5A5] text-[#666666] hover:border-[rgba(215,183,151,0.4)]'}`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.descriptionOptional')}</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder={t('approval.descriptionPlaceholder')}
                  className={`w-full px-3 py-0.5 border rounded-lg text-sm font-['Montserrat'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'}`}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className={`flex-1 px-4 py-0.5 border rounded-lg font-medium text-sm font-['Montserrat'] transition-colors ${'border-[#C4B5A5] text-[#666666] hover:bg-[rgba(160,120,75,0.12)]'} ${isMobile ? 'order-2' : ''}`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.brandId || !formData.roleName || saving}
                className={`flex-1 px-4 py-0.5 bg-[#D7B797] hover:bg-[#C4A480] text-[#0A0A0A] font-semibold text-sm font-['Montserrat'] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isMobile ? 'order-1' : ''}`}
              >
                <Save size={16} />
                {saving ? t('approval.saving') : editingStep ? t('common.update') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default ApprovalWorkflowScreen;
