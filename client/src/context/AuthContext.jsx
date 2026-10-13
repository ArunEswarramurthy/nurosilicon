import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'cf_token';

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function isTokenExpired(token) {
  const p = decodeToken(token);
  if (!p?.exp) return true;
  return Date.now() / 1000 > p.exp - 30;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { id, name, email, role, org_id, photo_url, status, can_use_lab } = user;
  const validRoles = ['super_admin', 'student'];
  if (!validRoles.includes(role)) return null;
  return { id, name, email, role, org_id, photo_url, status, can_use_lab: can_use_lab === true };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const didFetch              = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isTokenExpired(token)) {
      api.get('/auth/me')
        .then((r) => {
          const u = sanitizeUser(r.data.user);
          if (u) {
            setUser(u);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
          }
        })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      if (token) localStorage.removeItem(TOKEN_KEY);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    const u = sanitizeUser(data.user);
    setUser(u);
    return u;
  };

  const registerStudent = async (formData) => {
    const { data } = await api.post('/auth/student-register', formData);
    // Returns { pending_verification: true, email } — no auto-login
    return data;
  };

  const verifyEmail = async (email, otp) => {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    localStorage.setItem(TOKEN_KEY, data.token);
    const u = sanitizeUser(data.user);
    setUser(u);
    return u;
  };

  const resendVerification = async (email) => {
    await api.post('/auth/resend-verification', { email });
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem(TOKEN_KEY, data.token);
    const u = sanitizeUser(data.user);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* best-effort */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const updateUser = (updates) => setUser((current) => current ? { ...current, ...updates } : current);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, registerStudent, verifyEmail, resendVerification, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
