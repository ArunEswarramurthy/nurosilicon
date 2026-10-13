import { useState, useEffect } from 'react';
import { Layout, Check } from 'lucide-react';
import { learnAdminApi } from '../../../../lib/learnApi';

const PRESET_INFO = {
  documentation: { label: 'Documentation Style', desc: 'Left sidebar + wide content area. Great for text-heavy technical courses.' },
  split_screen:  { label: 'Split-Screen', desc: 'Dark theme with side-by-side layout. Ideal for coding and HDL courses.' },
  video_course:  { label: 'Video Course', desc: 'Right curriculum panel with large content area. Best for video-led learning.' },
};

export default function TemplateStep({ course, onNext, saving }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(course?.template_id || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learnAdminApi.listTemplates()
      .then(r => setTemplates(r.data.templates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNext = () => {
    const t = templates.find(t => t.id === selected);
    const latestVersion = t?.versions?.[0]?.version || null;
    onNext(selected, latestVersion);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Select a published template to control how your course looks to students. You can change this later.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading templates…</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#64748b', marginBottom: 12 }}>No published templates yet.</p>
          <a href="/admin/learn/templates" style={{ color: '#00A6FF', fontSize: 13, fontWeight: 600 }}>Create a template →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14, marginBottom: 24 }}>
          {/* No template option */}
          <div
            onClick={() => setSelected(null)}
            style={{ border: `2px solid ${selected === null ? '#00A6FF' : '#e8ecf4'}`, borderRadius: 12, padding: 18, cursor: 'pointer', background: selected === null ? '#e6f6ff' : '#fff', transition: 'all 0.15s', position: 'relative' }}
          >
            {selected === null && <Check size={14} style={{ position: 'absolute', top: 10, right: 10, color: '#00A6FF' }} />}
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f4f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Layout size={18} style={{ color: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a1a', marginBottom: 4 }}>No Template</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Use the default layout without a custom template.</div>
          </div>

          {templates.map(t => {
            const info = PRESET_INFO[t.preset] || { label: t.name, desc: t.description };
            const isSelected = selected === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{ border: `2px solid ${isSelected ? '#00A6FF' : '#e8ecf4'}`, borderRadius: 12, padding: 18, cursor: 'pointer', background: isSelected ? '#e6f6ff' : '#fff', transition: 'all 0.15s', position: 'relative' }}
              >
                {isSelected && <Check size={14} style={{ position: 'absolute', top: 10, right: 10, color: '#00A6FF' }} />}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e6f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Layout size={18} style={{ color: '#00A6FF' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a1a', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{t.description || info.desc}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: t.status === 'published' ? '#ecfdf5' : '#fffbeb', color: t.status === 'published' ? '#10B981' : '#F59E0B' }}>
                  {t.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleNext} disabled={saving} style={{ height: 38, padding: '0 24px', borderRadius: 9, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {saving ? 'Saving…' : 'Continue to Curriculum →'}
        </button>
      </div>
    </div>
  );
}
