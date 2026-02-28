'use client';
import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import BottomSheet from './BottomSheet';

export default function MobileFilterSheet({
  isOpen,
  onClose,
  filters = [],
  values = {},
  onApply,
  onReset,
  title = 'Filters',
}: any) {
  const [localValues, setLocalValues] = useState<any>(values);

  useEffect(() => {
    if (isOpen) setLocalValues(values);
  }, [isOpen, values]);

  const handleChange = (key: any, value: any) => {
    setLocalValues((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply?.(localValues);
    onClose();
  };

  const handleReset = () => {
    const resetValues: Record<string, any> = {};
    filters.forEach((f: any) => { resetValues[f.key] = f.defaultValue ?? ''; });
    setLocalValues(resetValues);
    onReset?.();
  };

  const renderFilter = (filter: any) => {
    const value = localValues[filter.key] ?? '';

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className={`w-full h-12 px-3 rounded-lg border text-sm font-['Montserrat'] appearance-none bg-gray-50 border-gray-200 text-gray-900`}
          >
            <option value="">{filter.placeholder || `Select ${filter.label}`}</option>
            {(filter.options || []).map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'search':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            placeholder={filter.placeholder || `Search ${filter.label}`}
            className={`w-full h-12 px-3 rounded-lg border text-sm font-['Montserrat'] bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className={`w-full h-12 px-3 rounded-lg border text-sm font-['Montserrat'] bg-gray-50 border-gray-200 text-gray-900`}
          />
        );

      case 'toggle':
        return (
          <button
            onClick={() => handleChange(filter.key, !value)}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              value
                ? 'bg-dafc-gold'
                : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
              value ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} snapPoint="half">
      <div className="px-5 py-4 space-y-5">
        {filters.map((filter: any) => (
          <div key={filter.key}>
            <label className={`block text-xs font-semibold font-['Montserrat'] uppercase tracking-wider mb-2 text-gray-600`}>
              {filter.label}
            </label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className={`sticky bottom-0 px-5 py-4 border-t flex gap-3 bg-white border-gray-200`}>
        <button
          onClick={handleReset}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold font-['Montserrat'] transition-colors bg-gray-100 text-gray-600 active:bg-gray-200`}
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-3 rounded-xl text-sm font-semibold font-['Montserrat'] bg-dafc-gold text-[#0A0A0A] active:bg-dafc-gold-dark transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </BottomSheet>
  );
}
