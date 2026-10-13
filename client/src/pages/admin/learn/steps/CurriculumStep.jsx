import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check, X, BookOpen, FileText, Globe, Lock, HelpCircle } from 'lucide-react';
import { learnAdminApi } from '../../../../lib/learnApi';
import { resolveUploadUrl } from '../../../../lib/uploadUrl';

export default function CurriculumStep({ courseId, course, showToast }) {
  const navigate = useNavigate();
  const [modules, setModules]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // inline add states
  const [addingModule, setAddingModule]   = useState(false);
  const [newModTitle, setNewModTitle]     = useState('');
  const [addingTopic, setAddingTopic]     = useState(null); // moduleId
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [addingLesson, setAddingLesson]   = useState(null); // topicId
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [saving, setSaving]           = useState(false);

  const load = () => {
    setLoading(true);
    learnAdminApi.listModules(courseId)
      .then(r => { setModules(r.data.modules); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [courseId]);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const handleAddModule = async () => {
    if (!newModTitle.trim()) return;
    setSaving(true);
    try {
      await learnAdminApi.createModule(courseId, { title: newModTitle.trim() });
      setNewModTitle(''); setAddingModule(false);
      load();
    } catch { showToast('Failed to add module', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddTopic = async (moduleId) => {
    if (!newTopicTitle.trim()) return;
    setSaving(true);
    try {
      await learnAdminApi.createTopic(courseId, moduleId, { title: newTopicTitle.trim() });
      setNewTopicTitle(''); setAddingTopic(null);
      load();
    } catch { showToast('Failed to add topic', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddLesson = async (moduleId, topicId) => {
    if (!newLessonTitle.trim()) return;
    setSaving(true);
    try {
      await learnAdminApi.createLesson(courseId, topicId, { title: newLessonTitle.trim() });
      setNewLessonTitle(''); setAddingLesson(null);
      load();
    } catch { showToast('Failed to add lesson', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      if (confirmDelete.type === 'module') await learnAdminApi.deleteModule(courseId, confirmDelete.id);
      if (confirmDelete.type === 'topic')  await learnAdminApi.deleteTopic(courseId, confirmDelete.id);
      if (confirmDelete.type === 'lesson') await learnAdminApi.deleteLesson(courseId, confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch { showToast('Delete failed', 'error'); }
    finally { setSaving(false); }
  };

  const handlePublishLesson = async (lessonId, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await learnAdminApi.updateLesson(courseId, lessonId, { status: newStatus });
      load();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handlePublishAll = async () => {
    setSaving(true);
    try {
      await learnAdminApi.publishAll(courseId);
      showToast('All lessons published!');
      load();
    } catch { showToast('Publish all failed', 'error'); }
    finally { setSaving(false); }
  };

  const totalLessons = modules.reduce((s, m) => s + (m.topics||[]).reduce((s2, t) => s2 + (t.lessons||[]).length, 0), 0);

  if (loading) return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e8ecf4', borderTopColor: '#00A6FF', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading curriculum...
    </div>
  );

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(5,5,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Trash2 size={20} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a1a', margin: '0 0 8px' }}>Delete {confirmDelete.type}?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              <strong>"{confirmDelete.title}"</strong> and all its content will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson editor modal */}
      {editingLesson && (
        <LessonEditorModal
          courseId={courseId}
          courseSlug={course?.slug} lessonId={editingLesson}
          onClose={() => { setEditingLesson(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>Course Curriculum</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {modules.length} module{modules.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {totalLessons > 0 && (
            <button
              onClick={handlePublishAll}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: '#ecfdf5', color: '#059669', border: '1.5px solid #6ee7b7', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <Globe size={12} /> Publish All
            </button>
          )}
          <button
            onClick={() => { setAddingModule(true); setNewModTitle(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            <Plus size={12} /> Add Module
          </button>
        </div>
      </div>

      {/* Add module inline form */}
      {addingModule && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e8ecf4' }}>
          <input
            className="input"
            style={{ flex: 1, height: 36 }}
            value={newModTitle}
            onChange={e => setNewModTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') setAddingModule(false); }}
            placeholder="Module title (e.g. SystemVerilog Fundamentals)"
            autoFocus
          />
          <button onClick={handleAddModule} disabled={saving || !newModTitle.trim()} style={{ height: 36, padding: '0 14px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? '...' : 'Add'}
          </button>
          <button onClick={() => setAddingModule(false)} style={{ height: 36, width: 36, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && !addingModule && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #e8ecf4', borderRadius: 12 }}>
          <BookOpen size={32} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No modules yet</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Add your first module to start building the curriculum.</p>
          <button onClick={() => setAddingModule(true)} style={{ height: 36, padding: '0 20px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={13} style={{ display: 'inline', marginRight: 5 }} />Add First Module
          </button>
        </div>
      )}

      {/* Module list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modules.map((mod, mi) => (
          <div key={mod.id} style={{ border: '1.5px solid #e8ecf4', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>

            {/* Module header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f8fafc', borderBottom: expanded[mod.id] ? '1px solid #e8ecf4' : 'none' }}>
              <button onClick={() => toggleExpand(mod.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, textAlign: 'left', padding: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {expanded[mod.id]
                    ? <ChevronDown size={13} color="#00A6FF" />
                    : <ChevronRight size={13} color="#00A6FF" />
                  }
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a1a' }}>M{mi + 1}: {mod.title}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                  {(mod.topics||[]).reduce((s, t) => s + (t.lessons||[]).length, 0)} lessons
                </span>
              </button>
              <button
                onClick={() => { setAddingTopic(mod.id); setNewTopicTitle(''); setExpanded(e => ({ ...e, [mod.id]: true })); }}
                title="Add topic"
                style={smBtn('#00A6FF')}
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete({ type: 'module', id: mod.id, title: mod.title })}
                title="Delete module"
                style={smBtn('#dc2626')}
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Topics */}
            {expanded[mod.id] && (
              <div style={{ padding: '10px 16px 14px' }}>

                {/* Add topic inline */}
                {addingTopic === mod.id && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1.5px solid #e8ecf4' }}>
                    <input
                      className="input"
                      style={{ flex: 1, height: 34 }}
                      value={newTopicTitle}
                      onChange={e => setNewTopicTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(mod.id); if (e.key === 'Escape') setAddingTopic(null); }}
                      placeholder="Topic title (e.g. Language Basics)"
                      autoFocus
                    />
                    <button onClick={() => handleAddTopic(mod.id)} disabled={saving || !newTopicTitle.trim()} style={{ height: 34, padding: '0 12px', borderRadius: 7, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Add</button>
                    <button onClick={() => setAddingTopic(null)} style={{ height: 34, width: 34, borderRadius: 7, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><X size={13} /></button>
                  </div>
                )}

                {(mod.topics||[]).length === 0 && addingTopic !== mod.id && (
                  <p style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>
                    No topics yet.{' '}
                    <button onClick={() => { setAddingTopic(mod.id); setNewTopicTitle(''); }} style={{ color: '#00A6FF', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Add topic</button>
                  </p>
                )}

                {(mod.topics||[]).map((topic, ti) => (
                  <div key={topic.id} style={{ marginBottom: 12 }}>
                    {/* Topic row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f1f4f9', borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                        {topic.title}
                      </span>
                      <button
                        onClick={() => { setAddingLesson(topic.id); setNewLessonTitle(''); }}
                        title="Add lesson"
                        style={smBtn('#00A6FF')}
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'topic', id: topic.id, title: topic.title })}
                        title="Delete topic"
                        style={smBtn('#dc2626')}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Add lesson inline */}
                    {addingLesson === topic.id && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #e8ecf4', marginLeft: 8 }}>
                        <input
                          className="input"
                          style={{ flex: 1, height: 32 }}
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddLesson(mod.id, topic.id); if (e.key === 'Escape') setAddingLesson(null); }}
                          placeholder="Lesson title"
                          autoFocus
                        />
                        <button onClick={() => handleAddLesson(mod.id, topic.id)} disabled={saving || !newLessonTitle.trim()} style={{ height: 32, padding: '0 12px', borderRadius: 7, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Add</button>
                        <button onClick={() => setAddingLesson(null)} style={{ height: 32, width: 32, borderRadius: 7, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><X size={12} /></button>
                      </div>
                    )}

                    {/* Lessons */}
                    {(topic.lessons||[]).map(lesson => (
                      <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 20px', borderRadius: 8, marginBottom: 3, background: '#fff', border: '1px solid #f1f4f9', transition: 'border-color 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f4f9'}
                      >
                        <FileText size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{lesson.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: lesson.status === 'published' ? '#ecfdf5' : '#fffbeb', color: lesson.status === 'published' ? '#059669' : '#d97706', flexShrink: 0 }}>
                          {lesson.status}
                        </span>
                        <button onClick={() => navigate(`/admin/learn/courses/${courseId}/lessons/${lesson.id}/edit`)} title="Edit content" style={smBtn('#00A6FF')}><Edit2 size={11} /></button>
                        <button
                          onClick={() => handlePublishLesson(lesson.id, lesson.status)}
                          title={lesson.status === 'published' ? 'Unpublish' : 'Publish'}
                          style={smBtn(lesson.status === 'published' ? '#d97706' : '#059669')}
                        >
                          {lesson.status === 'published' ? <Lock size={11} /> : <Globe size={11} />}
                        </button>
                        <button onClick={() => setConfirmDelete({ type: 'lesson', id: lesson.id, title: lesson.title })} title="Delete" style={smBtn('#dc2626')}><Trash2 size={11} /></button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const smBtn = (color) => ({
  width: 26, height: 26, borderRadius: 6,
  border: `1.5px solid ${color}22`,
  background: `${color}10`,
  color, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'all 0.12s',
});

function LessonEditorModal({ courseId, courseSlug, lessonId, onClose, showToast }) {
  const [lesson, setLesson]       = useState(null);
  const [blocks, setBlocks]       = useState([]);
  const [saving, setSaving]       = useState(false);
  const [newBlockType, setNewBlockType] = useState('paragraph');
  const [dirty, setDirty]         = useState(false);

  useEffect(() => {
    learnAdminApi.getLesson(courseId, lessonId).then(r => {
      setLesson(r.data.lesson);
      setBlocks(r.data.lesson.content_blocks || []);
    });
  }, [lessonId]);

  const addBlock = () => {
    const block = { id: Date.now().toString(), type: newBlockType, content: '' };
    if (newBlockType === 'heading')  { block.level = 2; }
    if (newBlockType === 'code')     { block.language = 'systemverilog'; }
    if (newBlockType === 'image')    { block.url = ''; block.alt = ''; block.caption = ''; }
    if (newBlockType === 'video')    { block.url = ''; block.caption = ''; }
    if (newBlockType === 'callout')  { block.variant = 'info'; }
    if (newBlockType === 'link')     { block.url = ''; }
    setBlocks(b => [...b, block]);
    setDirty(true);
  };

  const updateBlock = (id, updates) => { setBlocks(b => b.map(bl => bl.id === id ? { ...bl, ...updates } : bl)); setDirty(true); };
  const removeBlock = (id) => { setBlocks(b => b.filter(bl => bl.id !== id)); setDirty(true); };
  const moveBlock   = (id, dir) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === blocks.length - 1) return;
    const nb = [...blocks];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [nb[idx], nb[swap]] = [nb[swap], nb[idx]];
    setBlocks(nb);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await learnAdminApi.updateLesson(courseId, lessonId, { content_blocks: blocks });
      setDirty(false);
      showToast('Lesson saved');
      onClose();
    } catch (e) {
      showToast(e.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  if (!lesson) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(5,5,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, color: '#94a3b8', fontSize: 13 }}>Loading...</div>
    </div>
  );

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(5,5,11,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1.5px solid #e8ecf4', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0a0a1a' }}>{lesson.title}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{blocks.length} block{blocks.length !== 1 ? 's' : ''}{dirty ? ' · Unsaved changes' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>{courseSlug && lesson && (<button onClick={()=>window.open(`/student/learn/${courseSlug}/lesson/${lessonId}`,'_blank','noopener')} style={{display:'inline-flex',alignItems:'center',gap:6,height:34,padding:'0 14px',borderRadius:8,background:'#fff',color:'#374151',border:'1.5px solid #e8ecf4',cursor:'pointer',fontSize:13,fontWeight:500}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#00A6FF';e.currentTarget.style.color='#00A6FF';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e8ecf4';e.currentTarget.style.color='#374151';}} title='Preview as student'>Preview</button>)}{dirty && (
              <button onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: 'linear-gradient(135deg,#00A6FF,#A855F7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Blocks */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {blocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              No content blocks yet. Add your first block below.
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

          {/* Add block row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #e8ecf4' }}>
            <select className="select" style={{ flex: 1, height: 36 }} value={newBlockType} onChange={e => setNewBlockType(e.target.value)}>
              {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={addBlock} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <Plus size={13} style={{ display: 'inline', marginRight: 4 }} />Add Block
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1.5px solid #e8ecf4', flexShrink: 0 }}>
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            {dirty ? 'Discard & Close' : 'Close'}
          </button>
          <button onClick={save} disabled={saving || !dirty} style={{ height: 36, padding: '0 20px', borderRadius: 8, background: dirty ? 'linear-gradient(135deg,#00A6FF,#A855F7)' : '#e8ecf4', color: dirty ? '#fff' : '#94a3b8', border: 'none', cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save Lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({ block, index, total, onUpdate, onRemove, onMove }) {
  const TYPE_COLORS = { heading:'#7c3aed', paragraph:'#374151', code:'#0369a1', callout:'#d97706', list:'#059669', image:'#dc2626', video:'#dc2626', link:'#00A6FF', divider:'#94a3b8' };
  const color = TYPE_COLORS[block.type] || '#94a3b8';

  return (
    <div style={{ marginBottom: 10, border: '1.5px solid #e8ecf4', borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c8d0dc'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e8ecf4'}
    >
      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f4f9' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{block.type}</span>
        <button onClick={() => onMove(block.id, 'up')}  disabled={index === 0}           style={miniBtn}>↑</button>
        <button onClick={() => onMove(block.id, 'down')} disabled={index === total - 1}  style={miniBtn}>↓</button>
        <button onClick={() => onRemove(block.id)} style={{ ...miniBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}><X size={11} /></button>
      </div>

      {/* Block body */}
      <div style={{ padding: '10px 12px' }}>
        {block.type === 'heading' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" style={{ width: 72, height: 34 }} value={block.level || 2} onChange={e => onUpdate(block.id, { level: parseInt(e.target.value) })}>
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <input className="input" style={{ height: 34, fontWeight: 700 }} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Heading text..." />
          </div>
        )}
        {block.type === 'paragraph' && (
          <textarea className="textarea" rows={3} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Paragraph text... Use [link text](https://url.com) for inline links." />
        )}
        {block.type === 'code' && (
          <div>
            <select className="select" style={{ width: 160, height: 32, marginBottom: 8 }} value={block.language || 'systemverilog'} onChange={e => onUpdate(block.id, { language: e.target.value })}>
              {['systemverilog','verilog','c','cpp','python','java','javascript','sql','bash'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <textarea className="textarea" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} rows={7} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="// code here..." />
          </div>
        )}
        {block.type === 'link' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" style={{ height: 34 }} value={block.url || ''} onChange={e => onUpdate(block.id, { url: e.target.value })} placeholder="https://example.com/reference" />
            <input className="input" style={{ height: 34 }} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Link label (e.g. IEEE 1800-2017 Standard)" />
            {block.url && !/^https?:\/\//i.test(block.url) && (
              <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>URL must start with https://</p>
            )}
          </div>
        )}
        {block.type === 'image' && (
          <ImageBlockEditor block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" style={{ height: 34 }} value={block.url || ''} onChange={e => onUpdate(block.id, { url: e.target.value })} placeholder="YouTube URL (https://youtube.com/watch?v=...)" />
            <input className="input" style={{ height: 34 }} value={block.caption || ''} onChange={e => onUpdate(block.id, { caption: e.target.value })} placeholder="Caption (optional)" />
          </div>
        )}
        {block.type === 'callout' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" style={{ width: 110, height: 34 }} value={block.variant || 'info'} onChange={e => onUpdate(block.id, { variant: e.target.value })}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="danger">Danger</option>
            </select>
            <textarea className="textarea" rows={2} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="Callout text..." />
          </div>
        )}
        {block.type === 'list' && (
          <textarea className="textarea" rows={4} value={block.content || ''} onChange={e => onUpdate(block.id, { content: e.target.value })} placeholder="One item per line..." />
        )}
        {block.type === 'divider' && (
          <hr style={{ border: 'none', borderTop: '1.5px solid #e8ecf4', margin: '4px 0' }} />
        )}
      </div>
    </div>
  );
}

const miniBtn = {
  width: 22, height: 22, borderRadius: 5,
  border: '1.5px solid #e8ecf4', background: '#fff',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, color: '#64748b',
};

function ImageBlockEditor({ block, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const previewUrl = block.url ? resolveUploadUrl(block.url) : null;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return; }
    setError('');
    setUploading(true);
    try {
      const r = await learnAdminApi.uploadLessonImage(file);
      onUpdate(block.id, { url: r.data.url });
    } catch {
      setError('Upload failed. Try again.');
    } finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Upload area */}
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', border: '1.5px dashed #e8ecf4', borderRadius: 10,
          cursor: uploading ? 'not-allowed' : 'pointer', background: '#fafbfc',
          transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = '#00A6FF'; }}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e8ecf4'}
        >
          {uploading ? (
            <>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e8ecf4', borderTopColor: '#00A6FF', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Uploading...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {block.url ? 'Replace image' : 'Upload image'}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>JPG, PNG, WebP, GIF · max 8 MB</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>

      {/* Or paste URL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: '#e8ecf4' }} />
        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>or paste URL</span>
        <div style={{ flex: 1, height: 1, background: '#e8ecf4' }} />
      </div>
      <input
        className="input"
        style={{ height: 34 }}
        value={block.url || ''}
        onChange={e => { onUpdate(block.id, { url: e.target.value }); setError(''); }}
        placeholder="https://example.com/image.png"
      />

      {error && <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{error}</p>}

      {/* Preview */}
      {previewUrl && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={previewUrl}
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1.5px solid #e8ecf4', display: 'block', objectFit: 'contain', background: '#f8fafc' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => onUpdate(block.id, { url: '' })}
            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Alt + Caption */}
      <input className="input" style={{ height: 34 }} value={block.alt || ''} onChange={e => onUpdate(block.id, { alt: e.target.value })} placeholder="Alt text (for accessibility)" />
      <input className="input" style={{ height: 34 }} value={block.caption || ''} onChange={e => onUpdate(block.id, { caption: e.target.value })} placeholder="Caption (optional)" />
    </div>
  );
}
