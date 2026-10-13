import { AlertTriangle, RefreshCw } from 'lucide-react';

export function getStudentRequestError(error, fallback = 'Unable to load this content. Please try again.') {
  if (error?.response?.data?.code === 'LAB_ACCESS_REQUIRED') {
    return 'Lab access is not enabled for your account. Please contact your instructor or administrator.';
  }
  if (error?.response?.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return error?.response?.data?.message || fallback;
}

export default function StudentRequestError({ message, onRetry, retrying = false }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '12px 16px',
        border: '1px solid var(--danger-border)',
        borderRadius: 10,
        background: 'var(--danger-soft)',
        color: 'var(--danger)',
        fontSize: 13,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} aria-hidden="true" />
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 11px',
            border: '1px solid var(--danger-border)',
            borderRadius: 7,
            background: '#fff',
            color: 'var(--danger)',
            fontWeight: 600,
            cursor: retrying ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={13} aria-hidden="true" />
          {retrying ? 'Retrying...' : 'Try again'}
        </button>
      )}
    </div>
  );
}
