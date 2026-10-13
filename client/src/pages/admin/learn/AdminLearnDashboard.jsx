import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, BarChart2, Layout, TrendingUp, Users, CheckCircle, FileText } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';

export default function AdminLearnDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learnAdminApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => setStats({ total: 0, published: 0, draft: 0, archived: 0, enrollments: 0, recent: [] }))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Courses', value: stats?.total ?? 0, icon: BookOpen, color: '#00A6FF' },
    { label: 'Published', value: stats?.published ?? 0, icon: CheckCircle, color: '#10B981' },
    { label: 'Drafts', value: stats?.draft ?? 0, icon: FileText, color: '#F59E0B' },
    { label: 'Enrollments', value: stats?.enrollments ?? 0, icon: Users, color: '#A020F0' },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Learn Management</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Create and manage courses, templates, and student learning</p>
        </div>
        <button
          onClick={() => navigate('/admin/learn/courses/new')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 40, padding: '0 18px', borderRadius: 10,
            background: 'linear-gradient(135deg,#00A6FF,#A855F7)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 3px 12px rgba(0,166,255,0.28)',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(0,166,255,0.36)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,166,255,0.28)'; }}
        >
          <Plus size={15} /> New Course
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = '#c8d0dc'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, border: `1.5px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {loading ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div
          style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, cursor: 'pointer', padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'all 0.18s' }}
          onClick={() => navigate('/admin/learn/courses')}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,166,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e6f6ff', border: '1.5px solid #b3e4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} style={{ color: '#00A6FF' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Manage Courses</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Create, edit, publish and archive courses</div>
            </div>
          </div>
        </div>
        <div
          style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, cursor: 'pointer', padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'all 0.18s' }}
          onClick={() => navigate('/admin/learn/templates')}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#A855F7'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: '#f3e6fd', border: '1.5px solid #d9a8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layout size={20} style={{ color: '#A855F7' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Template Designer</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Design reusable visual course templates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent courses */}
      {stats?.recent?.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1.5px solid #e8ecf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a1a' }}>Recent Courses</span>
            <button onClick={() => navigate('/admin/learn/courses')} style={{ fontSize: 12, color: '#00A6FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all →</button>
          </div>
          {stats.recent.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/admin/learn/courses/${c.id}/edit`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f4f9', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: '#0a0a1a' }}>{c.title}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: c.status === 'published' ? '#ecfdf5' : c.status === 'draft' ? '#fffbeb' : '#f1f5f9',
                color: c.status === 'published' ? '#10B981' : c.status === 'draft' ? '#F59E0B' : '#64748b',
              }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
