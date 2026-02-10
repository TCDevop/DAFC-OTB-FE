'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, CheckCircle, AlertTriangle, Info, Zap, BarChart3, PieChart,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { useLanguage } from '@/contexts/LanguageContext';

const OtbAllocationAdvisor = ({
  budgetDetailId,
  budgetAmount,
  seasonGroup,
  seasonType,
  storeId,
  brandId,
  onApplyRecommendation,
  currentAllocation = null,
  darkMode = true,
}) => {
  const { t } = useLanguage();
  const [recommendation, setRecommendation] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDimension, setExpandedDimension] = useState('collection');
  const [showDetails, setShowDetails] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    if (budgetDetailId && budgetAmount > 0) {
      // Cancel any in-flight request to prevent race conditions
      if (abortRef.current) abortRef.current.abort = true;
      const token = { abort: false };
      abortRef.current = token;
      generateRecommendation(token);
    }
    return () => {
      if (abortRef.current) abortRef.current.abort = true;
    };
  }, [budgetDetailId, budgetAmount, seasonGroup, seasonType]);

  useEffect(() => {
    if (recommendation && currentAllocation?.length > 0) runComparison();
  }, [currentAllocation, recommendation]);

  const generateRecommendation = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.generateAllocation({
        budgetDetailId, budgetAmount, seasonGroup, seasonType, storeId, brandId,
      });
      if (token?.abort) return; // Request was superseded
      setRecommendation(result);
    } catch (err) {
      if (token?.abort) return;
      setError(t('ai.failedToGenerate'));
      console.warn('Allocation advisory unavailable:', err?.response?.status || err.message);
    }
    if (!token?.abort) setLoading(false);
  };

  const runComparison = async () => {
    try {
      const result = await aiService.compareAllocation(budgetDetailId, currentAllocation);
      setComparison(result);
    } catch (err) {
      console.error('Comparison error:', err);
    }
  };

  const handleApply = async (dimensionType = null) => {
    try {
      await aiService.applyAllocationRecommendations(budgetDetailId, dimensionType);
      const toApply = dimensionType
        ? recommendation[`${dimensionType}s`]
        : [...recommendation.collections, ...recommendation.genders, ...recommendation.categories];
      if (onApplyRecommendation) onApplyRecommendation(toApply);
    } catch (err) {
      console.error('Apply error:', err);
    }
  };

  const fmtCurrency = (v) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

  const confidenceColor = (c) =>
    c >= 0.8
      ? darkMode ? 'text-[#2A9E6A]' : 'text-emerald-600'
      : c >= 0.5
        ? darkMode ? 'text-[#D7B797]' : 'text-amber-600'
        : darkMode ? 'text-[#999999]' : 'text-gray-500';

  const qualityBadge = (q) => {
    const cfg = {
      high: { bg: darkMode ? 'bg-[rgba(42,158,106,0.15)]' : 'bg-emerald-100', text: darkMode ? 'text-[#2A9E6A]' : 'text-emerald-700', label: t('ai.highConfidence') },
      medium: { bg: darkMode ? 'bg-[rgba(215,183,151,0.15)]' : 'bg-amber-100', text: darkMode ? 'text-[#D7B797]' : 'text-amber-700', label: t('ai.mediumConfidence') },
      low: { bg: darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100', text: darkMode ? 'text-[#999999]' : 'text-gray-600', label: t('ai.limitedData') },
    };
    const c = cfg[q] || cfg.low;
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`rounded-2xl p-6 border ${
        darkMode
          ? 'bg-gradient-to-r from-[rgba(147,51,234,0.08)] to-[rgba(99,102,241,0.08)] border-purple-800/40'
          : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
      }`}>
        <div className="flex items-center gap-3">
          <Sparkles className={`w-6 h-6 animate-pulse ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <div>
            <div className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>
              {t('ai.allocationEngine')}
            </div>
            <div className={`text-sm ${darkMode ? 'text-purple-400/70' : 'text-purple-600'}`}>
              {t('ai.analyzingData')}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[t('planningDetail.collection'), t('planningDetail.gender'), t('planningDetail.category')].map((dim, i) => (
            <div key={dim} className="flex items-center gap-3">
              <div className={`w-20 text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>{dim}</div>
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-purple-900/30' : 'bg-purple-200'}`}>
                <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: `${30 + i * 20}%`, animationDelay: `${i * 150}ms` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-[rgba(248,81,73,0.08)] border-[rgba(248,81,73,0.3)]' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-[#FF7B72]' : 'text-red-600'}`} />
          <span className={darkMode ? 'text-[#FF7B72]' : 'text-red-700'}>{error}</span>
          <button onClick={generateRecommendation} className={`ml-auto px-3 py-1 rounded-lg text-sm ${darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700'}`}>
            {t('ai.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  const dimensions = [
    { key: 'collection', label: t('planningDetail.collection'), icon: BarChart3, data: recommendation.collections },
    { key: 'gender', label: t('planningDetail.gender'), icon: PieChart, data: recommendation.genders },
    { key: 'category', label: t('planningDetail.category'), icon: BarChart3, data: recommendation.categories },
  ];

  // ── Main render ────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode
        ? 'bg-gradient-to-r from-[rgba(147,51,234,0.08)] to-[rgba(99,102,241,0.08)] border-purple-800/40'
        : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-purple-800/40' : 'border-purple-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
              <Sparkles className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className={`font-semibold font-['Montserrat'] ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                {t('ai.allocationAdvisor')}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {qualityBadge(recommendation.dataQuality)}
                <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>
                  {t('ai.overallConfidence', { pct: (recommendation.overallConfidence * 100).toFixed(0) })}
                </span>
              </div>
            </div>
          </div>

          {comparison && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              comparison.overallStatus === 'good'
                ? darkMode ? 'bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]' : 'bg-emerald-100 text-emerald-700'
                : comparison.overallStatus === 'review_recommended'
                  ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-700'
                  : darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700'
            }`}>
              {comparison.overallStatus === 'good' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {t('ai.aligned', { pct: comparison.alignmentScore.toFixed(0) })}
            </div>
          )}
        </div>

        {recommendation.warnings?.length > 0 && (
          <div className={`mt-3 flex items-start gap-2 text-sm ${darkMode ? 'text-[#D7B797]' : 'text-amber-700'}`}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{recommendation.warnings.join(' ')}</span>
          </div>
        )}
      </div>

      {/* Dimension Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-purple-800/40' : 'border-purple-200'}`}>
        {dimensions.map(dim => (
          <button
            key={dim.key}
            onClick={() => setExpandedDimension(dim.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              expandedDimension === dim.key
                ? darkMode
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-[rgba(147,51,234,0.08)]'
                  : 'text-purple-700 border-b-2 border-purple-500 bg-white/50'
                : darkMode
                  ? 'text-[#999999] hover:text-purple-400'
                  : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <dim.icon className="w-4 h-4 inline mr-2" />
            {dim.label}
          </button>
        ))}
      </div>

      {/* Recommendation Content */}
      <div className="p-4">
        {dimensions.map(dim => (
          <div key={dim.key} className={expandedDimension === dim.key ? 'block' : 'hidden'}>
            <div className="space-y-3">
              {dim.data.map((item, index) => {
                const compItem = comparison?.comparisons?.find(
                  c => c.dimensionType === item.dimensionType && c.dimensionValue === item.dimensionValue,
                );

                return (
                  <div key={index} className={`rounded-xl p-4 border ${
                    darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                        {item.dimensionValue}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold font-['JetBrains_Mono'] ${confidenceColor(item.confidence)}`}>
                          {item.recommendedPct.toFixed(1)}%
                        </span>
                        <span className={`text-sm font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>
                          ({fmtCurrency(item.recommendedAmt)})
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className={`h-2 rounded-full overflow-hidden mb-2 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min(item.recommendedPct, 100)}%` }}
                      />
                    </div>

                    {compItem && compItem.userPct !== null && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={darkMode ? 'text-[#999999]' : 'text-gray-500'}>
                          {t('ai.yourAllocation', { pct: compItem.userPct.toFixed(1) })}
                        </span>
                        {compItem.deviation > 5 && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            compItem.deviation > 15
                              ? darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700'
                              : darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {compItem.userPct > Number(compItem.aiPct) ? '+' : ''}{(compItem.userPct - Number(compItem.aiPct)).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}

                    {showDetails && (
                      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-100'}`}>
                        <p className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>
                          {item.reasoning}
                        </p>
                        {item.factors && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-gray-100 text-gray-600'}`}>
                              Hist: {item.factors.historicalAvg.toFixed(1)}%
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-gray-100 text-gray-600'}`}>
                              ST: {item.factors.sellThroughScore.toFixed(1)}%
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-gray-100 text-gray-600'}`}>
                              Trend: {item.factors.growthTrend > item.factors.historicalAvg ? '↑' : item.factors.growthTrend < item.factors.historicalAvg ? '↓' : '→'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions per dimension */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-sm hover:underline ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}
              >
                {showDetails ? t('ai.hideReasoning') : t('ai.showReasoning')}
              </button>
              <button
                onClick={() => handleApply(dim.key)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {t('ai.apply', { label: dim.label })}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — Apply All */}
      <div className={`p-4 border-t ${darkMode ? 'border-purple-800/40 bg-[rgba(147,51,234,0.04)]' : 'border-purple-200 bg-white/50'}`}>
        <div className="flex items-center justify-between">
          <div className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
            {t('ai.totalBudget')} <span className={`font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-gray-800'}`}>{fmtCurrency(budgetAmount)}</span>
          </div>
          <button
            onClick={() => handleApply()}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {t('ai.applyAllRecommendations')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtbAllocationAdvisor;
