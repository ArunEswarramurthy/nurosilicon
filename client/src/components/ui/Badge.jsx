const VARIANTS = {
  default:  'badge badge-primary',
  primary:  'badge badge-primary',
  blue:     'badge badge-blue',
  purple:   'badge badge-purple',
  cyan:     'badge badge-cyan',
  success:  'badge badge-success',
  warning:  'badge badge-warning',
  danger:   'badge badge-danger',
  error:    'badge badge-danger',
  info:     'badge badge-info',
  neutral:  'badge badge-neutral',
  easy:     'badge badge-success',
  medium:   'badge badge-warning',
  hard:     'badge badge-danger',
};

export default function Badge({ children, variant = 'default', dot, className = '' }) {
  return (
    <span className={`${VARIANTS[variant] ?? VARIANTS.default} ${className}`}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
          display: 'inline-block',
        }} />
      )}
      {children}
    </span>
  );
}
