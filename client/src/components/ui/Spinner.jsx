export default function Spinner({ size = 'md', color }) {
  const dim = size === 'sm' ? 14 : size === 'lg' ? 28 : 20;
  return (
    <span
      style={{
        display: 'inline-block',
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `2px solid ${color ?? 'var(--border)'}`,
        borderTopColor: color ?? 'var(--primary)',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
      aria-label="Loading"
    />
  );
}
