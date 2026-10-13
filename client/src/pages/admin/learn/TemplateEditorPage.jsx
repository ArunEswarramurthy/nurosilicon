import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, ChevronRight, RotateCcw, Copy, CheckCircle } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';
import TemplatePreview from './TemplatePreview';

const PANEL_TABS = ['Layout', 'Colors', 'Typography', 'Components', 'Identity'];

export default function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('Layout');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => {
    learnAdminApi.getTemplate(id)
      .then(r => { setTemplate(r.data.template); setConfig(r.data.template.config); })
      .catch(() => navigate('/admin/learn/templates'));
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setConfigKey = (section, key, value) => {
    setConfig(c => ({ ...c, [section]: { ...c[section], [key]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await learnAdminApi.updateTemplate(id, { config });
      showToast('Template saved');
    } catch (e) {
      showToast(e.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await learnAdminApi.updateTemplate(id, { config });
      await learnAdminApi.publishTemplate(id);
      showToast('Template published!');
      learnAdminApi.getTemplate(id).then(r => setTemplate(r.data.template));
    } catch (e) {
      showToast(e.response?.data?.message || 'Publish failed', 'error');
    } finally { setPublishing(false); }
  };

  if (!config) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading template…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 72, right: 20, zIndex: 999, padding: '10px 18px', borderRadius: 10, background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5', border: `1.5px solid ${toast.type === 'error' ? '#fecaca' : '#6ee7b7'}`, color: toast.type === 'error' ? '#ef4444' : '#10B981', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1.5px solid #e8ecf4', background: '#fff', flexShrink: 0 }}>
        <button onClick={() => navigate('/admin/learn/templates')} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>← Templates</button>
        <span style={{ color: '#e8ecf4' }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a1a' }}>{template?.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: template?.status === 'published' ? '#ecfdf5' : '#fffbeb', color: template?.status === 'published' ? '#10B981' : '#F59E0B' }}>
          {template?.status}
        </span>
        <div style={{ flex: 1 }} />
        {/* Preview mode */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f4f9', borderRadius: 8, padding: 3 }}>
          {['desktop','tablet','mobile'].map(m => (
            <button key={m} onClick={() => setPreviewMode(m)} style={{ height: 26, padding: '0 10px', borderRadius: 6, border: 'none', background: previewMode === m ? '#fff' : 'transparent', color: previewMode === m ? '#0a0a1a' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', boxShadow: previewMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {m}
            </button>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button onClick={handlePublish} disabled={publishing} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <CheckCircle size={13} /> {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      {/* Three-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — settings */}
        <div style={{ width: 240, borderRight: '1.5px solid #e8ecf4', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f4f9' }}>
            {PANEL_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7, border: 'none', background: activeTab === tab ? '#e6f6ff' : 'transparent', color: activeTab === tab ? '#00A6FF' : '#374151', fontSize: 13, fontWeight: activeTab === tab ? 600 : 500, cursor: 'pointer', marginBottom: 2 }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Center — live preview */}
        <div style={{ flex: 1, background: '#f1f4f9', overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: previewMode === 'desktop' ? '100%' : previewMode === 'tablet' ? 768 : 390, maxWidth: '100%', transition: 'width 0.3s' }}>
            <TemplatePreview config={config} />
          </div>
        </div>

        {/* Right panel — property editor */}
        <div style={{ width: 280, borderLeft: '1.5px solid #e8ecf4', background: '#fff', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: 16 }}>
            {activeTab === 'Layout' && <LayoutPanel config={config} onChange={setConfigKey} />}
            {activeTab === 'Colors' && <ColorsPanel config={config} onChange={setConfigKey} />}
            {activeTab === 'Typography' && <TypographyPanel config={config} onChange={setConfigKey} />}
            {activeTab === 'Components' && <ComponentsPanel config={config} onChange={setConfigKey} />}
            {activeTab === 'Identity' && <IdentityPanel config={config} onChange={setConfigKey} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, marginTop: 16 }}>{children}</div>;
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input type="number" min={min} max={max} step={step} value={value || 0}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: 70, height: 30, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12, textAlign: 'right', outline: 'none' }}
    />
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8ecf4', cursor: 'pointer', padding: 2 }}
      />
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: 80, height: 28, padding: '0 6px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 11, fontFamily: 'monospace', outline: 'none' }}
      />
    </div>
  );
}

function LayoutPanel({ config, onChange }) {
  const l = config.layout || {};
  const d = config.dimensions || {};
  return (
    <div>
      <SectionLabel>Layout Type</SectionLabel>
      <select className="select" style={{ height: 32, marginBottom: 12 }} value={l.type || 'documentation'} onChange={e => onChange('layout', 'type', e.target.value)}>
        <option value="documentation">Documentation</option>
        <option value="split_screen">Split-Screen</option>
        <option value="video_course">Video Course</option>
        <option value="centered">Centered</option>
      </select>

      <SectionLabel>Sidebar</SectionLabel>
      <Row label="Position">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={l.sidebar || 'left'} onChange={e => onChange('layout', 'sidebar', e.target.value)}>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="none">None</option>
        </select>
      </Row>
      <Row label="Width (px)">
        <NumInput value={l.sidebarWidth || 280} onChange={v => onChange('layout', 'sidebarWidth', v)} min={180} max={480} step={10} />
      </Row>

      <SectionLabel>Spacing</SectionLabel>
      <Row label="Preset">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={l.spacing || 'balanced'} onChange={e => onChange('layout', 'spacing', e.target.value)}>
          <option value="compact">Compact</option>
          <option value="balanced">Balanced</option>
          <option value="spacious">Spacious</option>
        </select>
      </Row>

      <SectionLabel>Dimensions</SectionLabel>
      <Row label="Header height">
        <NumInput value={d.headerHeight || 56} onChange={v => onChange('dimensions', 'headerHeight', v)} min={40} max={120} />
      </Row>
      <Row label="Content padding">
        <NumInput value={d.contentPadding || 32} onChange={v => onChange('dimensions', 'contentPadding', v)} min={8} max={80} />
      </Row>
      <Row label="Card radius">
        <NumInput value={d.cardRadius || 12} onChange={v => onChange('dimensions', 'cardRadius', v)} min={0} max={32} />
      </Row>
      <Row label="Border thickness">
        <NumInput value={d.borderThickness || 1.5} onChange={v => onChange('dimensions', 'borderThickness', v)} min={0} max={4} step={0.5} />
      </Row>
      <Row label="Show footer">
        <input type="checkbox" checked={d.footerVisible !== false} onChange={e => onChange('dimensions', 'footerVisible', e.target.checked)} />
      </Row>
    </div>
  );
}

function ColorsPanel({ config, onChange }) {
  const c = config.colors || {};
  const colorFields = [
    ['pageBg', 'Page Background'],
    ['contentBg', 'Content Background'],
    ['headerBg', 'Header Background'],
    ['sidebarBg', 'Sidebar Background'],
    ['primary', 'Primary Color'],
    ['secondary', 'Secondary Color'],
    ['accent', 'Accent Color'],
    ['headingColor', 'Heading Color'],
    ['bodyColor', 'Body Text'],
    ['linkColor', 'Link Color'],
    ['buttonBg', 'Button Background'],
    ['buttonText', 'Button Text'],
    ['borderColor', 'Border Color'],
    ['progressColor', 'Progress Bar'],
  ];
  return (
    <div>
      <SectionLabel>Theme Colors</SectionLabel>
      {colorFields.map(([key, label]) => (
        <Row key={key} label={label}>
          <ColorInput value={c[key]} onChange={v => onChange('colors', key, v)} />
        </Row>
      ))}
    </div>
  );
}

function TypographyPanel({ config, onChange }) {
  const t = config.typography || {};
  const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans Pro', 'Nunito'];
  return (
    <div>
      <SectionLabel>Font Family</SectionLabel>
      <select className="select" style={{ height: 32, marginBottom: 12 }} value={t.fontFamily || 'Inter'} onChange={e => onChange('typography', 'fontFamily', e.target.value)}>
        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <SectionLabel>Sizes</SectionLabel>
      <Row label="Heading (px)"><NumInput value={t.headingSize || 24} onChange={v => onChange('typography', 'headingSize', v)} min={14} max={48} /></Row>
      <Row label="Body (px)"><NumInput value={t.bodySize || 14} onChange={v => onChange('typography', 'bodySize', v)} min={11} max={22} /></Row>
      <Row label="Student name (px)"><NumInput value={t.studentNameSize || 14} onChange={v => onChange('typography', 'studentNameSize', v)} min={10} max={24} /></Row>

      <SectionLabel>Style</SectionLabel>
      <Row label="Font weight">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={t.fontWeight || 400} onChange={e => onChange('typography', 'fontWeight', Number(e.target.value))}>
          {[300,400,500,600,700].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </Row>
      <Row label="Line height"><NumInput value={t.lineHeight || 1.6} onChange={v => onChange('typography', 'lineHeight', v)} min={1.2} max={2.2} step={0.1} /></Row>
      <Row label="Text align">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={t.textAlign || 'left'} onChange={e => onChange('typography', 'textAlign', e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="justify">Justify</option>
        </select>
      </Row>
    </div>
  );
}

function ComponentsPanel({ config, onChange }) {
  const comps = config.components || {};
  const COMP_LABELS = {
    courseHeader: 'Course Header', courseTitle: 'Course Title', courseDescription: 'Course Description',
    studentIdentity: 'Student Identity', courseProgress: 'Course Progress', curriculumSidebar: 'Curriculum Sidebar',
    lessonTitle: 'Lesson Title', richContent: 'Rich Content', images: 'Images', videoEmbeds: 'Video Embeds',
    codeBlocks: 'Code Blocks', resources: 'Resources', quizEntry: 'Quiz Entry', prevNextButtons: 'Prev/Next Buttons',
    markCompleted: 'Mark Completed', notes: 'Notes',
  };
  return (
    <div>
      <SectionLabel>Visible Components</SectionLabel>
      {Object.entries(COMP_LABELS).map(([key, label]) => (
        <Row key={key} label={label}>
          <input type="checkbox" checked={comps[key] !== false} onChange={e => onChange('components', key, e.target.checked)} />
        </Row>
      ))}
    </div>
  );
}

function IdentityPanel({ config, onChange }) {
  const si = config.studentIdentity || {};
  return (
    <div>
      <SectionLabel>Student Identity Display</SectionLabel>
      <Row label="Show name"><input type="checkbox" checked={si.showName !== false} onChange={e => onChange('studentIdentity', 'showName', e.target.checked)} /></Row>
      <Row label="Show avatar"><input type="checkbox" checked={si.showAvatar !== false} onChange={e => onChange('studentIdentity', 'showAvatar', e.target.checked)} /></Row>
      <Row label="Show progress"><input type="checkbox" checked={si.showProgress !== false} onChange={e => onChange('studentIdentity', 'showProgress', e.target.checked)} /></Row>

      <SectionLabel>Placement</SectionLabel>
      <Row label="Alignment">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={si.alignment || 'right'} onChange={e => onChange('studentIdentity', 'alignment', e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Row>
      <Row label="Font size (px)"><NumInput value={si.fontSize || 13} onChange={v => onChange('studentIdentity', 'fontSize', v)} min={10} max={24} /></Row>
      <Row label="Font weight">
        <select style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1.5px solid #e8ecf4', fontSize: 12 }} value={si.fontWeight || 600} onChange={e => onChange('studentIdentity', 'fontWeight', Number(e.target.value))}>
          {[400,500,600,700].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </Row>
      <Row label="Text color"><ColorInput value={si.color || '#0a0a1a'} onChange={v => onChange('studentIdentity', 'color', v)} /></Row>
    </div>
  );
}
