'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Upload, Trash2, X, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { getDemoImageSvg } from '../../utils';

interface ProductImageProps {
  subCategory: string;
  sku: string;
  size?: 40 | 48 | 56 | 64 | 140;
  rounded?: string;
}

const sizeMap: Record<number, string> = {
  40: 'w-10 h-10',
  48: 'w-12 h-12',
  56: 'w-14 h-14',
  64: 'w-16 h-16',
  140: 'w-[140px] h-[140px]',
};

/* ── Premium Image Editor Popup ─────────────────────────── */
function ImageEditorPopup({
  currentSrc,
  defaultSrc,
  hasCustom,
  sku,
  subCategory,
  onUpload,
  onDelete,
  onClose,
}: {
  currentSrc: string;
  defaultSrc: string;
  hasCustom: boolean;
  sku: string;
  subCategory: string;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(currentSrc);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
    setPendingFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleConfirm = useCallback(() => {
    if (pendingFile) {
      onUpload(pendingFile);
    }
    onClose();
  }, [pendingFile, onUpload, onClose]);

  const handleDelete = useCallback(() => {
    onDelete();
    setPreviewSrc(defaultSrc);
    setPendingFile(null);
  }, [onDelete, defaultSrc]);

  const bgCard = 'bg-white';
  const borderCard = 'border-[rgba(215,183,151,0.3)]';
  const textPrimary = 'text-gray-800';
  const textSecondary = 'text-gray-500';
  const textAccent = 'text-[#6B4D30]';
  const bgAccent = 'bg-[rgba(160,120,75,0.08)]';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <div
        className={`relative ${bgCard} border ${borderCard} rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden`}
        style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(215,183,151,0.1)' }}
      >
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.04)]`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${bgAccent}`}>
              <Camera size={18} className={textAccent} />
            </div>
            <div>
              <h3 className={`text-sm font-bold font-['Montserrat'] ${textPrimary}`}>
                Product Image
              </h3>
              <p className={`text-xs ${textSecondary} font-['JetBrains_Mono']`}>{sku || 'N/A'} · {subCategory || '-'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors hover:bg-gray-100`}
          >
            <X size={18} className={textSecondary} />
          </button>
        </div>

        {/* Preview Area */}
        <div className="px-5 pt-5 pb-3">
          <div
            className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden ${
              dragging
                ? 'border-[#6B4D30] bg-[rgba(160,120,75,0.06)]'
                : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {/* Image */}
            <div className="flex items-center justify-center py-6">
              <div className={`w-40 h-40 rounded-xl border overflow-hidden border-gray-200 bg-white shadow-lg`}>
                <img src={previewSrc} alt="" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Drag overlay */}
            {dragging && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
                <Upload size={32} className="text-white mb-2" />
                <p className="text-white text-sm font-semibold">Drop image here</p>
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-1.5 h-1.5 rounded-full ${hasCustom || pendingFile ? 'bg-emerald-500' : 'bg-[#A08050]'}`} />
            <span className={`text-xs ${textSecondary}`}>
              {pendingFile ? 'New image selected' : hasCustom ? 'Custom image' : 'Default illustration'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={`px-5 pb-5 pt-2 flex flex-col gap-2`}>
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all border-[rgba(160,120,75,0.3)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.08)] active:bg-[rgba(160,120,75,0.12)]`}
          >
            <Upload size={16} />
            Upload Image
          </button>

          {/* Delete + Confirm row */}
          <div className="flex gap-2">
            {(hasCustom || pendingFile) && (
              <button
                type="button"
                onClick={handleDelete}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all border-red-200 text-red-500 hover:bg-red-50`}
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
            {pendingFile && (
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-white bg-[#6B4D30] hover:bg-[#5A3E25]`}
              >
                Confirm
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>,
    document.body
  );
}

/* ── ProductImage Thumbnail ─────────────────────────────── */
function ProductImage({
  subCategory,
  sku,
  size = 48,
  rounded = 'rounded-lg',
}: ProductImageProps) {
  const [customSrc, setCustomSrc] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const defaultSrc = getDemoImageSvg(subCategory || '', sku || '');
  const src = customSrc || defaultSrc;
  const sz = sizeMap[size] || sizeMap[48];
  const borderCls = 'border-[rgba(215,183,151,0.25)]';
  const bgCls = 'bg-gray-50';

  const handleUpload = useCallback((file: File) => {
    if (customSrc) URL.revokeObjectURL(customSrc);
    const url = URL.createObjectURL(file);
    setCustomSrc(url);
  }, [customSrc]);

  const handleDelete = useCallback(() => {
    if (customSrc) URL.revokeObjectURL(customSrc);
    setCustomSrc(null);
  }, [customSrc]);

  return (
    <>
      <div
        className={`group relative ${sz} ${rounded} border overflow-hidden cursor-pointer transition-all hover:shadow-md ${borderCls} ${bgCls}`}
        onClick={() => setPopupOpen(true)}
      >
        <img src={src} alt="" className="w-full h-full object-contain" />
        {/* Hover hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn size={size >= 56 ? 18 : 14} className="text-white drop-shadow" />
        </div>
      </div>

      {popupOpen && (
        <ImageEditorPopup
          currentSrc={src}
          defaultSrc={defaultSrc}
          hasCustom={!!customSrc}
          sku={sku}
          subCategory={subCategory}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}

export default React.memo(ProductImage);
