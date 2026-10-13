import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let _id = 0;

const TOAST_STYLES = {
  success: { icon: CheckCircle, color: 'var(--success)', bg: 'var(--success-soft)', border: 'var(--success-border)' },
  error:   { icon: XCircle,     color: 'var(--danger)',  bg: 'var(--danger-soft)',  border: 'var(--danger-border)'  },
  warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-soft)', border: 'var(--warning-border)' },
  info:    { icon: Info,         color: 'var(--blue)',    bg: 'var(--blue-soft)',    border: 'var(--blue-mid)'       },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = id => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const style = TOAST_STYLES[t.type] ?? TOAST_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1.5px solid ${style.border}`,
                background: '#fff',
                boxShadow: 'var(--shadow-lg)',
                fontSize: 14, color: 'var(--text-primary)',
                maxWidth: 380, pointerEvents: 'all',
                animation: 'slideUp 0.18s ease-out',
                borderLeft: `3px solid ${style.color}`,
              }}
            >
              <Icon size={16} style={{ color: style.color, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.01em' }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
