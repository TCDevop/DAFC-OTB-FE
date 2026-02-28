'use client';

import { useState } from 'react';
import {
  X, AlertCircle, AlertTriangle, CheckCircle, Clock,
  GitCompare, RotateCcw, ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BottomSheet } from '@/components/mobile';
import type { ValidationIssue } from '../hooks/useAllocationState';

interface VersionHistoryItem {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  createdBy?: string;
  isFinal?: boolean;
}

interface AllocationSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  validationIssues: ValidationIssue[];
  versions: VersionHistoryItem[];
  selectedVersionId?: string;
  onCompareVersion?: (versionId: string) => void;
  onRollbackVersion?: (versionId: string) => void;
}

const AllocationSidePanel = ({
  isOpen,
  onClose,
  validationIssues,
  versions,
  selectedVersionId,
  onCompareVersion,
  onRollbackVersion}: AllocationSidePanelProps) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const [activeTab, setActiveTab] = useState<'validation' | 'history'>('validation');

  const errors = validationIssues.filter((i) => i.type === 'error');
  const warnings = validationIssues.filter((i) => i.type === 'warning');

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      {!isMobile && (
        <div
          className={`flex items-center justify-between px-3 py-2 border-b ${'border-[rgba(215,183,151,0.3)]'}`}
        >
          <div className="flex items-center gap-1">
            {/* Tab buttons */}
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'validation'
                  ?'bg-[rgba(160,120,75,0.18)] text-[#6B4D30]':'text-[#666] hover:text-[#0A0A0A]'}`}
            >
              {t('planning.validation')}
              {errors.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F85149] text-white text-[9px] font-bold">
                  {errors.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ?'bg-[rgba(160,120,75,0.18)] text-[#6B4D30]':'text-[#666] hover:text-[#0A0A0A]'}`}
            >
              {t('planning.history')}
            </button>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${'text-[#666] hover:text-[#0A0A0A] hover:bg-[rgba(160,120,75,0.12)]'}`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mobile tab bar */}
      {isMobile && (
        <div
          className={`flex border-b ${'border-[rgba(215,183,151,0.3)]'}`}
        >
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors ${
              activeTab === 'validation'
                ?'border-[#6B4D30] text-[#6B4D30]': 'border-transparent ' + ('text-[#666]')
            }`}
          >
            {t('planning.validation')}
            {errors.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F85149] text-white text-[9px] font-bold">
                {errors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors ${
              activeTab === 'history'
                ?'border-[#6B4D30] text-[#6B4D30]': 'border-transparent ' + ('text-[#666]')
            }`}
          >
            {t('planning.history')}
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'validation' && (
          <div className="space-y-2">
            {validationIssues.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle
                  size={32}
                  className={'text-[#127749]'}
                />
                <span
                  className={`text-xs mt-2 ${'text-[#666]'}`}
                >
                  {t('planning.noErrors')}
                </span>
              </div>
            )}

            {/* Errors */}
            {errors.map((issue) => (
              <div
                key={issue.key}
                className={`flex items-start gap-2 p-2 rounded-lg border ${'bg-red-50 border-red-200'}`}
              >
                <AlertCircle size={14} className="text-[#F85149] shrink-0 mt-0.5" />
                <span className="text-xs text-[#F85149]">
                  {t(issue.message, issue.params)}
                </span>
              </div>
            ))}

            {/* Warnings */}
            {warnings.map((issue) => (
              <div
                key={issue.key}
                className={`flex items-start gap-2 p-2 rounded-lg border ${'bg-amber-50 border-amber-200'}`}
              >
                <AlertTriangle size={14} className="text-[#E3B341] shrink-0 mt-0.5" />
                <span className={`text-xs ${'text-amber-700'}`}>
                  {t(issue.message, issue.params)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-0">
            {versions.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <Clock size={32} className={'text-[#666]'} />
                <span
                  className={`text-xs mt-2 ${'text-[#666]'}`}
                >
                  {t('planning.noVersions')}
                </span>
              </div>
            )}

            {versions.map((version, i) => {
              const isSelected = version.id === selectedVersionId;

              return (
                <div
                  key={version.id}
                  className={`relative pl-5 py-2 ${
                    i < versions.length - 1
                      ? `border-l-2 ml-1.5 ${'border-[#D4C8BB]'}`
                      : 'ml-1.5'
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-3 w-3 h-3 rounded-full border-2 -translate-x-[7px] ${
                      isSelected
                        ? 'bg-[#127749] border-[#2A9E6A]'
                        : version.isFinal
                          ?'bg-[#6B4D30] border-[#6B4D30]':'bg-white border-[#C4B5A5]'}`}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold font-['Montserrat'] ${
                            isSelected
                              ? 'text-[#127749]'
                              :'text-[#0A0A0A]'}`}
                        >
                          {version.name}
                        </span>
                        {version.isFinal && (
                          <span className="px-1 py-px text-[8px] font-bold bg-[#D7B797] text-[#0A0A0A] rounded">
                            FINAL
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1 py-px rounded ${
                            version.status?.toLowerCase() === 'approved'
                              ? 'bg-[rgba(18,119,73,0.15)] text-[#127749]'
                              : version.status?.toLowerCase() === 'submitted'
                                ? 'bg-[rgba(227,179,65,0.15)] text-[#E3B341]'
                                :'bg-[#F2F2F2] text-[#666]'}`}
                        >
                          {version.status}
                        </span>
                      </div>
                      {(version.createdAt || version.createdBy) && (
                        <span
                          className={`text-[10px] ${'text-[#666]'}`}
                        >
                          {version.createdAt}
                          {version.createdBy && ` ${t('planning.versionBy')} ${version.createdBy}`}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isSelected && (
                      <div className="flex items-center gap-1 shrink-0">
                        {onCompareVersion && (
                          <button
                            onClick={() => onCompareVersion(version.id)}
                            className={`p-1 rounded text-[10px] font-medium transition-colors ${'text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)]'}`}
                            title={t('planning.compareVersions')}
                          >
                            <GitCompare size={12} />
                          </button>
                        )}
                        {onRollbackVersion && version.status?.toLowerCase() === 'draft' && (
                          <button
                            onClick={() => onRollbackVersion(version.id)}
                            className={`p-1 rounded text-[10px] font-medium transition-colors ${'text-[#666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)]'}`}
                            title={t('planning.rollbackVersion')}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={activeTab === 'validation' ? t('planning.validation') : t('planning.history')}
        height="half"
      >
        {content}
      </BottomSheet>
    );
  }

  // Desktop: slide-in panel
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 z-40 border-l shadow-xl transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${'bg-white border-[rgba(215,183,151,0.3)]'}`}
    >
      {content}
    </div>
  );
};

export default AllocationSidePanel;
