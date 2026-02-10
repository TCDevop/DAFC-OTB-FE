let cachedConfig = null;

export async function getRuntimeConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/config');
    cachedConfig = await res.json();
  } catch {
    cachedConfig = {
      apiUrl: 'http://localhost:4000/api/v1',
    };
  }

  return cachedConfig;
}

export function getApiUrl() {
  return cachedConfig?.apiUrl || 'http://localhost:4000/api/v1';
}
