import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url || '';
    const data   = err.response?.data;

    // Force-logout on 401 from non-auth endpoints
    if (status === 401 && !url.includes('/auth/') && window.location.pathname !== '/login') {
      localStorage.removeItem('cf_token');
      window.dispatchEvent(new Event('auth:logout'));
    }

    // Limit exceeded - fire global event so LimitToast can show it
    if ((status === 400 || status === 429) && data?.limit !== undefined && data?.message) {
      window.dispatchEvent(new window.CustomEvent('limit:exceeded', {
        detail: { message: data.message, limit: data.limit, current: data.current ?? null },
      }));
    }

    return Promise.reject(err);
  }
);

export default api;
