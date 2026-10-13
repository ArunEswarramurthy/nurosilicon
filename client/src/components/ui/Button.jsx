import Spinner from './Spinner';

const VARIANTS = {
  primary:   'btn btn-primary',
  purple:    'btn btn-purple',
  secondary: 'btn btn-secondary',
  ghost:     'btn btn-ghost',
  danger:    'btn btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
