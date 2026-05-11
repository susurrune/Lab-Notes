const DEFAULT_API_BASE = 'http://127.0.0.1:8000';
const DEFAULT_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const getApiBase = () => import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;

const buildUrl = (path) => {
  if (typeof path !== 'string') throw new Error('apiClient: path must be a string');
  const base = getApiBase().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers, signal } = options;
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal || AbortSignal.timeout(DEFAULT_TIMEOUT)
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error?.message || payload?.message || 'Request failed';
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
