import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Bookmark, BookmarkCheck, StickyNote, X, Code2,
  Copy, Check, Play, Target, BookOpen, Clock, ExternalLink,
} from 'lucide-react';
import { learnStudentApi, learnAdminApi } from '../../../lib/learnApi';

function flatLessons(modules) {
  const list = [];
  (modules || []).forEach(mod =>
    (mod.topics || []).forEach(topic =>
      (topic.lessons || []).forEach(l => list.push({ ...l, modTitle: mod.title }))
    )
  );
  return list;
}

function headingsFromBlocks(blocks) {
  return (blocks || [])
    .filter(b => b.type === 'heading')
    .map(b => ({ text: b.content, level: b.level || 2 }));
}

export default function LessonViewerPage({ previewMode = false }) {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const centerRef = useRef(null);

  const [data, setData]                     = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [transitioning, setTransitioning]   = useState(false);
  const [completing, setCompleting]         = useState(false);
  const [bookmarked, setBookmarked]         = useState(false);
  const [showNotes, setShowNotes]           = useState(false);
  const [notes, setNotes]                   = useState([]);
  const [noteText, setNoteText]             = useState('');
  const [curriculum, setCurriculum]         = useState(null);
  const [leftOpen, setLeftOpen]             = useState(true);
  const [rightOpen, setRightOpen]           = useState(true);

  // Curriculum loads once per course slug — not on every lesson change
  useEffect(() => {
    if (window.innerWidth < 1024) { setLeftOpen(false); setRightOpen(false); }
    previewMode ? learnAdminApi.getCourse(slug) : learnStudentApi.getCourse(slug)
      .then(cr => setCurriculum(cr.data.course))
      .catch(() => {});
  }, [slug]);

  // Lesson loads on every lessonId change — soft fade after first load
  useEffect(() => {
    if (!initialLoading) setTransitioning(true);

    previewMode ? learnAdminApi.getLesson(slug, lessonId) : learnStudentApi.getLesson(slug, lessonId)
      .then(r => {
        setData(r.data);
        // Scroll reading area back to top
        if (centerRef.current) centerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        learnStudentApi.getBookmarks()
          .then(br => setBookmarked(br.data.bookmarks.some(b => b.lesson_id === lessonId)))
          .catch(() => {});
        learnStudentApi.getNotes(lessonId)
          .then(nr => setNotes(nr.data.notes))
          .catch(() => {});
      })
      .catch(() => navigate(previewMode ? `/admin/learn/preview/${slug}` : `/student/learn/${slug}`))
      .finally(() => { setInitialLoading(false); setTransitioning(false); });
  }, [slug, lessonId]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await learnStudentApi.completeLesson(slug, lessonId);
      setData(d => ({ ...d, progress: { ...(d.progress || {}), completed: true } }));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to mark complete');
    } finally { setCompleting(false); }
  };

  const handleBookmark = async () => {
    try {
      const r = await learnStudentApi.toggleBookmark(lessonId);
      setBookmarked(r.data.bookmarked);
    } catch {}
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const r = await learnStudentApi.saveNote(lessonId, noteText.trim());
      setNotes(n => [r.data.note, ...n]);
      setNoteText('');
    } catch {}
  };

  const handleDeleteNote = async (nid) => {
    try {
      await learnStudentApi.deleteNote(nid);
      setNotes(n => n.filter(x => x.id !== nid));
    } catch {}
  };

  const allLessons   = useMemo(() => flatLessons(curriculum?.modules), [curriculum]);
  const lessonIndex  = allLessons.findIndex(l => l.id === lessonId);
  const lessonNumber = lessonIndex + 1;
  const totalLessons = allLessons.length;

  // Full spinner only on very first load
  if (initialLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #e8ecf4', borderTopColor:'#00A6FF', animation:'spin 0.8s linear infinite' }} />
      <span style={{ fontSize:13, color:'#94a3b8' }}>Loading lesson...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!data) return null;

  const { lesson, prevLesson, nextLesson, quiz } = data;
  const isCompleted        = data.progress?.completed;
  const enrollmentProgress = data.enrollment?.progress || 0;
  const headings           = headingsFromBlocks(lesson.content_blocks);
  const objectives         = curriculum?.learning_objectives || [];
  const difficulty         = curriculum?.difficulty || '';
  const category           = curriculum?.category || '';
  const DIFF_COLOR         = { beginner:'#059669', intermediate:'#d97706', advanced:'#dc2626' };
  const diffColor          = DIFF_COLOR[difficulty] || '#64748b';
  const PAD                = 'clamp(12px, 2.5vw, 28px)';

  const goNext = () => nextLesson && navigate(`/student/learn/${slug}/lesson/${nextLesson.id}`);
  const goPrev = () => prevLesson && navigate(`/student/learn/${slug}/lesson/${prevLesson.id}`);

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      margin:previewMode ? 0 : `calc(-1 * clamp(12px, 2vw, 20px)) calc(-1 * ${PAD})`,
      height:previewMode ? 'calc(100vh - 40px)' : 'calc(100vh - 56px)',
      fontFamily:'Inter, sans-serif', background:'#f8fafc', overflow:'hidden',
    }}>
      <style>{`
        .lvp-left  { width:260px; flex-shrink:0; background:#0d1117; border-right:1px solid #1e2433; overflow-y:auto; display:flex; flex-direction:column; }
        .lvp-right { width:272px; flex-shrink:0; background:#fff; border-left:1.5px solid #e8ecf4; overflow-y:auto; display:flex; flex-direction:column; }
        .lvp-mod-btn { width:100%; display:flex; align-items:center; gap:8px; padding:11px 16px; background:transparent; border:none; cursor:pointer; text-align:left; border-bottom:1px solid #1e2433; }
        .lvp-mod-btn:hover { background:rgba(255,255,255,0.04); }
        .lvp-lesson-row { display:flex; align-items:center; gap:9px; padding:8px 14px 8px 38px; cursor:pointer; border-left:3px solid transparent; transition:background 0.12s; }
        .lvp-lesson-row:hover { background:rgba(255,255,255,0.05); }
        .lvp-lesson-row.active { background:rgba(0,166,255,0.12); border-left-color:#00A6FF; }
        .lvp-copy-btn { opacity:0; transition:opacity 0.15s; }
        .lvp-code-wrap:hover .lvp-copy-btn { opacity:1; }
        .lvp-toc-item { display:flex; align-items:flex-start; gap:8px; padding:5px 0; cursor:pointer; font-size:12.5px; color:#64748b; line-height:1.4; transition:color 0.1s; }
        .lvp-toc-item:hover { color:#00A6FF; }
        .lvp-action-btn { width:100%; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; gap:7px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .lvp-link { color:#7c3aed; text-decoration:underline; text-underline-offset:2px; word-break:break-word; }
        .lvp-link:hover { color:#00A6FF; }
        .lvp-link:focus-visible { outline:2px solid #00A6FF; outline-offset:2px; border-radius:2px; }
        .lvp-center { flex:1; overflow-y:auto; min-width:0; background:#fff; transition:opacity 0.18s ease; }
        .lvp-center.fading { opacity:0.45; pointer-events:none; }
        @media(max-width:1200px){ .lvp-right{ display:none!important; } }
        @media(max-width:860px)  { .lvp-left { display:none!important; } }
      `}</style>

      {/* TOP BAR */}
      <div style={{ height:48, background:'#fff', borderBottom:'1.5px solid #e8ecf4', display:'flex', alignItems:'center', gap:6, padding:'0 10px', flexShrink:0, overflowX:'auto', overflowY:'hidden' }}>
        <button
          onClick={() => setLeftOpen(v => !v)}
          title={leftOpen ? 'Hide curriculum' : 'Show curriculum'}
          style={{ width:30, height:30, borderRadius:7, border:`1.5px solid ${leftOpen?'#00A6FF':'#e8ecf4'}`, background:leftOpen?'#e6f6ff':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:leftOpen?'#00A6FF':'#64748b', flexShrink:0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>
        <button
          onClick={() => navigate(`/student/learn/${slug}`)}
          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:6, flexShrink:0, whiteSpace:'nowrap' }}
        >
          <ChevronLeft size={13} /> Back
        </button>
        <span style={{ color:'#e2e8f0' }}>›</span>
        <span style={{ fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>
          {curriculum?.title && <><span style={{ color:'#64748b' }}>{curriculum.title}</span><span style={{ margin:'0 5px', color:'#e2e8f0' }}>›</span></>}
          <span style={{ color:'#0a0a1a', fontWeight:600 }}>{lesson.title}</span>
        </span>
        {totalLessons > 0 && (
          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600, flexShrink:0, whiteSpace:'nowrap' }}>
            Lesson {lessonNumber} of {totalLessons}
          </span>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <div style={{ width:72, height:4, borderRadius:99, background:'#e8ecf4', overflow:'hidden' }}>
            <div style={{ width:`${enrollmentProgress}%`, height:'100%', background:'linear-gradient(90deg,#00A6FF,#A855F7)', borderRadius:99, transition:'width 0.4s' }} />
          </div>
          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{Math.round(enrollmentProgress)}%</span>
        </div>
        <button
          onClick={() => setRightOpen(v => !v)}
          title={rightOpen ? 'Hide panel' : 'Show panel'}
          style={{ width:30, height:30, borderRadius:7, border:`1.5px solid ${rightOpen?'#A855F7':'#e8ecf4'}`, background:rightOpen?'#f3e6fd':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:rightOpen?'#A855F7':'#64748b', flexShrink:0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
      </div>

      {/* 3-COLUMN BODY */}
      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>

        {leftOpen && (
          <LeftSidebar
            curriculum={curriculum}
            slug={slug}
            currentLessonId={lessonId}
            enrollmentProgress={enrollmentProgress}
            difficulty={difficulty}
            category={category}
            diffColor={diffColor}
          />
        )}

        {/* CENTER — fades during lesson transition, no full unmount */}
        <div ref={centerRef} className={`lvp-center${transitioning ? ' fading' : ''}`}>
          <div className="lvp-center-inner" style={{ maxWidth:760, margin:'0 auto', padding:'36px 32px 80px' }}>

            <h1 style={{ fontSize:28, fontWeight:800, color:'#0a0a1a', margin:'0 0 24px', lineHeight:1.2, letterSpacing:'-0.025em' }}>
              {lesson.title}
            </h1>

            {(lesson.content_blocks || []).length === 0 ? (
              <div style={{ padding:'48px 0', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                No content added to this lesson yet.
              </div>
            ) : (
              (lesson.content_blocks || []).map((block, i) => (
                <ContentBlock key={block.id || i} block={block} slug={slug} />
              ))
            )}

            {quiz && (
              <div style={{ margin:'32px 0', padding:'18px 20px', background:'#e6f6ff', borderRadius:12, border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', marginBottom:4, display:'flex', alignItems:'center', gap:7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    {quiz.title}
                  </div>
                  <div style={{ fontSize:12, color:'#64748b' }}>
                    {quiz.time_limit ? `${Math.floor(quiz.time_limit/60)}m · ` : ''}{quiz.max_attempts} attempts · Passing: {quiz.passing_percentage}%
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/student/learn/${slug}/quiz/${quiz.id}`)}
                  style={{ height:36, padding:'0 18px', borderRadius:8, background:'#00A6FF', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}
                >
                  Take Quiz →
                </button>
              </div>
            )}

            {/* Bottom nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:40, paddingTop:24, borderTop:'1.5px solid #e2e8f0', gap:10, flexWrap:'wrap' }}>
              <button
                onClick={goPrev} disabled={!prevLesson}
                style={{ display:'inline-flex', alignItems:'center', gap:6, height:40, padding:'0 18px', borderRadius:9, border:'1.5px solid #e8ecf4', background:'#fff', cursor:prevLesson?'pointer':'not-allowed', fontSize:13, color:'#374151', opacity:prevLesson?1:0.35, flexShrink:0, fontWeight:500 }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={isCompleted ? undefined : handleComplete}
                disabled={completing || isCompleted}
                style={{ display:'inline-flex', alignItems:'center', gap:6, height:40, padding:'0 22px', borderRadius:9, border:isCompleted?'1.5px solid #6ee7b7':'none', background:isCompleted?'#ecfdf5':'linear-gradient(135deg,#00A6FF,#A855F7)', color:isCompleted?'#059669':'#fff', cursor:isCompleted?'default':completing?'not-allowed':'pointer', fontSize:13, fontWeight:700, flexShrink:0, boxShadow:isCompleted?'none':'0 2px 10px rgba(0,166,255,0.25)', opacity:completing?0.7:1 }}
              >
                <CheckCircle size={14} />
                {completing ? 'Saving...' : isCompleted ? 'Completed' : 'Mark Complete'}
              </button>
              <button
                onClick={goNext} disabled={!nextLesson}
                style={{ display:'inline-flex', alignItems:'center', gap:6, height:40, padding:'0 18px', borderRadius:9, border:'none', background:nextLesson?'#00A6FF':'#e8ecf4', color:nextLesson?'#fff':'#94a3b8', cursor:nextLesson?'pointer':'not-allowed', fontSize:13, fontWeight:600, flexShrink:0 }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {rightOpen && (
          <RightPanel
            headings={headings}
            objectives={objectives}
            nextLesson={nextLesson}
            isCompleted={isCompleted}
            completing={completing}
            bookmarked={bookmarked}
            showNotes={showNotes}
            onComplete={handleComplete}
            onBookmark={handleBookmark}
            onToggleNotes={() => setShowNotes(v => !v)}
            onNavigateNext={goNext}
          />
        )}
      </div>

      {/* Notes panel */}
      {showNotes && (
        <div style={{ position:'fixed', bottom:20, right:20, width:'min(320px, calc(100vw - 32px))', background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:50, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #f1f4f9' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0a0a1a' }}>My Notes</span>
            <button onClick={() => setShowNotes(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={14} /></button>
          </div>
          <div style={{ padding:12 }}>
            <textarea className="textarea" rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write a note..." style={{ marginBottom:8, resize:'none' }} />
            <button onClick={handleSaveNote} style={{ width:'100%', height:32, borderRadius:7, background:'#00A6FF', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>Save Note</button>
          </div>
          <div style={{ maxHeight:200, overflowY:'auto', padding:'0 12px 12px' }}>
            {notes.length === 0 && <p style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:'8px 0' }}>No notes yet</p>}
            {notes.map(n => (
              <div key={n.id} style={{ padding:'8px 28px 8px 10px', background:'#f8fafc', borderRadius:8, marginBottom:6, fontSize:12, color:'#374151', position:'relative', lineHeight:1.5 }}>
                {n.content}
                <button onClick={() => handleDeleteNote(n.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeftSidebar({ curriculum, slug, currentLessonId, enrollmentProgress, difficulty, category, diffColor }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!curriculum) return;
    const init = {};
    (curriculum.modules || []).forEach(mod => {
      const has = (mod.topics || []).some(t => (t.lessons || []).some(l => l.id === currentLessonId));
      if (has) init[mod.id] = true;
    });
    if (!Object.keys(init).length && curriculum.modules?.[0]) init[curriculum.modules[0].id] = true;
    setExpanded(init);
  }, [curriculum, currentLessonId]);

  const DIFF_STYLE = {
    beginner:     { bg:'rgba(5,150,105,0.18)',  color:'#34d399', border:'rgba(52,211,153,0.3)' },
    intermediate: { bg:'rgba(217,119,6,0.18)',  color:'#fbbf24', border:'rgba(251,191,36,0.3)' },
    advanced:     { bg:'rgba(220,38,38,0.18)',   color:'#f87171', border:'rgba(248,113,113,0.3)' },
  };
  const DIFF_LBL = { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' };
  const ds = DIFF_STYLE[difficulty] || { bg:'rgba(100,116,139,0.15)', color:'rgba(255,255,255,0.5)', border:'rgba(255,255,255,0.15)' };

  return (
    <div className="lvp-left">
      {/* Hero header */}
      <div style={{ flexShrink:0, background:'linear-gradient(160deg,#0f1729 0%,#0d1117 60%,#111827 100%)', borderBottom:'1px solid #1e2433', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, left:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.15) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, padding:'14px 16px 16px' }}>
          <button
            onClick={() => navigate(`/student/learn/${slug}`)}
            style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.4)', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:12, letterSpacing:'0.01em', transition:'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.75)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}
          >
            <ChevronLeft size={12} /> Back to Course
          </button>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff', lineHeight:1.3, marginBottom:14, letterSpacing:'-0.01em' }}>
            {curriculum?.title || 'Course'}
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase' }}>Progress</span>
              <span style={{ fontSize:11, color:'#00A6FF', fontWeight:700 }}>{Math.round(enrollmentProgress)}%</span>
            </div>
            <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
              <div style={{ width:`${enrollmentProgress}%`, height:'100%', background:'linear-gradient(90deg,#00A6FF,#A855F7)', borderRadius:99, transition:'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {difficulty && (
              <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:ds.bg, color:ds.color, border:`1px solid ${ds.border}`, letterSpacing:'0.02em' }}>
                {DIFF_LBL[difficulty] || difficulty}
              </span>
            )}
            {category && (
              <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'rgba(0,166,255,0.12)', color:'#60a5fa', border:'1px solid rgba(0,166,255,0.2)' }}>
                {category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum tree */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {!curriculum ? (
          <div style={{ padding:'20px 16px', fontSize:12, color:'rgba(255,255,255,0.25)', textAlign:'center' }}>Loading...</div>
        ) : (curriculum.modules || []).map((mod, mi) => {
          const lessonCount = (mod.topics||[]).reduce((s,t) => s+(t.lessons||[]).length, 0);
          const isOpen = expanded[mod.id];
          return (
            <div key={mod.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <button
                className="lvp-mod-btn"
                onClick={() => setExpanded(e => ({ ...e, [mod.id]: !e[mod.id] }))}
              >
                <div style={{ width:18, height:18, borderRadius:5, background:isOpen?'rgba(0,166,255,0.15)':'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>
                  {isOpen
                    ? <ChevronDown size={11} style={{ color:'#00A6FF' }} />
                    : <ChevronRight size={11} style={{ color:'rgba(255,255,255,0.4)' }} />
                  }
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:isOpen?'#fff':'rgba(255,255,255,0.65)', flex:1, lineHeight:1.3, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  M{mi+1}: {mod.title}
                </span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', flexShrink:0, whiteSpace:'nowrap' }}>
                  {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                </span>
              </button>

              {isOpen && (mod.topics||[]).map(topic => (
                <div key={topic.id}>
                  <div style={{ padding:'7px 16px 4px 38px', fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.22)', textTransform:'uppercase', letterSpacing:'0.1em', background:'rgba(0,0,0,0.15)' }}>
                    {topic.title}
                  </div>
                  {(topic.lessons||[]).map(lesson => {
                    const isCurrent = lesson.id === currentLessonId;
                    return (
                      <div
                        key={lesson.id}
                        className={`lvp-lesson-row${isCurrent ? ' active' : ''}`}
                        onClick={() => navigate(`/student/learn/${slug}/lesson/${lesson.id}`)}
                      >
                        <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:isCurrent?'#00A6FF':'rgba(255,255,255,0.06)', border:`1.5px solid ${isCurrent?'#00A6FF':'rgba(255,255,255,0.12)'}` }}>
                          {isCurrent
                            ? <Play size={8} color="#fff" fill="#fff" />
                            : <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.25)' }} />
                          }
                        </div>
                        <span style={{ fontSize:12.5, fontWeight:isCurrent?600:400, color:isCurrent?'#fff':'rgba(255,255,255,0.5)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.4, transition:'color 0.1s' }}>
                          {lesson.title}
                        </span>
                        {lesson.estimated_duration > 0 && (
                          <span style={{ fontSize:10, color:'rgba(255,255,255,0.22)', flexShrink:0, whiteSpace:'nowrap' }}>
                            {lesson.estimated_duration} min
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RightPanel({ headings, objectives, nextLesson, isCompleted, completing, bookmarked, showNotes, onComplete, onBookmark, onToggleNotes, onNavigateNext }) {
  return (
    <div className="lvp-right">
      {headings.length > 0 && (
        <div style={{ padding:'18px 16px 14px', borderBottom:'1.5px solid #f1f4f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <div style={{ width:18, height:18, borderRadius:5, background:'#e6f6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={10} color="#00A6FF" />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:'#0a0a1a', textTransform:'uppercase', letterSpacing:'0.07em' }}>In this lesson</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {headings.map((h, i) => (
              <div key={i} className="lvp-toc-item" style={{ paddingLeft:h.level===3?14:0 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:'#00A6FF', flexShrink:0, marginTop:5 }} />
                <span>{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {objectives.length > 0 && (
        <div style={{ padding:'16px', borderBottom:'1.5px solid #f1f4f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <div style={{ width:18, height:18, borderRadius:5, background:'#f3e6fd', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Target size={10} color="#A855F7" />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:'#0a0a1a', textTransform:'uppercase', letterSpacing:'0.07em' }}>Learning objectives</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {objectives.slice(0,4).map((obj, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:7, fontSize:12, color:'#374151', lineHeight:1.5 }}>
                <CheckCircle size={12} color="#10B981" style={{ flexShrink:0, marginTop:2 }} />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nextLesson && (
        <div style={{ padding:'16px', borderBottom:'1.5px solid #f1f4f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <div style={{ width:18, height:18, borderRadius:5, background:'#f1f4f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={10} color="#64748b" />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:'#0a0a1a', textTransform:'uppercase', letterSpacing:'0.07em' }}>Next lesson</span>
          </div>
          <button
            onClick={onNavigateNext}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'1.5px solid #e8ecf4', background:'#f8fafc', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#00A6FF'; e.currentTarget.style.background='#e6f6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e8ecf4'; e.currentTarget.style.background='#f8fafc'; }}
          >
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,rgba(0,166,255,0.13),rgba(168,85,247,0.13))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Play size={12} color="#00A6FF" />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#0a0a1a', lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {nextLesson.title}
              </div>
              {nextLesson.estimated_duration > 0 && (
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={10} /> {nextLesson.estimated_duration}m
                </div>
              )}
            </div>
            <ChevronRight size={13} color="#94a3b8" style={{ flexShrink:0 }} />
          </button>
        </div>
      )}

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
          <div style={{ width:18, height:18, borderRadius:5, background:'#f1f4f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CheckCircle size={10} color="#64748b" />
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:'#0a0a1a', textTransform:'uppercase', letterSpacing:'0.07em' }}>Lesson actions</span>
        </div>
        <button
          className="lvp-action-btn"
          onClick={isCompleted ? undefined : onComplete}
          disabled={completing || isCompleted}
          style={{ background:isCompleted?'#ecfdf5':'linear-gradient(135deg,#00A6FF,#A855F7)', color:isCompleted?'#059669':'#fff', border:isCompleted?'1.5px solid #6ee7b7':'none', boxShadow:isCompleted?'none':'0 2px 10px rgba(0,166,255,0.22)', opacity:completing?0.7:1, cursor:isCompleted?'default':'pointer' }}
        >
          <CheckCircle size={14} />
          {completing ? 'Saving...' : isCompleted ? 'Completed' : 'Mark as Complete'}
        </button>
        <button
          className="lvp-action-btn"
          onClick={onBookmark}
          style={{ background:bookmarked?'#fffbeb':'#fff', color:bookmarked?'#d97706':'#374151', border:`1.5px solid ${bookmarked?'#fde68a':'#e8ecf4'}`, cursor:'pointer' }}
        >
          {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {bookmarked ? 'Bookmarked' : 'Add to Bookmarks'}
        </button>
        <button
          className="lvp-action-btn"
          onClick={onToggleNotes}
          style={{ background:showNotes?'#e6f6ff':'#fff', color:showNotes?'#00A6FF':'#374151', border:`1.5px solid ${showNotes?'#b3e4ff':'#e8ecf4'}`, cursor:'pointer' }}
        >
          <StickyNote size={14} />
          {showNotes ? 'Close Notes' : 'My Notes'}
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ block, slug }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const isVerilog = block.language === 'verilog' || block.language === 'systemverilog';

  const handleCopy = () => {
    navigator.clipboard.writeText(block.content || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="lvp-code-wrap" style={{ marginBottom:24, borderRadius:10, overflow:'hidden', border:'1px solid #1a1a2e' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 14px', background:'#1a1a2e' }}>
        <span style={{ fontSize:11, color:'#7c8db5', fontWeight:600, fontFamily:'JetBrains Mono, monospace' }}>
          {block.language || 'code'}
        </span>
        <div style={{ display:'flex', gap:6 }}>
          {isVerilog && (
            <button
              onClick={() => navigate('/student/lab/ide', { state:{ code:block.content, language:block.language } })}
              style={{ display:'inline-flex', alignItems:'center', gap:5, height:24, padding:'0 10px', borderRadius:5, background:'#00A6FF', color:'#fff', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}
            >
              <Code2 size={10} /> Try in Lab
            </button>
          )}
          <button
            className="lvp-copy-btn"
            onClick={handleCopy}
            style={{ display:'inline-flex', alignItems:'center', gap:4, height:24, padding:'0 9px', borderRadius:5, background:copied?'#10B981':'rgba(255,255,255,0.08)', color:copied?'#fff':'#94a3b8', border:`1px solid ${copied?'#10B981':'rgba(255,255,255,0.12)'}`, cursor:'pointer', fontSize:11, fontWeight:500, transition:'all 0.15s' }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre style={{ margin:0, padding:'16px 18px', background:'#0d0d1a', fontFamily:'JetBrains Mono, monospace', fontSize:12.5, color:'#e2e8f0', overflowX:'auto', lineHeight:1.65, whiteSpace:'pre' }}>
        {block.content}
      </pre>
    </div>
  );
}

function renderInlineLinks(text) {
  if (!text || !text.includes('[')) return text;
  const parts = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const isInternal = m[2].startsWith(window.location.origin);
    parts.push(
      <a key={m.index} href={m[2]} target={isInternal?'_self':'_blank'} rel={isInternal?undefined:'noopener noreferrer'} className="lvp-link">
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 1 ? parts : text;
}

function ContentBlock({ block, slug }) {
  switch (block.type) {
    case 'heading': {
      const sizes = { 1:26, 2:21, 3:17 };
      const Tag = `h${block.level || 2}`;
      return <Tag style={{ fontSize:sizes[block.level||2]||21, fontWeight:700, color:'#0a0a1a', margin:'32px 0 12px', lineHeight:1.25, letterSpacing:'-0.02em' }}>{block.content}</Tag>;
    }
    case 'paragraph':
      return <p style={{ marginBottom:18, fontSize:15, color:'#374151', lineHeight:1.75 }}>{renderInlineLinks(block.content)}</p>;
    case 'code':
      return <CodeBlock block={block} slug={slug} />;
    case 'image':
      return (
        <figure style={{ margin:'24px 0' }}>
          <img src={block.url} alt={block.alt||''} style={{ maxWidth:'100%', borderRadius:10, display:'block', border:'1px solid #e2e8f0' }} />
          {block.caption && <figcaption style={{ fontSize:12, color:'#94a3b8', marginTop:8, textAlign:'center', lineHeight:1.5 }}>{block.caption}</figcaption>}
        </figure>
      );
    case 'video': {
      const vid = block.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
      if (!vid) return null;
      return (
        <div style={{ margin:'24px 0', borderRadius:10, overflow:'hidden', position:'relative', paddingTop:'56.25%', background:'#000' }}>
          <iframe src={`https://www.youtube.com/embed/${vid}`} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} allowFullScreen title={block.caption||'Video'} />
        </div>
      );
    }
    case 'callout': {
      const C = {
        info:    { bg:'#e6f6ff', border:'#b3e4ff', color:'#0369a1', icon:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4m0 4h.01' },
        warning: { bg:'#fffbeb', border:'#fde68a', color:'#92400e', icon:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01' },
        success: { bg:'#ecfdf5', border:'#6ee7b7', color:'#065f46', icon:'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3' },
        danger:  { bg:'#fef2f2', border:'#fecaca', color:'#991b1b', icon:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01' },
      };
      const cc = C[block.variant||'info'];
      return (
        <div style={{ margin:'20px 0', padding:'14px 18px', background:cc.bg, border:`1.5px solid ${cc.border}`, borderRadius:10, fontSize:14, color:cc.color, lineHeight:1.65, display:'flex', gap:12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}><path d={cc.icon}/></svg>
          <span>{block.content}</span>
        </div>
      );
    }
    case 'list':
      return (
        <ul style={{ margin:'12px 0 20px', paddingLeft:26 }}>
          {(block.content||'').split('\n').filter(Boolean).map((item, i) => (
            <li key={i} style={{ fontSize:15, color:'#374151', marginBottom:6, lineHeight:1.7 }}>{item}</li>
          ))}
        </ul>
      );
    case 'link': {
      const href = block.url || '';
      if (!/^https?:\/\//i.test(href)) return null;
      const isInternal = href.startsWith(window.location.origin) || href.startsWith('/');
      return (
        <div style={{ margin:'16px 0', padding:'12px 16px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#e6f6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ExternalLink size={14} color="#00A6FF" />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            {block.content && <div style={{ fontSize:13, fontWeight:600, color:'#0a0a1a', marginBottom:2 }}>{block.content}</div>}
            <a href={href} target={isInternal?'_self':'_blank'} rel={isInternal?undefined:'noopener noreferrer'} className="lvp-link" style={{ fontSize:12, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {href}
            </a>
          </div>
          {!isInternal && <ExternalLink size={12} color="#94a3b8" style={{ flexShrink:0 }} />}
        </div>
      );
    }
    case 'divider':
      return <hr style={{ border:'none', borderTop:'1.5px solid #e2e8f0', margin:'28px 0' }} />;
    default:
      return null;
  }
}
