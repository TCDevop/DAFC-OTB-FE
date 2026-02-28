// src/components/mobile/MobileList.tsx
'use client';

import React, { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE LIST COMPONENT
// Table replacement with expandable rows, swipe actions
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileListItemData {
  id: string;
  avatar?: string | React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  valueLabel?: string;
  status?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  };
  expandedContent?: React.ReactNode;
  details?: Array<{ label: string; value: string }>;
}

export interface MobileListProps {
  items: MobileListItemData[];
  onItemPress?: (item: MobileListItemData) => void;
  onItemDelete?: (item: MobileListItemData) => void;
  onItemEdit?: (item: MobileListItemData) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  showChevron?: boolean;
  expandable?: boolean;
}

const statusVariants = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  default: 'bg-gray-100 text-gray-700',
};

// ─── List Item Component ────────────────────────────────────────────────────────

interface ListItemProps {
  item: MobileListItemData;
  onPress?: (item: MobileListItemData) => void;
  showChevron: boolean;
  expandable: boolean;
}

const MobileListItem: React.FC<ListItemProps> = ({
  item,
  onPress,
  showChevron,
  expandable,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = useCallback(() => {
    if (expandable && (item.expandedContent || item.details)) {
      setIsExpanded((prev) => !prev);
    } else if (onPress) {
      onPress(item);
    }
  }, [expandable, item, onPress]);

  const hasExpandableContent = item.expandedContent || (item.details && item.details.length > 0);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Main Row */}
      <button
        onClick={handlePress}
        className="
          w-full p-4 flex items-center gap-3
          bg-white
          active:bg-gray-50
          transition-colors duration-150
          text-left
        "
      >
        {/* Avatar */}
        {item.avatar && (
          <div className="
            w-12 h-12 rounded-xl flex-shrink-0
            bg-gradient-to-br from-amber-100 to-orange-50
            flex items-center justify-center
            text-[15px] font-bold text-amber-700
          ">
            {typeof item.avatar === 'string' ? item.avatar : item.avatar}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-gray-900 truncate">
            {item.title}
          </div>
          {item.subtitle && (
            <div className="text-[13px] text-gray-500 truncate mt-0.5">
              {item.subtitle}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            {item.value && (
              <div>
                {item.valueLabel && (
                  <span className="text-[11px] text-gray-400 mr-1">{item.valueLabel}</span>
                )}
                <span className="text-[15px] font-semibold text-gray-900">
                  {item.value}
                </span>
              </div>
            )}
            {item.status && (
              <span className={`
                px-2.5 py-1 rounded-full text-[11px] font-medium
                ${statusVariants[item.status.variant]}
              `}>
                {item.status.text}
              </span>
            )}
          </div>
        </div>

        {/* Chevron / Expand Icon */}
        {(showChevron || (expandable && hasExpandableContent)) && (
          <div className="flex-shrink-0">
            {expandable && hasExpandableContent ? (
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && hasExpandableContent && (
        <div className="bg-gray-50 px-4 pb-4">
          {item.details && item.details.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {item.details.map((detail, i) => (
                <div key={i}>
                  <div className="text-[11px] text-gray-500">
                    {detail.label}
                  </div>
                  <div className="text-[14px] font-medium text-gray-900">
                    {detail.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {item.expandedContent}
        </div>
      )}
    </div>
  );
};

// ─── Main List Component ────────────────────────────────────────────────────────

export const MobileList: React.FC<MobileListProps> = ({
  items,
  onItemPress,
  emptyMessage = 'No items found',
  emptyIcon,
  className = '',
  showChevron = true,
  expandable = false,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {emptyIcon || (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
        )}
        <p className="text-[15px] text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`}>
      {items.map((item) => (
        <MobileListItem
          key={item.id}
          item={item}
          onPress={onItemPress}
          showChevron={showChevron}
          expandable={expandable}
        />
      ))}
    </div>
  );
};

// ─── Skeleton Loading ───────────────────────────────────────────────────────────

export const MobileListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
        >
          {/* Avatar skeleton */}
          <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />

          {/* Content skeleton */}
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileList;
