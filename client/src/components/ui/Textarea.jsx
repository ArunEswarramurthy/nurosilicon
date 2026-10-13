export default function Textarea({ label, helper, error, className = '', rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`textarea ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {helper && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{helper}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}
