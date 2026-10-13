import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, wide = false, size }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxW = size === 'lg' ? 740 : size === 'sm' ? 420 : wide ? 700 : 540;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(5,5,11,0.50)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: '#fff',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-modal)',
        width: '100%', maxWidth: maxW,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.15s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1.5px solid var(--border)',
          flexShrink: 0,
        }}>
          {/* Accent line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 18, borderRadius: 99, background: 'linear-gradient(180deg, #00A6FF, #A020F0)' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--t)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8, padding: '14px 20px',
            borderTop: '1.5px solid var(--border)', flexShrink: 0,
            background: 'var(--surface)',
            borderRadius: '0 0 16px 16px',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
