'use client';

import { useEffect } from 'react';

// MSAL popup flow: after user logs in, Microsoft redirects the popup window here.
// We must initialize MSAL so it can detect the auth code in the URL and close the popup.
export default function MicrosoftCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { getMsalInstance } = await import('@/services/msalConfig');
        const msalInstance = getMsalInstance();
        await msalInstance.initialize();
        // MSAL detects the auth code in the URL hash and resolves the loginPopup promise
        // in the parent window, then closes this popup automatically.
        await msalInstance.handleRedirectPromise();
      } catch {
        // Popup will close on its own if MSAL processing fails
      }
    };
    handleCallback();
  }, []);

  return null;
}
