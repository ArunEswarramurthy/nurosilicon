export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`}>
      {tabs.map(tab => {
        const key   = typeof tab === 'string' ? tab : tab.key ?? tab.label;
        const label = typeof tab === 'string' ? tab : tab.label;
        const count = typeof tab === 'object' ? tab.count : undefined;
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`tab ${isActive ? 'tab-active' : ''}`}
          >
            {label}
            {count !== undefined && (
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                padding: '2px 7px', borderRadius: 99,
                background: isActive ? 'var(--blue-soft)' : 'var(--surface-2)',
                color: isActive ? 'var(--blue)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--blue-mid)' : 'var(--border)'}`,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
