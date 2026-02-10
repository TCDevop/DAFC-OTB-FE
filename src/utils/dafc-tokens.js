/**
 * DAFC Design Tokens
 * Industrial Precision UI Design System
 *
 * Framework: Industrial Precision UI
 * Brand: DAFC (Champagne Gold + Forest Green)
 * Philosophy: Flat Design, High Contrast, Data-First
 */

// ===== BRAND COLORS =====
export const DAFC_BRAND = {
  gold: {
    DEFAULT: '#D7B797',
    light: '#E8D4C0',
    dark: '#B89970',
    darker: '#8A6340',
  },
  green: {
    DEFAULT: '#127749',
    light: '#2A9E6A',
    dark: '#095431',
  },
};

// ===== SURFACE COLORS =====
export const SURFACE = {
  DEFAULT: '#121212',
  secondary: '#1A1A1A',
  elevated: '#242424',
  overlay: 'rgba(36, 36, 36, 0.5)',
  canvas: '#000000',
};

// ===== CONTENT/TEXT COLORS =====
export const CONTENT = {
  DEFAULT: '#F2F2F2',
  secondary: '#999999',
  muted: '#666666',
  inverse: '#000000',
};

// ===== BORDER COLORS =====
export const BORDER = {
  DEFAULT: '#2E2E2E',
  muted: '#1A1A1A',
  emphasis: '#3D3D3D',
};

// ===== STATUS COLORS =====
export const STATUS = {
  critical: {
    DEFAULT: '#F85149',
    muted: 'rgba(248, 81, 73, 0.15)',
    text: '#FF7B72',
  },
  warning: {
    DEFAULT: '#D29922',
    muted: 'rgba(210, 153, 34, 0.15)',
    text: '#E3B341',
  },
  success: {
    DEFAULT: '#127749',
    muted: 'rgba(18, 119, 73, 0.15)',
    text: '#2A9E6A',
  },
  info: {
    DEFAULT: '#58A6FF',
    muted: 'rgba(88, 166, 255, 0.15)',
    text: '#79C0FF',
  },
  neutral: {
    DEFAULT: '#8B949E',
    muted: 'rgba(139, 148, 158, 0.15)',
  },
};

// ===== DATA VISUALIZATION COLORS =====
export const DATA = {
  positive: '#127749',
  negative: '#F85149',
  neutral: '#8B949E',
};

// ===== CHART COLORS =====
export const CHART_COLORS = {
  1: '#D7B797', // DAFC Gold
  2: '#2A9E6A', // DAFC Green Light
  3: '#D29922', // Amber
  4: '#A371F7', // Purple
  5: '#F85149', // Red
  6: '#8B949E', // Gray
  7: '#58A6FF', // Blue
  8: '#48CAE4', // Teal
};

export const CHART_SERIES = [
  '#D7B797', // Champagne Gold
  '#2A9E6A', // Forest Green Light
  '#58A6FF', // Blue
  '#D29922', // Amber
  '#A371F7', // Purple
  '#48CAE4', // Teal
  '#EC4899', // Pink
  '#84CC16', // Lime
];

// ===== AI COLORS =====
export const AI = {
  DEFAULT: '#A371F7',
  muted: 'rgba(163, 113, 247, 0.15)',
  text: '#D2A8FF',
};

// ===== HIERARCHY COLORS (Tree Structure) =====
export const HIERARCHY_COLORS = {
  0: { // Root - Dark accent
    bg: 'bg-transparent',
    accent: 'bg-slate-800',
    accentWidth: 'w-1',
    text: 'text-slate-900',
    indent: 0,
  },
  1: { // Collection - Blue accent
    bg: 'bg-transparent',
    accent: 'bg-blue-500',
    accentWidth: 'w-1',
    text: 'text-slate-800',
    indent: 0,
  },
  2: { // Gender - Teal accent
    bg: 'bg-transparent',
    accent: 'bg-teal-500',
    accentWidth: 'w-1',
    text: 'text-slate-700',
    indent: 24,
  },
  3: { // Category - Amber accent
    bg: 'bg-transparent',
    accent: 'bg-amber-500',
    accentWidth: 'w-0.5',
    text: 'text-slate-700',
    indent: 24,
  },
  4: { // Product - Rose accent
    bg: 'bg-transparent',
    accent: 'bg-rose-400',
    accentWidth: 'w-0.5',
    text: 'text-slate-600',
    indent: 24,
  },
  5: { // SKU - Gray accent
    bg: 'bg-transparent',
    accent: 'bg-slate-300',
    accentWidth: 'w-0.5',
    text: 'text-slate-600',
    indent: 24,
  },
};

// ===== STATUS COLORS FOR TREE NODES =====
export const STATUS_COLORS = {
  draft: { badge: 'text-slate-500', dot: 'bg-slate-400' },
  verified: { badge: 'text-emerald-600', dot: 'bg-emerald-500' },
  warning: { badge: 'text-amber-600', dot: 'bg-amber-500' },
  error: { badge: 'text-red-600', dot: 'bg-red-500' },
  locked: { badge: 'text-slate-400', dot: 'bg-slate-400' },
};

// ===== CHART THEME =====
export const chartTheme = {
  colors: {
    primary: '#D7B797',
    secondary: '#2A9E6A',
    tertiary: '#58A6FF',
    quaternary: '#D29922',
    quinary: '#A371F7',
    senary: '#48CAE4',
    positive: '#127749',
    negative: '#F85149',
    neutral: '#8B949E',
    grid: '#2E2E2E',
    axis: '#999999',
    tooltipBg: '#121212',
    tooltipBorder: '#2E2E2E',
  },

  series: CHART_SERIES,

  fonts: {
    label: "'JetBrains Mono', monospace",
    value: "'JetBrains Mono', monospace",
    title: "'Montserrat', sans-serif",
  },

  grid: {
    stroke: '#2E2E2E',
    strokeDasharray: '3 3',
    strokeWidth: 1,
    opacity: 0.4,
  },

  axis: {
    stroke: '#2E2E2E',
    fontSize: 10,
    tickSize: 4,
    tick: {
      fill: '#999999',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
    },
  },

  tooltip: {
    backgroundColor: '#121212',
    borderColor: '#2E2E2E',
    borderRadius: 6,
    padding: 12,
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },

  legend: {
    fontSize: 11,
    fontFamily: "'Montserrat', sans-serif",
    iconSize: 8,
    itemGap: 16,
  },
};

// ===== RECHARTS CONFIG HELPER =====
export const rechartsConfig = {
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: '#2E2E2E',
    strokeOpacity: 0.4,
    vertical: false,
  },

  xAxis: {
    axisLine: { stroke: '#2E2E2E' },
    tickLine: { stroke: '#2E2E2E' },
    tick: {
      fill: '#999999',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
    },
  },

  yAxis: {
    axisLine: false,
    tickLine: false,
    tick: {
      fill: '#999999',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
    },
  },

  tooltipContentStyle: {
    backgroundColor: '#121212',
    border: '1px solid #2E2E2E',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
  },
};

// ===== NUMBER FORMATTERS =====
export const chartFormatters = {
  currency: (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  },

  currencyVND: (value) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} tr`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString('vi-VN');
  },

  percent: (value) => `${value.toFixed(1)}%`,

  number: (value) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString();
  },

  week: (value) => `W${String(value).padStart(2, '0')}`,
};

// ===== COMPLETE TOKEN OBJECT =====
export const DAFC = {
  colors: {
    gold: '#D7B797',
    goldDark: '#B89970',
    goldLight: '#E8D4C0',
    goldDarker: '#8A6340',
    green: '#127749',
    greenLight: '#2A9E6A',
    greenDark: '#095431',
    black: '#000000',
    charcoal: '#1a1a1a',
    slate: '#2a2a2a',
    cream: '#FAFAFA',
    white: '#FFFFFF',
    status: STATUS,
  },
  fonts: {
    display: "'Montserrat', sans-serif",
    mono: "'JetBrains Mono', monospace",
    body: "'Inter', sans-serif",
  },
  radius: {
    pill: '9999px',
    card: '12px',
    button: '8px',
    input: '8px',
  },
  shadows: {
    glow: '0 0 20px rgba(215, 183, 151, 0.3)',
    card: '0 4px 24px rgba(0, 0, 0, 0.12)',
    elevated: '0 8px 32px rgba(0, 0, 0, 0.24)',
  },
  media: {
    heroSize: { width: 1200, height: 1600 },
    cardSize: { width: 600, height: 800 },
    thumbSize: { width: 400, height: 400 },
    miniSize: { width: 64, height: 64 },
    aspectRatio: '3/4',
    background: '#FAFAFA',
    format: 'webp',
  },
};

export default DAFC;
