'use client';
import React from 'react';
import {
  FileText, Clock, CheckCircle, XCircle,
  ArrowRight, Building2, Star
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { useLanguage } from '@/contexts/LanguageContext';

const COLUMNS = [
  { id: 'DRAFT', labelKey: 'kanban.draft', icon: FileText },
  { id: 'SUBMITTED', labelKey: 'kanban.submitted', icon: Clock },
  { id: 'LEVEL1_APPROVED', labelKey: 'kanban.l1Approved', icon: ArrowRight },
  { id: 'LEVEL2_APPROVED', labelKey: 'kanban.l2Approved', icon: ArrowRight },
  { id: 'APPROVED', labelKey: 'kanban.approved', icon: CheckCircle },
  { id: 'FINAL', labelKey: 'kanban.final', icon: Star },
  { id: 'REJECTED', labelKey: 'kanban.rejected', icon: XCircle },
];

// Map column id to DAFC-style colors
const COLUMN_COLORS = {
  DRAFT: {
    header: ['bg-[rgba(102,102,102,0.15)]', 'bg-gray-100'],
    icon: ['text-[#999999]', 'text-gray-500'],
    count: ['bg-[rgba(102,102,102,0.25)] text-[#999999]', 'bg-gray-200 text-gray-600'],
    bg: ['bg-[#0A0A0A]/50', 'bg-gray-50'],
    border: ['border-[#2E2E2E]', 'border-gray-200'],
  },
  SUBMITTED: {
    header: ['bg-[rgba(210,153,34,0.12)]', 'bg-amber-50'],
    icon: ['text-[#E3B341]', 'text-amber-600'],
    count: ['bg-[rgba(210,153,34,0.25)] text-[#E3B341]', 'bg-amber-200 text-amber-700'],
    bg: ['bg-[rgba(210,153,34,0.04)]', 'bg-amber-50/50'],
    border: ['border-[rgba(210,153,34,0.2)]', 'border-amber-200'],
  },
  LEVEL1_APPROVED: {
    header: ['bg-[rgba(163,113,247,0.12)]', 'bg-purple-50'],
    icon: ['text-[#A371F7]', 'text-purple-600'],
    count: ['bg-[rgba(163,113,247,0.25)] text-[#A371F7]', 'bg-purple-200 text-purple-700'],
    bg: ['bg-[rgba(163,113,247,0.04)]', 'bg-purple-50/50'],
    border: ['border-[rgba(163,113,247,0.2)]', 'border-purple-200'],
  },
  LEVEL2_APPROVED: {
    header: ['bg-[rgba(59,130,246,0.12)]', 'bg-blue-50'],
    icon: ['text-[#60A5FA]', 'text-blue-600'],
    count: ['bg-[rgba(59,130,246,0.25)] text-[#60A5FA]', 'bg-blue-200 text-blue-700'],
    bg: ['bg-[rgba(59,130,246,0.04)]', 'bg-blue-50/50'],
    border: ['border-[rgba(59,130,246,0.2)]', 'border-blue-200'],
  },
  APPROVED: {
    header: ['bg-[rgba(18,119,73,0.12)]', 'bg-emerald-50'],
    icon: ['text-[#2A9E6A]', 'text-emerald-600'],
    count: ['bg-[rgba(18,119,73,0.25)] text-[#2A9E6A]', 'bg-emerald-200 text-emerald-700'],
    bg: ['bg-[rgba(18,119,73,0.04)]', 'bg-emerald-50/50'],
    border: ['border-[rgba(18,119,73,0.2)]', 'border-emerald-200'],
  },
  FINAL: {
    header: ['bg-[rgba(215,183,151,0.12)]', 'bg-[rgba(215,183,151,0.15)]'],
    icon: ['text-[#D7B797]', 'text-[#8A6340]'],
    count: ['bg-[rgba(215,183,151,0.25)] text-[#D7B797]', 'bg-[rgba(215,183,151,0.3)] text-[#8A6340]'],
    bg: ['bg-[rgba(215,183,151,0.04)]', 'bg-[rgba(215,183,151,0.05)]'],
    border: ['border-[rgba(215,183,151,0.2)]', 'border-[rgba(215,183,151,0.3)]'],
  },
  REJECTED: {
    header: ['bg-[rgba(248,81,73,0.12)]', 'bg-red-50'],
    icon: ['text-[#FF7B72]', 'text-red-600'],
    count: ['bg-[rgba(248,81,73,0.25)] text-[#FF7B72]', 'bg-red-200 text-red-700'],
    bg: ['bg-[rgba(248,81,73,0.04)]', 'bg-red-50/50'],
    border: ['border-[rgba(248,81,73,0.2)]', 'border-red-200'],
  },
};

// Entity type badge styles
const ENTITY_COLORS = {
  budget: ['bg-[rgba(215,183,151,0.15)] text-[#D7B797]', 'bg-[rgba(215,183,151,0.2)] text-[#8A6340]'],
  planning: ['bg-[rgba(59,130,246,0.15)] text-[#60A5FA]', 'bg-blue-100 text-blue-700'],
  proposal: ['bg-[rgba(16,185,129,0.15)] text-[#34D399]', 'bg-emerald-100 text-emerald-700'],
};

const TicketKanbanBoard = ({ tickets = [], onTicketClick, darkMode = true }) => {
  const { t } = useLanguage();
  const d = darkMode ? 0 : 1; // index into color arrays

  // Group tickets by status — merge LEVEL1_REJECTED/LEVEL2_REJECTED into REJECTED
  const ticketsByStatus = COLUMNS.reduce((acc, col) => {
    if (col.id === 'REJECTED') {
      acc[col.id] = tickets.filter(t => {
        const s = t.status?.toUpperCase();
        return s === 'REJECTED' || s === 'LEVEL1_REJECTED' || s === 'LEVEL2_REJECTED';
      });
    } else {
      acc[col.id] = tickets.filter(t => t.status?.toUpperCase() === col.id);
    }
    return acc;
  }, {});

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
      {COLUMNS.map((column) => {
        const colors = COLUMN_COLORS[column.id] || COLUMN_COLORS.DRAFT;
        const columnTickets = ticketsByStatus[column.id] || [];
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-72 ${colors.bg[d]} ${colors.border[d]} border rounded-xl overflow-hidden`}
          >
            {/* Column Header */}
            <div className={`${colors.header[d]} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Icon size={16} className={colors.icon[d]} />
                <span className={`font-semibold text-sm font-['Montserrat'] ${colors.icon[d]}`}>
                  {t(column.labelKey)}
                </span>
              </div>
              <span className={`${colors.count[d]} text-xs font-bold font-['JetBrains_Mono'] px-2 py-0.5 rounded-full`}>
                {columnTickets.length}
              </span>
            </div>

            {/* Cards Container */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto">
              {columnTickets.length === 0 ? (
                <div className={`text-center py-8 text-sm font-['Montserrat'] ${darkMode ? 'text-[#444444]' : 'text-gray-400'}`}>
                  {t('kanban.noTickets')}
                </div>
              ) : (
                columnTickets.map((ticket) => (
                  <div
                    key={`${ticket.entityType}-${ticket.id}`}
                    onClick={() => onTicketClick?.(ticket)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all duration-150 ${
                      darkMode
                        ? 'bg-[#121212] border-[#2E2E2E] hover:border-[rgba(215,183,151,0.4)] hover:shadow-lg hover:shadow-[rgba(215,183,151,0.05)]'
                        : 'bg-white border-gray-200 hover:border-[#D7B797] hover:shadow-md'
                    }`}
                  >
                    {/* Entity Type + Date */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        ENTITY_COLORS[ticket.entityType]?.[d] || ENTITY_COLORS.budget[d]
                      }`}>
                        {ticket.entityType}
                      </span>
                      <span className={`text-[10px] font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666]' : 'text-gray-400'}`}>
                        {ticket.createdOn}
                      </span>
                    </div>

                    {/* Ticket Name */}
                    <h4 className={`font-medium text-sm font-['Montserrat'] mb-2 line-clamp-2 ${
                      darkMode ? 'text-[#F2F2F2]' : 'text-[#0A0A0A]'
                    }`}>
                      {ticket.name}
                    </h4>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {ticket.brand && ticket.brand !== '-' && (
                        <span className={`flex items-center gap-1 ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>
                          <Building2 size={12} />
                          {ticket.brand}
                        </span>
                      )}
                      {ticket.seasonGroup && ticket.seasonGroup !== '-' && (
                        <span className={`px-1.5 py-0.5 rounded font-['JetBrains_Mono'] ${
                          darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {ticket.seasonGroup} {ticket.season !== '-' ? ticket.season : ''}
                        </span>
                      )}
                    </div>

                    {/* Budget Amount */}
                    {ticket.totalBudget > 0 && (
                      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-100'}`}>
                        <span className={`text-xs font-['JetBrains_Mono'] ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>
                          {formatCurrency(ticket.totalBudget)}
                        </span>
                      </div>
                    )}

                    {/* Created By */}
                    {ticket.createdBy && ticket.createdBy !== 'System' && (
                      <div className={`mt-1 text-[10px] ${darkMode ? 'text-[#666666]' : 'text-gray-400'}`}>
                        {t('kanban.by')} {ticket.createdBy}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketKanbanBoard;
