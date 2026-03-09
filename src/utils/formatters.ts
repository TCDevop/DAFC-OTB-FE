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
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(num)) + ' VND';
}

// Format plain number with thousand separators, rounded to integer (e.g. 1,234,567)
export function formatNumber(value: number | string | null | undefined): string {
  let num = 0;
  if (value === null || value === undefined) {
    num = 0;
  } else if (typeof value === 'string') {
    num = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  } else if (typeof value === 'number') {
    num = isNaN(value) ? 0 : value;
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(num));
}

// Format percentage display (no sign, no rounding — show exact value)
export function displayPct(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  // Remove trailing zeros but keep all meaningful decimals
  const str = parseFloat(num.toFixed(10)).toString();
  return `${str}%`;
}

// Format percentage with optional sign (for changes/variance, no rounding)
export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  const sign = num > 0 ? '+' : '';
  const str = parseFloat(num.toFixed(10)).toString();
  return `${sign}${str}%`;
}

// Format change between two values as percentage
export function formatChange(oldVal: number, newVal: number): { text: string; direction: 'up' | 'down' | 'none' } {
  if (oldVal === 0) return { text: newVal > 0 ? '+100%' : '—', direction: newVal > 0 ? 'up' : 'none' };
  const pct = ((newVal - oldVal) / oldVal) * 100;
  const direction = pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'none' as const;
  return { text: formatPercent(pct), direction };
}

interface FormatCurrencyOptions {
  currency?: 'VND' | 'USD';
}

export const formatCurrency = (value: string | number | null | undefined, options: FormatCurrencyOptions = {}): string => {
  const { currency = 'VND' } = options;

  // Parse value - handle string, number, null, undefined
  let num = 0;
  if (value === null || value === undefined) {
    num = 0;
  } else if (typeof value === 'string') {
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(num));
  }

  // VND formatting — full number with thousand separators, rounded to integer
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(num));
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
