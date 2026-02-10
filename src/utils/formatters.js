// Utility functions for formatting

// Exchange rate VND to USD (approximate)
const VND_TO_USD_RATE = 25000;

export const formatCurrency = (value, options = {}) => {
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

export const generateSeasons = (seasonGroup, fiscalYear) => {
  return [
    { id: `${seasonGroup}_pre_${fiscalYear}`, name: 'Pre', fiscalYear, seasonGroupId: seasonGroup, type: 'pre' },
    { id: `${seasonGroup}_main_${fiscalYear}`, name: 'Main', fiscalYear, seasonGroupId: seasonGroup, type: 'main' }
  ];
};

export const generateSeasonsMultiple = (seasonGroups, fiscalYear) => {
  return seasonGroups.flatMap(seasonGroup => [
    { id: `${seasonGroup}_pre_${fiscalYear}`, name: 'Pre', fiscalYear, seasonGroupId: seasonGroup, type: 'pre' },
    { id: `${seasonGroup}_main_${fiscalYear}`, name: 'Main', fiscalYear, seasonGroupId: seasonGroup, type: 'main' }
  ]);
};
