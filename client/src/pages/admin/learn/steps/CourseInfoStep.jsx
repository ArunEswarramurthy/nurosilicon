import { useState, useEffect } from 'react';
import { X, Upload, Target, Tag } from 'lucide-react';

const CATEGORIES = ['VLSI', 'Embedded Systems', 'Programming', 'Digital Design', 'Analog Design', 'Core Engineering', 'Other'];

export default function CourseInfoStep({ course, onSave, saving }) {
  const [form, setForm] = useState({
    title: '', summary: '', description: '', category: '',
    difficulty: 'beginner', estimated_duration: '',
    learning_objectives: [], prerequisites: [], tags: [],
  });
  const [coverFile, setCoverFile]   = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [objInput, setObjInput]     = useState('');
  const [tagInput, setTagInput]     = useState('');
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (course) {
      setForm({
        title:               course.title || '',
        summary:             course.summary || '',
        description:         course.description || '',
        category:            course.category || '',
        difficulty:          course.difficulty || 'beginner',
        estimated_duration:  course.estimated_duration || '',
        learning_objectives: course.learning_objectives || [],
        prerequisites:       course.prerequisites || [],
        tags:                course.tags || [],
      });
      if (course.cover_image_url) setCoverPreview(course.cover_image_url);
    }
  }, [course]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErrors(e => ({ ...e, cover: 'Image must be under 5 MB' })); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    setErrors(e => ({ ...e, cover: '' }));
  };

  const addObj = () => {
    if (!objInput.trim()) return;
    set('learning_objectives', [...form.learning_objectives, objInput.trim()]);
    setObjInput('');
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (form.tags.includes(tagInput.trim())) { setTagInput(''); return; }
    set('tags', [...form.tags, tagInput.trim()]);
    setTagInput('');
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Course title is required';
    if (form.title.trim().length > 300) e.title = 'Title must be under 300 characters';
    if (form.summary.length > 500) e.summary = 'Summary must be under 500 characters';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
      else fd.append(k, v);
    });
    if (coverFile) fd.append('cover_image', coverFile);
    onSave(fd);
  };

  const F = ({ label, error, required, children, hint }) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: error ? '#dc2626' : '#374151', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {error}
      </p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>

        {/* Title — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <F label="Course Title" required error={errors.title}>
            <input
              className={`input${errors.title ? ' input-error' : ''}`}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. SystemVerilog for VLSI Design"
              style={{ fontSize: 15, height: 42, fontWeight: 500 }}
            />
          </F>
        </div>

        {/* Category */}
        <F label="Category">
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select category…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>

        {/* Difficulty */}
        <F label="Difficulty Level">
          <div style={{ display: 'flex', gap: 8 }}>
            {['beginner', 'intermediate', 'advanced'].map(d => {
              const active = form.difficulty === d;
              const colors = { beginner: '#059669', intermediate: '#d97706', advanced: '#dc2626' };
              return (
                <button
                  key={d} type="button"
                  onClick={() => set('difficulty', d)}
                  style={{
                    flex: 1, height: 38, borderRadius: 8, border: `1.5px solid ${active ? colors[d] : '#e8ecf4'}`,
                    background: active ? `${colors[d]}12` : '#fff',
                    color: active ? colors[d] : '#64748b',
                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    textTransform: 'capitalize', transition: 'all 0.15s',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </F>

        {/* Summary — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <F label="Short Summary" error={errors.summary} hint="Shown on course cards. Keep it under 120 characters for best display.">
            <input
              className={`input${errors.summary ? ' input-error' : ''}`}
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="One-line description shown in course cards"
              maxLength={500}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: form.summary.length > 450 ? '#d97706' : '#94a3b8', marginTop: 3 }}>
              {form.summary.length}/500
            </div>
          </F>
        </div>

        {/* Description — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <F label="Full Description" hint="Shown on the course overview page.">
            <textarea
              className="textarea"
              rows={4}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Detailed course description — what students will learn, prerequisites, and course structure…"
            />
          </F>
        </div>

        {/* Duration */}
        <F label="Estimated Duration" hint="Total minutes (e.g. 480 = 8 hours)">
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type="number" min={0} max={99999}
              value={form.estimated_duration}
              onChange={e => set('estimated_duration', e.target.value)}
              placeholder="480"
              style={{ paddingRight: 48 }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', pointerEvents: 'none' }}>min</span>
          </div>
        </F>

        {/* Cover image */}
        <F label="Cover Image" error={errors.cover} hint="JPG, PNG or WebP · max 5 MB · recommended 1280×720">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed #e8ecf4', borderRadius: 10, cursor: 'pointer', background: '#fafbfc', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#00A6FF'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e8ecf4'}
          >
            <Upload size={16} color="#94a3b8" />
            <span style={{ fontSize: 13, color: '#64748b' }}>{coverFile ? coverFile.name : 'Click to upload image'}</span>
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {coverPreview && (
            <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
              <img src={coverPreview} alt="cover preview" style={{ height: 90, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #e8ecf4' }} />
              <button
                type="button"
                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <X size={10} />
              </button>
            </div>
          )}
        </F>

        {/* Learning objectives — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <F label="Learning Objectives" hint="What students will be able to do after completing this course">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Target size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32 }}
                  value={objInput}
                  onChange={e => setObjInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addObj())}
                  placeholder="e.g. Write synthesisable RTL using always_ff"
                />
              </div>
              <button type="button" onClick={addObj} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
            {form.learning_objectives.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.learning_objectives.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e8ecf4' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#00A6FF' }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{o}</span>
                    <button type="button" onClick={() => set('learning_objectives', form.learning_objectives.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </F>
        </div>

        {/* Tags — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <F label="Tags" hint="Keywords for search and discovery">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Tag size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32 }}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="e.g. verilog, rtl, fpga"
                />
              </div>
              <button type="button" onClick={addTag} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: '#f1f4f9', color: '#374151', border: '1.5px solid #e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.tags.map((t, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#f3e6fd', color: '#7c3aed', fontSize: 12, fontWeight: 500, border: '1px solid #d9a8f8' }}>
                    #{t}
                    <button type="button" onClick={() => set('tags', form.tags.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, display: 'flex' }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </F>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1.5px solid #f1f4f9', marginTop: 8 }}>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          {Object.keys(errors).length > 0 ? (
            <span style={{ color: '#dc2626' }}>Please fix the errors above before continuing.</span>
          ) : 'All fields except Title are optional.'}
        </p>
        <button
          type="submit"
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 24px', borderRadius: 10, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#00A6FF,#A855F7)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, boxShadow: saving ? 'none' : '0 2px 10px rgba(0,166,255,0.25)', transition: 'all 0.15s' }}
        >
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </form>
  );
}
