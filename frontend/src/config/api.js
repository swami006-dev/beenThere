function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://been-there-psi.vercel.app/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Common fetch wrapper for Beenthere Backend API.
 * Automatically attaches Authorization header if token exists in localStorage.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('beenthere_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      if (res.status === 401) {
        // Only trigger unauthorized event if it's a genuine auth verification failure
        window.dispatchEvent(new CustomEvent('beenthere_unauthorized', { detail: { endpoint, status: res.status } }));
      }
      const errorMessage = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.code = data?.error?.code;
      throw err;
    }

    // Backend successResponse wraps payload in { success: true, data: ... }
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  get: (endpoint, options) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiFetch(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options) => apiFetch(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};
