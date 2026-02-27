'use client';

import { useState, useMemo, useCallback } from 'react';

export type ViewMode = 'detail' | 'summary' | 'compact';
export type ShowFilter = 'all' | 'modified' | 'errors' | 'warnings';

export interface TableFilterState {
  view: ViewMode;
  showOnly: ShowFilter;
  channelFilter: string; // 'all' or a store id
}

const DEFAULT_FILTERS: TableFilterState = {
  view: 'detail',
  showOnly: 'all',
  channelFilter: 'all',
};

export function useTableFilters() {
  const [filters, setFilters] = useState<TableFilterState>(DEFAULT_FILTERS);

  const setView = useCallback((view: ViewMode) => {
    setFilters(prev => ({ ...prev, view }));
  }, []);

  const setShowOnly = useCallback((showOnly: ShowFilter) => {
    setFilters(prev => ({ ...prev, showOnly }));
  }, []);

  const setChannelFilter = useCallback((channelFilter: string) => {
    setFilters(prev => ({ ...prev, channelFilter }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      filters.view !== 'detail' ||
      filters.showOnly !== 'all' ||
      filters.channelFilter !== 'all',
    [filters],
  );

  return {
    filters,
    setView,
    setShowOnly,
    setChannelFilter,
    resetFilters,
    hasActiveFilters,
  };
}

export default useTableFilters;
