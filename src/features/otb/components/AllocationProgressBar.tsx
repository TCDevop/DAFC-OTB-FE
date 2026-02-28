'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Circle } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatCurrency, formatFullCurrency } from '@/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface AllocationProgressBarProps {
  totalBudget: number;
  totalAllocated: number;
}

// Tooltip wrapper for currency values
const CurrencyWithTooltip = ({ value, className }: { value: number; className: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className={`relative cursor-default ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {formatCurrency(value)}
      {show && (
        <span
          className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] whitespace-nowrap pointer-events-none shadow-lg ${'bg-[#0A0A0A] text-white'}`}
        >
          {formatFullCurrency(value)}
        </span>
      )}
    </span>
  );
};

const AllocationProgressBar = ({
  totalBudget,
  totalAllocated}: AllocationProgressBarProps) => {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();

  const { pct, remaining, isOver, isComplete } = useMemo(() => {
    if (totalBudget <= 0) return { pct: 0, remaining: 0, isOver: false, isComplete: false };
    const rawPct = (totalAllocated / totalBudget) * 100;
    const p = Math.min(Math.round(rawPct), 100);
    const r = totalBudget - totalAllocated;
    return { pct: p, remaining: r, isOver: r < 0, isComplete: Math.round(rawPct) === 100 };
  }, [totalBudget, totalAllocated]);

  if (totalBudget <= 0) return null;

  const overPct = isOver
    ? Math.min(Math.round((totalAllocated / totalBudget) * 100), 120)
    : 0;

  // Bar color: green (normal), emerald pulse (100%), red (over)
  const barColor = isOver
    ? 'bg-gradient-to-r from-[#F85149] to-[#FF6B6B]'
    : isComplete
      ? 'bg-gradient-to-r from-[#127749] to-[#2A9E6A]'
      : 'bg-gradient-to-r from-[#127749] to-[#2A9E6A]';

  const pctColor = isOver
    ? 'text-[#F85149]'
    : isComplete
      ?'text-[#127749]': pct >= 80
        ?'text-[#127749]': 'text-[#E3B341]';

  return (
    <div
      className={`px-3 md:px-6 py-1.5 border-b flex items-center gap-3 ${'bg-white border-[rgba(215,183,151,0.3)]'}`}
    >
      {/* Bar */}
      <div className="flex-1 min-w-0">
        <div
          className={`h-2 rounded-full overflow-hidden ${'bg-[#E8DDD0]'}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-200 ${barColor}`}
            style={{ width: `${isOver ? Math.min(overPct, 100) : pct}%` }}
          />
        </div>
      </div>

      {/* Allocation Status Badge */}
      {(() => {
        const badge = totalAllocated === 0
          ? { color: 'bg-[#6B7280]', dotColor: 'text-[#9CA3AF]', label: t('planning.statusNotAllocated'), short: t('planning.statusNotAllocatedShort') }
          : isOver
            ? { color: 'bg-[#F85149]', dotColor: 'text-[#FF6B6B]', label: t('planning.statusOverBudget'), short: t('planning.statusOverBudgetShort') }
            : isComplete
              ? { color: 'bg-[#127749]', dotColor: 'text-[#2A9E6A]', label: t('planning.statusAllocated'), short: t('planning.statusAllocatedShort') }
              : { color: 'bg-[#D97706]', dotColor: 'text-[#FBBF24]', label: t('planning.statusProcessing'), short: t('planning.statusProcessingShort') };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shrink-0 ${badge.color}`}>
            <Circle size={6} className={`fill-current ${badge.dotColor}`} />
            {isMobile ? badge.short : badge.label}
          </span>
        );
      })()}

      {/* Percentage with color coding */}
      <span className={`text-xs font-bold font-['JetBrains_Mono'] shrink-0 ${pctColor}`}>
        {isOver ? overPct : pct}%
        {isOver && <AlertTriangle size={10} className="inline ml-0.5 -mt-0.5" />}
      </span>

      {/* Stats with tooltips */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className={`text-[10px] ${'text-[#666]'}`}>
          {t('planning.allocated')}:
        </span>
        <CurrencyWithTooltip
          value={totalAllocated}
          className={`text-xs font-semibold font-['JetBrains_Mono'] ${
            isOver ? 'text-[#F85149]' :'text-[#127749]'}`}
        />

        <span className={'text-[#C4B5A5]'}>|</span>

        <span className={`text-[10px] ${'text-[#666]'}`}>
          {isOver ? t('planning.overBudget') : t('planning.remaining')}:
        </span>
        <CurrencyWithTooltip
          value={Math.abs(remaining)}
          className={`text-xs font-semibold font-['JetBrains_Mono'] ${
            isOver
              ? 'text-[#F85149]'
              :'text-[#6B4D30]'}`}
        />

        <span className={'text-[#C4B5A5]'}>|</span>

        <span className={`text-[10px] ${'text-[#666]'}`}>
          {t('planning.totalBudget')}:
        </span>
        <CurrencyWithTooltip
          value={totalBudget}
          className={`text-xs font-semibold font-['JetBrains_Mono'] ${'text-[#0A0A0A]'}`}
        />
      </div>

      {/* Mobile: compact stats */}
      <div className="flex md:hidden items-center gap-1.5 shrink-0">
        <CurrencyWithTooltip
          value={totalAllocated}
          className={`text-[10px] font-semibold font-['JetBrains_Mono'] ${
            isOver ? 'text-[#F85149]' :'text-[#127749]'}`}
        />
        <span className={`text-[10px] ${'text-[#999]'}`}>/</span>
        <CurrencyWithTooltip
          value={totalBudget}
          className={`text-[10px] font-['JetBrains_Mono'] ${'text-[#666]'}`}
        />
      </div>
    </div>
  );
};

export default React.memo(AllocationProgressBar);
