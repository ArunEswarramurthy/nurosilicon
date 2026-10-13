import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, helper, error, type = 'text', className = '', ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          style={isPassword ? { paddingRight: 42 } : {}}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {helper && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{helper}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>{error}</span>
      )}
    </div>
  );
}
