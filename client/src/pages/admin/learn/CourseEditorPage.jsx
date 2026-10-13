import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Globe, BookOpen, CheckCircle, FileText, Eye } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';
import CourseInfoStep from './steps/CourseInfoStep';
import CurriculumStep from './steps/CurriculumStep';

const STEPS = [
  { key: 'info',       label: 'Course Info',  icon: FileText },
  { key: 'curriculum', label: 'Curriculum',   icon: BookOpen },
];

export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [courseId, setCourseId] = useState(id || null);
  const [course, setCourse]   = useState(null);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    if (isEdit) {
      learnAdminApi.getCourse(id)
        .then(r => setCourse(r.data.course))
        .catch(() => showToast('Failed to load course', 'error'));
    }
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleInfoSave = async (formData) => {
    setSaving(true);
    try {
      if (courseId) {
        const r = await learnAdminApi.updateCourse(courseId, formData);
        setCourse(r.data.course);
        showToast('Course info saved');
      } else {
        const r = await learnAdminApi.createCourse(formData);
        setCourseId(r.data.course.id);
        setCourse(r.data.course);
        showToast('Course created — now build your curriculum');
      }
      setStep(1);
    } catch (e) {
      showToast(e.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!courseId) return;
    setPublishing(true);
    try {
      await learnAdminApi.publishCourse(courseId);
      showToast('Course published and live!');
      setTimeout(() => navigate('/admin/learn/courses'), 1400);
    } catch (e) {
      showToast(e.response?.data?.message || 'Publish failed', 'error');
    } finally { setPublishing(false); }
  };

  const isPublished = course?.status === 'published';

  return (
    <div style={{ maxWidth: 1060, fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 68, right: 20, zIndex: 999,
          padding: '11px 18px', borderRadius: 10,
          background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1.5px solid ${toast.type === 'error' ? '#fecaca' : '#6ee7b7'}`,
          color: toast.type === 'error' ? '#dc2626' : '#059669',
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideDown 0.18s ease-out',
        }}>
          {toast.type === 'error'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            : <CheckCircle size={14} />
          }
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/learn/courses')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0a0a1a', margin: 0, letterSpacing: '-0.02em' }}>
              {isEdit ? 'Edit Course' : 'New Course'}
            </h1>
            {course && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{course.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                  background: isPublished ? '#ecfdf5' : '#fffbeb',
                  color: isPublished ? '#059669' : '#d97706',
                }}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Preview button — opens student view in new tab */}
          {course?.slug && (
            <button
              onClick={() => window.open(`/admin/learn/preview/${course.slug}`, '_blank', 'noopener')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9, background: '#fff', color: '#374151', border: '1.5px solid #e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.color = '#00A6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8ecf4'; e.currentTarget.style.color = '#374151'; }}
              title="Open student view in new tab"
            >
              <Eye size={13} /> Preview
            </button>
          )}
          {courseId && !isPublished && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9, background: '#10B981', color: '#fff', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: publishing ? 0.7 : 1 }}
            >
              <Globe size={13} /> {publishing ? 'Publishing...' : 'Publish Course'}
            </button>
          )}
          {courseId && isPublished && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9, background: '#fff', color: '#64748b', border: '1.5px solid #e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {STEPS.map(({ key, label, icon: Icon }, i) => {
          const active = i === step;
          const done   = courseId && i < step;
          return (
            <button
              key={key}
              onClick={() => courseId && setStep(i)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 18px', borderRadius: 9, border: 'none',
                background: active ? '#0a0a1a' : 'transparent',
                color: active ? '#fff' : done ? '#10B981' : '#64748b',
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: courseId ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: active ? 'rgba(255,255,255,0.2)' : done ? '#10B981' : '#e8ecf4',
                color: active ? '#fff' : done ? '#fff' : '#94a3b8',
                fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {done ? '✓' : i + 1}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 16, overflow: 'hidden' }}>
        {step === 0 && (
          <CourseInfoStep course={course} onSave={handleInfoSave} saving={saving} />
        )}
        {step === 1 && courseId && (
          <CurriculumStep courseId={courseId} course={course} showToast={showToast} />
        )}
        {step === 1 && !courseId && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: '#94a3b8' }}>
            <BookOpen size={32} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Save course info first</p>
            <p style={{ fontSize: 13 }}>Complete Step 1 to unlock the curriculum builder.</p>
            <button onClick={() => setStep(0)} style={{ marginTop: 16, height: 36, padding: '0 20px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Go to Course Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
