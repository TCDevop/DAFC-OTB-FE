import { useEffect, useCallback, useRef } from 'react';

/**
 * Zero-lag filter bar hide/show.
 * Directly toggles DOM `hidden` attribute — no React re-render.
 */
export function useSmartScrollState() {
  const barRef = useRef<HTMLDivElement>(null);
  const isCollapsed = useRef(false);

  useEffect(() => {
    const scrollEl = document.getElementById('main-scroll');
    if (!scrollEl) return;

    let locked = false;

    const handleScroll = () => {
      if (locked) return;

      const el = barRef.current;
      if (!el) return;

      const scrollTop = scrollEl.scrollTop;

      if (scrollTop < 10 && isCollapsed.current) {
        isCollapsed.current = false;
        el.hidden = false;
        locked = true;
        setTimeout(() => { locked = false; }, 80);
      } else if (scrollTop > 40 && !isCollapsed.current) {
        isCollapsed.current = true;
        el.hidden = true;
        locked = true;
        setTimeout(() => { locked = false; }, 80);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBarClick = useCallback(() => {
    const el = barRef.current;
    if (!el) return;
    isCollapsed.current = !isCollapsed.current;
    el.hidden = isCollapsed.current;
  }, []);

  return { barRef, handleBarClick };
}
