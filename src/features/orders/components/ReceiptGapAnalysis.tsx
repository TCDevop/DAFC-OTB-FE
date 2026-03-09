'use client';

import React, { useMemo } from 'react';

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
interface GapRow {
  label: string;
  plan: number;
  actual: number;
  pctMix: number;
  gap: number;
  note: string;
}

interface GapTableProps {
  title: string;
  columnLabel: string;
  planLabel: string;
  actualLabel: string;
  rows: GapRow[];
  accent: string; // header accent color
}

/* ═══════════════════════════════════════════════
   Format helpers
═══════════════════════════════════════════════ */
const fmt = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(v));
const fmtPct = (v: number) => `${v}%`;

/* ═══════════════════════════════════════════════
   Auto-generate note
═══════════════════════════════════════════════ */
function generateNote(label: string, plan: number, actual: number): string {
  if (plan === 0 && actual === 0) return '';
  if (plan === 0) return `Unplanned ${label}`;
  if (actual === 0) return `Not received`;
  const ratio = actual / plan;
  if (ratio >= 0.95 && ratio <= 1.05) return '';
  if (ratio > 1.2) return `Over +${Math.round((ratio - 1) * 100)}%`;
  if (ratio < 0.5) return `Critical shortage`;
  if (ratio < 0.8) return `Under -${Math.round((1 - ratio) * 100)}%`;
  return '';
}

/* ═══════════════════════════════════════════════
   GAP TABLE COMPONENT (app-consistent colors)
═══════════════════════════════════════════════ */
const GapTable = ({ title, columnLabel, planLabel, actualLabel, rows, accent }: GapTableProps) => {
  const total = rows.find(r => r.label === 'TTL');
  const dataRows = rows.filter(r => r.label !== 'TTL');

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* Title */}
      <div className="px-3 py-1.5 border-b border-gray-200" style={{ background: accent }}>
        <span className="text-[10px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#4A3728]">{title}</span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#E8DDD1]">
            <th className="px-3 py-1.5 text-left font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">{columnLabel}</th>
            <th className="px-3 py-1.5 text-right font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">{planLabel}</th>
            <th className="px-3 py-1.5 text-right font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">{actualLabel}</th>
            <th className="px-3 py-1.5 text-right font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">% Mix</th>
            <th className="px-3 py-1.5 text-right font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">Gap</th>
            <th className="px-3 py-1.5 text-left font-semibold text-[#4A3728] font-['Montserrat']">Note</th>
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, idx) => (
            <tr key={row.label} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'} hover:bg-[rgba(215,183,151,0.1)]`}>
              <td className="px-3 py-1.5 font-medium text-gray-800 font-['Montserrat'] border-r border-gray-100">{row.label}</td>
              <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-700 border-r border-gray-100">{fmt(row.plan)}</td>
              <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-700 border-r border-gray-100">{fmt(row.actual)}</td>
              <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-500 border-r border-gray-100">{fmtPct(row.pctMix)}</td>
              <td className={`px-3 py-1.5 text-right font-['JetBrains_Mono'] font-semibold border-r border-gray-100 ${
                row.gap > 0 ? 'text-red-600' : row.gap < 0 ? 'text-green-600' : 'text-gray-500'
              }`}>{fmt(row.gap)}</td>
              <td className="px-3 py-1.5 text-gray-500 font-['Montserrat'] text-[10px] italic">{row.note}</td>
            </tr>
          ))}
          {/* Total row */}
          {total && (
            <tr className="border-t-2 border-[#D7B797] bg-[#F5F0EB]">
              <td className="px-3 py-1.5 font-bold text-[#6B4D30] font-['Montserrat'] border-r border-[#d4c4b0]">{total.label}</td>
              <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">{fmt(total.plan)}</td>
              <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">{fmt(total.actual)}</td>
              <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">100%</td>
              <td className={`px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] border-r border-[#d4c4b0] ${
                total.gap > 0 ? 'text-red-600' : total.gap < 0 ? 'text-green-600' : 'text-[#6B4D30]'
              }`}>{fmt(total.gap)}</td>
              <td className="px-3 py-1.5"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Aggregate rows into gap analysis
═══════════════════════════════════════════════ */
function aggregateGap(
  rows: Record<string, any>[],
  groupKey: string,
  planKey: string,
  actualKey: string,
): GapRow[] {
  const groups: Record<string, { plan: number; actual: number }> = {};

  for (const row of rows) {
    const label = row[groupKey] || 'Unknown';
    if (!groups[label]) groups[label] = { plan: 0, actual: 0 };
    groups[label].plan += Number(row[planKey]) || 0;
    groups[label].actual += Number(row[actualKey]) || 0;
  }

  const totalActual = Object.values(groups).reduce((s, g) => s + g.actual, 0);
  const totalPlan = Object.values(groups).reduce((s, g) => s + g.plan, 0);

  const result: GapRow[] = Object.entries(groups)
    .sort(([, a], [, b]) => b.actual - a.actual)
    .map(([label, g]) => ({
      label,
      plan: g.plan,
      actual: g.actual,
      pctMix: totalActual > 0 ? (g.actual / totalActual) * 100 : 0,
      gap: g.plan - g.actual,
      note: generateNote(label, g.plan, g.actual),
    }));

  result.push({
    label: 'TTL',
    plan: totalPlan,
    actual: totalActual,
    pctMix: 100,
    gap: totalPlan - totalActual,
    note: '',
  });

  return result;
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
interface ReceiptGapAnalysisProps {
  rows: Record<string, any>[];
}

const ReceiptGapAnalysis = ({ rows }: ReceiptGapAnalysisProps) => {
  // ── Section 1: Proposal vs Receipt (monetary) ──
  // Plan = total_units × unit_cost (proposalValue), Actual = actual_total_price (receipt)
  const proposalVsReceiptByDivision = useMemo(
    () => aggregateGap(rows, 'division', 'proposalValue', 'actualTotalPrice'),
    [rows],
  );
  const proposalVsReceiptByProductType = useMemo(
    () => aggregateGap(rows, 'productType', 'proposalValue', 'actualTotalPrice'),
    [rows],
  );

  // ── Section 2: Order vs Receipt (monetary) ──
  // Plan = amount (price_mod_single × qty), Actual = actual_total_price (receipt)
  const orderVsReceiptByDivision = useMemo(
    () => aggregateGap(rows, 'division', 'amount', 'actualTotalPrice'),
    [rows],
  );
  const orderVsReceiptByProductType = useMemo(
    () => aggregateGap(rows, 'productType', 'amount', 'actualTotalPrice'),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <div className="space-y-4 shrink-0">
      {/* ═══ SECTION 1: Proposal vs Order & Receipt ═══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#8B6914]" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-gray-700">
            Proposal vs Receipt
          </h2>
          <span className="text-[10px] text-gray-400 font-['Montserrat']">Qty × Unit Cost vs Actual Total Price</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GapTable
            title="By Gender (Division)"
            columnLabel="Gender"
            planLabel="Proposal"
            actualLabel="Received"
            rows={proposalVsReceiptByDivision}
            accent="rgba(139,105,20,0.12)"
          />
          <GapTable
            title="By Category (Product Type)"
            columnLabel="CAT"
            planLabel="Proposal"
            actualLabel="Received"
            rows={proposalVsReceiptByProductType}
            accent="rgba(139,105,20,0.12)"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-300" />

      {/* ═══ SECTION 2: Order vs Receipt ═══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#D7B797]" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-gray-700">
            Order vs Receipt
          </h2>
          <span className="text-[10px] text-gray-400 font-['Montserrat']">Order Amount (Price Mod × Qty) vs Actual Total Price</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GapTable
            title="By Gender (Division)"
            columnLabel="Gender"
            planLabel="Ordered"
            actualLabel="Received"
            rows={orderVsReceiptByDivision}
            accent="rgba(215,183,151,0.2)"
          />
          <GapTable
            title="By Category (Product Type)"
            columnLabel="CAT"
            planLabel="Ordered"
            actualLabel="Received"
            rows={orderVsReceiptByProductType}
            accent="rgba(215,183,151,0.2)"
          />
        </div>
      </div>
    </div>
  );
};

export default ReceiptGapAnalysis;
