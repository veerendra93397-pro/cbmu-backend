const BACKEND_URL_KEY = 'cbmu_backend_url';
export const CBMU_BACKEND_RENDER_URL = 'https://cbmu-backend.onrender.com';
export const CBMU_BACKEND_VERCEL_URL = 'https://cbmu-backend-be63p5720-veerendra8.vercel.app';

/**
 * Returns the currently active Backend API base URL.
 * Defaults to '' (integrated same-origin Express server on port 3000),
 * which provides instant, zero-latency responses for AI chat, study tutor, and campus data.
 * Users can also configure a custom Vercel or Render backend in Settings.
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

  // Primary Default: Integrated same-origin Express server (fast & 100% reliable)
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
 * Resilient fetch helper:
 * Tries the configured backend URL first, and automatically falls back
 * to the integrated same-origin backend if the remote backend fails (CORS, 302 SSO, or network error).
 */
export async function safeFetchApi(endpoint: string, init?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();

  if (base) {
    try {
      const url = `${base}${cleanEndpoint}`;
      const res = await fetch(url, init);
      if (res.ok) {
        return res;
      }
      // If remote returned an error or redirect, fallback to integrated backend
      console.warn(`Remote API at ${url} returned status ${res.status}, falling back to integrated backend.`);
    } catch (err) {
      console.warn(`Remote API fetch failed (${err}), falling back to integrated backend.`);
    }
  }

  // Guaranteed fallback to integrated same-origin backend
  return await fetch(cleanEndpoint, init);
}

/**
 * Saves a custom backend URL in localStorage
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
