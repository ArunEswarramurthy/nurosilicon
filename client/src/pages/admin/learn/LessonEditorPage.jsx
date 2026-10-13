import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, Eye, Save, Globe } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';
import { resolveUploadUrl } from '../../../lib/uploadUrl';

const BLOCK_TYPES = [
  { value: 'heading',   label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'code',      label: 'Code Block' },
  { value: 'link',      label: 'Reference Link' },
  { value: 'callout',   label: 'Callout / Note' },
  { value: 'list',      label: 'List' },
  { value: 'image',     label: 'Image' },
  { value: 'video',     label: 'Video Embed' },
  { value: 'divider',   label: 'Divider' },
];

export default function LessonEditorPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson]   = useState(null);
  const [course, setCourse]   = useState(null);
  const [blocks, setBlocks]   = useState([]);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [toast, setToast]     = useState(null);
  const [newBlockType, setNewBlockType] = useState('paragraph');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    learnAdminApi.getLesson(courseId, lessonId)
      .then(r => { setLesson(r.data.lesson); setBlocks(r.data.lesson.content_blocks || []); })
      .catch(() => showToast('Failed to load lesson', 'error'));
    learnAdminApi.getCourse(courseId)
      .then(r => setCourse(r.data.course))
      .catch(() => {});
  }, [courseId, lessonId]);

  const addBlock = () => {
    const block = { id: Date.now().toString(), type: newBlockType, content: '' };
    if (newBlockType === 'heading')  block.level = 2;
    if (newBlockType === 'code')     block.language = 'systemverilog';
    if (newBlockType === 'image')    { block.url = ''; block.alt = ''; block.caption = ''; }
    if (newBlockType === 'video')    { block.url = ''; block.caption = ''; }
    if (newBlockType === 'callout')  block.variant = 'info';
    if (newBlockType === 'link')     block.url = '';
    setBlocks(b => [...b, block]);
    setDirty(true);
  };

  const updateBlock = (id, updates) => { setBlocks(b => b.map(bl => bl.id === id ? { ...bl, ...updates } : bl)); setDirty(true); };
  const removeBlock = (id) => { setBlocks(b => b.filter(bl => bl.id !== id)); setDirty(true); };
  const moveBlock = (id, dir) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === blocks.length - 1) return;
    const nb = [...blocks];
    [nb[idx], nb[dir === 'up' ? idx - 1 : idx + 1]] = [nb[dir === 'up' ? idx - 1 : idx + 1], nb[idx]];
    setBlocks(nb);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await learnAdminApi.updateLesson(courseId, lessonId, { content_blocks: blocks });
      setDirty(false);
      showToast('Lesson saved successfully');
    } catch (e) {
      showToast(e.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  if (!lesson) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e8ecf4', borderTopColor: '#00A6FF', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>Loading lesson...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 68, right: 20, zIndex: 999, padding: '11px 18px', borderRadius: 10, background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5', border: `1.5px solid ${toast.type === 'error' ? '#fecaca' : '#6ee7b7'}`, color: toast.type === 'error' ? '#dc2626' : '#059669', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(`/admin/learn/courses/${courseId}/edit`)}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
              {course?.title} › Lesson Editor
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0a0a1a', margin: 0, letterSpacing: '-0.02em' }}>
              {lesson.title}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Preview */}
          {course?.slug && (
            <button
              onClick={() => navigate(`/admin/learn/preview/${course.slug}/lesson/${lessonId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 9, background: '#fff', color: '#374151', border: '1.5px solid #e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.color = '#00A6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8ecf4'; e.currentTarget.style.color = '#374151'; }}
            >
              <Eye size={13} /> Preview
            </button>
          )}
          {/* Publish toggle */}
          <button
            onClick={async () => {
              const newStatus = lesson.status === 'published' ? 'draft' : 'published';
              try {
                await learnAdminApi.updateLesson(courseId, lessonId, { status: newStatus });
                setLesson(l => ({ ...l, status: newStatus }));
                showToast(newStatus === 'published' ? 'Lesson published' : 'Lesson unpublished');
              } catch { showToast('Failed to update status', 'error'); }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 9, background: lesson.status === 'published' ? '#ecfdf5' : '#fff', color: lesson.status === 'published' ? '#059669' : '#64748b', border: `1.5px solid ${lesson.status === 'published' ? '#6ee7b7' : '#e8ecf4'}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Globe size={13} /> {lesson.status === 'published' ? 'Published' : 'Publish'}
          </button>
          {/* Save */}
          <button
            onClick={save}
            disabled={saving || !dirty}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px', borderRadius: 9, background: dirty ? 'linear-gradient(135deg,#00A6FF,#A855F7)' : '#e8ecf4', color: dirty ? '#fff' : '#94a3b8', border: 'none', cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, boxShadow: dirty ? '0 2px 10px rgba(0,166,255,0.25)' : 'none' }}
          >
            <Save size={13} /> {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 10, marginBottom: 20, fontSize: 12, color: '#64748b' }}>
        <span>{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
        <span style={{ color: '#e2e8f0' }}>·</span>
        <span style={{ color: dirty ? '#d97706' : '#059669', fontWeight: 600 }}>
          {dirty ? '● Unsaved changes' : '✓ All changes saved'}
        </span>
        <span style={{ color: '#e2e8f0' }}>·</span>
        <span>Status: <strong style={{ color: lesson.status === 'published' ? '#059669' : '#d97706' }}>{lesson.status}</strong></span>
      </div>

      {/* Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {blocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #e8ecf4', borderRadius: 12, color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No content yet</p>
            <p style={{ fontSize: 13 }}>Add your first block below to start building this lesson.</p>
          </div>
        )}
        {blocks.map((block, i) => (
          <BlockEditor
            key={block.id}
            block={block}
            index={i}
            total={blocks.length}
            onUpdate={updateBlock}
            onRemove={removeBlock}
            onMove={moveBlock}
          />
        ))}
      </div>

      {/* Add block */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px', background: '#fff', border: '1.5px dashed #e8ecf4', borderRadius: 12 }}>
        <select className="select" style={{ flex: 1, height: 38 }} value={newBlockType} onChange={e => setNewBlockType(e.target.value)}>
          {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={addBlock}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          <Plus size={13} /> Add Block
        </button>
      </div>

      {/* Quiz section */}
      <QuizSection courseId={courseId} lessonId={lessonId} showToast={showToast} />
    </div>
  );
}

/* ── Block editor ─────────────────────────────────────────────────────────── */
function BlockEditor({ block, index, total, onUpdate, onRemove, onMove }) {
  const TYPE_COLORS = { heading:'#7c3aed', paragraph:'#374151', code:'#0369a1', callout:'#d97706', list:'#059669', image:'#dc2626', video:'#dc2626', link:'#00A6FF', divider:'#94a3b8' };
  const color = TYPE_COLORS[block.type] || '#94a3b8';

  return (
    <div style={{ border: '1.5px solid #e8ecf4', borderRadius: 12, overflow: 'hidden', background: '#fff', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c8d0dc'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e8ecf4'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f4f9' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{block.type}</span>
        <button onClick={() => onMove(block.id, 'up')}  disabled={index === 0}          style={miniBtn}>↑</button>
        <button onClick={() => onMove(block.id, 'down')} disabled={index === total - 1} style={miniBtn}>↓</button>
        <button onClick={() => onRemove(block.id)} style={{ ...miniBtn, color:'#dc2626', borderColor:'#fecaca', background:'#fef2f2' }}><X size={11} /></button>
      </div>
      <div style={{ padding: '12px 14px' }}>
        {block.type === 'heading' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" style={{ width: 72, height: 36 }} value={block.level || 2} onChange={e => onUpdate(block.id, { level: parseInt(e.target.value) })}>
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <input className="input" style={{ height: 36, fontWeight: 700, fontSize: 15 }} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Heading text..." />
          </div>
        )}
        {block.type === 'paragraph' && (
          <textarea className="textarea" rows={4} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Paragraph text... Use [link text](https://url.com) for inline links." />
        )}
        {block.type === 'code' && (
          <div>
            <select className="select" style={{ width: 160, height: 34, marginBottom: 8 }} value={block.language || 'systemverilog'} onChange={e => onUpdate(block.id, { language: e.target.value })}>
              {['systemverilog','verilog','c','cpp','python','java','javascript','sql','bash'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <textarea className="textarea" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }} rows={8} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="// code here..." />
          </div>
        )}
        {block.type === 'link' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" value={block.url || ''} onChange={e => onUpdate(block.id, { url: e.target.value })} placeholder="https://example.com/reference" />
            <input className="input" value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Link label (e.g. IEEE 1800-2017 Standard)" />
            {block.url && !/^https?:\/\//i.test(block.url) && <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>URL must start with https://</p>}
          </div>
        )}
        {block.type === 'image' && <ImageBlockEditor block={block} onUpdate={onUpdate} />}
        {block.type === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" value={block.url || ''} onChange={e => onUpdate(block.id, { url: e.target.value })} placeholder="YouTube URL (https://youtube.com/watch?v=...)" />
            <input className="input" value={block.caption || ''} onChange={e => onUpdate(block.id, { caption: e.target.value })} placeholder="Caption (optional)" />
          </div>
        )}
        {block.type === 'callout' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" style={{ width: 110, height: 36 }} value={block.variant || 'info'} onChange={e => onUpdate(block.id, { variant: e.target.value })}>
              <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="danger">Danger</option>
            </select>
            <textarea className="textarea" rows={3} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Callout text..." />
          </div>
        )}
        {block.type === 'list' && (
          <textarea className="textarea" rows={5} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="One item per line..." />
        )}
        {block.type === 'divider' && <hr style={{ border: 'none', borderTop: '1.5px solid #e8ecf4', margin: '4px 0' }} />}
      </div>
    </div>
  );
}

function ImageBlockEditor({ block, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = block.url ? resolveUploadUrl(block.url) : null;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return; }
    setError(''); setUploading(true);
    try {
      const r = await learnAdminApi.uploadLessonImage(file);
      onUpdate(block.id, { url: r.data.url });
    } catch { setError('Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed #e8ecf4', borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer', background: '#fafbfc' }}
        onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = '#00A6FF'; }}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e8ecf4'}
      >
        {uploading
          ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e8ecf4', borderTopColor: '#00A6FF', animation: 'spin 0.8s linear infinite' }} /><span style={{ fontSize: 13, color: '#64748b' }}>Uploading...</span></>
          : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style={{ fontSize: 13, color: '#64748b' }}>{block.url ? 'Replace image' : 'Upload image'}</span><span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>JPG, PNG, WebP · max 8 MB</span></>
        }
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: '#e8ecf4' }} />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>or paste URL</span>
        <div style={{ flex: 1, height: 1, background: '#e8ecf4' }} />
      </div>
      <input className="input" value={block.url || ''} onChange={e => { onUpdate(block.id, { url: e.target.value }); setError(''); }} placeholder="https://example.com/image.png" />
      {error && <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{error}</p>}
      {previewUrl && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={previewUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1.5px solid #e8ecf4', display: 'block', objectFit: 'contain', background: '#f8fafc' }} onError={e => { e.target.style.display = 'none'; }} />
          <button type="button" onClick={() => onUpdate(block.id, { url: '' })} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={10} /></button>
        </div>
      )}
      <input className="input" value={block.alt || ''} onChange={e => onUpdate(block.id, { alt: e.target.value })} placeholder="Alt text (for accessibility)" />
      <input className="input" value={block.caption || ''} onChange={e => onUpdate(block.id, { caption: e.target.value })} placeholder="Caption (optional)" />
    </div>
  );
}

const miniBtn = { width: 22, height: 22, borderRadius: 5, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748b' };

/* ── Quiz Section (appended to LessonEditorPage) ─────────────────────────── */
export function QuizSection({ courseId, lessonId, showToast }) {
  const [quiz, setQuiz]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [addingQ, setAddingQ]     = useState(false);
  const [qForm, setQForm]         = useState({ type:'mcq', text:'', options:['','','',''], correct:'', marks:1, explanation:'' });
  const [savingQ, setSavingQ]     = useState(false);
  const [quizForm, setQuizForm]   = useState({ title:'', time_limit:'', passing_percentage:60, max_attempts:3, show_explanations:true });

  const load = () => {
    setLoading(true);
    learnAdminApi.listQuizzes(courseId)
      .then(r => {
        const found = r.data.quizzes.find(q => q.lesson_id === lessonId);
        setQuiz(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [courseId, lessonId]);

  const handleCreateQuiz = async () => {
    if (!quizForm.title.trim()) return;
    setSavingQuiz(true);
    try {
      await learnAdminApi.createQuiz(courseId, {
        title: quizForm.title.trim(),
        lesson_id: lessonId,
        time_limit: quizForm.time_limit ? parseInt(quizForm.time_limit) * 60 : null,
        passing_percentage: parseFloat(quizForm.passing_percentage) || 60,
        max_attempts: parseInt(quizForm.max_attempts) || 3,
        show_explanations: quizForm.show_explanations,
      });
      setCreating(false);
      showToast('Quiz created!');
      load();
    } catch (e) { showToast(e.response?.data?.message || 'Failed to create quiz', 'error'); }
    finally { setSavingQuiz(false); }
  };

  const handlePublishQuiz = async () => {
    if (!quiz) return;
    const newStatus = quiz.status === 'published' ? 'draft' : 'published';
    try {
      await learnAdminApi.updateQuiz(courseId, quiz.id, { status: newStatus });
      showToast(newStatus === 'published' ? 'Quiz published — students can now take it' : 'Quiz unpublished');
      load();
    } catch { showToast('Failed to update quiz status', 'error'); }
  };

  const handleAddQuestion = async () => {
    if (!qForm.text.trim()) return;
    if ((qForm.type === 'mcq' || qForm.type === 'true_false') && !qForm.correct) return;
    setSavingQ(true);
    try {
      const opts = qForm.type === 'true_false' ? ['True','False'] : qForm.options.filter(o => o.trim());
      await learnAdminApi.addQuestion(courseId, quiz.id, {
        type: qForm.type,
        text: qForm.text.trim(),
        options: opts,
        correct: qForm.correct,
        marks: parseFloat(qForm.marks) || 1,
        explanation: qForm.explanation.trim(),
      });
      setQForm({ type:'mcq', text:'', options:['','','',''], correct:'', marks:1, explanation:'' });
      setAddingQ(false);
      showToast('Question added');
      load();
    } catch (e) { showToast(e.response?.data?.message || 'Failed to add question', 'error'); }
    finally { setSavingQ(false); }
  };

  const handleDeleteQuestion = async (qId) => {
    try {
      await learnAdminApi.deleteQuestion(courseId, quiz.id, qId);
      showToast('Question deleted');
      load();
    } catch { showToast('Failed to delete question', 'error'); }
  };

  if (loading) return <div style={{ padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Loading quiz...</div>;

  return (
    <div style={{ marginTop: 32, borderTop: '1.5px solid #e8ecf4', paddingTop: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00A6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>Lesson Quiz</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Students see this quiz at the end of the lesson</p>
          </div>
        </div>
        {quiz && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePublishQuiz}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, background: quiz.status === 'published' ? '#ecfdf5' : '#fff', color: quiz.status === 'published' ? '#059669' : '#64748b', border: `1.5px solid ${quiz.status === 'published' ? '#6ee7b7' : '#e8ecf4'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {quiz.status === 'published' ? '✓ Published' : 'Publish Quiz'}
            </button>
          </div>
        )}
      </div>

      {/* No quiz yet */}
      {!quiz && !creating && (
        <div style={{ textAlign: 'center', padding: '32px 24px', border: '2px dashed #e8ecf4', borderRadius: 12, background: '#fafbfc' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No quiz attached</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Add a quiz to test students at the end of this lesson.</p>
          <button
            onClick={() => setCreating(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={13} /> Create Quiz
          </button>
        </div>
      )}

      {/* Create quiz form */}
      {creating && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', borderRadius: 12, padding: '20px 20px 16px' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: '0 0 14px' }}>New Quiz</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Quiz Title *</label>
              <input className="input" value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Module 1 Quiz — SV Fundamentals" />
            </div>
            <div>
              <label style={lbl}>Time Limit (minutes, 0 = none)</label>
              <input className="input" type="number" min={0} value={quizForm.time_limit} onChange={e => setQuizForm(f => ({ ...f, time_limit: e.target.value }))} placeholder="10" />
            </div>
            <div>
              <label style={lbl}>Passing Score (%)</label>
              <input className="input" type="number" min={0} max={100} value={quizForm.passing_percentage} onChange={e => setQuizForm(f => ({ ...f, passing_percentage: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Max Attempts</label>
              <input className="input" type="number" min={1} value={quizForm.max_attempts} onChange={e => setQuizForm(f => ({ ...f, max_attempts: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="show_exp" checked={quizForm.show_explanations} onChange={e => setQuizForm(f => ({ ...f, show_explanations: e.target.checked }))} style={{ width: 15, height: 15, cursor: 'pointer' }} />
              <label htmlFor="show_exp" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>Show explanations after submission</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setCreating(false)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
            <button onClick={handleCreateQuiz} disabled={savingQuiz || !quizForm.title.trim()} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {savingQuiz ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Quiz exists — show details + questions */}
      {quiz && (
        <div>
          {/* Quiz meta */}
          <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e8ecf4', marginBottom: 16, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
            <span>⏱ {quiz.time_limit ? `${Math.floor(quiz.time_limit/60)}m` : 'No time limit'}</span>
            <span>🎯 Pass: {quiz.passing_percentage}%</span>
            <span>🔄 {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''}</span>
            <span>❓ {quiz.questions?.length || 0} question{(quiz.questions?.length || 0) !== 1 ? 's' : ''}</span>
            <span>📊 {quiz.total_marks || 0} total marks</span>
          </div>

          {/* Questions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {(quiz.questions || []).length === 0 && !addingQ && (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '1.5px dashed #e8ecf4', borderRadius: 10 }}>
                No questions yet. Add your first question below.
              </div>
            )}
            {(quiz.questions || []).map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#00A6FF' }}>{i+1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a1a', marginBottom: 4, lineHeight: 1.4 }}>{q.text}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#f1f4f9', color: '#64748b', textTransform: 'uppercase' }}>{q.type}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteQuestion(q.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Add question form */}
          {addingQ ? (
            <div style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', borderRadius: 12, padding: '16px 16px 14px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: '0 0 12px' }}>Add Question</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Type */}
                <div>
                  <label style={lbl}>Question Type</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['mcq','MCQ'],['true_false','True/False'],['fill_blank','Fill Blank']].map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setQForm(f => ({ ...f, type: val, options: val === 'true_false' ? ['True','False'] : ['','','',''], correct: '' }))}
                        style={{ height: 32, padding: '0 12px', borderRadius: 7, border: `1.5px solid ${qForm.type === val ? '#00A6FF' : '#e8ecf4'}`, background: qForm.type === val ? '#e6f6ff' : '#fff', color: qForm.type === val ? '#00A6FF' : '#64748b', fontSize: 12, fontWeight: qForm.type === val ? 700 : 500, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Question text */}
                <div>
                  <label style={lbl}>Question *</label>
                  <textarea className="textarea" rows={2} value={qForm.text} onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} placeholder="Enter the question..." />
                </div>
                {/* MCQ options */}
                {qForm.type === 'mcq' && (
                  <div>
                    <label style={lbl}>Options (select the correct one)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {qForm.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name="correct_opt" checked={qForm.correct === opt && opt.trim() !== ''} onChange={() => opt.trim() && setQForm(f => ({ ...f, correct: opt }))} style={{ cursor: 'pointer', flexShrink: 0 }} />
                          <input className="input" style={{ height: 34 }} value={opt} onChange={e => { const o = [...qForm.options]; o[oi] = e.target.value; setQForm(f => ({ ...f, options: o, correct: f.correct === qForm.options[oi] ? e.target.value : f.correct })); }} placeholder={`Option ${oi+1}`} />
                        </div>
                      ))}
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Click the radio button next to the correct answer</p>
                    </div>
                  </div>
                )}
                {/* True/False */}
                {qForm.type === 'true_false' && (
                  <div>
                    <label style={lbl}>Correct Answer</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['True','False'].map(v => (
                        <button key={v} type="button" onClick={() => setQForm(f => ({ ...f, correct: v }))}
                          style={{ height: 34, padding: '0 20px', borderRadius: 8, border: `1.5px solid ${qForm.correct === v ? '#059669' : '#e8ecf4'}`, background: qForm.correct === v ? '#ecfdf5' : '#fff', color: qForm.correct === v ? '#059669' : '#64748b', fontSize: 13, fontWeight: qForm.correct === v ? 700 : 500, cursor: 'pointer' }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Fill blank */}
                {qForm.type === 'fill_blank' && (
                  <div>
                    <label style={lbl}>Correct Answer</label>
                    <input className="input" value={qForm.correct} onChange={e => setQForm(f => ({ ...f, correct: e.target.value }))} placeholder="Exact answer (case-insensitive)" />
                  </div>
                )}
                {/* Marks + Explanation */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Marks</label>
                    <input className="input" type="number" min={0.5} step={0.5} value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Explanation (shown after submission)</label>
                    <input className="input" value={qForm.explanation} onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))} placeholder="Why is this the correct answer?" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={() => setAddingQ(false)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
                <button onClick={handleAddQuestion} disabled={savingQ || !qForm.text.trim()} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {savingQ ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingQ(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: '#fff', color: '#374151', border: '1.5px solid #e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.color = '#00A6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8ecf4'; e.currentTarget.style.color = '#374151'; }}
            >
              <Plus size={13} /> Add Question
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
