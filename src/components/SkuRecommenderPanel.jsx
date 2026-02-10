'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, ShoppingBag, Shield, ShieldAlert, ShieldCheck,
  CheckCircle, XCircle, Plus, ChevronDown, ChevronUp,
  Palette, Tag, BarChart3, RefreshCw, Zap
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { useLanguage } from '@/contexts/LanguageContext';

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return '0 VND';
  return Number(value).toLocaleString('vi-VN') + ' VND';
};

const ScoreBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-[#999999] w-20 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-[#2E2E2E] overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(Math.max(value || 0, 0), 100)}%` }}
      />
    </div>
    <span className="text-[10px] font-['JetBrains_Mono'] text-[#999999] w-8 text-right">{value || 0}</span>
  </div>
);

const RiskBadge = ({ riskLevel, t }) => {
  if (riskLevel === 'safe') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(34,197,94,0.15)] text-emerald-400">
        <ShieldCheck size={10} /> {t('ai.safe')}
      </span>
    );
  }
  if (riskLevel === 'moderate') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-amber-400">
        <Shield size={10} /> {t('ai.moderate')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(239,68,68,0.15)] text-red-400">
      <ShieldAlert size={10} /> {t('ai.highRisk')}
    </span>
  );
};

const SkeletonCard = () => (
  <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-5 h-5 rounded-full bg-[#2E2E2E]" />
      <div className="h-4 w-32 rounded bg-[#2E2E2E]" />
      <div className="h-4 w-16 rounded-full bg-[#2E2E2E] ml-auto" />
    </div>
    <div className="h-3 w-48 rounded bg-[#2E2E2E] mb-2" />
    <div className="h-3 w-36 rounded bg-[#2E2E2E] mb-3" />
    <div className="space-y-2">
      <div className="h-1.5 rounded-full bg-[#2E2E2E]" />
      <div className="h-1.5 rounded-full bg-[#2E2E2E]" />
      <div className="h-1.5 rounded-full bg-[#2E2E2E]" />
    </div>
  </div>
);

const SkuRecommenderPanel = ({
  budgetDetailId,
  category,
  subCategory,
  budgetAmount,
  seasonGroup,
  fiscalYear,
  storeId,
  proposalId,
  onSkusAdded,
  existingSkuIds = [],
  darkMode = true,
}) => {
  const { t } = useLanguage();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const input = {
        budgetDetailId,
        category,
        subCategory,
        budgetAmount,
        seasonGroup,
        fiscalYear,
        storeId,
        existingSkuIds,
      };
      const result = await aiService.generateSkuRecommendations(input);
      const recs = result.recommendations || result.skus || [];
      setRecommendations(recs);
      setSummary(result.summary || result.assortmentSummary || null);

      // Auto-select safe SKUs
      const safeIds = new Set();
      recs.forEach((r) => {
        if (r.riskLevel === 'safe') {
          safeIds.add(r.id || r.skuId || r.skuCode);
        }
      });
      setSelected(safeIds);
    } catch (err) {
      console.error('SKU recommendation error:', err);
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  }, [budgetDetailId, category, subCategory, budgetAmount, seasonGroup, fiscalYear, storeId, existingSkuIds]);

  useEffect(() => {
    fetchRecommendations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getSkuKey = (rec) => rec.id || rec.skuId || rec.skuCode;

  const toggleSelect = (skuKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skuKey)) {
        next.delete(skuKey);
      } else {
        next.add(skuKey);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(recommendations.map(getSkuKey));
    setSelected(all);
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const selectedRecs = recommendations.filter((r) => selected.has(getSkuKey(r)));
  const totalSelectedValue = selectedRecs.reduce(
    (sum, r) => sum + (r.recommendedValue || r.totalValue || 0),
    0
  );
  const utilizationPct =
    budgetAmount && budgetAmount > 0
      ? Math.round((totalSelectedValue / budgetAmount) * 100)
      : 0;

  const handleAddToProposal = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      // Update status for each selected recommendation
      const statusPromises = selectedRecs.map((r) =>
        aiService.updateSkuRecommendationStatus(getSkuKey(r), 'accepted')
      );
      await Promise.all(statusPromises);

      // Add to proposal
      if (budgetDetailId && proposalId) {
        await aiService.addSelectedSkusToProposal(budgetDetailId, proposalId);
      }

      if (onSkusAdded) {
        onSkusAdded(selectedRecs);
      }
    } catch (err) {
      console.error('Failed to add SKUs to proposal:', err);
      setError(t('ai.failedToAddSkus'));
    } finally {
      setAdding(false);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#2E2E2E] overflow-hidden bg-gradient-to-br from-[#1A1A1A] via-[#121212] to-[rgba(99,102,241,0.05)]">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Sparkles size={18} className="text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-['Montserrat'] text-[#F2F2F2]">
                {t('ai.skuRecommendations')}
              </h3>
              <p className="text-xs text-[#666666]">{t('ai.analyzingOptimalSku')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-[rgba(239,68,68,0.05)] p-5">
        <div className="flex items-center gap-3 mb-3">
          <XCircle size={18} className="text-red-400" />
          <h3 className="text-sm font-semibold font-['Montserrat'] text-red-400">
            {t('ai.recommendationError')}
          </h3>
        </div>
        <p className="text-xs text-red-300/70 mb-4">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
          <RefreshCw size={12} />
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  const priceTiers = summary?.priceTierDistribution || summary?.priceTiers || null;

  return (
    <div className="rounded-2xl border border-[#2E2E2E] overflow-hidden bg-gradient-to-br from-[#1A1A1A] via-[#121212] to-[rgba(99,102,241,0.03)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2E2E2E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <ShoppingBag size={16} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-['Montserrat'] text-[#F2F2F2] flex items-center gap-2">
                {t('ai.skuRecommendations')}
                <span className="text-[10px] font-['JetBrains_Mono'] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                  {t('ai.skuCount', { count: recommendations.length })}
                </span>
                {budgetAmount > 0 && (
                  <span className="text-[10px] font-['JetBrains_Mono'] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                    {t('ai.utilized', { pct: utilizationPct })}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#666666]">
                {category}
                {subCategory ? ` / ${subCategory}` : ''} &mdash;{' '}
                {seasonGroup || 'All Seasons'} {fiscalYear || ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-[rgba(99,102,241,0.1)] transition-colors text-[#999999] hover:text-indigo-400"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-5">
          {/* Selection Bar */}
          <div className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#2E2E2E]">
            <div className="flex items-center gap-4 text-xs">
              <button
                onClick={selectAll}
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                {t('ai.selectAll')}
              </button>
              <span className="text-[#2E2E2E]">|</span>
              <button
                onClick={deselectAll}
                className="text-[#999999] hover:text-[#F2F2F2] transition-colors font-medium"
              >
                {t('ai.deselectAll')}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#999999]">
                <span className="font-['JetBrains_Mono'] text-indigo-400 font-semibold">
                  {selected.size}
                </span>{' '}
                {t('ai.selected')}
              </span>
              <span className="text-[#2E2E2E]">|</span>
              <span className="font-['JetBrains_Mono'] text-[#F2F2F2] font-semibold">
                {formatCurrency(totalSelectedValue)}
              </span>
            </div>
          </div>

          {/* SKU Cards */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {recommendations.map((rec) => {
              const key = getSkuKey(rec);
              const isSelected = selected.has(key);
              const scores = rec.scores || {};

              return (
                <div
                  key={key}
                  onClick={() => toggleSelect(key)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-[rgba(99,102,241,0.06)]'
                      : 'border-[#2E2E2E] bg-[#1A1A1A] hover:border-[rgba(99,102,241,0.3)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox circle */}
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-[#666666] bg-transparent'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle size={12} className="text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold font-['JetBrains_Mono'] text-[#F2F2F2]">
                          {rec.skuCode || rec.sku || key}
                        </span>
                        <RiskBadge riskLevel={rec.riskLevel || 'moderate'} t={t} />
                      </div>

                      <p className="text-xs text-[#F2F2F2] font-medium mb-1 truncate">
                        {rec.productName || rec.name || t('ai.unknownProduct')}
                      </p>

                      <div className="flex items-center gap-3 mb-2 text-[11px] text-[#999999]">
                        {rec.color && (
                          <span className="flex items-center gap-1">
                            <Palette size={10} className="text-[#666666]" />
                            {rec.color}
                          </span>
                        )}
                        {rec.theme && (
                          <span className="flex items-center gap-1">
                            <Tag size={10} className="text-[#666666]" />
                            {rec.theme}
                          </span>
                        )}
                      </div>

                      {rec.reasoning && (
                        <p className="text-[11px] text-[#666666] mb-3 line-clamp-2 leading-relaxed">
                          {rec.reasoning}
                        </p>
                      )}

                      {/* Score Bars */}
                      <div className="space-y-1.5">
                        <ScoreBar
                          label={t('ai.performance')}
                          value={scores.performance || rec.performanceScore || 0}
                          color="bg-emerald-500"
                        />
                        <ScoreBar
                          label={t('ai.trend')}
                          value={scores.trend || rec.trendScore || 0}
                          color="bg-purple-500"
                        />
                        <ScoreBar
                          label={t('ai.assortment')}
                          value={scores.assortment || rec.assortmentScore || 0}
                          color="bg-blue-500"
                        />
                        <ScoreBar
                          label={t('ai.price')}
                          value={scores.price || rec.priceScore || 0}
                          color="bg-amber-500"
                        />
                      </div>
                    </div>

                    {/* Right side: Qty, Value, Overall Score */}
                    <div className="shrink-0 text-right space-y-2">
                      <div>
                        <p className="text-[10px] text-[#666666] uppercase tracking-wide">{t('ai.qty')}</p>
                        <p className="text-sm font-semibold font-['JetBrains_Mono'] text-[#F2F2F2]">
                          {rec.recommendedQty || rec.quantity || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#666666] uppercase tracking-wide">{t('ai.value')}</p>
                        <p className="text-xs font-semibold font-['JetBrains_Mono'] text-indigo-400">
                          {formatCurrency(rec.recommendedValue || rec.totalValue || 0)}
                        </p>
                      </div>
                      {(rec.overallScore != null || rec.score != null) && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-500/15 to-purple-500/15">
                          <Zap size={10} className="text-indigo-400" />
                          <span className="text-xs font-bold font-['JetBrains_Mono'] text-indigo-400">
                            {rec.overallScore || rec.score || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assortment Summary */}
          {priceTiers && (
            <div className="mt-4 rounded-lg border border-[#2E2E2E] bg-[#0A0A0A] p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold font-['Montserrat'] text-[#F2F2F2]">
                  {t('ai.assortmentSummary')}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(Array.isArray(priceTiers) ? priceTiers : Object.entries(priceTiers)).map(
                  (item, idx) => {
                    const tierName = Array.isArray(item) ? item[0] : item.tier || item.name;
                    const tierValue = Array.isArray(item) ? item[1] : item.count || item.percentage;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E]"
                      >
                        <span className="text-[11px] text-[#999999]">{tierName}</span>
                        <span className="text-xs font-semibold font-['JetBrains_Mono'] text-[#F2F2F2]">
                          {tierValue}
                          {typeof tierValue === 'number' && tierValue <= 100 ? '%' : ''}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2E2E2E]">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#2E2E2E] text-[#999999] hover:text-[#F2F2F2] hover:border-[rgba(99,102,241,0.3)] transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t('ai.refresh')}
            </button>
            <button
              onClick={handleAddToProposal}
              disabled={selected.size === 0 || adding}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                selected.size === 0 || adding
                  ? 'bg-[#2E2E2E] text-[#666666] cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/20'
              }`}
            >
              {adding ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  {t('ai.adding')}
                </>
              ) : (
                <>
                  <Plus size={14} />
                  {t('ai.addToProposal', { count: selected.size, plural: selected.size !== 1 ? 's' : '' })}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuRecommenderPanel;
