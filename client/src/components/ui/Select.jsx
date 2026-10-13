export default function Select({ label, helper, error, className = '', children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <select
        className={`select ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {helper && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{helper}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}
