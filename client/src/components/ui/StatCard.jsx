export default function StatCard({ label, value, delta, icon: Icon, iconColor, iconBg, loading }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {Icon && (
          <span style={{
            width: 34, height: 34,
            borderRadius: 9,
            background: iconBg || 'var(--blue-soft)',
            border: '1.5px solid var(--blue-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={15} style={{ color: iconColor ?? 'var(--blue)' }} strokeWidth={1.6} />
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 30, width: '50%', borderRadius: 6 }} />
      ) : (
        <span className="stat-value">{value ?? '-'}</span>
      )}
      {delta && (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>{delta}</span>
      )}
    </div>
  );
}
