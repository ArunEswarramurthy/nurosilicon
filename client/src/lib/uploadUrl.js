/**
 * Resolves a server-relative upload path to a full URL.
 *
 * In development: Vite proxies /uploads → http://localhost:5000
 * so we just return the path as-is (same-origin, no CORS/CSP issues).
 *
 * In production: prepend the API base URL (minus /api suffix).
 *
 * Examples:
 *   resolveUploadUrl('/uploads/profile-photos/abc.png')
 *   → '/uploads/profile-photos/abc.png'  (dev, via Vite proxy)
 *   → 'https://api.example.com/uploads/profile-photos/abc.png'  (prod)
 *
 *   resolveUploadUrl('https://cdn.example.com/photo.png')
 *   → 'https://cdn.example.com/photo.png'  (returned as-is)
 */

const isDev = import.meta.env.DEV;
const BASE  = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export function resolveUploadUrl(url) {
  if (!url) return null;
  // Already absolute - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // In dev, Vite proxy handles /uploads → backend, so use relative path
  if (isDev) return url.startsWith('/') ? url : `/${url}`;
  // In prod, prepend the backend base URL
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}
