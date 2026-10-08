const BACKEND_URL_KEY = 'cbmu_backend_url';
export const CBMU_BACKEND_RENDER_URL = 'https://cbmu-backend.onrender.com';

/**
 * Returns the currently active Backend API base URL.
 * Defaults to the live deployed Render backend: https://cbmu-backend.onrender.com
 * Also allows user override via Settings or environment variables.
 */
export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(BACKEND_URL_KEY);
    if (saved !== null) {
      const trimmed = saved.trim().replace(/\/+$/, '');
      // If empty or set to integrated/local, return empty string for same-origin
      if (!trimmed || trimmed === 'local' || trimmed === 'integrated') {
        return '';
      }
      return trimmed;
    }
  } catch {
    // localStorage not accessible
  }

  const metaEnv = (import.meta as unknown as { env?: { VITE_BACKEND_URL?: string; VITE_API_URL?: string } })?.env;
  const envUrl = (metaEnv?.VITE_BACKEND_URL || metaEnv?.VITE_API_URL || '').trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // Primary Default: Integrated same-origin Express server (instant & reliable, full admin & campus data)
  return '';
}

/**
 * Resets the backend connection back to the integrated same-origin server.
 */
export function resetToIntegratedBackend(): void {
  try {
    localStorage.removeItem(BACKEND_URL_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbmu_backend_url_changed', { detail: { url: '' } }));
    }
  } catch {
    // ignore
  }
}

/**
 * Constructs a fully qualified API URL.
 * If backend base URL is set (e.g. Render backend https://cbmu-backend.onrender.com),
 * it returns https://cbmu-backend.onrender.com/api/...
 * Otherwise returns /api/...
 */
export function getApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) {
    return cleanEndpoint;
  }
  return `${base}${cleanEndpoint}`;
}

/**
 * Saves a custom Render backend or proxy URL in localStorage
 */
export function setBackendUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean) {
      localStorage.removeItem(BACKEND_URL_KEY);
    } else {
      localStorage.setItem(BACKEND_URL_KEY, clean);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbmu_backend_url_changed', { detail: { url: clean } }));
    }
  } catch {
    // localStorage error
  }
}
