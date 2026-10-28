/**
 * Real HTTP client – same backend as stravex_mlm_web/src/api.js
 */
import { clearSession, getToken } from './session';

export const API_BASE = 'https://backend.finitygrowth.com';

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.errors = body?.errors || null;
  }
}

/** Same as web imageUrl() – absolute URL for profile / KYC / attachment paths. */
export function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Warm TLS/DNS so the first auth call (forgot/login) is not cold-start slow.
 * Fire-and-forget; safe to call on auth screen mount.
 */
export function warmApi() {
  fetch(`${API_BASE}/api/v1/auth/password/forgot`, { method: 'OPTIONS' }).catch(() => {});
}

/**
 * Same contract as web `api(path, options)`.
 * Pass `form` (FormData) for multipart — do not set Content-Type (boundary is auto).
 * Aborts after `timeoutMs` so loaders never spin forever.
 */
export async function request(
  path,
  { method = 'GET', body, form, auth = true, token = '', timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const headers = {
    Accept: 'application/json',
  };
  const authToken = auth ? token || getToken() : '';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(0, { message: 'Request timed out. Check your connection and try again.' });
    }
    throw new ApiError(0, { message: 'Cannot reach the server.' });
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && authToken) {
    clearSession();
  }
  if (!response.ok || payload.success === false) {
    throw new ApiError(response.status, payload);
  }
  return payload;
}
