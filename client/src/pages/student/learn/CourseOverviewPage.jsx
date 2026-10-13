import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, ChevronDown, ChevronRight, ChevronLeft,
  Play, CheckCircle, Lock, Target, Users, GraduationCap,
} from 'lucide-react';
import { learnStudentApi, learnAdminApi } from '../../../lib/learnApi';

const DIFF = {
  beginner:     { label: 'Beginner',     bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  intermediate: { label: 'Intermediate', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  advanced:     { label: 'Advanced',     bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export default function CourseOverviewPage({ previewMode = false }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (previewMode) {
      // Admin preview: use admin API which accepts super_admin role
      // Admin getCourse returns { course } not { course, enrollment, completedLessonIds }
      learnAdminApi.getCourse(slug)
        .then(r => {
          // Normalise to the same shape CourseOverviewPage expects
          setData({ course: r.data.course, enrollment: null, completedLessonIds: [] });
          const firstId = r.data.course.modules?.[0]?.id;
          if (firstId) setExpanded({ [firstId]: true });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      learnStudentApi.getCourse(slug)
        .then(r => {
          setData(r.data);
          const firstId = r.data.course.modules?.[0]?.id;
          if (firstId) setExpanded({ [firstId]: true });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [slug, previewMode]);

  const firstLesson = data?.course?.modules?.[0]?.topics?.[0]?.lessons?.[0];

  const handleStart = async () => {
    if (!data) return;
    setEnrolling(true);
    try {
      await learnStudentApi.enroll(slug);
      // Refresh course data so enrollment state is up to date
      const refreshed = await learnStudentApi.getCourse(slug);
      setData(refreshed.data);
      const first = refreshed.data.course?.modules?.[0]?.topics?.[0]?.lessons?.[0];
      if (first) navigate(`/student/learn/${slug}/lesson/${first.id}`);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not enroll');
    } finally { setEnrolling(false); }
  };

  const handleResume = () => {
    const lastId = data?.enrollment?.last_lesson_id;
    if (lastId) {
      navigate(`/student/learn/${slug}/lesson/${lastId}`);
    } else if (firstLesson) {
      navigate(`/student/learn/${slug}/lesson/${firstLesson.id}`);
    } else {
      handleStart();
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div className="skeleton" style={{ height: 32, width: 120, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 16, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.65fr) minmax(300px,0.85fr)', gap: 20 }}>
          <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 380, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>Course not found.</p>
        <button onClick={() => navigate('/student/learn')} className="btn btn-primary btn-md">Back to Courses</button>
      </div>
    );
  }

  const { course, enrollment, completedLessonIds } = data;
  const completedSet = new Set(completedLessonIds || []);
  const df = DIFF[course.difficulty] || DIFF.beginner;
  const progress = Math.min(100, Math.max(0, enrollment?.progress || 0));
  const isDone = progress >= 100;
  const isEnrolled = Boolean(enrollment);

  const totalLessons = (course.modules || []).reduce(
    (s, m) => s + (m.topics || []).reduce((s2, t) => s2 + (t.lessons || []).length, 0), 0
  );
  const completedCount = completedLessonIds?.length || 0;

  const ctaLabel = previewMode
    ? 'Preview Only'
    : isEnrolled
      ? isDone ? 'Review Course' : progress > 0 ? 'Continue Learning' : 'Start Learning'
      : enrolling ? 'Starting...' : 'Enroll and Start Learning';

  return (
    <div style={{ width: '100%', minWidth: 0, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .cop-body { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr); gap: 20px; align-items: start; }
        @media (max-width: 900px) { .cop-body { grid-template-columns: 1fr !important; } }
        .cop-obj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 600px) { .cop-obj-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* BREADCRUMB */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: 13, color: '#64748B' }}>
        <button
          onClick={() => navigate('/student/learn')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0 }}
        >
          <ChevronLeft size={14} /> All Courses
        </button>
        <span style={{ color: '#E2E8F0' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>{course.title}</span>
      </nav>

      {/* HERO BANNER — dark with circuit art */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #04040e 0%, #080820 50%, #0c0830 100%)',
        minHeight: 220, marginBottom: 20,
        border: '1px solid #1a1a30',
        boxShadow: '0 4px 28px rgba(0,0,0,0.22)',
      }}>
        {/* grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        {/* purple glow */}
        <div style={{ position: 'absolute', top: -80, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* blue glow */}
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.20) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* cyan glow */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* circuit SVG */}
        <svg style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '45%', opacity: 0.22, pointerEvents: 'none' }} viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid meet">
          <path d="M500 0 L320 0 L280 40 L280 100 L240 100 L200 140 L200 240" stroke="#00A6FF" strokeWidth="1.5"/>
          <path d="M500 80 L400 80 L360 120 L360 180 L320 180 L320 240" stroke="#A855F7" strokeWidth="1.2"/>
          <path d="M500 160 L450 160 L420 190 L420 240" stroke="#00E5FF" strokeWidth="1"/>
          <path d="M500 30 L440 30 L440 70 L380 70" stroke="#00A6FF" strokeWidth="0.8" strokeDasharray="4 3"/>
          <circle cx="280" cy="40" r="4" fill="#00A6FF"/>
          <circle cx="240" cy="100" r="4" fill="#00A6FF"/>
          <circle cx="360" cy="120" r="4" fill="#A855F7"/>
          <circle cx="320" cy="180" r="3.5" fill="#A855F7"/>
          <circle cx="420" cy="190" r="3" fill="#00E5FF"/>
          <circle cx="440" cy="70" r="3" fill="#00A6FF"/>
          <circle cx="280" cy="100" r="7" fill="none" stroke="#00A6FF" strokeWidth="1.5"/>
          <circle cx="360" cy="80" r="6" fill="none" stroke="#A855F7" strokeWidth="1.2"/>
          <circle cx="440" cy="30" r="5" fill="none" stroke="#00E5FF" strokeWidth="1"/>
        </svg>

        {/* cover image overlay */}
        {course.cover_image_url && (
          <div style={{ position: 'absolute', right: 0, top: 0, width: '40%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}>
            <img src={course.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(20px,3vw,36px) clamp(20px,3vw,40px)', maxWidth: 'min(70%, 600px)', minWidth: 'min(100%, 300px)' }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: df.bg, color: df.color, border: `1px solid ${df.border}` }}>
              {df.label}
            </span>
            {course.category && (
              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)', border: '1px solid rgba(255,255,255,0.15)' }}>
                {course.category}
              </span>
            )}
            {isDone && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.30)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={11} /> Completed
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            {course.title}
          </h1>
          {course.summary && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', lineHeight: 1.65, maxWidth: 560 }}>
              {course.summary}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: isEnrolled ? 20 : 24 }}>
            {course.estimated_duration > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                <Clock size={14} color="rgba(255,255,255,0.35)" />{Math.round(course.estimated_duration / 60)}h estimated
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              <BookOpen size={14} color="rgba(255,255,255,0.35)" />{totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
            </span>
            {isEnrolled && totalLessons > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                <CheckCircle size={14} color="#34d399" />{completedCount}/{totalLessons} completed
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isEnrolled && progress > 0 && (
            <div style={{ marginBottom: 24, maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.40)', marginBottom: 6 }}>
                <span>Your progress</span>
                <span style={{ fontWeight: 700, color: isDone ? '#34d399' : '#00A6FF' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: isDone ? '#10B981' : 'linear-gradient(90deg,#00A6FF,#A855F7)', borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={previewMode ? undefined : (isEnrolled ? handleResume : handleStart)}
              disabled={enrolling || previewMode}
              title={previewMode ? 'Enroll/Start is disabled in preview mode' : undefined}
              style={{ height: 46, padding: '0 28px', borderRadius: 12, background: previewMode ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#00A6FF,#A855F7)', color: '#fff', border: previewMode ? '1.5px solid rgba(255,255,255,0.25)' : 'none', cursor: previewMode ? 'not-allowed' : enrolling ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, boxShadow: previewMode ? 'none' : '0 4px 16px rgba(0,166,255,0.30)', opacity: enrolling ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.18s' }}
              onMouseEnter={e => { if (!enrolling && !previewMode) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,166,255,0.38)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = previewMode ? 'none' : '0 4px 16px rgba(0,166,255,0.30)'; }}
            >
              {isEnrolled ? <Play size={15} /> : <GraduationCap size={15} />}
              {ctaLabel}
            </button>

            {/* Completed toast */}
            {isDone && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={14} color="#34d399" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>Course Completed</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>Great job! All lessons done.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="cop-body">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {course.description && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={15} color="#00A6FF" /> About this course
              </h3>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, margin: 0 }}>{course.description}</p>
            </div>
          )}

          {course.learning_objectives?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={15} color="#A855F7" /> What you will learn
              </h3>
              <div className="cop-obj-grid">
                {course.learning_objectives.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
                    <CheckCircle size={13} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                    {obj}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!course.description && !course.learning_objectives?.length && (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
              <BookOpen size={28} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Course details coming soon.</p>
            </div>
          )}
        </div>

        {/* RIGHT — Curriculum */}
        <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'sticky', top: 72, minWidth: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Course curriculum
            </h3>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{totalLessons} lesson{totalLessons !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {(course.modules || []).length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No lessons added yet.</div>
            ) : (course.modules || []).map((mod, mi) => (
              <div key={mod.id} style={{ borderBottom: '1px solid #F1F4F9' }}>
                <button
                  onClick={() => setExpanded(e => ({ ...e, [mod.id]: !e[mod.id] }))}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', cursor: 'pointer', background: '#F8FAFC', border: 'none', textAlign: 'left', userSelect: 'none' }}
                >
                  {expanded[mod.id]
                    ? <ChevronDown size={13} color="#64748B" style={{ flexShrink: 0 }} />
                    : <ChevronRight size={13} color="#64748B" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flex: 1, lineHeight: 1.3 }}>M{mi + 1}: {mod.title}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                    {(mod.topics || []).reduce((s, t) => s + (t.lessons || []).length, 0)} lessons
                  </span>
                  {expanded[mod.id]
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  }
                </button>

                {expanded[mod.id] && (mod.topics || []).map(topic => (
                  <div key={topic.id}>
                    <div style={{ padding: '5px 18px 3px 36px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#fafbfc' }}>
                      {topic.title}
                    </div>
                    {(topic.lessons || []).map((lesson, li) => {
                      const done = completedSet.has(lesson.id);
                      const canClick = isEnrolled;
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            if (previewMode) {
                              navigate(`/admin/learn/preview/${slug}/lesson/${lesson.id}`);
                            } else if (canClick) {
                              navigate(`/student/learn/${slug}/lesson/${lesson.id}`);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px 9px 40px', cursor: (previewMode || canClick) ? 'pointer' : 'default', borderLeft: `3px solid ${done ? '#10B981' : 'transparent'}`, transition: 'background 0.1s', minWidth: 0 }}
                          onMouseEnter={e => (previewMode || canClick) && (e.currentTarget.style.background = '#F3F6FC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {done
                            ? <CheckCircle size={13} color="#10B981" style={{ flexShrink: 0 }} />
                            : canClick
                              ? <Play size={11} color="#00A6FF" style={{ flexShrink: 0 }} />
                              : <Lock size={11} color="#c4cdd6" style={{ flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: 12, color: done ? '#059669' : canClick ? '#374151' : '#94a3b8', flex: 1, lineHeight: 1.4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lesson.title}>
                            {li + 1}. {lesson.title}
                          </span>
                          {lesson.estimated_duration > 0 && (
                            <span style={{ fontSize: 10, color: '#c4cdd6', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                              {lesson.estimated_duration}m
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 18px', borderTop: '1.5px solid #E2E8F0', background: '#fafbfc' }}>
            <button
              onClick={previewMode ? undefined : (isEnrolled ? handleResume : handleStart)}
              disabled={enrolling || previewMode}
              title={previewMode ? 'Disabled in preview mode' : undefined}
              style={{ width: '100%', height: 40, borderRadius: 10, background: previewMode ? '#e8ecf4' : 'linear-gradient(135deg,#00A6FF,#A855F7)', color: previewMode ? '#94a3b8' : '#fff', border: 'none', cursor: previewMode ? 'not-allowed' : enrolling ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: enrolling ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.18s' }}
              onMouseEnter={e => { if (!enrolling && !previewMode) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = enrolling ? '0.7' : '1'; }}
            >
              <Play size={13} /> {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
