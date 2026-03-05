'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, Plus, Edit2, Trash2, Save, X,
  ChevronRight, ChevronDown, Check, Users, Building2, RefreshCw,
  LayoutList, GitBranch, Layers, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { approvalWorkflowService } from '@/services/approvalWorkflowService';
import { masterDataService } from '@/services';
import { MobileDataCard, ConfirmDialog } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

// Flatten workflows → level-based "steps" for display
const flattenWorkflowsToSteps = (workflows: any[]) => {
  const steps: any[] = [];
  (workflows || []).forEach((wf: any) => {
    (wf.approval_workflow_levels || []).forEach((level: any) => {
      steps.push({
        id: level.id,
        workflowId: wf.id,
        groupBrandId: wf.group_brand_id,
        groupBrand: wf.group_brand,
        workflowName: wf.workflow_name,
        stepNumber: level.level_order,
        roleName: level.level_name,
        approverUserId: level.approver_user_id,
        isRequired: level.is_required,
        user: level.approver_user,
      });
    });
  });
  return steps.sort((a, b) => {
    const brandCmp = (a.groupBrand?.name || '').localeCompare(b.groupBrand?.name || '');
    return brandCmp !== 0 ? brandCmp : a.stepNumber - b.stepNumber;
  });
};

const ApprovalWorkflowScreen = ({}: any) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { dialogProps, confirm } = useConfirmDialog();
  const [steps, setSteps] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [groupBrands, setGroupBrands] = useState<any[]>([]);
  const [brandList, setBrandList] = useState<any[]>([]);
  const [selectedGroupBrandId, setSelectedGroupBrandId] = useState<string>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<string>('table');

  // Dropdown states
  const [isGBDropdownOpen, setIsGBDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const gbDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    groupBrandId: '',
    stepNumber: 1,
    roleName: '',
    isRequired: true,
    approverUserId: '',
  });

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    try {
      const gbId = selectedGroupBrandId === 'all' ? null : selectedGroupBrandId;
      const result = await approvalWorkflowService.getAll(gbId);
      const wfList = Array.isArray(result) ? result : [];
      setWorkflows(wfList);
      setSteps(flattenWorkflowsToSteps(wfList));
    } catch (err: any) {
      console.error('Failed to fetch workflows:', err);
      setWorkflows([]);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupBrandId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const gbRes = await masterDataService.getGroupBrands();
        const gbList = Array.isArray(gbRes) ? gbRes : (gbRes?.data || []);
        setGroupBrands(gbList);
        // Flatten child brands
        const allBrands: any[] = [];
        gbList.forEach((gb: any) => {
          (gb.brands || []).forEach((b: any) => {
            allBrands.push({ ...b, groupBrandId: gb.id, groupBrandName: gb.name });
          });
        });
        setBrandList(allBrands);
      } catch (err: any) {
        console.error('Failed to fetch group brands:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gbDropdownRef.current && !gbDropdownRef.current.contains(e.target as Node)) setIsGBDropdownOpen(false);
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) setIsBrandDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Brands filtered by selected group brand
  const filteredBrands = selectedGroupBrandId === 'all'
    ? brandList
    : brandList.filter((b: any) => String(b.groupBrandId) === String(selectedGroupBrandId));

  const selectedGroupBrandObj = groupBrands.find((g: any) => String(g.id) === String(selectedGroupBrandId));
  const selectedBrandObj = brandList.find((b: any) => String(b.id) === String(selectedBrandId));

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const getNextStepNumber = () => {
    const filteredSteps = selectedGroupBrandId === 'all'
      ? steps
      : steps.filter((s: any) => s.groupBrandId === selectedGroupBrandId);
    return filteredSteps.length > 0 ? Math.max(...filteredSteps.map((s: any) => s.stepNumber)) + 1 : 1;
  };

  const openAddModal = () => {
    setEditingStep(null);
    setFormData({
      groupBrandId: selectedGroupBrandId !== 'all' ? selectedGroupBrandId : '',
      stepNumber: getNextStepNumber(),
      roleName: '',
      isRequired: true,
      approverUserId: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (step: any) => {
    setEditingStep(step);
    setFormData({
      groupBrandId: step.groupBrandId,
      stepNumber: step.stepNumber,
      roleName: step.roleName,
      isRequired: step.isRequired,
      approverUserId: step.approverUserId || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.groupBrandId || !formData.roleName) return;
    setSaving(true);
    try {
      if (editingStep) {
        // Update existing level
        await approvalWorkflowService.updateLevel(editingStep.id, {
          levelOrder: formData.stepNumber,
          levelName: formData.roleName,
          isRequired: formData.isRequired,
          ...(formData.approverUserId ? { approverUserId: formData.approverUserId } : {}),
        });
        toast.success(t('approval.stepUpdated'));
      } else {
        // Find existing workflow for this group brand, or create one
        let wf = workflows.find((w: any) => w.group_brand_id === formData.groupBrandId);
        if (!wf) {
          const gb = groupBrands.find((g: any) => g.id === formData.groupBrandId);
          const wfName = `${gb?.name || 'Group'} Approval Workflow`;
          wf = await approvalWorkflowService.create({
            groupBrandId: formData.groupBrandId,
            workflowName: wfName,
          });
        }
        const workflowId = wf?.id;
        if (workflowId) {
          await approvalWorkflowService.addLevel(workflowId, {
            levelOrder: formData.stepNumber,
            levelName: formData.roleName,
            isRequired: formData.isRequired,
            approverUserId: formData.approverUserId || '0',
          });
        }
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

  const handleDelete = (step: any) => {
    confirm({
      title: t('common.delete'),
      message: t('approval.confirmDelete'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      promptRequired: 'delete',
      onConfirm: async () => {
        try {
          await approvalWorkflowService.deleteLevel(step.id);
          toast.success(t('approval.stepDeleted'));
          fetchSteps();
        } catch (err: any) {
          console.error('Failed to delete:', err);
          toast.error(t('approval.failedToDeleteStep'));
        }
      }});
  };

  // Hardcoded roles (BE has no /roles endpoint)
  const availableRoles = [
    { code: 'BRAND_MANAGER', name: 'Brand Manager' },
    { code: 'GROUP_HEAD', name: 'Group Head' },
    { code: 'MERCH_MANAGER', name: 'Merchandising Manager' },
    { code: 'FINANCE', name: 'Finance Lead' },
    { code: 'CEO', name: 'CEO' },
  ];

  // Group steps by group brand for progress view
  const stepsByBrand = steps.reduce((acc: any, step: any) => {
    const brandName = step.groupBrand?.name || 'Unknown';
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
          <div className="flex flex-wrap items-end gap-2.5 md:ml-auto">
            {/* Group Brand Filter */}
            <div className="relative shrink-0" ref={gbDropdownRef}>
              <label className="block text-[10px] uppercase tracking-[0.06em] font-bold mb-0.5 text-[#8A6340]">{t('approval.groupBrand')}</label>
              <button
                type="button"
                onClick={() => { setIsGBDropdownOpen(!isGBDropdownOpen); setIsBrandDropdownOpen(false); }}
                className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedGroupBrandId !== 'all'
                  ?'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <Layers size={12} className={`shrink-0 ${selectedGroupBrandId !== 'all' ? 'text-[#6B4D30]' : 'text-[#666666]'}`} />
                  <span className="truncate">{selectedGroupBrandObj?.name || t('approval.allGroupBrands')}</span>
                </div>
                <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isGBDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGBDropdownOpen && (
                <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max ${'bg-white border-[#C4B5A5]'}`}>
                  <div
                    onClick={() => { setSelectedGroupBrandId('all'); setSelectedBrandId('all'); setIsGBDropdownOpen(false); }}
                    className={`px-3 py-1 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedGroupBrandId === 'all'
                      ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                  >
                    <span className="font-medium">{t('approval.allGroupBrands')}</span>
                    {selectedGroupBrandId === 'all' && <Check size={14} className="text-[#127749]" />}
                  </div>
                  {groupBrands.map((gb: any) => (
                    <div
                      key={gb.id}
                      onClick={() => { setSelectedGroupBrandId(gb.id); setSelectedBrandId('all'); setIsGBDropdownOpen(false); }}
                      className={`px-3 py-1 flex items-center justify-between cursor-pointer text-sm transition-colors ${String(selectedGroupBrandId) === String(gb.id)
                        ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                    >
                      <span className="font-medium">{gb.name || gb.code}</span>
                      {String(selectedGroupBrandId) === String(gb.id) && <Check size={14} className="text-[#127749]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div className="relative shrink-0" ref={brandDropdownRef}>
              <label className="block text-[10px] uppercase tracking-[0.06em] font-bold mb-0.5 text-[#8A6340]">{t('approval.brand')}</label>
              <button
                type="button"
                onClick={() => { setIsBrandDropdownOpen(!isBrandDropdownOpen); setIsGBDropdownOpen(false); }}
                className={`w-full px-2 py-1 border rounded-md font-medium cursor-pointer flex items-center justify-between text-xs transition-all ${selectedBrandId !== 'all'
                  ?'bg-[rgba(160,120,75,0.18)] border-[rgba(215,183,151,0.4)] text-[#6B4D30] hover:border-[#D7B797]':'bg-white border-[#C4B5A5] text-[#0A0A0A] hover:border-[rgba(215,183,151,0.4)] hover:bg-[rgba(160,120,75,0.18)]'}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <Tag size={12} className={`shrink-0 ${selectedBrandId !== 'all' ? 'text-[#6B4D30]' : 'text-[#666666]'}`} />
                  <span className="truncate">{selectedBrandObj?.name || t('approval.allBrands')}</span>
                </div>
                <ChevronDown size={12} className={`shrink-0 ml-1 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isBrandDropdownOpen && (
                <div className={`absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-[9999] overflow-hidden whitespace-nowrap min-w-full w-max max-h-60 overflow-y-auto ${'bg-white border-[#C4B5A5]'}`}>
                  <div
                    onClick={() => { setSelectedBrandId('all'); setIsBrandDropdownOpen(false); }}
                    className={`px-3 py-1 flex items-center justify-between cursor-pointer text-sm transition-colors ${selectedBrandId === 'all'
                      ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                  >
                    <span className="font-medium">{t('approval.allBrands')}</span>
                    {selectedBrandId === 'all' && <Check size={14} className="text-[#127749]" />}
                  </div>
                  {filteredBrands.map((b: any) => (
                    <div
                      key={b.id}
                      onClick={() => { setSelectedBrandId(b.id); setIsBrandDropdownOpen(false); }}
                      className={`px-3 py-1 flex items-center justify-between cursor-pointer text-sm transition-colors ${String(selectedBrandId) === String(b.id)
                        ?'bg-[rgba(18,119,73,0.1)] text-[#127749]':'hover:bg-[rgba(160,120,75,0.18)] text-[#0A0A0A]'}`}
                    >
                      <span className="font-medium">{b.name}</span>
                      {String(selectedBrandId) === String(b.id) && <Check size={14} className="text-[#127749]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  subtitle={step.groupBrand?.name || '-'}
                  metrics={[
                    { label: t('approval.step'), value: `#${step.stepNumber}` },
                    { label: t('approval.required'), value: step.isRequired ? 'Yes' : 'No' },
                  ]}
                  actions={[
                    { label: t('common.edit'), primary: true, onClick: () => openEditModal(step) },
                    { label: t('common.delete'), onClick: () => handleDelete(step) },
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
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.groupBrand')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] w-16 ${'text-[#666666]'}`}>{t('approval.step')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.roleUser')}</th>
                  <th className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.required')}</th>
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
                        {step.groupBrand?.name || '-'}
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
                        {step.isRequired ? 'Yes' : 'No'}
                      </td>
                      <td className="px-3 py-1 text-right">
                        <button
                          onClick={() => openEditModal(step)}
                          className={`p-2 rounded-lg transition-colors ${'text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.18)]'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(step)}
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
                          {step.user && (
                            <p className={`text-xs font-['Montserrat'] truncate ${'text-[#666666]'}`}>
                              {step.user.name}
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
              {/* Group Brand */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${'text-[#666666]'}`}>{t('approval.groupBrand')}</label>
                <select
                  value={formData.groupBrandId}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, groupBrandId: e.target.value }))}
                  disabled={!!editingStep}
                  className={`w-full px-3 py-0.5 border rounded-lg text-sm font-['Montserrat'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] disabled:opacity-50 ${'bg-white border-[#C4B5A5] text-[#0A0A0A]'}`}
                >
                  <option value="">{t('approval.selectBrand')}</option>
                  {groupBrands.map((gb: any) => (
                    <option key={gb.id} value={gb.id}>{gb.name || gb.code}</option>
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
                  {availableRoles.map((role: any) => (
                    <button
                      key={role.code}
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, roleName: role.name }))}
                      className={`px-3 py-0.5 text-sm font-['Montserrat'] rounded-lg border transition-colors ${
                        formData.roleName === role.name
                          ?'bg-[rgba(215,183,151,0.2)] border-[#D7B797] text-[#6B4D30]':'border-[#C4B5A5] text-[#666666] hover:border-[rgba(215,183,151,0.4)]'}`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
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
                disabled={!formData.groupBrandId || !formData.roleName || saving}
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
