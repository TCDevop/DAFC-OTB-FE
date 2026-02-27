// UX-27: Warn user before leaving page with unsaved changes
import { useEffect } from 'react';

/**
 * Shows a browser confirmation dialog when the user tries to
 * navigate away (close tab, refresh, back button) while there
 * are unsaved changes.
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a generic dialog
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
}

export default useUnsavedChanges;
