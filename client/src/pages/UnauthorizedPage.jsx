import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboard = user?.role === 'super_admin' ? '/admin' : user ? '/student' : '/login';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      padding: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, maxWidth: 380, width: '100%', textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--danger-soft)', border: '1.5px solid var(--danger-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Text */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Access denied
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
            You don't have permission to view this page.
            {user
              ? ' This section is restricted to a different role.'
              : ' Sign in to continue.'}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            onClick={() => navigate(dashboard)}
            className="btn btn-primary btn-md"
            style={{ flex: 1 }}
          >
            {user ? 'Go to dashboard' : 'Sign in'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-md"
            style={{ flex: 1 }}
          >
            Go back
          </button>
        </div>

        {/* Role hint */}
        {user && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Signed in as <strong style={{ color: 'var(--text-secondary)' }}>{user.email}</strong>
            {' '}({user.role?.replace('_', ' ')})
          </p>
        )}
      </div>
    </div>
  );
}
