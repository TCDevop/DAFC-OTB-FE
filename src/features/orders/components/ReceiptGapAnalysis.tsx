'use client';

import React, { useMemo } from 'react';
import { Users, Tag } from 'lucide-react';

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
interface GapRow {
  label: string;
  proposal: number;
  order: number;
  receipt: number;
  gapPR: number; // proposal - receipt
  gapOR: number; // order - receipt
  note: string;
}

/* ═══════════════════════════════════════════════
   Format helpers
═══════════════════════════════════════════════ */
const fmt = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(v));

/* ═══════════════════════════════════════════════
   Auto-generate note
═══════════════════════════════════════════════ */
function generateNote(label: string, proposal: number, order: number, receipt: number): string {
  if (proposal === 0 && order === 0 && receipt === 0) return '';
  if (receipt === 0 && (proposal > 0 || order > 0)) return 'Not received';
  if (proposal === 0 && order === 0 && receipt > 0) return `Unplanned ${label}`;

  // Check order vs receipt ratio
  if (order > 0) {
    const ratio = receipt / order;
    if (ratio > 1.2) return `Over +${Math.round((ratio - 1) * 100)}%`;
    if (ratio < 0.5) return 'Critical shortage';
    if (ratio < 0.8) return `Under -${Math.round((1 - ratio) * 100)}%`;
  }
  return '';
}

/* ═══════════════════════════════════════════════
   GAP TABLE COMPONENT
═══════════════════════════════════════════════ */
interface GapTableProps {
  title: string;
  columnLabel: string;
  rows: GapRow[];
  accent: string;
  icon?: React.ReactNode;
}

const GapTable = ({ title, columnLabel, rows, accent, icon }: GapTableProps) => {
  const total = rows.find(r => r.label === 'TTL');
  const dataRows = rows.filter(r => r.label !== 'TTL');

  const thCls = "px-3 py-1.5 text-right font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0] whitespace-nowrap";

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* Title */}
      <div className="px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5" style={{ background: accent }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider font-['Montserrat'] text-[#4A3728]">{title}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#E8DDD1]">
              <th className="px-3 py-1.5 text-left font-semibold text-[#4A3728] font-['Montserrat'] border-r border-[#d4c4b0]">{columnLabel}</th>
              <th className={thCls}>Proposal</th>
              <th className={thCls}>Order</th>
              <th className={thCls}>Receipt</th>
              <th className={thCls}>Gap Proposal vs Receipt</th>
              <th className={thCls}>Gap Order vs Receipt</th>
              <th className="px-3 py-1.5 text-left font-semibold text-[#4A3728] font-['Montserrat']">Note</th>
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, idx) => (
              <tr key={row.label} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'} hover:bg-[rgba(215,183,151,0.1)]`}>
                <td className="px-3 py-1.5 font-medium text-gray-800 font-['Montserrat'] border-r border-gray-100">{row.label}</td>
                <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-700 border-r border-gray-100">{fmt(row.proposal)}</td>
                <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-700 border-r border-gray-100">{fmt(row.order)}</td>
                <td className="px-3 py-1.5 text-right font-['JetBrains_Mono'] text-gray-700 border-r border-gray-100">{fmt(row.receipt)}</td>
                <td className={`px-3 py-1.5 text-right font-['JetBrains_Mono'] font-semibold border-r border-gray-100 ${
                  row.gapPR > 0 ? 'text-red-600' : row.gapPR < 0 ? 'text-green-600' : 'text-gray-500'
                }`}>{fmt(row.gapPR)}</td>
                <td className={`px-3 py-1.5 text-right font-['JetBrains_Mono'] font-semibold border-r border-gray-100 ${
                  row.gapOR > 0 ? 'text-red-600' : row.gapOR < 0 ? 'text-green-600' : 'text-gray-500'
                }`}>{fmt(row.gapOR)}</td>
                <td className="px-3 py-1.5 text-gray-500 font-['Montserrat'] text-[10px] italic">{row.note}</td>
              </tr>
            ))}
            {/* Total row */}
            {total && (
              <tr className="border-t-2 border-[#D7B797] bg-[#F5F0EB]">
                <td className="px-3 py-1.5 font-bold text-[#6B4D30] font-['Montserrat'] border-r border-[#d4c4b0]">{total.label}</td>
                <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">{fmt(total.proposal)}</td>
                <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">{fmt(total.order)}</td>
                <td className="px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] text-[#6B4D30] border-r border-[#d4c4b0]">{fmt(total.receipt)}</td>
                <td className={`px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] border-r border-[#d4c4b0] ${
                  total.gapPR > 0 ? 'text-red-600' : total.gapPR < 0 ? 'text-green-600' : 'text-[#6B4D30]'
                }`}>{fmt(total.gapPR)}</td>
                <td className={`px-3 py-1.5 text-right font-bold font-['JetBrains_Mono'] border-r border-[#d4c4b0] ${
                  total.gapOR > 0 ? 'text-red-600' : total.gapOR < 0 ? 'text-green-600' : 'text-[#6B4D30]'
                }`}>{fmt(total.gapOR)}</td>
                <td className="px-3 py-1.5"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Aggregate rows into gap analysis
═══════════════════════════════════════════════ */
function aggregateGap(
  rows: Record<string, any>[],
  groupKey: string,
  proposalKey: string,
  orderKey: string,
  receiptKey: string,
): GapRow[] {
  const groups: Record<string, { proposal: number; order: number; receipt: number }> = {};

  for (const row of rows) {
    const label = row[groupKey] || 'Unknown';
    if (!groups[label]) groups[label] = { proposal: 0, order: 0, receipt: 0 };
    groups[label].proposal += Number(row[proposalKey]) || 0;
    groups[label].order += Number(row[orderKey]) || 0;
    groups[label].receipt += Number(row[receiptKey]) || 0;
  }

  const totalProposal = Object.values(groups).reduce((s, g) => s + g.proposal, 0);
  const totalOrder = Object.values(groups).reduce((s, g) => s + g.order, 0);
  const totalReceipt = Object.values(groups).reduce((s, g) => s + g.receipt, 0);

  const result: GapRow[] = Object.entries(groups)
    .sort(([, a], [, b]) => b.receipt - a.receipt)
    .map(([label, g]) => ({
      label,
      proposal: g.proposal,
      order: g.order,
      receipt: g.receipt,
      gapPR: g.proposal - g.receipt,
      gapOR: g.order - g.receipt,
      note: generateNote(label, g.proposal, g.order, g.receipt),
    }));

  result.push({
    label: 'TTL',
    proposal: totalProposal,
    order: totalOrder,
    receipt: totalReceipt,
    gapPR: totalProposal - totalReceipt,
    gapOR: totalOrder - totalReceipt,
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
  const byGender = useMemo(
    () => aggregateGap(rows, 'division', 'proposalValue', 'amount', 'actualTotalPrice'),
    [rows],
  );
  const byCategory = useMemo(
    () => aggregateGap(rows, 'productType', 'proposalValue', 'amount', 'actualTotalPrice'),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-[#8B6914]" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider font-['Montserrat'] text-gray-700">
          Gap Analysis
        </h2>
        <span className="text-[10px] text-gray-400 font-['Montserrat']">Proposal vs Order vs Receipt</span>
      </div>
      <div className="space-y-6">
        <GapTable
          title="By Gender"
          columnLabel="Gender"
          rows={byGender}
          accent="rgba(139,105,20,0.12)"
          icon={<Users size={12} className="text-[#4A3728]" />}
        />
        <GapTable
          title="By Category"
          columnLabel="Category"
          rows={byCategory}
          accent="rgba(215,183,151,0.2)"
          icon={<Tag size={12} className="text-[#4A3728]" />}
        />
      </div>
    </div>
  );
};

export default ReceiptGapAnalysis;
