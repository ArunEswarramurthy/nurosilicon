import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Copy, Archive, BarChart2, BookOpen, CheckCircle, Globe, X } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';

const STATUS_STYLE = {
  published: { bg: '#ecfdf5', color: '#059669', label: 'Published' },
  draft:     { bg: '#fffbeb', color: '#d97706', label: 'Draft' },
  archived:  { bg: '#f1f5f9', color: '#64748b', label: 'Archived' },
};
const DIFF_STYLE = {
  beginner:     { bg: '#ecfdf5', color: '#059669' },
  intermediate: { bg: '#fffbeb', color: '#d97706' },
  advanced:     { bg: '#fef2f2', color: '#dc2626' },
};

export default function AdminCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]               = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    learnAdminApi.listCourses({ search, status: statusFilter, page, limit: 15 })
      .then(r => { setCourses(r.data.courses); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter, page]);

  const handlePublish = async (id, currentStatus) => {
    setActionLoading(id);
    try {
      if (currentStatus === 'published') await learnAdminApi.unpublishCourse(id);
      else await learnAdminApi.publishCourse(id);
      load();
      showToast(currentStatus === 'published' ? 'Course unpublished' : 'Course published!');
    } catch (e) {
      showToast(e.response?.data?.message || 'Action failed', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDuplicate = async (id) => {
    setActionLoading(id + '_dup');
    try {
      const r = await learnAdminApi.duplicateCourse(id);
      navigate(`/admin/learn/courses/${r.data.course.id}/edit`);
    } catch (e) {
      showToast(e.response?.data?.message || 'Duplicate failed', 'error');
    } finally { setActionLoading(null); }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    setActionLoading(confirmArchive.id + '_arc');
    try {
      await learnAdminApi.archiveCourse(confirmArchive.id);
      setConfirmArchive(null);
      load();
      showToast('Course archived');
    } catch (e) {
      showToast(e.response?.data?.message || 'Archive failed', 'error');
    } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ maxWidth: 1100, fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 68, right: 20, zIndex: 999, padding: '11px 18px', borderRadius: 10, background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5', border: `1.5px solid ${toast.type === 'error' ? '#fecaca' : '#6ee7b7'}`, color: toast.type === 'error' ? '#dc2626' : '#059669', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={13} /></button>
        </div>
      )}

      {/* Archive confirm dialog */}
      {confirmArchive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(5,5,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Archive size={20} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a1a', margin: '0 0 8px' }}>Archive course?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              Students will lose access to <strong>"{confirmArchive.title}"</strong>. You can restore it by editing the course later.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmArchive(null)} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleArchive} disabled={actionLoading === confirmArchive.id + '_arc'} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {actionLoading === confirmArchive.id + '_arc' ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Courses</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{total} course{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/admin/learn/courses/new')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 10, background: 'linear-gradient(135deg,#00A6FF,#A855F7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 3px 12px rgba(0,166,255,0.28)', transition: 'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(0,166,255,0.36)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,166,255,0.28)'; }}
        >
          <Plus size={15} /> New Course
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, height: 36 }}
            placeholder="Search courses..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="select" style={{ width: 150, height: 36 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Difficulty</th>
              <th>Status</th>
              <th>Enrollments</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No courses found</td></tr>
            ) : courses.map(c => {
              const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              const df = DIFF_STYLE[c.difficulty] || DIFF_STYLE.beginner;
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {c.cover_image_url
                        ? <img src={c.cover_image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 6, background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BookOpen size={16} color="#00A6FF" /></div>
                      }
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a1a' }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.category || 'Uncategorized'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: df.bg, color: df.color }}>
                      {c.difficulty}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#374151' }}>{c.enrollment_count ?? 0}</td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Edit" onClick={() => navigate(`/admin/learn/courses/${c.id}/edit`)} style={iconBtn}><Edit2 size={13} /></button>
                      <button title="Analytics" onClick={() => navigate(`/admin/learn/courses/${c.id}/analytics`)} style={iconBtn}><BarChart2 size={13} /></button>
                      <button title="Duplicate" onClick={() => handleDuplicate(c.id)} disabled={actionLoading === c.id + '_dup'} style={iconBtn}><Copy size={13} /></button>
                      <button
                        title={c.status === 'published' ? 'Unpublish' : 'Publish'}
                        onClick={() => handlePublish(c.id, c.status)}
                        disabled={actionLoading === c.id || c.status === 'archived'}
                        style={{ ...iconBtn, color: c.status === 'published' ? '#059669' : '#94a3b8' }}
                      >
                        {c.status === 'published' ? <CheckCircle size={13} /> : <Globe size={13} />}
                      </button>
                      {c.status !== 'archived' && (
                        <button
                          title="Archive"
                          onClick={() => setConfirmArchive({ id: c.id, title: c.title })}
                          disabled={actionLoading === c.id + '_arc'}
                          style={{ ...iconBtn, color: '#dc2626' }}
                        >
                          <Archive size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ ...pageBtn, ...(p === page ? pageBtnActive : {}) }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn = { width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.12s' };
const pageBtn = { height: 32, minWidth: 32, padding: '0 8px', borderRadius: 7, border: '1.5px solid #e8ecf4', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' };
const pageBtnActive = { background: '#00A6FF', color: '#fff', borderColor: '#00A6FF' };
