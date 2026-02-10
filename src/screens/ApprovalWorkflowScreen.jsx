'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Edit2, Trash2, Save, X,
  ChevronRight, Users, Building2, RefreshCw,
  LayoutList, GitBranch, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { approvalWorkflowService } from '../services/approvalWorkflowService';
import { masterDataService } from '../services';
import { useLanguage } from '@/contexts/LanguageContext';

const ApprovalWorkflowScreen = ({ darkMode = false }) => {
  const { t } = useLanguage();
  const [steps, setSteps] = useState([]);
  const [brands, setBrands] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    brandId: '',
    stepNumber: 1,
    roleName: '',
    roleCode: '',
    description: '',
  });

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    try {
      const brandId = selectedBrandId === 'all' ? null : selectedBrandId;
      const result = await approvalWorkflowService.getAll(brandId);
      setSteps(Array.isArray(result) ? result : []);
    } catch (err) {
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
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const getNextStepNumber = () => {
    const brandSteps = selectedBrandId === 'all' ? steps : steps.filter(s => s.brandId === selectedBrandId);
    return brandSteps.length > 0 ? Math.max(...brandSteps.map(s => s.stepNumber)) + 1 : 1;
  };

  const openAddModal = () => {
    setEditingStep(null);
    setFormData({
      brandId: selectedBrandId !== 'all' ? selectedBrandId : '',
      stepNumber: getNextStepNumber(),
      roleName: '',
      roleCode: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (step) => {
    setEditingStep(step);
    setFormData({
      brandId: step.brandId,
      stepNumber: step.stepNumber,
      roleName: step.roleName,
      roleCode: step.roleCode || '',
      description: step.description || '',
    });
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
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error(err.response?.data?.message || t('approval.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const reason = window.prompt(t('approval.confirmDelete'));
    if (reason !== 'delete') return;
    try {
      await approvalWorkflowService.delete(id);
      toast.success(t('approval.stepDeleted'));
      fetchSteps();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(t('approval.failedToDeleteStep'));
    }
  };

  // Group steps by brand for progress view
  const stepsByBrand = steps.reduce((acc, step) => {
    const brandName = step.brand?.name || 'Unknown';
    if (!acc[brandName]) acc[brandName] = [];
    acc[brandName].push(step);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`backdrop-blur-xl rounded-2xl shadow-xl border p-6 ${
        darkMode ? 'bg-[#121212]/95 border-[#2E2E2E]' : 'bg-gradient-to-br from-white to-[rgba(160,120,75,0.12)] border-[#C4B5A5]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-[rgba(215,183,151,0.1)]' : 'bg-[rgba(160,120,75,0.18)]'}`}>
              <Settings size={24} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {t('approval.title')}
              </h1>
              <p className={`text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                {t('approval.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D7B797] hover:bg-[#C4A480] text-[#0A0A0A] font-semibold text-sm font-['Montserrat'] rounded-lg transition-colors"
          >
            <Plus size={16} />
            {t('approval.addStep')}
          </button>
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div className={`rounded-xl border shadow-sm p-4 ${
        darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter size={16} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
            <span className={`text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>{t('approval.brand')}</span>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm font-['Montserrat'] transition-all focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${
                darkMode
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]'
                  : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'
              }`}
            >
              <option value="all">{t('approval.allBrands')}</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name || brand.code}</option>
              ))}
            </select>
            <button
              onClick={fetchSteps}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'text-[#999999] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)]' : 'text-[#666666] hover:text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'
              }`}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* View Toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.12)]'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? darkMode ? 'bg-[#2E2E2E] text-[#D7B797]' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#666666]' : 'text-[#999999]'
              }`}
              title={t('approval.tableView')}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('progress')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'progress'
                  ? darkMode ? 'bg-[#2E2E2E] text-[#D7B797]' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#666666]' : 'text-[#999999]'
              }`}
              title={t('approval.progressView')}
            >
              <GitBranch size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center">
          <RefreshCw size={32} className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
          <p className={`text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.loadingSteps')}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className={`rounded-xl border shadow-sm overflow-hidden ${
          darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
        }`}>
          <table className="w-full">
            <thead>
              <tr className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.12)]'}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.brand')}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] w-20 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.step')}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.roleUser')}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.description')}</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider font-['Montserrat'] w-32 ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {steps.length === 0 ? (
                <tr>
                  <td colSpan="5" className={`px-4 py-16 text-center text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                    {t('approval.noStepsConfigured')}
                  </td>
                </tr>
              ) : (
                steps.map((step) => (
                  <tr key={step.id} className={`border-t transition-colors ${
                    darkMode ? 'border-[#2E2E2E] hover:bg-[rgba(215,183,151,0.04)]' : 'border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.06)]'
                  }`}>
                    <td className={`px-4 py-3 text-sm font-semibold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                      {step.brand?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm font-['JetBrains_Mono'] ${
                        darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-[rgba(215,183,151,0.2)] text-[#8A6340]'
                      }`}>
                        {step.stepNumber}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                      <div className="flex items-center gap-2">
                        <Users size={14} className={darkMode ? 'text-[#999999]' : 'text-[#666666]'} />
                        {step.roleName}
                        {step.user && (
                          <span className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-[#999999]'}`}>({step.user.name})</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                      {step.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(step)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'text-[#999999] hover:text-[#D7B797] hover:bg-[rgba(215,183,151,0.08)]' : 'text-[#666666] hover:text-[#8A6340] hover:bg-[rgba(160,120,75,0.18)]'
                        }`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(step.id)}
                        className={`p-2 rounded-lg transition-colors ml-1 ${
                          darkMode ? 'text-[#999999] hover:text-[#FF7B72] hover:bg-[rgba(248,81,73,0.08)]' : 'text-[#666666] hover:text-red-600 hover:bg-red-50'
                        }`}
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
      ) : (
        /* Progress View */
        <div className="space-y-4">
          {Object.entries(stepsByBrand).map(([brandName, brandSteps]) => (
            <div key={brandName} className={`rounded-xl border shadow-sm p-6 ${
              darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
            }`}>
              <h3 className={`text-lg font-semibold font-['Montserrat'] mb-4 flex items-center gap-2 ${
                darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'
              }`}>
                <Building2 size={20} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
                {brandName}
              </h3>
              <div className="flex items-center gap-4 flex-wrap">
                {brandSteps.sort((a, b) => a.stepNumber - b.stepNumber).map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        darkMode ? 'bg-[rgba(215,183,151,0.1)] border-[#D7B797]' : 'bg-[rgba(160,120,75,0.18)] border-[#D7B797]'
                      }`}>
                        <span className={`font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{step.stepNumber}</span>
                      </div>
                      <span className={`mt-2 text-sm font-medium font-['Montserrat'] text-center max-w-[100px] ${
                        darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'
                      }`}>
                        {step.roleName}
                      </span>
                    </div>
                    {index < brandSteps.length - 1 && (
                      <ChevronRight size={20} className={darkMode ? 'text-[#2E2E2E]' : 'text-[#2E2E2E]/30'} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(stepsByBrand).length === 0 && (
            <div className={`p-16 text-center rounded-xl border ${
              darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-[#C4B5A5]'
            }`}>
              <Settings size={48} className={`mx-auto mb-4 ${darkMode ? 'text-[#2E2E2E]' : 'text-[#2E2E2E]/30'}`} />
              <p className={`text-sm font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>
                {t('approval.noStepsProgress')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div
            className={`rounded-2xl w-full max-w-md p-6 m-4 shadow-2xl ${
              darkMode ? 'bg-[#121212] border border-[#2E2E2E]' : 'bg-white border border-[#C4B5A5]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold font-['Montserrat'] ${darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'}`}>
                {editingStep ? t('approval.editStep') : t('approval.addNewStep')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#1A1A1A] text-[#999999]' : 'hover:bg-[rgba(160,120,75,0.18)] text-[#666666]'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Brand */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.brand')}</label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandId: e.target.value }))}
                  disabled={!!editingStep}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-['Montserrat'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] disabled:opacity-50 ${
                    darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'
                  }`}
                >
                  <option value="">{t('approval.selectBrand')}</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name || brand.code}</option>
                  ))}
                </select>
              </div>

              {/* Step Number */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.stepNumber')}</label>
                <input
                  type="number"
                  min="1"
                  value={formData.stepNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, stepNumber: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-['JetBrains_Mono'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${
                    darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A]'
                  }`}
                />
              </div>

              {/* Role */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.role')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(availableRoles.length > 0 ? availableRoles : [
                    { code: 'BRAND_MANAGER', name: 'Brand Manager' },
                    { code: 'GROUP_HEAD', name: 'Group Head' },
                    { code: 'FINANCE', name: 'Finance Lead' },
                    { code: 'CEO', name: 'CEO' },
                    { code: 'ADMIN', name: 'Admin' },
                  ]).map(role => (
                    <button
                      key={role.code}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, roleName: role.name, roleCode: role.code }))}
                      className={`px-3 py-2 text-sm font-['Montserrat'] rounded-lg border transition-colors ${
                        formData.roleCode === role.code
                          ? darkMode
                            ? 'bg-[rgba(215,183,151,0.15)] border-[#D7B797] text-[#D7B797]'
                            : 'bg-[rgba(215,183,151,0.2)] border-[#D7B797] text-[#8A6340]'
                          : darkMode
                            ? 'border-[#2E2E2E] text-[#999999] hover:border-[rgba(215,183,151,0.25)]'
                            : 'border-[#C4B5A5] text-[#666666] hover:border-[rgba(215,183,151,0.4)]'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 font-['Montserrat'] ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('approval.descriptionOptional')}</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('approval.descriptionPlaceholder')}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-['Montserrat'] focus:outline-none focus:ring-2 focus:ring-[#D7B797] ${
                    darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F2F2F2] placeholder-[#666666]' : 'bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className={`flex-1 px-4 py-2.5 border rounded-lg font-medium text-sm font-['Montserrat'] transition-colors ${
                  darkMode ? 'border-[#2E2E2E] text-[#999999] hover:bg-[#1A1A1A]' : 'border-[#C4B5A5] text-[#666666] hover:bg-[rgba(160,120,75,0.12)]'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.brandId || !formData.roleName || saving}
                className="flex-1 px-4 py-2.5 bg-[#D7B797] hover:bg-[#C4A480] text-[#0A0A0A] font-semibold text-sm font-['Montserrat'] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? t('approval.saving') : editingStep ? t('common.update') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflowScreen;
