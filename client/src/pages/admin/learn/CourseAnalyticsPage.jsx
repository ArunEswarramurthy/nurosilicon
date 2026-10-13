import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, BookOpen, BarChart2 } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';

export default function CourseAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learnAdminApi.getCourseAnalytics(id)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading analytics…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Failed to load analytics</div>;

  const stats = [
    { label: 'Total Enrollments', value: data.totalEnrollments, icon: Users, color: '#00A6FF' },
    { label: 'Completions', value: data.completedEnrollments, icon: CheckCircle, color: '#10B981' },
    { label: 'Completion Rate', value: `${data.completionRate}%`, icon: BarChart2, color: '#A020F0' },
    { label: 'Published Lessons', value: data.totalLessons, icon: BookOpen, color: '#F59E0B' },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/learn/courses')} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>← Courses</button>
        <span style={{ color: '#e8ecf4' }}>|</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>{data.course.title} — Analytics</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0a0a1a', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1.5px solid #e8ecf4' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a1a' }}>Recent Enrollments</span>
        </div>
        {data.recentEnrollments.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No enrollments yet</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Student</th><th>Email</th><th>Progress</th><th>Enrolled</th></tr>
            </thead>
            <tbody>
              {data.recentEnrollments.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{e.student?.name || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{e.student?.email || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#e8ecf4', overflow: 'hidden', maxWidth: 80 }}>
                        <div style={{ width: `${e.progress || 0}%`, height: '100%', background: '#00A6FF', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{Math.round(e.progress || 0)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
