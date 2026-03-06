'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToHeaderProps {
  threshold?: number;
}

export default function ScrollToHeader({ threshold = 200 }: ScrollToHeaderProps) {
  const [visible, setVisible] = useState(false);

  const getScrollContainer = useCallback(() => {
    return document.getElementById('main-scroll') || document.documentElement;
  }, []);

  useEffect(() => {
    const el = getScrollContainer();
    const handleScroll = () => setVisible(el.scrollTop > threshold);
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [threshold, getScrollContainer]);

  const scrollToTop = () => {
    const el = getScrollContainer();
    el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg border transition-all duration-200 hover:scale-110 active:scale-95 bg-white border-[#C4B5A5] text-[#6B4D30] hover:bg-[rgba(215,183,151,0.15)]"
      aria-label="Scroll to top"
    >
      <ArrowUp size={20} />
    </button>
  );
}
