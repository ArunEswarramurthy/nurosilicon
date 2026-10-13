import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, ShieldAlert, Cpu, Trophy,
  CalendarDays, FolderOpen, ChevronRight, Zap, RefreshCw,
  BookOpen, BarChart2, Activity,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';

/* ── Circuit SVG decoration ── */
function CircuitDeco() {
  return (
    <svg width="340" height="180" viewBox="0 0 340 180" fill="none"
      style={{ position: 'absolute', right: 0, top: 0, opacity: 0.18, pointerEvents: 'none' }}>
      <rect x="260" y="20" width="60" height="60" rx="6" stroke="#00E5FF" strokeWidth="1.2" />
      <rect x="275" y="35" width="30" height="30" rx="3" stroke="#A855F7" strokeWidth="1" />
      <circle cx="290" cy="50" r="6" stroke="#00A6FF" strokeWidth="1.2" />
      <line x1="260" y1="50" x2="200" y2="50" stroke="#00E5FF" strokeWidth="1" />
      <line x1="200" y1="50" x2="200" y2="90" stroke="#00E5FF" strokeWidth="1" />
      <line x1="200" y1="90" x2="140" y2="90" stroke="#A855F7" strokeWidth="1" />
      <circle cx="200" cy="50" r="3" fill="#00E5FF" />
      <circle cx="200" cy="90" r="3" fill="#A855F7" />
      <rect x="100" y="70" width="40" height="40" rx="4" stroke="#00A6FF" strokeWidth="1" />
      <line x1="140" y1="90" x2="100" y2="90" stroke="#A855F7" strokeWidth="1" />
      <line x1="290" y1="80" x2="290" y2="130" stroke="#00A6FF" strokeWidth="1" />
      <rect x="270" y="130" width="40" height="30" rx="4" stroke="#00E5FF" strokeWidth="1" />
      <circle cx="290" cy="145" r="4" stroke="#A855F7" strokeWidth="1.2" />
      <line x1="60" y1="90" x2="60" y2="140" stroke="#00E5FF" strokeWidth="1" />
      <line x1="60" y1="140" x2="120" y2="140" stroke="#00A6FF" strokeWidth="1" />
      <circle cx="60" cy="90" r="3" fill="#00E5FF" />
      <rect x="120" y="125" width="30" height="30" rx="3" stroke="#A855F7" strokeWidth="1" />
      <line x1="320" y1="20" x2="320" y2="0" stroke="#00E5FF" strokeWidth="1" />
      <line x1="260" y1="20" x2="240" y2="0" stroke="#A855F7" strokeWidth="1" />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { label: 'Users',           icon: Users,        to: '/admin/users',           color: '#A855F7', desc: 'Manage student accounts' },
  { label: 'Learn',           icon: BookOpen,     to: '/admin/learn',           color: '#00A6FF', desc: 'Courses & curriculum' },
  { label: 'Lab',             icon: Cpu,          to: '/admin/lab',             color: '#00E5FF', desc: 'Lab access & sessions' },
  { label: 'Daily Challenge', icon: CalendarDays, to: '/admin/daily-challenge', color: '#A855F7', desc: 'Daily problem sets' },
  { label: 'Contests',        icon: Trophy,       to: '/admin/contests',        color: '#00A6FF', desc: 'Competition management' },
  { label: 'Objective Banks', icon: FolderOpen,   to: '/admin/eng-lab-folders', color: '#00E5FF', desc: 'Engineering lab folders' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load platform stats. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const METRICS = [
    { label: 'Total Students', value: stats?.totalUsers,     icon: Users,       color: '#A855F7', glow: 'rgba(168,85,247,0.3)' },
    { label: 'Active',         value: stats?.activeUsers,    icon: UserCheck,   color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
    { label: 'Inactive',       value: stats?.inactiveUsers,  icon: UserX,       color: '#64748b', glow: 'rgba(100,116,139,0.2)' },
    { label: 'Suspended',      value: stats?.suspendedUsers, icon: ShieldAlert, color: '#EF4444', glow: 'rgba(239,68,68,0.3)' },
    { label: 'Lab Enabled',    value: stats?.labEnabledUsers,icon: Cpu,         color: '#00A6FF', glow: 'rgba(0,166,255,0.3)' },
    { label: 'Flagged',        value: stats?.flaggedUsers,   icon: Activity,    color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Dark Hero Banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0D0D1A 0%, #12082A 50%, #0A1628 100%)',
        borderRadius: 20, padding: 'clamp(24px,3vw,36px) clamp(20px,3vw,36px)',
        border: '1px solid rgba(168,85,247,0.2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: -40, right: 80, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 20, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <CircuitDeco />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #A855F7, #00A6FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}>
                <BarChart2 size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A855F7' }}>
                Super Admin
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Platform{' '}
              <span style={{ background: 'linear-gradient(90deg, #A855F7, #00A6FF, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Overview
              </span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              NuroSilicon Engineering Education — Admin Control Panel
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={loadStats} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: '#A855F7', fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s' }}
            >
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', border: '1px solid var(--danger-border)', borderRadius: 12, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>
          <span>{error}</span>
          <button onClick={loadStats} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--danger-border)', borderRadius: 8, background: '#fff', color: 'var(--danger)', padding: '6px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ── Metrics Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {METRICS.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} style={{
            background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16,
            padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: 'var(--shadow-xs)', transition: 'all 0.2s',
            cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${glow}, var(--shadow-sm)`; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} strokeWidth={1.8} />
              </div>
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.05em' }}>
              {loading
                ? <span className="skeleton" style={{ display: 'inline-block', width: 52, height: 32, borderRadius: 6 }} />
                : (value ?? '-')}
            </span>
          </div>
        ))}
      </div>

      {stats?.generatedAt && !error && (
        <p style={{ margin: '-16px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>
          Counts as of {new Date(stats.generatedAt).toLocaleString()}
        </p>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,260px),1fr))', gap: 10 }}>
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, color, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                border: '1.5px solid var(--border)', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 20px ${color}22`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
          Reporting shows aggregate student-account status counts only. Student identifiers and execution-service health are not exposed here.
        </p>
      </div>
    </div>
  );
}
