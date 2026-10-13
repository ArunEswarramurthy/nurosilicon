import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, BookOpen, Clock, ChevronRight, GraduationCap,
  Play, CheckCircle, Cpu, Zap, Code2, Shield, Filter, X,
} from 'lucide-react';
import { learnStudentApi } from '../../../lib/learnApi';

const DIFF = {
  beginner:     { label: 'Beginner',     bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  intermediate: { label: 'Intermediate', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  advanced:     { label: 'Advanced',     bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

const CAT_META = {
  VLSI:        { Icon: Cpu,   color: '#00A6FF', bg: 'rgba(0,166,255,0.12)' },
  Embedded:    { Icon: Zap,   color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
  Programming: { Icon: Code2, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  Core:        { Icon: Shield,color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

function getCatMeta(category) {
  const key = Object.keys(CAT_META).find(k => category?.toLowerCase().includes(k.toLowerCase()));
  return CAT_META[key] || { Icon: BookOpen, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
}

function CategoryFallback({ category }) {
  const { Icon, color, bg } = getCatMeta(category);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: `linear-gradient(135deg, #0a0f1e 0%, #0d1a35 100%)` }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color={color} strokeWidth={1.5} />
      </div>
      {category && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{category}</span>}
    </div>
  );
}

export default function StudentLearnPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const load = () => {
    setLoading(true);
    setError(false);
    learnStudentApi.getCatalogue({ search, difficulty, page, limit: LIMIT })
      .then(r => { setCourses(r.data.courses); setTotal(r.data.total); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, difficulty, page]);

  const totalPages = Math.ceil(total / LIMIT);
  const inProgress = courses.filter(c => c.enrollment && c.enrollment.progress > 0 && c.enrollment.progress < 100);

  const HERO_CATS = [
    { Icon: Cpu,   label: 'VLSI and HDL',     color: '#00A6FF' },
    { Icon: Zap,   label: 'Embedded Systems', color: '#A855F7' },
    { Icon: Code2, label: 'Programming',      color: '#10B981' },
  ];

  return (
    <div style={{ width: '100%', minWidth: 0, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .slp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: 20px;
        }
        @media (min-width: 1400px) { .slp-grid { grid-template-columns: repeat(3, 1fr); } }
        .slp-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.13) !important; border-color: #00A6FF !important; }
        .slp-filter-btn { transition: all 0.15s; }
        .slp-filter-btn:hover { background: #f1f4f9 !important; }
        .slp-cta:hover { opacity: 0.88; transform: translateY(-1px); }
        @media (max-width: 640px) { .slp-hero-right { display: none !important; } .slp-filters-row { flex-direction: column !important; gap: 8px !important; } }
        @media (max-width: 480px) { .slp-filter-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; } .slp-filter-tabs::-webkit-scrollbar { display: none; } }
      `}</style>

      {/* ── HERO BANNER ── */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #04040e 0%, #080818 45%, #0c0820 100%)',
        minHeight: 160, display: 'flex', alignItems: 'stretch',
        border: '1px solid #1a1a30', marginBottom: 18,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        {/* purple glow left */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* blue glow right */}
        <div style={{ position: 'absolute', bottom: -60, right: 120, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* cyan glow far right */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* circuit SVG */}
        <svg style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 340, opacity: 0.18, pointerEvents: 'none' }} viewBox="0 0 340 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M340 0 L200 0 L160 40 L160 80 L120 80 L80 120 L80 180" stroke="#00A6FF" strokeWidth="1.2"/>
          <path d="M340 60 L260 60 L220 100 L220 140 L180 140 L180 180" stroke="#A855F7" strokeWidth="1"/>
          <path d="M340 120 L300 120 L280 140 L280 180" stroke="#00E5FF" strokeWidth="0.8"/>
          <circle cx="160" cy="40" r="3" fill="#00A6FF"/>
          <circle cx="120" cy="80" r="3" fill="#00A6FF"/>
          <circle cx="220" cy="100" r="3" fill="#A855F7"/>
          <circle cx="180" cy="140" r="2.5" fill="#A855F7"/>
          <circle cx="280" cy="140" r="2" fill="#00E5FF"/>
          <circle cx="160" cy="80" r="5" fill="none" stroke="#00A6FF" strokeWidth="1.2"/>
          <circle cx="220" cy="60" r="4" fill="none" stroke="#A855F7" strokeWidth="1"/>
        </svg>

        {/* LEFT content */}
        <div style={{ flex: 1, minWidth: 0, padding: 'clamp(20px,3vw,28px) clamp(20px,3vw,32px)', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 8px' }}>Course Catalogue</p>
          <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Learn{' '}
            <span style={{ background: 'linear-gradient(90deg, #A855F7, #00A6FF, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Engineering</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Structured courses in VLSI, Embedded Systems, Programming, and Core Engineering.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {HERO_CATS.map(({ Icon, label, color }) => (
              <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: `${color}14`, border: `1px solid ${color}28` }}>
                <Icon size={11} color={color} strokeWidth={1.8} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — My Learning button */}
        <div className="slp-hero-right" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '20px 28px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/student/learn/my-learning')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
          >
            <GraduationCap size={14} /> My Learning
            <ChevronRight size={13} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* ── CONTINUE LEARNING STRIP ── */}
      {!loading && inProgress.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 16, borderRadius: 99, background: 'linear-gradient(180deg,#00A6FF,#A855F7)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Continue Learning</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>({inProgress.length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {inProgress.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/student/learn/${c.slug}`)}
                style={{ width: '100%', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'left', padding: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,166,255,0.14)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ height: 3, background: `linear-gradient(90deg,#00A6FF,#A855F7)` }} />
                <div style={{ padding: '11px 13px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 5 }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 700, color: '#00A6FF' }}>{Math.round(c.enrollment.progress)}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: '#F1F4F9', overflow: 'hidden', marginBottom: 9 }}>
                    <div style={{ width: `${c.enrollment.progress}%`, height: '100%', background: 'linear-gradient(90deg,#00A6FF,#A855F7)', borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#00A6FF' }}>
                    <Play size={10} /> Continue
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH + FILTERS ── */}
      <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }} className="slp-filters-row">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, height: 38, borderRadius: 9, fontSize: 13 }}
            placeholder="Search courses..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search courses"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Filter size={13} color="#94a3b8" />
          <div className="slp-filter-tabs" style={{ display: 'flex', background: '#F3F6FC', borderRadius: 9, padding: 3, gap: 2 }} role="group" aria-label="Filter by difficulty">
            {[
              { val: '',             label: 'All' },
              { val: 'beginner',     label: 'Beginner' },
              { val: 'intermediate', label: 'Intermediate' },
              { val: 'advanced',     label: 'Advanced' },
            ].map(({ val, label }) => {
              const active = difficulty === val;
              return (
                <button
                  key={val}
                  onClick={() => { setDifficulty(val); setPage(1); }}
                  className="slp-filter-btn"
                  aria-pressed={active}
                  style={{
                    height: 30, padding: '0 13px', borderRadius: 7, border: 'none',
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#111827' : '#64748B',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12, cursor: 'pointer',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    borderBottom: active ? '2px solid #00A6FF' : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RESULT COUNT ── */}
      {!loading && (
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12, fontWeight: 500 }}>
          {error ? '' : total > 0
            ? `${total} course${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`
            : search ? `No results for "${search}"` : 'No courses available yet'
          }
        </p>
      )}

      {/* ── ERROR STATE ── */}
      {error && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #E2E8F0', borderRadius: 16, background: '#fafbfc', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Failed to load courses</p>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>Check your connection and try again.</p>
          <button onClick={load} style={{ height: 38, padding: '0 20px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* ── COURSE GRID ── */}
      {!error && (
        loading ? (
          <div className="slp-grid">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState search={search} difficulty={difficulty} onClear={() => { setSearch(''); setDifficulty(''); setPage(1); }} />
        ) : (
          <div className="slp-grid">
            {courses.map(c => {
              const progress = Math.min(100, Math.max(0, c.enrollment?.progress || 0));
              const isDone = progress >= 100;
              const hasStarted = Boolean(c.enrollment) && progress > 0;
              const handlePrimary = () => {
                if (!c.enrollment) { navigate(`/student/learn/${c.slug}`); return; }
                if (isDone || !c.enrollment.last_lesson_id) { navigate(`/student/learn/${c.slug}`); return; }
                navigate(`/student/learn/${c.slug}/lesson/${c.enrollment.last_lesson_id}`);
              };
              return (
                <CourseCard
                  key={c.id}
                  course={c}
                  onPrimary={handlePrimary}
                  onView={() => navigate(`/student/learn/${c.slug}`)}
                />
              );
            })}
          </div>
        )
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 32 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(false, page === 1)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={pgBtn(p === page, false)}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtn(false, page === totalPages)}>
            Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onPrimary, onView }) {
  const df = DIFF[course.difficulty] || DIFF.beginner;
  const enrollment = course.enrollment;
  const progress = Math.min(100, Math.max(0, enrollment?.progress || 0));
  const isDone = progress >= 100;
  const isEnrolled = Boolean(enrollment);
  const hasStarted = isEnrolled && progress > 0;

  const ctaLabel = isDone ? 'Review Course' : hasStarted ? 'Continue Learning' : 'Start Learning';

  return (
    <article
      className="slp-card"
      style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: '1.5px solid #E2E8F0',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      {/* Thumbnail — clicking opens course overview */}
      <div
        onClick={onView}
        style={{ aspectRatio: '16/9', background: '#0a0f1e', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
      >
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <CategoryFallback category={course.category} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)', pointerEvents: 'none' }} />
        {isDone ? (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: 'rgba(16,185,129,0.92)', fontSize: 10, fontWeight: 700, color: '#fff' }}>
            <CheckCircle size={9} /> Done
          </div>
        ) : hasStarted ? (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: 'rgba(0,166,255,0.92)', fontSize: 10, fontWeight: 700, color: '#fff' }}>
            <Play size={9} /> In Progress
          </div>
        ) : null}
        {isEnrolled && progress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: isDone ? '#10B981' : '#00A6FF' }} />
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: df.bg, color: df.color, border: `1px solid ${df.border}` }}>{df.label}</span>
          {course.category && (
            <span style={{ fontSize: 10, color: '#64748B', padding: '2px 9px', borderRadius: 99, background: '#F3F6FC', border: '1px solid #E2E8F0' }}>{course.category}</span>
          )}
        </div>

        <h3
          onClick={onView}
          style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 5px', lineHeight: 1.4, letterSpacing: '-0.01em', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00A6FF'}
          onMouseLeave={e => e.currentTarget.style.color = '#111827'}
        >
          {course.title}
        </h3>

        {course.summary && (
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>
            {course.summary}
          </p>
        )}

        {(course.estimated_duration > 0 || course.lesson_count > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {course.estimated_duration > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                <Clock size={11} />{Math.round(course.estimated_duration / 60)}h
              </span>
            )}
            {course.lesson_count > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                <BookOpen size={11} />{course.lesson_count} lesson{course.lesson_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          {isEnrolled && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>{isDone ? 'Completed' : 'Progress'}</span>
                <span style={{ fontWeight: 700, color: isDone ? '#10B981' : '#00A6FF' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: '#F1F4F9', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${Math.max(progress, progress > 0 ? 4 : 0)}%`, height: '100%', background: isDone ? '#10B981' : 'linear-gradient(90deg,#00A6FF,#A855F7)', borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </>
          )}

          {/* Dual action row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Primary CTA */}
            <button
              onClick={onPrimary}
              className="slp-cta"
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isDone ? '#ecfdf5' : 'linear-gradient(135deg,#00A6FF,#A855F7)',
                color: isDone ? '#059669' : '#fff',
                outline: isDone ? '1.5px solid #6ee7b7' : 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 12, fontWeight: 700,
                boxShadow: isDone ? 'none' : '0 2px 8px rgba(0,166,255,0.20)',
                transition: 'all 0.18s',
              }}
            >
              {isDone ? <CheckCircle size={12} /> : hasStarted ? <Play size={12} /> : <BookOpen size={12} />}
              {ctaLabel}
            </button>

            {/* View Course */}
            <button
              onClick={onView}
              title="View course details"
              style={{
                height: 36, width: 36, borderRadius: 8, border: '1.5px solid #E2E8F0',
                background: '#fff', cursor: 'pointer', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.color = '#00A6FF'; e.currentTarget.style.background = '#e6f6ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = '#fff'; }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #E2E8F0', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%' }} />
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <div className="skeleton" style={{ height: 18, width: 70, borderRadius: 99 }} />
          <div className="skeleton" style={{ height: 18, width: 55, borderRadius: 99 }} />
        </div>
        <div className="skeleton" style={{ height: 16, width: '85%', borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '65%', borderRadius: 6, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 38, borderRadius: 9 }} />
      </div>
    </div>
  );
}

function EmptyState({ search, difficulty, onClear }) {
  const hasFilter = search || difficulty;
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', border: '2px dashed #E2E8F0', borderRadius: 18, background: '#fafbfc' }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: '#F3F6FC', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <BookOpen size={26} color="#94a3b8" strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
        {hasFilter ? 'No courses found' : 'No courses available yet'}
      </p>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: hasFilter ? 20 : 0, lineHeight: 1.6 }}>
        {hasFilter ? 'Try different keywords or clear the filters.' : 'New courses are being added — check back soon.'}
      </p>
      {hasFilter && (
        <button onClick={onClear} style={{ height: 38, padding: '0 20px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Clear Filters
        </button>
      )}
    </div>
  );
}

const pgBtn = (active, disabled) => ({
  height: 36, padding: '0 13px', borderRadius: 9, minWidth: 36,
  border: `1.5px solid ${active ? '#00A6FF' : '#E2E8F0'}`,
  background: active ? '#00A6FF' : '#fff',
  color: active ? '#fff' : disabled ? '#c4cdd6' : '#374151',
  fontSize: 13, fontWeight: active ? 700 : 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
  display: 'inline-flex', alignItems: 'center', gap: 5,
  transition: 'all 0.15s',
  boxShadow: active ? '0 2px 8px rgba(0,166,255,0.22)' : 'none',
});
