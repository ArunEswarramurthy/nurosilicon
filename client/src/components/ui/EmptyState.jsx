import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--blue-soft)',
          border: '1.5px solid var(--blue-mid)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color="var(--blue)" strokeWidth={1.5} />
        </div>
      )}
      {title && (
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </p>
      )}
      {description && (
        <p style={{ margin: 0 }}>{description}</p>
      )}
      {action && actionLabel && (
        <Button variant="secondary" size="sm" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
