'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Image as ImageIcon, ChevronDown, ChevronUp, Package, Ruler, ArrowLeft, Loader2, Check, X, Clock, Send, CheckCircle, XCircle, LayoutGrid, List, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils';
import { budgetService, planningService, proposalService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import RiskScoreCard from '../components/RiskScoreCard';

/* =========================
   DAFC DESIGN SYSTEM COLORS
========================= */

// Chart colors: REX = Champagne Gold, TTP = Forest Green
const REX_COLOR = '#D7B797';
const TTP_COLOR = '#127749';

// Mock SKU data for demo
const MOCK_SKU_DATA = [
  {
    gender: 'female',
    productType: 'W OUTERWEAR',
    subCategory: 'Jackets & Coats',
    pctBuyPropose: 35,
    otbPropose: 2500000000,
    items: [
      { sku: '8116333', name: 'FITZROVIA DK SHT', theme: 'AUGUST (08)', color: 'WINE RED', composition: '100% COTTON', srp: 87900000, order: 6, rex: 3, ttp: 3, ttlValue: 527400000, productType: 'W OUTERWEAR' },
      { sku: '8116334', name: 'CHELSEA TRENCH', theme: 'AUGUST (08)', color: 'CAMEL', composition: '100% WOOL', srp: 125000000, order: 4, rex: 2, ttp: 2, ttlValue: 500000000, productType: 'W OUTERWEAR' },
      { sku: '8116335', name: 'KENSINGTON COAT', theme: 'SEPTEMBER (09)', color: 'BLACK', composition: '80% WOOL 20% CASHMERE', srp: 185000000, order: 3, rex: 2, ttp: 1, ttlValue: 555000000, productType: 'W OUTERWEAR' },
    ]
  },
  {
    gender: 'female',
    productType: 'W KNITWEAR',
    subCategory: 'Sweaters',
    pctBuyPropose: 25,
    otbPropose: 1800000000,
    items: [
      { sku: '8117001', name: 'CASHMERE CREW', theme: 'AUGUST (08)', color: 'IVORY', composition: '100% CASHMERE', srp: 45000000, order: 8, rex: 4, ttp: 4, ttlValue: 360000000, productType: 'W KNITWEAR' },
      { sku: '8117002', name: 'MERINO TURTLENECK', theme: 'SEPTEMBER (09)', color: 'BURGUNDY', composition: '100% MERINO WOOL', srp: 35000000, order: 10, rex: 5, ttp: 5, ttlValue: 350000000, productType: 'W KNITWEAR' },
    ]
  },
  {
    gender: 'male',
    productType: 'M OUTERWEAR',
    subCategory: 'Jackets',
    pctBuyPropose: 40,
    otbPropose: 3200000000,
    items: [
      { sku: '8118001', name: 'WESTMINSTER TRENCH', theme: 'AUGUST (08)', color: 'HONEY', composition: '100% COTTON GABARDINE', srp: 95000000, order: 5, rex: 3, ttp: 2, ttlValue: 475000000, productType: 'M OUTERWEAR' },
      { sku: '8118002', name: 'PADDED JACKET', theme: 'SEPTEMBER (09)', color: 'NAVY', composition: 'NYLON/DOWN FILL', srp: 75000000, order: 6, rex: 3, ttp: 3, ttlValue: 450000000, productType: 'M OUTERWEAR' },
      { sku: '8118003', name: 'QUILTED VEST', theme: 'AUGUST (08)', color: 'ARCHIVE BEIGE', composition: 'NYLON/POLYESTER', srp: 42000000, order: 8, rex: 4, ttp: 4, ttlValue: 336000000, productType: 'M OUTERWEAR' },
    ]
  },
  {
    gender: 'male',
    productType: 'M ACCESSORIES',
    subCategory: 'Bags',
    pctBuyPropose: 20,
    otbPropose: 1500000000,
    items: [
      { sku: '8119001', name: 'TB MESSENGER BAG', theme: 'CORE', color: 'BLACK', composition: '100% LEATHER', srp: 55000000, order: 5, rex: 3, ttp: 2, ttlValue: 275000000, productType: 'M ACCESSORIES' },
      { sku: '8119002', name: 'CHECK BACKPACK', theme: 'AUGUST (08)', color: 'VINTAGE CHECK', composition: 'CANVAS/LEATHER', srp: 48000000, order: 6, rex: 3, ttp: 3, ttlValue: 288000000, productType: 'M ACCESSORIES' },
    ]
  }
];

// Mock detail data for demo
const MOCK_DETAIL_DATA = {
  id: 1,
  fiscalYear: 2025,
  groupBrand: { name: 'BURBERRY', code: 'BBY' },
  seasonGroupId: 'SS',
  seasonType: 'Main',
  totalBudget: 15000000000,
  status: 'APPROVED',
  createdBy: { name: 'Nguyễn Văn A' },
  createdAt: '2025-01-15',
  details: [
    { store: { name: 'REX' }, budgetAmount: 9000000000 },
    { store: { name: 'TTP' }, budgetAmount: 6000000000 }
  ]
};

// Card styles using DAFC tokens
const CARD_STYLES_DARK = [
  'from-[rgba(215,183,151,0.12)] to-[rgba(215,183,151,0.05)] border-[rgba(215,183,151,0.25)]',
  'from-[rgba(18,119,73,0.12)] to-[rgba(18,119,73,0.05)] border-[rgba(18,119,73,0.25)]',
  'from-[rgba(227,179,65,0.12)] to-[rgba(227,179,65,0.05)] border-[rgba(227,179,65,0.25)]',
  'from-[rgba(215,183,151,0.08)] to-[rgba(215,183,151,0.03)] border-[rgba(215,183,151,0.2)]',
  'from-[rgba(42,158,106,0.12)] to-[rgba(42,158,106,0.05)] border-[rgba(42,158,106,0.25)]',
  'from-[rgba(248,81,73,0.12)] to-[rgba(248,81,73,0.05)] border-[rgba(248,81,73,0.25)]',
];

const CARD_STYLES_LIGHT = [
  'from-[rgba(160,120,75,0.22)] to-[rgba(160,120,75,0.1)] border-[rgba(160,120,75,0.5)]',
  'from-[rgba(18,119,73,0.18)] to-[rgba(18,119,73,0.08)] border-[rgba(18,119,73,0.4)]',
  'from-[rgba(227,179,65,0.18)] to-[rgba(227,179,65,0.08)] border-[rgba(227,179,65,0.4)]',
  'from-[rgba(160,120,75,0.18)] to-[rgba(160,120,75,0.08)] border-[rgba(160,120,75,0.4)]',
  'from-[rgba(42,158,106,0.18)] to-[rgba(42,158,106,0.08)] border-[rgba(42,158,106,0.4)]',
  'from-[rgba(248,81,73,0.18)] to-[rgba(248,81,73,0.08)] border-[rgba(248,81,73,0.4)]',
];

/* =========================
   GROUPED BAR CHARTS
========================= */

const CollectionBarChart = ({ data, darkMode, t }) => (
  <div className={`border rounded-xl shadow-sm p-6 ${
    darkMode
      ? 'bg-[#121212] border-[#2E2E2E]'
      : 'bg-white border-gray-200'
  }`}>
    <h3 className={`text-base font-semibold font-['Montserrat'] ${
      darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'
    }`}>{t ? t('planningDetail.collection') : 'Collection Allocation'}</h3>
    <p className={`text-sm mb-4 ${
      darkMode ? 'text-[#999999]' : 'text-gray-700'
    }`}>Carry Over vs Seasonal — REX & TTP by collection</p>
    <div className="h-[300px]" style={{ minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#2E2E2E' : '#e2e8f0'} />
          <XAxis dataKey="name" tick={{ fontSize: 13, fill: darkMode ? '#999999' : '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: darkMode ? '#999999' : '#64748b' }} tickFormatter={(v) => `${(v / 1e9).toFixed(1)}B`} />
          <Tooltip
            formatter={(v) => formatCurrency(v)}
            contentStyle={{
              backgroundColor: darkMode ? '#1A1A1A' : '#fff',
              border: `1px solid ${darkMode ? '#2E2E2E' : '#e2e8f0'}`,
              borderRadius: '8px',
              color: darkMode ? '#F2F2F2' : '#1e293b'
            }}
            labelStyle={{ color: darkMode ? '#F2F2F2' : '#1e293b' }}
            cursor={{ fill: darkMode ? 'rgba(215,183,151,0.1)' : 'rgba(0,0,0,0.05)' }}
          />
          <Legend wrapperStyle={{ color: darkMode ? '#999999' : '#64748b' }} />
          <Bar dataKey="rex" name="REX" fill={REX_COLOR} radius={[4, 4, 0, 0]} maxBarSize={56} />
          <Bar dataKey="ttp" name="TTP" fill={TTP_COLOR} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const GenderBarChart = ({ data, darkMode, t }) => (
  <div className={`border rounded-xl shadow-sm p-6 ${
    darkMode
      ? 'bg-[#121212] border-[#2E2E2E]'
      : 'bg-white border-gray-200'
  }`}>
    <h3 className={`text-base font-semibold font-['Montserrat'] ${
      darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'
    }`}>{t ? t('planningDetail.gender') : 'Gender Allocation'}</h3>
    <p className={`text-sm mb-4 ${
      darkMode ? 'text-[#999999]' : 'text-gray-700'
    }`}>Male vs Female — REX & TTP by gender</p>
    <div className="h-[300px]" style={{ minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#2E2E2E' : '#e2e8f0'} />
          <XAxis dataKey="name" tick={{ fontSize: 13, fill: darkMode ? '#999999' : '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: darkMode ? '#999999' : '#64748b' }} tickFormatter={(v) => `${(v / 1e9).toFixed(1)}B`} />
          <Tooltip
            formatter={(v) => formatCurrency(v)}
            contentStyle={{
              backgroundColor: darkMode ? '#1A1A1A' : '#fff',
              border: `1px solid ${darkMode ? '#2E2E2E' : '#e2e8f0'}`,
              borderRadius: '8px',
              color: darkMode ? '#F2F2F2' : '#1e293b'
            }}
            labelStyle={{ color: darkMode ? '#F2F2F2' : '#1e293b' }}
            cursor={{ fill: darkMode ? 'rgba(215,183,151,0.1)' : 'rgba(0,0,0,0.05)' }}
          />
          <Legend wrapperStyle={{ color: darkMode ? '#999999' : '#64748b' }} />
          <Bar dataKey="rex" name="REX" fill={REX_COLOR} radius={[4, 4, 0, 0]} maxBarSize={56} />
          <Bar dataKey="ttp" name="TTP" fill={TTP_COLOR} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

/* =========================
   SKU CARD (with sizing)
========================= */

const SizingTable = ({ productType, darkMode }) => (
  <div className={`rounded-xl border overflow-hidden ${
    darkMode
      ? 'border-[#2E2E2E] bg-[#121212]'
      : 'border-gray-200 bg-white'
  }`}>
    <div className={`px-4 py-2.5 text-sm font-semibold border-b font-['Montserrat'] ${
      darkMode
        ? 'text-[#F2F2F2] bg-[#1A1A1A] border-[#2E2E2E]'
        : 'text-gray-600 bg-gray-50 border-gray-200'
    }`}>
      Sizing
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-[rgba(160,120,75,0.18)] text-[#666666]'}>
            <th className="px-3 py-2 text-left">{productType}</th>
            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0002</th>
            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0004</th>
            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0006</th>
            <th className="px-3 py-2 text-center font-['JetBrains_Mono']">0008</th>
            <th className="px-3 py-2 text-center">Sum</th>
          </tr>
        </thead>
        <tbody>
          <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
            <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>% Sales mix</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>6%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>33%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>33%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>28%</td>
            <td className={`px-3 py-2 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>100%</td>
          </tr>
          <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
            <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>% ST</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>50%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>43%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>30%</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>63%</td>
            <td className={`px-3 py-2 text-center ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>-</td>
          </tr>
          <tr className={`border-t ${
            darkMode
              ? 'border-[#2E2E2E] bg-[rgba(227,179,65,0.1)]'
              : 'border-gray-200 bg-[rgba(227,179,65,0.18)]'
          }`}>
            <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#E3B341]' : 'text-[#8A6340]'}`}>Final Choice</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>0</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>3</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>3</td>
            <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>2</td>
            <td className={`px-3 py-2 text-center font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>8</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const SKUCard = ({ item, block, cardIdx, darkMode }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [storeOrderOpen, setStoreOrderOpen] = useState(false);
  const [sizingOpen, setSizingOpen] = useState(false);
  const cardStyles = darkMode ? CARD_STYLES_DARK : CARD_STYLES_LIGHT;
  const style = cardStyles[cardIdx % cardStyles.length];
  const productType = item.productType || block.productType;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${style} shadow-sm overflow-hidden transition-all ${
      darkMode
        ? 'hover:shadow-[0_4px_20px_rgba(215,183,151,0.1)]'
        : 'hover:shadow-md'
    }`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
            darkMode
              ? 'bg-[#1A1A1A] border-[#2E2E2E]'
              : 'bg-white/80 border-white/50'
          }`}>
            <ImageIcon size={24} className={darkMode ? 'text-[#666666]' : 'text-gray-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-base truncate font-['Montserrat'] ${
              darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'
            }`}>
              <span className="font-['JetBrains_Mono']">{item.sku}</span> • {item.name}
            </div>
            <div className={`text-sm mt-0.5 ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>
              {block.gender} • {block.subCategory}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setDetailsOpen((p) => !p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  darkMode
                    ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#999999] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)] hover:text-[#D7B797]'
                    : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(160,120,75,0.4)] hover:text-[#8A6340]'
                }`}
              >
                {detailsOpen ? 'Hide details' : 'Details'}
              </button>
              <button
                type="button"
                onClick={() => setStoreOrderOpen((p) => !p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1 transition-all ${
                  darkMode
                    ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#999999] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)] hover:text-[#D7B797]'
                    : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(160,120,75,0.4)] hover:text-[#8A6340]'
                }`}
              >
                <Store size={12} />
                {storeOrderOpen ? 'Hide stores' : 'Store Order'}
              </button>
              <button
                type="button"
                onClick={() => setSizingOpen((p) => !p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1 transition-all ${
                  darkMode
                    ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#999999] hover:bg-[rgba(215,183,151,0.08)] hover:border-[rgba(215,183,151,0.25)] hover:text-[#D7B797]'
                    : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-[rgba(160,120,75,0.18)] hover:border-[rgba(160,120,75,0.4)] hover:text-[#8A6340]'
                }`}
              >
                <Ruler size={12} />
                {sizingOpen ? 'Hide sizing' : 'Sizing'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`rounded-lg border px-3 py-2.5 ${
            darkMode
              ? 'bg-[#1A1A1A]/60 border-[#2E2E2E]'
              : 'bg-white/60 border-white/50'
          }`}>
            <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Rex</p>
            <p className="text-base font-bold text-[#D7B797] font-['JetBrains_Mono']">{item.rex}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2.5 ${
            darkMode
              ? 'bg-[#1A1A1A]/60 border-[#2E2E2E]'
              : 'bg-white/60 border-white/50'
          }`}>
            <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>TTP</p>
            <p className="text-base font-bold text-[#127749] font-['JetBrains_Mono']">{item.ttp}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2.5 ${
            darkMode
              ? 'bg-[#1A1A1A]/60 border-[#2E2E2E]'
              : 'bg-white/60 border-white/50'
          }`}>
            <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Order</p>
            <p className={`text-base font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.order}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2.5 ${
            darkMode
              ? 'bg-[#1A1A1A]/60 border-[#2E2E2E]'
              : 'bg-white/60 border-white/50'
          }`}>
            <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>TTL value</p>
            <p className={`text-base font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency(item.ttlValue)}</p>
          </div>
        </div>

        {detailsOpen && (
          <div className={`mt-4 rounded-xl border p-4 ${
            darkMode
              ? 'border-[#2E2E2E] bg-[#1A1A1A]/40'
              : 'border-white/50 bg-white/40'
          }`}>
            <div className="grid grid-cols-2 gap-3 text-base">
              <div>
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Product type</span>
                <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{productType}</div>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Theme</span>
                <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.theme}</div>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Color</span>
                <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.color}</div>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>Composition</span>
                <div className={`font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.composition}</div>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>SRP</span>
                <div className={`font-medium text-lg font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency(item.srp)}</div>
              </div>
            </div>
          </div>
        )}

        {storeOrderOpen && (
          <div className={`mt-4 rounded-xl border overflow-hidden ${
            darkMode ? 'border-[#2E2E2E] bg-[#121212]' : 'border-gray-200 bg-white'
          }`}>
            <div className={`px-4 py-2.5 text-sm font-semibold border-b font-['Montserrat'] ${
              darkMode ? 'text-[#F2F2F2] bg-[#1A1A1A] border-[#2E2E2E]' : 'text-gray-600 bg-gray-50 border-gray-200'
            }`}>Store Order</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-[rgba(160,120,75,0.18)] text-[#666666]'}>
                    <th className="px-3 py-2 text-left">Store</th>
                    <th className="px-3 py-2 text-center font-['JetBrains_Mono']">ORDER</th>
                    <th className="px-3 py-2 text-right font-['JetBrains_Mono']">TTL VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
                    <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D7B797]" />REX
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.rex || 0}</td>
                    <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency((item.rex || 0) * (item.srp || 0))}</td>
                  </tr>
                  <tr className={`border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
                    <td className={`px-3 py-2 ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-700'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#127749]" />TTP
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-center font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.ttp || 0}</td>
                    <td className={`px-3 py-2 text-right font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency((item.ttp || 0) * (item.srp || 0))}</td>
                  </tr>
                  <tr className={`border-t-2 ${darkMode ? 'border-[#D7B797]/30' : 'border-[#D7B797]/40'} ${darkMode ? 'bg-[rgba(215,183,151,0.05)]' : 'bg-[rgba(160,120,75,0.12)]'}`}>
                    <td className={`px-3 py-2 font-semibold ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>Total</td>
                    <td className={`px-3 py-2 text-center font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.order || ((item.rex || 0) + (item.ttp || 0))}</td>
                    <td className={`px-3 py-2 text-right font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency(item.ttlValue || (item.order || 0) * (item.srp || 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sizingOpen && (
          <div className="mt-4">
            <SizingTable productType={productType} darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================
   APPROVAL STEPS & COMPONENTS
========================= */

const APPROVAL_STEPS = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'brand_manager', label: 'Group Brand Manager' },
  { id: 'finance', label: 'Finance' },
  { id: 'ceo', label: 'CEO' },
];

const getApprovalStepStatus = (stepId, currentStep, approvalHistory) => {
  const historyItem = approvalHistory?.find(h => h.stepId === stepId);
  if (historyItem?.action === 'approved') return 'approved';
  if (historyItem?.action === 'rejected') return 'rejected';
  if (historyItem?.action === 'submitted') return 'approved';
  if (stepId === currentStep) return 'current';
  const stepIndex = APPROVAL_STEPS.findIndex(s => s.id === stepId);
  const currentIndex = APPROVAL_STEPS.findIndex(s => s.id === currentStep);
  return stepIndex < currentIndex ? 'approved' : 'waiting';
};

const ApprovalProgressBar = ({ currentStep, approvalHistory, darkMode, t }) => (
  <div className={`border rounded-xl shadow-sm p-5 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}>
    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-5 font-['Montserrat'] ${darkMode ? 'text-[#666666]' : 'text-gray-500'}`}>
      {t ? t('ticketDetail.approvalHistory') : 'Approval Progress'}
    </h3>
    <div className="flex items-start">
      {APPROVAL_STEPS.map((step, index) => {
        const status = getApprovalStepStatus(step.id, currentStep, approvalHistory);
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                status === 'approved' ? 'bg-[#127749] border-[#127749] text-white' :
                status === 'rejected' ? 'bg-[#F85149] border-[#F85149] text-white' :
                status === 'current' ? 'bg-[#D7B797] border-[#D7B797] text-white animate-pulse' :
                darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#666666]' : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {status === 'approved' ? <Check size={20} strokeWidth={3} /> :
                 status === 'rejected' ? <X size={20} strokeWidth={3} /> :
                 status === 'current' ? <Clock size={18} /> :
                 <span className="text-sm font-bold">{index + 1}</span>}
              </div>
              <div className={`text-xs mt-2 font-medium text-center leading-tight ${
                status === 'approved' ? 'text-[#2A9E6A]' :
                status === 'rejected' ? 'text-[#FF7B72]' :
                status === 'current' ? 'text-[#D7B797]' :
                darkMode ? 'text-[#666666]' : 'text-gray-400'
              }`}>
                {step.label}
              </div>
              {(status === 'approved' || status === 'rejected') && (
                <span className={`mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  status === 'approved'
                    ? darkMode ? 'bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]' : 'bg-emerald-100 text-emerald-700'
                    : darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700'
                }`}>
                  {status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              )}
              {status === 'current' && (
                <span className={`mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-700'
                }`}>
                  In Review
                </span>
              )}
            </div>
            {index < APPROVAL_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-5 mx-1 rounded-full transition-all ${
                getApprovalStepStatus(APPROVAL_STEPS[index + 1].id, currentStep, approvalHistory) !== 'waiting'
                  ? 'bg-[#127749]'
                  : darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const StatusTrackingPanel = ({ approvalHistory, ticket, darkMode, t }) => (
  <div className={`border rounded-xl shadow-sm p-5 ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}>
    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 font-['Montserrat'] ${darkMode ? 'text-[#666666]' : 'text-gray-500'}`}>
      {t ? t('common.status') : 'Status Tracking'}
    </h3>

    <div className="space-y-0">
      {approvalHistory?.length > 0 ? (
        approvalHistory.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                item.action === 'approved' ? 'bg-[#2A9E6A]' :
                item.action === 'rejected' ? 'bg-[#F85149]' :
                item.action === 'submitted' ? 'bg-[#D7B797]' :
                darkMode ? 'bg-[#666666]' : 'bg-gray-400'
              }`} />
              {index < approvalHistory.length - 1 && (
                <div className={`w-px flex-1 min-h-[20px] ${darkMode ? 'bg-[#2E2E2E]' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  item.action === 'approved' ? (darkMode ? 'bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]' : 'bg-emerald-100 text-emerald-700') :
                  item.action === 'rejected' ? (darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700') :
                  darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                </span>
                <span className={`text-xs ${darkMode ? 'text-[#999999]' : 'text-gray-500'}`}>
                  by {item.stepLabel || item.role || '-'}
                </span>
              </div>
              {item.decidedAt && (
                <div className={`text-[10px] mt-0.5 font-['JetBrains_Mono'] ${darkMode ? 'text-[#666666]' : 'text-gray-400'}`}>
                  {new Date(item.decidedAt).toLocaleString('vi-VN')}
                </div>
              )}
              {item.comment && (
                <div className={`mt-1.5 px-3 py-2 rounded-lg text-xs italic ${
                  darkMode ? 'bg-[#1A1A1A] text-[#999999] border border-[#2E2E2E]' : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                  "{item.comment}"
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className={`text-sm italic ${darkMode ? 'text-[#666666]' : 'text-gray-400'}`}>
          {t ? t('ticketDetail.approvalHistory') : 'No approval history yet'}
        </div>
      )}
    </div>

    <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-[#2E2E2E]' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-500'}`}>{t ? t('common.status') : 'Current Status'}:</span>
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
          ['APPROVED', 'LEVEL2_APPROVED', 'FINAL'].includes(ticket?.status?.toUpperCase())
            ? darkMode ? 'bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]' : 'bg-emerald-100 text-emerald-700'
          : ['REJECTED', 'LEVEL1_REJECTED', 'LEVEL2_REJECTED'].includes(ticket?.status?.toUpperCase())
            ? darkMode ? 'bg-[rgba(248,81,73,0.15)] text-[#FF7B72]' : 'bg-red-100 text-red-700'
          : ['SUBMITTED', 'LEVEL1_APPROVED'].includes(ticket?.status?.toUpperCase())
            ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797]' : 'bg-amber-100 text-amber-700'
          : darkMode ? 'bg-[#1A1A1A] text-[#999999]' : 'bg-gray-100 text-gray-600'
        }`}>
          {ticket?.status?.replace(/_/g, ' ') || 'Draft'}
        </span>
      </div>
    </div>
  </div>
);

/* =========================
   MAIN SCREEN
========================= */

export default function TicketDetailPage({ ticket, onBack, darkMode = true }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [skuData, setSkuData] = useState([]);
  const [skuViewMode, setSkuViewMode] = useState('card');

  // Determine the right service based on entity type
  const getEntityService = () => {
    if (ticket?.entityType === 'budget') return budgetService;
    if (ticket?.entityType === 'planning') return planningService;
    if (ticket?.entityType === 'proposal') return proposalService;
    return null;
  };

  // Check if current user can approve at the current step
  const canApprove = () => {
    if (!ticket || !user) return false;
    const status = ticket?.status?.toUpperCase();
    const roleName = (user.role?.name || user.roleName || '').toLowerCase();
    const permissions = user.role?.permissions || user.permissions || [];
    const entityType = ticket.entityType;
    const permPrefix = entityType === 'proposal' ? 'proposal' : entityType === 'planning' ? 'planning' : 'budget';

    if (status === 'SUBMITTED') {
      return permissions.includes(`${permPrefix}:approve_l1`) || permissions.includes('*') || roleName.includes('manager');
    }
    if (status === 'LEVEL1_APPROVED') {
      return permissions.includes(`${permPrefix}:approve_l2`) || permissions.includes('*') || roleName.includes('finance') || roleName.includes('director');
    }
    return false;
  };

  const handleSubmitTicket = async () => {
    const svc = getEntityService();
    if (!svc) return;
    setActionLoading(true);
    try {
      await svc.submit(ticket.id);
      toast.success(t('ticketDetail.submit'));
      if (onBack) onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveTicket = async () => {
    const svc = getEntityService();
    if (!svc) return;
    const status = ticket?.status?.toUpperCase();
    setActionLoading(true);
    try {
      if (status === 'SUBMITTED') {
        await svc.approveL1(ticket.id, 'Approved');
      } else if (status === 'LEVEL1_APPROVED') {
        await svc.approveL2(ticket.id, 'Approved');
      }
      toast.success(t('ticketDetail.approve'));
      if (onBack) onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTicket = async () => {
    const reason = window.prompt(t('ticketDetail.reject') + ':');
    if (reason === null) return; // User cancelled
    const svc = getEntityService();
    if (!svc) return;
    const status = ticket?.status?.toUpperCase();
    setActionLoading(true);
    try {
      if (status === 'SUBMITTED') {
        await svc.rejectL1(ticket.id, reason || 'Rejected');
      } else if (status === 'LEVEL1_APPROVED') {
        await svc.rejectL2(ticket.id, reason || 'Rejected');
      }
      toast.success(t('ticketDetail.reject'));
      if (onBack) onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Approval history — derive from ticket status
  const approvalHistory = useMemo(() => {
    const status = ticket?.status?.toUpperCase();
    if (!status || status === 'DRAFT') return [];
    const history = [];
    history.push({
      stepId: 'submitted',
      stepLabel: 'Submitted',
      action: 'submitted',
      decidedAt: ticket?.createdAt || ticket?.createdOn || null,
      comment: null
    });
    if (['LEVEL1_APPROVED', 'LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(status)) {
      history.push({
        stepId: 'brand_manager',
        stepLabel: 'Group Brand Manager',
        action: 'approved',
        decidedAt: ticket?.l1ApprovedAt || null,
        comment: ticket?.l1Comment || 'Approved for finance review'
      });
    } else if (status === 'LEVEL1_REJECTED') {
      history.push({
        stepId: 'brand_manager',
        stepLabel: 'Group Brand Manager',
        action: 'rejected',
        decidedAt: ticket?.l1RejectedAt || null,
        comment: ticket?.l1Comment || 'Rejected'
      });
    }
    if (['LEVEL2_APPROVED', 'APPROVED', 'FINAL'].includes(status)) {
      history.push({
        stepId: 'finance',
        stepLabel: 'Finance',
        action: 'approved',
        decidedAt: ticket?.l2ApprovedAt || null,
        comment: ticket?.l2Comment || 'Finance approved'
      });
    } else if (status === 'LEVEL2_REJECTED') {
      history.push({
        stepId: 'finance',
        stepLabel: 'Finance',
        action: 'rejected',
        decidedAt: ticket?.l2RejectedAt || null,
        comment: ticket?.l2Comment || 'Rejected by Finance'
      });
    }
    if (['APPROVED', 'FINAL'].includes(status)) {
      history.push({
        stepId: 'ceo',
        stepLabel: 'CEO',
        action: 'approved',
        decidedAt: ticket?.approvedAt || null,
        comment: ticket?.ceoComment || 'Final approval granted'
      });
    }
    return history;
  }, [ticket]);

  const currentStep = useMemo(() => {
    const status = ticket?.status?.toUpperCase();
    if (!status || status === 'DRAFT') return 'submitted';
    if (status === 'SUBMITTED') return 'brand_manager';
    if (status === 'LEVEL1_APPROVED') return 'finance';
    if (status === 'LEVEL1_REJECTED') return 'brand_manager';
    if (status === 'LEVEL2_APPROVED') return 'ceo';
    if (status === 'LEVEL2_REJECTED') return 'finance';
    if (['APPROVED', 'FINAL'].includes(status)) return 'completed';
    return 'submitted';
  }, [ticket]);

  // Fetch detailed data based on entity type
  useEffect(() => {
    if (!ticket) return;

    const fetchDetailData = async () => {
      setLoading(true);
      try {
        let data = ticket.data;

        // If we have full data from ticket, use it; otherwise fetch
        if (ticket.entityType === 'budget' && ticket.id) {
          const res = await budgetService.getOne(ticket.id);
          data = res.data || res;
        } else if (ticket.entityType === 'planning' && ticket.id) {
          const res = await planningService.getOne(ticket.id);
          data = res.data || res;
        } else if (ticket.entityType === 'proposal' && ticket.id) {
          const res = await proposalService.getOne(ticket.id);
          data = res.data || res;
          // Transform proposal items to SKU format
          if (data.items) {
            const groupedSkus = {};
            data.items.forEach(item => {
              const key = `${item.gender?.name || 'Unknown'}_${item.category?.name || 'Unknown'}`;
              if (!groupedSkus[key]) {
                groupedSkus[key] = {
                  gender: item.gender?.name?.toLowerCase() || 'unknown',
                  productType: item.category?.name || 'Unknown',
                  subCategory: item.subCategory?.name || item.category?.name || 'Unknown',
                  pctBuyPropose: 0,
                  otbPropose: 0,
                  items: []
                };
              }
              groupedSkus[key].items.push({
                sku: item.sku?.code || item.skuId,
                name: item.sku?.name || '-',
                theme: item.sku?.theme || '-',
                color: item.sku?.color || '-',
                composition: item.sku?.composition || '-',
                srp: Number(item.sku?.retailPrice) || 0,
                order: Number(item.quantity) || 0,
                rex: Math.floor(Number(item.quantity) / 2) || 0,
                ttp: Math.ceil(Number(item.quantity) / 2) || 0,
                ttlValue: Number(item.totalValue) || 0
              });
              groupedSkus[key].otbPropose += Number(item.totalValue) || 0;
            });
            const skuGroups = Object.values(groupedSkus);
            setSkuData(skuGroups);
            // Default collapse all SKU groups
            const defaultCollapsed = {};
            skuGroups.forEach(block => {
              defaultCollapsed[`${block.productType}_${block.gender}`] = true;
            });
            setCollapsed(defaultCollapsed);
          }
        }

        setDetailData(data);
      } catch (err) {
        console.error('Failed to fetch ticket detail, using mock data:', err);
        // Use mock data as fallback
        setDetailData(MOCK_DETAIL_DATA);
        setSkuData(MOCK_SKU_DATA);
        // Default collapse all mock SKU groups
        const defaultCollapsed = {};
        MOCK_SKU_DATA.forEach(block => {
          defaultCollapsed[`${block.productType}_${block.gender}`] = true;
        });
        setCollapsed(defaultCollapsed);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailData();
  }, [ticket]);

  // Generate chart data from detail
  const { collectionData, genderData, budgetData, budgetSeasonData } = useMemo(() => {
    if (!detailData) {
      return {
        collectionData: [],
        genderData: [],
        budgetData: {},
        budgetSeasonData: {}
      };
    }

    // For budget type
    if (ticket?.entityType === 'budget') {
      const details = detailData.details || [];
      const storeMap = {};
      details.forEach(d => {
        const storeName = d.store?.name || 'Unknown';
        if (!storeMap[storeName]) {
          storeMap[storeName] = 0;
        }
        storeMap[storeName] += Number(d.budgetAmount) || 0;
      });

      return {
        collectionData: [
          { name: 'Total Allocation', rex: storeMap['REX'] || storeMap['Rex'] || Object.values(storeMap)[0] || 0, ttp: storeMap['TTP'] || storeMap['Ttp'] || Object.values(storeMap)[1] || 0 }
        ],
        genderData: [],
        budgetData: {
          id: detailData.id,
          fiscalYear: detailData.fiscalYear,
          groupBrand: detailData.groupBrand?.name || '-',
          brandId: detailData.groupBrandId,
          brandName: detailData.groupBrand?.name || '-',
          totalBudget: Number(detailData.totalBudget) || 0,
          budgetName: `${detailData.groupBrand?.name || 'Budget'} - ${detailData.seasonGroupId || ''} ${detailData.seasonType || ''}`,
          status: detailData.status
        },
        budgetSeasonData: {
          seasonGroup: detailData.seasonGroupId || '-',
          Season: detailData.seasonType || '-',
          rex: Object.values(storeMap)[0] || 0,
          ttp: Object.values(storeMap)[1] || 0,
          finalVersion: 1
        }
      };
    }

    // For planning type
    if (ticket?.entityType === 'planning') {
      const details = detailData.details || [];
      const collectionMap = {};
      const genderMap = {};

      details.forEach(d => {
        const colName = d.collection?.name || 'Other';
        const genName = d.gender?.name || 'Other';

        if (!collectionMap[colName]) collectionMap[colName] = { rex: 0, ttp: 0 };
        if (!genderMap[genName]) genderMap[genName] = { rex: 0, ttp: 0 };

        const otb = Number(d.otbValue) || 0;
        collectionMap[colName].rex += otb * 0.5;
        collectionMap[colName].ttp += otb * 0.5;
        genderMap[genName].rex += otb * 0.5;
        genderMap[genName].ttp += otb * 0.5;
      });

      return {
        collectionData: Object.entries(collectionMap).map(([name, data]) => ({ name, ...data })),
        genderData: Object.entries(genderMap).map(([name, data]) => ({ name, ...data })),
        budgetData: {
          id: detailData.id,
          fiscalYear: detailData.budgetDetail?.budget?.fiscalYear || '-',
          groupBrand: detailData.budgetDetail?.budget?.groupBrand?.name || '-',
          brandName: detailData.budgetDetail?.budget?.groupBrand?.name || '-',
          totalBudget: Number(detailData.budgetDetail?.budgetAmount) || 0,
          budgetName: detailData.planningCode || 'Planning',
          status: detailData.status
        },
        budgetSeasonData: {
          seasonGroup: detailData.budgetDetail?.budget?.seasonGroupId || '-',
          Season: detailData.budgetDetail?.budget?.seasonType || '-',
          rex: 0,
          ttp: 0,
          finalVersion: detailData.versionNumber || 1
        }
      };
    }

    // Default / proposal
    return {
      collectionData: [],
      genderData: [],
      budgetData: {
        id: detailData.id,
        fiscalYear: '-',
        groupBrand: ticket?.brand || '-',
        brandName: ticket?.brand || '-',
        totalBudget: 0,
        budgetName: ticket?.name || 'Ticket',
        status: detailData.status
      },
      budgetSeasonData: {
        seasonGroup: ticket?.seasonGroup || '-',
        Season: ticket?.season || '-',
        rex: 0,
        ttp: 0,
        finalVersion: 1
      }
    };
  }, [detailData, ticket]);

  const rexNum = Number(budgetSeasonData.rex) || 0;
  const ttpNum = Number(budgetSeasonData.ttp) || 0;
  const totalRexTtp = rexNum + ttpNum;

  // Use real SKU data or empty
  const displaySkuData = skuData.length > 0 ? skuData : [];

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className={`animate-spin ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`} />
          <span className={darkMode ? 'text-[#999999]' : 'text-gray-700'}>{t('ticketDetail.loadingDetail')}</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
        <div className={`text-center ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
          <p>{t('common.noData')}</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-[#D7B797] hover:underline">
              {t('ticketDetail.backToTickets')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen space-y-6 ${
      darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'
    }`}>
      {/* Back Button & Header */}
      {onBack && (
        <div className={`flex items-center justify-between gap-4 mb-4 p-4 rounded-xl ${
          darkMode
            ? 'bg-gradient-to-r from-[#127749] to-[#0F5F3A]'
            : 'bg-gradient-to-r from-[#127749] to-[#2A9E6A]'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg transition-all hover:bg-white/10 text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-lg font-semibold font-['Montserrat'] text-white">
                {t('ticketDetail.title')}
              </h1>
              <p className="text-xs text-white/70">
                {ticket?.entityType?.charAt(0).toUpperCase() + ticket?.entityType?.slice(1)} • {ticket?.name}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Submit — only for DRAFT */}
            {ticket?.status?.toUpperCase() === 'DRAFT' && (
              <button
                onClick={handleSubmitTicket}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all text-sm border border-white/20 backdrop-blur-sm disabled:opacity-50"
              >
                <Send size={16} />
                {t('common.submit')}
              </button>
            )}

            {/* Approve / Reject — for pending approvers */}
            {canApprove() && (
              <>
                <button
                  onClick={handleRejectTicket}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F85149]/20 hover:bg-[#F85149]/30 text-white font-semibold rounded-lg transition-all text-sm border border-[#F85149]/30 backdrop-blur-sm disabled:opacity-50"
                >
                  <XCircle size={16} />
                  {t('ticketDetail.reject')}
                </button>
                <button
                  onClick={handleApproveTicket}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/25 hover:bg-white/35 text-white font-semibold rounded-lg transition-all text-sm border border-white/30 backdrop-blur-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {t('ticketDetail.approve')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== APPROVAL PROGRESS BAR ===== */}
      <ApprovalProgressBar
        currentStep={currentStep}
        approvalHistory={approvalHistory}
        darkMode={darkMode}
        t={t}
      />

      {/* ===== STATUS TRACKING + BUDGET INFO ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget + Budget Season — 2/3 width */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* 1. Budget + Budget Season */}
        <div className={`border rounded-xl shadow-sm p-5 ${
          darkMode
            ? 'bg-[#121212] border-[#2E2E2E]'
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-base font-semibold mb-4 font-['Montserrat'] ${
            darkMode ? 'text-[#F2F2F2]' : 'text-gray-600'
          }`}>{t('skuProposal.budget')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('budget.fiscalYear')}</p>
              <p className={`text-base font-semibold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetData.fiscalYear}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('budget.groupBrand')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetData.groupBrand}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('budget.brand')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetData.brandName}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('budget.totalBudget')}</p>
              <p className="text-lg font-semibold text-[#D7B797] font-['JetBrains_Mono']">{formatCurrency(budgetData.totalBudget)}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('budget.budgetName')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetData.budgetName}</p>
            </div>
          </div>
        </div>

        <div className={`border rounded-xl shadow-sm p-5 ${
          darkMode
            ? 'bg-[#121212] border-[#2E2E2E]'
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-base font-semibold mb-4 font-['Montserrat'] ${
            darkMode ? 'text-[#F2F2F2]' : 'text-gray-600'
          }`}>{t('skuProposal.season')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('skuProposal.seasonGroup')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetSeasonData.seasonGroup}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('skuProposal.season')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{budgetSeasonData.Season}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('common.version')}</p>
              <p className={`text-base font-semibold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>v{budgetSeasonData.finalVersion}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>REX</p>
              <p className="text-lg font-semibold text-[#D7B797] font-['JetBrains_Mono']">{formatCurrency(rexNum)}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>TTP</p>
              <p className="text-lg font-semibold text-[#127749] font-['JetBrains_Mono']">{formatCurrency(ttpNum)}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-700'}`}>{t('skuProposal.total')}</p>
              <p className="text-lg font-bold text-[#D7B797] font-['JetBrains_Mono']">{formatCurrency(totalRexTtp)}</p>
            </div>
          </div>
        </div>

        {/* Risk Score Card */}
        <RiskScoreCard
          entityType="proposal"
          entityId={ticket?.proposalId || ticket?.id}
          autoCalculate={true}
          darkMode={darkMode}
        />
      </div>

        {/* Status Tracking Panel — 1/3 width */}
        <StatusTrackingPanel
          approvalHistory={approvalHistory}
          ticket={ticket}
          darkMode={darkMode}
          t={t}
        />
      </div>

      {/* 3. Charts - Collection & Gender (grouped bar: REX, TTP per category) */}
      {(collectionData.length > 0 || genderData.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {collectionData.length > 0 && <CollectionBarChart data={collectionData} darkMode={darkMode} t={t} />}
          {genderData.length > 0 && <GenderBarChart data={genderData} darkMode={darkMode} t={t} />}
        </div>
      )}

      {/* 4. SKU Cards - grouped by type and gender (only for proposals) */}
      {displaySkuData.length > 0 && (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold flex items-center gap-2 font-['Montserrat'] ${
            darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'
          }`}>
            <Package size={20} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
            {t('proposal.skuCode')} ({displaySkuData.reduce((sum, b) => sum + b.items.length, 0)})
          </h3>

          {/* View Mode Toggle */}
          <div className={`flex items-center gap-1 rounded-lg p-1 ${darkMode ? 'bg-[#1A1A1A] border border-[#2E2E2E]' : 'bg-[rgba(160,120,75,0.12)] border border-[rgba(160,120,75,0.3)]'}`}>
            <button
              type="button"
              onClick={() => setSkuViewMode('card')}
              className={`p-2 rounded-md transition-all ${
                skuViewMode === 'card'
                  ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#666666] hover:text-[#999999]' : 'text-[#999999] hover:text-[#666666]'
              }`}
              title="Card View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSkuViewMode('table')}
              className={`p-2 rounded-md transition-all ${
                skuViewMode === 'table'
                  ? darkMode ? 'bg-[rgba(215,183,151,0.15)] text-[#D7B797] shadow-sm' : 'bg-white text-[#8A6340] shadow-sm'
                  : darkMode ? 'text-[#666666] hover:text-[#999999]' : 'text-[#999999] hover:text-[#666666]'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
        {/* === TABLE VIEW === */}
        {skuViewMode === 'table' && (
          <div className={`border rounded-2xl shadow-sm overflow-hidden ${darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'bg-[#1A1A1A]' : 'bg-[rgba(160,120,75,0.18)]'}>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}></th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.skuCode')}</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.productName')}</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.productType')}</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.color')}</th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.rex')}</th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.ttp')}</th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.order')}</th>
                    <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-[#999999]' : 'text-[#666666]'}`}>{t('proposal.totalValue')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-[#2E2E2E]' : 'divide-gray-100'}`}>
                  {displaySkuData.flatMap(block => block.items.map((item, idx) => (
                    <tr key={`${item.sku}_${idx}`} className={`transition-colors ${darkMode ? 'hover:bg-[rgba(215,183,151,0.05)]' : 'hover:bg-[rgba(160,120,75,0.1)]'}`}>
                      <td className="px-4 py-3">
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${darkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-gray-50 border-gray-200'}`}>
                          <ImageIcon size={16} className={darkMode ? 'text-[#666666]' : 'text-gray-400'} />
                        </div>
                      </td>
                      <td className={`px-4 py-3 font-['JetBrains_Mono'] text-sm ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{item.sku}</td>
                      <td className={`px-4 py-3 font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.name}</td>
                      <td className={`px-4 py-3 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{item.productType || block.productType}</td>
                      <td className={`px-4 py-3 ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>{item.color || '-'}</td>
                      <td className={`px-4 py-3 text-center font-['JetBrains_Mono'] font-medium text-[#D7B797]`}>{item.rex || 0}</td>
                      <td className={`px-4 py-3 text-center font-['JetBrains_Mono'] font-medium text-[#127749]`}>{item.ttp || 0}</td>
                      <td className={`px-4 py-3 text-center font-['JetBrains_Mono'] font-bold ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{item.order || 0}</td>
                      <td className={`px-4 py-3 text-right font-['JetBrains_Mono'] font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>{formatCurrency(item.ttlValue || 0)}</td>
                    </tr>
                  )))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${darkMode ? 'border-[#D7B797]/30 bg-[rgba(215,183,151,0.05)]' : 'border-[#D7B797]/40 bg-[rgba(160,120,75,0.12)]'}`}>
                    <td colSpan="5" className={`px-4 py-3 font-semibold ${darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'}`}>{t('skuProposal.total')}</td>
                    <td className={`px-4 py-3 text-center font-bold font-['JetBrains_Mono'] text-[#D7B797]`}>
                      {displaySkuData.reduce((s, b) => s + b.items.reduce((ss, i) => ss + (i.rex || 0), 0), 0)}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold font-['JetBrains_Mono'] text-[#127749]`}>
                      {displaySkuData.reduce((s, b) => s + b.items.reduce((ss, i) => ss + (i.ttp || 0), 0), 0)}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                      {displaySkuData.reduce((s, b) => s + b.items.reduce((ss, i) => ss + (i.order || 0), 0), 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold font-['JetBrains_Mono'] ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-800'}`}>
                      {formatCurrency(displaySkuData.reduce((s, b) => s + b.items.reduce((ss, i) => ss + (i.ttlValue || 0), 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* === CARD VIEW === */}
        {skuViewMode === 'card' && displaySkuData.map((block) => {
          const key = `${block.gender}_${block.productType}`;
          const isCollapsed = collapsed[key];
          const totalSrp = block.items.reduce((sum, i) => sum + i.srp, 0);
          return (
            <div key={key} className={`border rounded-2xl shadow-sm overflow-hidden ${
              darkMode
                ? 'bg-[#121212] border-[#2E2E2E]'
                : 'bg-white border-gray-200'
            }`}>
              <button
                type="button"
                onClick={() => setCollapsed((p) => ({ ...p, [key]: !p[key] }))}
                className={`w-full flex items-center gap-4 px-5 py-4 transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#1B2A4A] via-[#162240] to-[#1B2A4A] text-[#F2F2F2] hover:from-[#1F3058] hover:via-[#1A2848] hover:to-[#1F3058]'
                    : 'bg-gradient-to-r from-[#1E3A5F] via-[#2A4A7F] to-[#1E3A5F] text-white hover:from-[#234470] hover:via-[#305490] hover:to-[#234470]'
                }`}
              >
                <ChevronDown size={18} className={`transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''} ${darkMode ? 'text-[#D7B797]' : ''}`} />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold text-lg font-['Montserrat']">{block.subCategory}</div>
                  <div className={`text-sm mt-0.5 ${darkMode ? 'text-[#7A8BA8]' : 'text-blue-200'}`}>
                    {block.gender} • {block.productType} • <span className="font-['JetBrains_Mono']">{block.items.length}</span> SKUs
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#7A8BA8]' : 'text-blue-200'}`}>% Buy propose</div>
                    <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#D7B797]">{block.pctBuyPropose}%</div>
                  </div>
                  <div className={`w-px h-8 ${darkMode ? 'bg-[#2E3D5A]' : 'bg-blue-400/30'}`} />
                  <div className="text-right">
                    <div className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#7A8BA8]' : 'text-blue-200'}`}>OTB propose</div>
                    <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#D7B797]">{formatCurrency(block.otbPropose)}</div>
                  </div>
                  <div className={`w-px h-8 ${darkMode ? 'bg-[#2E3D5A]' : 'bg-blue-400/30'}`} />
                  <div className="text-right">
                    <div className={`text-xs uppercase tracking-wide ${darkMode ? 'text-[#7A8BA8]' : 'text-blue-200'}`}>Total SRP</div>
                    <div className="text-lg font-semibold font-['JetBrains_Mono'] text-[#D7B797]">{formatCurrency(totalSrp)}</div>
                  </div>
                </div>
              </button>

              {!isCollapsed && (
                <div className={`p-5 ${darkMode ? 'bg-[#0A0A0A]/50' : 'bg-gray-50/50'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
                    {block.items.map((item, idx) => (
                      <SKUCard
                        key={`${item.sku}_${idx}`}
                        item={{ ...item, productType: block.productType }}
                        block={block}
                        cardIdx={idx}
                        darkMode={darkMode}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
