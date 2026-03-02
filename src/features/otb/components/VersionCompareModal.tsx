'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { X, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/utils';
import { planningService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';

interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionA: { id: string; name: string };
  versionB: { id: string; name: string };
}

interface DiffRow {
  label: string;
  field: string;
  valueA: number;
  valueB: number;
  change: number;
  changePct: number;
}

const VersionCompareModal = ({
  isOpen,
  onClose,
  versionA,
  versionB}: VersionCompareModalProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [dataA, setDataA] = useState<Record<string, any> | null>(null);
  const [dataB, setDataB] = useState<Record<string, any> | null>(null);

  // Fetch both versions
  useEffect(() => {
    if (!isOpen || !versionA?.id || !versionB?.id) return;
    let ignore = false;
    setLoading(true);

    Promise.all([
      planningService.getOne(versionA.id),
      planningService.getOne(versionB.id),
    ])
      .then(([resA, resB]) => {
        if (ignore) return;
        setDataA(resA?.data || resA || {});
        setDataB(resB?.data || resB || {});
      })
      .catch(() => {
        if (!ignore) {
          setDataA(null);
          setDataB(null);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [isOpen, versionA?.id, versionB?.id]);

  // Compute diffs
  const { diffs, totalChangeA, totalChangeB, changedCount } = useMemo(() => {
    if (!dataA || !dataB) return { diffs: [], totalChangeA: 0, totalChangeB: 0, changedCount: 0 };

    const allocA = dataA.allocationValues || {};
    const allocB = dataB.allocationValues || {};
    const allKeys = new Set([...Object.keys(allocA), ...Object.keys(allocB)]);

    const rows: DiffRow[] = [];
    let tA = 0;
    let tB = 0;
    let changed = 0;

    allKeys.forEach((key) => {
      const storesA = allocA[key] || {};
      const storesB = allocB[key] || {};
      const allFields = new Set([...Object.keys(storesA), ...Object.keys(storesB)]);

      allFields.forEach((field) => {
        const vA = typeof storesA[field] === 'number' ? storesA[field] : 0;
        const vB = typeof storesB[field] === 'number' ? storesB[field] : 0;
        tA += vA;
        tB += vB;

        if (vA !== vB) {
          changed++;
          const diff = vB - vA;
          const pct = vA === 0 ? (vB > 0 ? 100 : 0) : (diff / vA) * 100;
          rows.push({
            label: key.replace(/-/g, ' › '),
            field,
            valueA: vA,
            valueB: vB,
            change: diff,
            changePct: pct});
        }
      });
    });

    // Sort by absolute change descending
    rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return { diffs: rows, totalChangeA: tA, totalChangeB: tB, changedCount: changed };
  }, [dataA, dataB]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full md:max-w-2xl mx-0 md:mx-4 max-h-[92vh] md:max-h-[80vh] rounded-none md:rounded-xl border-0 md:border shadow-2xl flex flex-col overflow-hidden animate-scalePop ${'bg-white md:border-[#C4B5A5]'}`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between shrink-0 ${'border-[rgba(215,183,151,0.3)]'}`}
        >
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm font-['Montserrat'] ${'text-[#0A0A0A]'}`}>
              {t('planning.compareVersions')}
            </h3>
            <span className={`text-xs font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>
              {versionA.name}
            </span>
            <ArrowRight size={12} className={'text-[#666]'} />
            <span className={`text-xs font-['JetBrains_Mono'] ${'text-[#6B4D30]'}`}>
              {versionB.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${'hover:bg-[rgba(160,120,75,0.12)] text-[#666]'}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary */}
        <div
          className={`px-5 py-2 border-b flex items-center gap-4 text-xs shrink-0 ${'bg-[rgba(215,183,151,0.08)] border-[rgba(215,183,151,0.3)]'}`}
        >
          <span className={'text-[#666]'}>
            {changedCount} {changedCount === 1 ? 'field changed' : 'fields changed'}
          </span>
          <span className={'text-[#C4B5A5]'}>|</span>
          <span className={'text-[#666]'}>
            Net: <span className={`font-semibold font-['JetBrains_Mono'] ${
              totalChangeB - totalChangeA > 0 ? 'text-[#2A9E6A]' : totalChangeB - totalChangeA < 0 ? 'text-[#F85149]' : ''
            }`}>
              {totalChangeB - totalChangeA > 0 ? '+' : ''}{formatCurrency(totalChangeB - totalChangeA)}
            </span>
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#D7B797]/30 border-t-[#D7B797] rounded-full animate-spin" />
            </div>
          ) : diffs.length === 0 ? (
            <div className={`py-12 text-center text-sm ${'text-[#666]'}`}>
              {t('planning.noChanges') || 'No differences found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className={'bg-[rgba(215,183,151,0.1)]'}>
                  <th className={`px-4 py-1.5 text-left text-[11px] font-semibold font-['Montserrat'] ${'text-[#666]'}`}>
                    Field
                  </th>
                  <th className={`px-3 py-1.5 text-right text-[11px] font-semibold font-['Montserrat'] ${'text-[#666]'}`}>
                    {versionA.name}
                  </th>
                  <th className={`px-3 py-1.5 text-right text-[11px] font-semibold font-['Montserrat'] ${'text-[#666]'}`}>
                    {versionB.name}
                  </th>
                  <th className={`px-3 py-1.5 text-right text-[11px] font-semibold font-['Montserrat'] ${'text-[#666]'}`}>
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((diff, i) => {
                  const isUp = diff.change > 0;
                  const isDown = diff.change < 0;
                  return (
                    <tr
                      key={`${diff.label}-${diff.field}-${i}`}
                      className={`border-b transition-colors ${'border-[#E8DDD0] hover:bg-[rgba(215,183,151,0.06)]'}`}
                    >
                      <td className="px-4 py-1.5">
                        <div className={`text-xs font-medium ${'text-[#0A0A0A]'}`}>
                          {diff.label}
                        </div>
                        <div className={`text-[10px] ${'text-[#999]'}`}>
                          {diff.field}
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 text-right text-xs font-['JetBrains_Mono'] ${'text-[#666]'}`}>
                        {formatCurrency(diff.valueA)}
                      </td>
                      <td className={`px-3 py-1.5 text-right text-xs font-semibold font-['JetBrains_Mono'] ${'text-[#0A0A0A]'}`}>
                        {formatCurrency(diff.valueB)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isUp && <TrendingUp size={10} className="text-[#2A9E6A]" />}
                          {isDown && <TrendingDown size={10} className="text-[#F85149]" />}
                          {!isUp && !isDown && <Minus size={10} className={'text-[#999]'} />}
                          <span
                            className={`text-xs font-semibold font-['JetBrains_Mono'] ${
                              isUp ? 'text-[#2A9E6A]' : isDown ? 'text-[#F85149]' :'text-[#999]'}`}
                          >
                            {isUp ? '+' : ''}{formatCurrency(diff.change)}
                          </span>
                          <span
                            className={`text-[10px] ${
                              isUp ? 'text-[#2A9E6A]' : isDown ? 'text-[#F85149]' :'text-[#999]'}`}
                          >
                            ({formatPercent(diff.changePct, 0)})
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(VersionCompareModal);
