'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BAR_COLORS = ['#D7B797', '#2A9E6A', '#58A6FF', '#F87171', '#F59E0B', '#14B8A6', '#A78BFA'];

/**
 * ExpandableStatCard - Reusable stat card with click-to-expand breakdown panel
 *
 * @param {string} title - Card label
 * @param {string|number} value - Main display value
 * @param {string} sub - Subtitle text
 * @param {Component} icon - lucide-react icon component
 * @param {string} accent - Color accent key
 * @param {number} trend - Trend percentage (positive = up, negative = down)
 * @param {string} trendLabel - Display text for trend (e.g. "+12.5%")
 * @param {number} progress - Progress bar value 0-100
 * @param {string} progressLabel - Label for progress bar
 * @param {Array} breakdown - Array of { label, value, pct?, color? } items
 * @param {Array} badges - Array of { label, value, color } badge items
 * @param {string} expandTitle - Title for expanded section
 */

const ACCENTS: any = {
  gold:    { color: '#D7B797', lightGrad: 'rgba(160,120,70,0.38)', lightMid: 'rgba(180,140,95,0.16)', iconLight: 'rgba(140,100,55,0.26)', glowLight: 'rgba(160,120,70,0.20)' },
  emerald: { color: '#2A9E6A', lightGrad: 'rgba(15,100,55,0.35)',  lightMid: 'rgba(20,120,65,0.14)',  iconLight: 'rgba(15,100,55,0.24)', glowLight: 'rgba(15,100,55,0.18)' },
  blue:    { color: '#58A6FF', lightGrad: 'rgba(40,100,200,0.32)', lightMid: 'rgba(50,120,220,0.14)', iconLight: 'rgba(40,100,200,0.24)', glowLight: 'rgba(40,100,200,0.18)' },
  rose:    { color: '#F87171', lightGrad: 'rgba(200,55,55,0.32)',  lightMid: 'rgba(220,70,70,0.14)',  iconLight: 'rgba(180,45,45,0.24)', glowLight: 'rgba(200,55,55,0.18)' },
  amber:   { color: '#D29922', lightGrad: 'rgba(180,100,5,0.35)', lightMid: 'rgba(200,120,10,0.14)', iconLight: 'rgba(160,90,5,0.24)', glowLight: 'rgba(180,100,5,0.18)' },
  teal:    { color: '#14B8A6', lightGrad: 'rgba(10,120,110,0.32)', lightMid: 'rgba(15,140,130,0.14)', iconLight: 'rgba(10,120,110,0.24)', glowLight: 'rgba(10,120,110,0.18)' },
  violet:  { color: '#A78BFA', lightGrad: 'rgba(100,70,200,0.32)', lightMid: 'rgba(120,90,220,0.14)', iconLight: 'rgba(80,55,180,0.24)', glowLight: 'rgba(100,70,200,0.18)' },
  indigo:  { color: '#818CF8', lightGrad: 'rgba(60,70,200,0.32)',  lightMid: 'rgba(80,90,220,0.14)', iconLight: 'rgba(60,70,200,0.24)', glowLight: 'rgba(60,70,200,0.18)' },
  red:     { color: '#F85149', lightGrad: 'rgba(200,55,55,0.32)',  lightMid: 'rgba(220,70,70,0.14)',  iconLight: 'rgba(180,45,45,0.24)', glowLight: 'rgba(200,55,55,0.18)' },
};

const ExpandableStatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  accent = 'blue',
  trend,
  trendLabel,
  progress,
  progressLabel,
  breakdown,
  badges,
  expandTitle,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const a = ACCENTS[accent] || ACCENTS.blue;
  const borderColor = 'border-gray-300';
  const textMuted = 'text-gray-600';
  const textPrimary = 'text-gray-900';
  const textSecondary = 'text-gray-700';
  const hasExpandContent = breakdown?.length > 0 || badges?.length > 0 || progress != null;

  return (
    <div
      className={`relative overflow-hidden border ${borderColor} rounded-xl group`}
      style={{
        background: `linear-gradient(135deg, #ffffff 0%, ${a.lightMid} 35%, ${a.lightGrad} 100%)`,
        boxShadow: `inset 0 -1px 0 ${a.glowLight}`,
      }}
    >
      {/* Watermark Icon */}
      {Icon && (
        <div
          className="absolute -bottom-1 -right-1 pointer-events-none"
          style={{ opacity: 0.12 }}
        >
          <Icon size={48} color={a.color} strokeWidth={1} />
        </div>
      )}

      {/* Main card area - clickable */}
      <div
        className={`relative z-10 px-3 py-2 ${hasExpandContent ? 'cursor-pointer' : ''}`}
        onClick={() => hasExpandContent && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted} font-['Montserrat']`}>{title}</p>
              {hasExpandContent && (
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${textMuted} ${expanded ? 'rotate-180' : ''}`}
                />
              )}
            </div>
            <div className={`mt-0.5 text-lg font-bold font-['JetBrains_Mono'] tabular-nums leading-tight ${textPrimary}`}>
              {value}
            </div>

            {/* Trend badge + sub in a row */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {trendLabel && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold font-['JetBrains_Mono'] rounded ${
                  trend > 0
                    ? 'bg-[rgba(18,119,73,0.15)] text-[#2A9E6A]'
                    : trend < 0
                      ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]'
                      : `bg-[rgba(102,102,102,0.15)] ${textMuted}`
                }`}>
                  {trend > 0 ? '\u25B2' : trend < 0 ? '\u25BC' : '\u2014'} {trendLabel}
                </span>
              )}
              {sub && <p className={`text-[10px] ${textMuted}`}>{sub}</p>}
            </div>

            {/* Progress bar (always visible when provided) */}
            {progress != null && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  {progressLabel && (
                    <span className={`text-[9px] font-medium ${textMuted} font-['Montserrat']`}>{progressLabel}</span>
                  )}
                  <span className={`text-[9px] font-semibold font-['JetBrains_Mono'] ${textSecondary}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className={`h-1 rounded-full overflow-hidden bg-gray-200`}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: a.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Icon badge */}
          {Icon && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm shrink-0"
              style={{ backgroundColor: a.iconLight }}
            >
              <Icon size={14} color={a.color} />
            </div>
          )}
        </div>

        {/* Expand hint */}
        {hasExpandContent && !expanded && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ArrowUpRight size={10} color={a.color} />
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      <div
        className={`relative z-10 overflow-hidden transition-all duration-200 ease-out ${
          expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`px-3 pb-2.5 border-t ${borderColor}`}>
          {/* Expand title */}
          {expandTitle && (
            <p className={`text-[9px] font-semibold uppercase tracking-wider mt-2 mb-1.5 ${textMuted} font-['Montserrat']`}>
              {expandTitle}
            </p>
          )}

          {/* Badges row */}
          {badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
              {badges.map((badge: any, i: any) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold font-['JetBrains_Mono']"
                  style={{
                    backgroundColor: `${badge.color || a.color}15`,
                    color: badge.color || a.color,
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: badge.color || a.color }} />
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
          )}

          {/* Breakdown bars */}
          {breakdown?.length > 0 && (
            <div className="space-y-1.5 mt-1.5">
              {breakdown.map((item: any, i: any) => {
                const maxVal = Math.max(...breakdown.map((b: any) => b.pct ?? b.value ?? 0), 1);
                const pct = item.pct ?? (maxVal > 0 ? Math.round(((item.value ?? 0) / maxVal) * 100) : 0);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${textPrimary} font-['Montserrat'] truncate max-w-[60%]`}>
                        {item.label}
                      </span>
                      <span className={`text-[9px] font-['JetBrains_Mono'] tabular-nums ${textSecondary}`}>
                        {item.displayValue || item.value}
                      </span>
                    </div>
                    <div className={`h-0.5 rounded-full overflow-hidden mt-0.5 bg-gray-200`}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: item.color || BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpandableStatCard;
