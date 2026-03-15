import { PublicClientApplication, Configuration } from '@azure/msal-browser';

const getRuntimeEnv = () => {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__ as { AZURE_CLIENT_ID: string; AZURE_TENANT_ID: string };
  }
  // Fallback for local dev (build-time vars still work)
  return {
    AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    AZURE_TENANT_ID: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || '',
  };
};

const getMsalConfig = (): Configuration => {
  const env = getRuntimeEnv();
  return {
    auth: {
      clientId: env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID || 'common'}`,
      redirectUri: `${window.location.origin}/auth/microsoft/callback`,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  };
};

// Lazy-initialize to avoid "crypto_nonexistent" error during SSR
let _msalInstance: PublicClientApplication | null = null;
let _msalInitialized = false;

export const getMsalInstance = (): PublicClientApplication => {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(getMsalConfig());
  }
  return _msalInstance;
};

// Call initialize() only once per page load — safe to call multiple times
export const initializeMsal = async (): Promise<PublicClientApplication> => {
  const instance = getMsalInstance();
  if (!_msalInitialized) {
    await instance.initialize();
    _msalInitialized = true;
  }
  return instance;
};

export const loginRequest = {
  scopes: ['User.Read'],
};
