const BACKEND_URL_KEY = 'cbmu_backend_url';

/**
 * Returns the currently active Backend API base URL.
 * Checks localStorage first (configured via Settings screen),
 * then Vite environment variables (VITE_BACKEND_URL / VITE_API_URL),
 * and defaults to empty string for relative same-origin calls.
 */
export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(BACKEND_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // localStorage not accessible
  }

  const metaEnv = (import.meta as unknown as { env?: { VITE_BACKEND_URL?: string; VITE_API_URL?: string } })?.env;
  const envUrl = (metaEnv?.VITE_BACKEND_URL || metaEnv?.VITE_API_URL || '').trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  return '';
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
