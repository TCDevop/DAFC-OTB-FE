const getRuntimeEnv = () => {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__ as { AZURE_CLIENT_ID: string; AZURE_TENANT_ID: string };
  }
  return {
    AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    AZURE_TENANT_ID: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || '',
  };
};

export const getMicrosoftAuthUrl = (redirectUri: string): string => {
  const env = getRuntimeEnv();
  const params = new URLSearchParams({
    client_id: env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'User.Read openid profile',
    response_mode: 'query',
  });
  return `https://login.microsoftonline.com/${env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/authorize?${params}`;
};
