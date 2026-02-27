// Utility functions for formatting

// VAL-03: Default currency constant — change here to switch system currency
export const DEFAULT_CURRENCY = 'VND' as const;
export type SupportedCurrency = 'VND' | 'USD';

// Exchange rate VND to USD (approximate)
const VND_TO_USD_RATE = 25000;

// ── Smart input parsing ──────────────────────────────────────────
// Handles shortcuts like: 1.5t, 500tr, 2b, 100m, 50k, plain numbers,
// and VN-format numbers (1.500.000.000)
export function parseSmartInput(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.toLowerCase().trim().replace(/,/g, '.');

  const patterns: { regex: RegExp; multiplier: number }[] = [
    { regex: /^(-?[\d.]+)\s*(t|ty|tỷ|b)$/i, multiplier: 1_000_000_000 },
    { regex: /^(-?[\d.]+)\s*(tr|trieu|triệu|m)$/i, multiplier: 1_000_000 },
    { regex: /^(-?[\d.]+)\s*(k|ng|nghin|nghìn)$/i, multiplier: 1_000 },
    { regex: /^(-?[\d.]+)\s*(đ|d|vnd)?$/i, multiplier: 1 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) return num * multiplier;
    }
  }

  // Handle VN dot-separated format: 1.500.000.000
  // Only if there are 3+ digits between dots (not a decimal like 1.5)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/\./g, ''));
    return isNaN(num) ? null : num;
  }

  return null;
}

// Full VND format with currency symbol (for tooltips)
export function formatFullCurrency(value: number | string | null | undefined): string {
  let num = 0;
  if (typeof value === 'string') {
    num = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  } else if (typeof value === 'number') {
    num = isNaN(value) ? 0 : value;
  }
  return new Intl.NumberFormat('vi-VN').format(num) + ' VND';
}

// Format percentage with optional sign and color hint
export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// Format change between two values as percentage
export function formatChange(oldVal: number, newVal: number): { text: string; direction: 'up' | 'down' | 'none' } {
  if (oldVal === 0) return { text: newVal > 0 ? '+100%' : '—', direction: newVal > 0 ? 'up' : 'none' };
  const pct = ((newVal - oldVal) / oldVal) * 100;
  const direction = pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'none' as const;
  return { text: formatPercent(pct), direction };
}

interface FormatCurrencyOptions {
  full?: boolean;
  currency?: 'VND' | 'USD';
}

export const formatCurrency = (value: string | number | null | undefined, options: FormatCurrencyOptions = {}): string => {
  const { full = false, currency = 'VND' } = options;

  // Parse value - handle string, number, null, undefined
  let num = 0;
  if (value === null || value === undefined) {
    num = 0;
  } else if (typeof value === 'string') {
    // Remove any non-numeric characters except decimal point and minus
    const cleaned = value.replace(/[^\d.-]/g, '');
    num = parseFloat(cleaned) || 0;
  } else if (typeof value === 'number') {
    num = isNaN(value) ? 0 : value;
  } else {
    num = 0;
  }

  // Convert to USD if requested
  if (currency === 'USD') {
    num = num / VND_TO_USD_RATE;

    // Format USD
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const prefix = isNegative ? '-' : '';

    if (absNum >= 1e6) {
      const val = absNum / 1e6;
      return `${prefix}$${val.toFixed(1)}M`;
    }
    if (absNum >= 1e3) {
      const val = absNum / 1e3;
      return `${prefix}$${val.toFixed(0)}K`;
    }
    return `${prefix}$${absNum.toFixed(0)}`;
  }

  // VND formatting
  // If full format requested, show full number
  if (full) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const prefix = isNegative ? '-' : '';

  // Abbreviated format: tỷ (billion), triệu (million)
  if (absNum >= 1e9) {
    const val = absNum / 1e9;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
    return `${prefix}${formatted} tỷ`;
  }

  if (absNum >= 1e6) {
    const val = absNum / 1e6;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
    return `${prefix}${formatted} tr`;
  }

  if (absNum >= 1e3) {
    const val = absNum / 1e3;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
    return `${prefix}${formatted}K đ`;
  }

  // For smaller numbers
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
};

export interface Season {
  id: string;
  name: string;
  fiscalYear: number;
  seasonGroupId: string;
  type: 'pre' | 'main';
}

export const generateSeasons = (seasonGroup: string, fiscalYear: number): Season[] => {
  return [
    { id: `${seasonGroup}_pre_${fiscalYear}`, name: 'Pre', fiscalYear, seasonGroupId: seasonGroup, type: 'pre' },
    { id: `${seasonGroup}_main_${fiscalYear}`, name: 'Main', fiscalYear, seasonGroupId: seasonGroup, type: 'main' }
  ];
};

export const generateSeasonsMultiple = (seasonGroups: string[], fiscalYear: number): Season[] => {
  return seasonGroups.flatMap(seasonGroup => [
    { id: `${seasonGroup}_pre_${fiscalYear}`, name: 'Pre', fiscalYear, seasonGroupId: seasonGroup, type: 'pre' },
    { id: `${seasonGroup}_main_${fiscalYear}`, name: 'Main', fiscalYear, seasonGroupId: seasonGroup, type: 'main' }
  ]);
};
