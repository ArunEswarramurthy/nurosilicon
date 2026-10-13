import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Edit2, Copy, Archive, CheckCircle } from 'lucide-react';
import { learnAdminApi } from '../../../lib/learnApi';

export default function AdminTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPreset, setNewPreset] = useState('documentation');
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    learnAdminApi.listTemplates()
      .then(r => setTemplates(r.data.templates))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await learnAdminApi.createTemplate({ name: newName.trim(), preset: newPreset });
      navigate(`/admin/learn/templates/${r.data.template.id}/edit`);
    } catch (e) {
      alert(e.response?.data?.message || 'Create failed');
    } finally { setCreating(false); }
  };

  const handleDuplicate = async (id) => {
    try {
      const r = await learnAdminApi.duplicateTemplate(id);
      navigate(`/admin/learn/templates/${r.data.template.id}/edit`);
    } catch (e) { alert('Duplicate failed'); }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this template?')) return;
    try { await learnAdminApi.archiveTemplate(id); load(); }
    catch (e) { alert('Archive failed'); }
  };

  const PRESET_LABELS = { documentation: 'Documentation', split_screen: 'Split-Screen', video_course: 'Video Course', custom: 'Custom' };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>Course Templates</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Design reusable visual templates for your courses</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 9, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,166,255,0.25)' }}>
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* New template form */}
      {showNew && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Create New Template</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 200px' }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template name" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <select className="select" style={{ width: 180 }} value={newPreset} onChange={e => setNewPreset(e.target.value)}>
              <option value="documentation">Documentation Style</option>
              <option value="split_screen">Split-Screen</option>
              <option value="video_course">Video Course</option>
              <option value="custom">Custom (blank)</option>
            </select>
            <button onClick={handleCreate} disabled={creating || !newName.trim()} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {creating ? 'Creating…' : 'Create & Edit'}
            </button>
            <button onClick={() => setShowNew(false)} style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #e8ecf4', borderRadius: 16 }}>
          <Layout size={40} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>No templates yet. Create your first template to get started.</p>
          <button onClick={() => setShowNew(true)} style={{ height: 38, padding: '0 20px', borderRadius: 9, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Create Template</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Preview strip */}
              <div style={{ height: 80, background: t.config?.colors?.headerBg || '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3].map(i => <div key={i} style={{ width: 40, height: 6, borderRadius: 3, background: i === 1 ? (t.config?.colors?.primary || '#00A6FF') : 'rgba(255,255,255,0.2)' }} />)}
                </div>
                <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: t.status === 'published' ? '#ecfdf5' : '#fffbeb', color: t.status === 'published' ? '#10B981' : '#F59E0B' }}>
                  {t.status}
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a1a', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{PRESET_LABELS[t.preset] || 'Custom'} preset</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => navigate(`/admin/learn/templates/${t.id}/edit`)} style={{ flex: 1, height: 32, borderRadius: 7, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => handleDuplicate(t.id)} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }} title="Duplicate"><Copy size={13} /></button>
                  <button onClick={() => handleArchive(t.id)} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }} title="Archive"><Archive size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
