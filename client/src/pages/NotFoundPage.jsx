import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const dashboard = user?.role === 'super_admin' ? '/admin' : user ? '/student' : '/login';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)', padding: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, maxWidth: 400, width: '100%', textAlign: 'center',
      }}>
        {/* 404 number */}
        <div style={{
          fontSize: 80, fontWeight: 900, lineHeight: 1,
          letterSpacing: '-0.05em',
          background: 'linear-gradient(135deg, #00A6FF, #A020F0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          404
        </div>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Page not found
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
            The page at <code style={{ fontSize: 13, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-primary)' }}>{location.pathname}</code> does not exist.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button onClick={() => navigate(dashboard)} className="btn btn-primary btn-md" style={{ flex: 1 }}>
            {user ? 'Go to dashboard' : 'Go to home'}
          </button>
          <button onClick={() => navigate(-1)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
