import { useAppContext } from '@/contexts/AppContext';

/**
 * Convenience hook for the global loading overlay.
 *
 * Usage:
 *   const { showLoading, hideLoading, withLoading } = useLoading();
 *
 *   // Manual:
 *   showLoading('Saving...');
 *   await doSomething();
 *   hideLoading();
 *
 *   // Wrapper:
 *   await withLoading(() => doSomething(), 'Saving...');
 */
export function useLoading() {
  const { loading, showLoading, hideLoading, withLoading } = useAppContext();
  return {
    isLoading: loading.visible,
    loadingMessage: loading.message,
    showLoading,
    hideLoading,
    withLoading,
  };
}
