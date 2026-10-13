export default function Skeleton({ width, height = 16, className = '', style = {} }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        display: 'block',
        width: width ?? '100%',
        height,
        borderRadius: 6,
        ...style,
      }}
    />
  );
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <tr style={{ height: 44, borderBottom: '1px solid var(--border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '0 16px' }}>
          <Skeleton height={14} width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={28} width="60%" />
      <Skeleton height={12} width="30%" />
    </div>
  );
}
