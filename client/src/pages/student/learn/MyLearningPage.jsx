import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, GraduationCap, Clock, Trophy, Play, CheckCircle } from 'lucide-react';
import { learnStudentApi } from '../../../lib/learnApi';

export default function MyLearningPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learnStudentApi.getMyLearning()
      .then(r => setEnrollments(r.data.enrollments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inProgress = enrollments.filter(e => e.progress > 0 && e.progress < 100);
  const notStarted = enrollments.filter(e => !e.progress || e.progress === 0);
  const completed  = enrollments.filter(e => e.progress >= 100);

  return (
    <div style={{ maxWidth: 1000, fontFamily: 'Inter, sans-serif' }}>

      {/* HERO BANNER */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #04040e 0%, #080818 45%, #0c0820 100%)',
        minHeight: 160, display: 'flex', alignItems: 'stretch',
        border: '1px solid #1a1a30', marginBottom: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.22) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 100, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, padding: '26px 32px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 7px' }}>My Learning</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Your{' '}
            <span style={{ background: 'linear-gradient(90deg, #A855F7, #00A6FF, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Learning Journey</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {loading ? 'Loading...' : `${enrollments.length} enrolled course${enrollments.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="myl-hero-right" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '20px 28px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/student/learn')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            <BookOpen size={13} /> Browse Courses
          </button>
        </div>
      </div>

      {/* STATS ROW */}
      {!loading && enrollments.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'In Progress', value: inProgress.length, color: '#00A6FF', bg: '#e6f6ff', border: '#b3e4ff', Icon: Play },
            { label: 'Completed',   value: completed.length,  color: '#10B981', bg: '#ecfdf5', border: '#6ee7b7', Icon: Trophy },
            { label: 'Not Started', value: notStarted.length, color: '#F59E0B', bg: '#fffbeb', border: '#fde68a', Icon: Clock },
            { label: 'Total',       value: enrollments.length, color: '#A855F7', bg: '#f3e6fd', border: '#d9a8f8', Icon: GraduationCap },
          ].map(({ label, value, color, bg, border, Icon }, i, arr) => (
            <div key={label} className="myl-stats-row" style={{ flex: '1 1 120px', minWidth: 0, padding: '18px 20px', borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none', display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} strokeWidth={1.6} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #e8ecf4' }}>
              <div className="skeleton" style={{ height: 110 }} />
              <div style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 6, marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 6, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 24px', border: '2px dashed #e8ecf4', borderRadius: 20, background: '#fafbfc' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#f1f4f9', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={28} color="#94a3b8" strokeWidth={1.5} />
          </div>
          <p style={{ color: '#0a0a1a', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No courses enrolled yet</p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Browse the catalogue and enroll in a course to start your learning journey.</p>
          <button
            onClick={() => navigate('/student/learn')}
            style={{ height: 40, padding: '0 24px', borderRadius: 10, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <Section title="Continue Learning" accent="#00A6FF" enrollments={inProgress} navigate={navigate} />
          )}
          {notStarted.length > 0 && (
            <Section title="Not Started" accent="#F59E0B" enrollments={notStarted} navigate={navigate} />
          )}
          {completed.length > 0 && (
            <Section title="Completed" accent="#10B981" enrollments={completed} navigate={navigate} />
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, accent, enrollments, navigate }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 18, borderRadius: 99, background: accent }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0a0a1a', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({enrollments.length})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {enrollments.map(e => <EnrollmentCard key={e.id} enrollment={e} navigate={navigate} />)}
      </div>
    </div>
  );
}

function EnrollmentCard({ enrollment: e, navigate }) {
  const progress = e.progress || 0;
  const isDone = progress >= 100;

  const handleClick = () => {
    if (progress > 0 && !isDone && e.last_lesson_id) {
      navigate(`/student/learn/${e.course.slug}/lesson/${e.last_lesson_id}`);
    } else {
      navigate(`/student/learn/${e.course.slug}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={el => { el.currentTarget.style.transform = 'translateY(-2px)'; el.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; el.currentTarget.style.borderColor = '#00A6FF'; }}
      onMouseLeave={el => { el.currentTarget.style.transform = 'translateY(0)'; el.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.currentTarget.style.borderColor = '#e8ecf4'; }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: isDone ? '#10B981' : progress > 0 ? 'linear-gradient(90deg,#00A6FF,#A020F0)' : '#e8ecf4' }} />

      {/* Thumbnail */}
      <div style={{ height: 100, background: 'linear-gradient(135deg,#0a0a1a,#1a1a2e)', position: 'relative', overflow: 'hidden' }}>
        {e.course.cover_image_url ? (
          <img src={e.course.cover_image_url} alt={e.course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={28} color="#334155" strokeWidth={1.4} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)', pointerEvents: 'none' }} />
        {isDone && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.88)', fontSize: 10, fontWeight: 700, color: '#fff' }}>
            <CheckCircle size={9} /> Done
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '13px 15px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', marginBottom: 10, lineHeight: 1.35 }}>
          {e.course.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{Math.round(progress)}% complete</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? '#10B981' : '#00A6FF', display: 'flex', alignItems: 'center', gap: 3 }}>
            {isDone ? 'Review' : progress > 0 ? 'Resume' : 'Start'}
            <ChevronRight size={12} />
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: '#f1f4f9', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(progress, progress > 0 ? 3 : 0)}%`, height: '100%', background: isDone ? '#10B981' : 'linear-gradient(90deg,#00A6FF,#A020F0)', borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
      </div>
    </div>
  );
}
