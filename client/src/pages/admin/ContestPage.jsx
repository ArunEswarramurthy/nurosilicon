import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Pencil, Trash2, Users, Eye, Save, AlertTriangle, X } from 'lucide-react';
import { contestApi } from '../../lib/contestApi';

const STATUS_STYLE = {
  draft:    { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Draft' },
  upcoming: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Upcoming' },
  live:     { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7', label: 'Live' },
  ended:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Ended' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DeleteConfirmModal({ contest, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setDeleting(true); setError('');
    try {
      await contestApi.adminDelete(contest.id);
      onDeleted();
      onClose();
    } catch (e) { setError(e.response?.data?.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:400, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'var(--danger-soft)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={16} color="var(--danger)" />
          </div>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Delete Contest</p>
        </div>
        <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.6 }}>
          Delete <strong>"{contest.title}"</strong>? This cannot be undone. Live contests and contests with submissions cannot be deleted.
        </p>
        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--danger-soft)', border:'1px solid var(--danger-border)', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:'var(--danger)' }}>
            <AlertTriangle size={13} />{error}
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ flex:1 }}>Cancel</button>
          <button onClick={confirm} disabled={deleting} className="btn btn-danger btn-sm" style={{ flex:1 }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContestFormModal({ contest, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: contest?.title || '',
    description: contest?.description || '',
    start_time: contest?.start_time ? new Date(contest.start_time).toISOString().slice(0,16) : '',
    end_time:   contest?.end_time   ? new Date(contest.end_time).toISOString().slice(0,16)   : '',
    is_public: contest?.is_public !== false,
    max_participants: contest?.max_participants || '',
    rules: contest?.rules || '',
    status: contest?.status || 'draft',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.start_time || !form.end_time) { setError('Start and end time are required'); return; }
    if (new Date(form.end_time) <= new Date(form.start_time)) { setError('End time must be after start time'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, max_participants: form.max_participants ? Number(form.max_participants) : null };
      if (contest) await contestApi.adminUpdate(contest.id, payload);
      else await contestApi.adminCreate(payload);
      onSaved(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>{contest ? 'Edit Contest' : 'New Contest'}</p>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} /></button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--danger-soft)', border:'1px solid var(--danger-border)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--danger)' }}>
              <AlertTriangle size={13} />{error}
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Weekly Contest #1" />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Description</label>
            <textarea className="textarea" value={form.description} onChange={set('description')} rows={2} placeholder="Contest description..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Start time *</label>
              <input type="datetime-local" className="input" value={form.start_time} onChange={set('start_time')} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>End time *</label>
              <input type="datetime-local" className="input" value={form.end_time} onChange={set('end_time')} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Status</label>
              <select className="select" value={form.status} onChange={set('status')}>
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Max participants</label>
              <input type="number" className="input" value={form.max_participants} onChange={set('max_participants')} placeholder="Unlimited" />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Rules</label>
            <textarea className="textarea" value={form.rules} onChange={set('rules')} rows={2} placeholder="Contest rules..." />
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:8, border:`1px solid ${form.is_public ? 'var(--brand-blue)' : 'var(--border)'}`, background: form.is_public ? 'var(--brand-blue-soft)' : 'var(--surface)' }}>
            <div onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
              style={{ position:'relative', width:36, height:20, borderRadius:99, background: form.is_public ? 'var(--brand-blue)' : 'var(--border)', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
              <span style={{ position:'absolute', top:2, width:16, height:16, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s', left: form.is_public ? 18 : 2 }} />
            </div>
            <span style={{ fontSize:13, fontWeight:500, color: form.is_public ? 'var(--brand-blue)' : 'var(--text-secondary)' }}>Public contest</span>
          </label>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:'1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Save size={12} />{saving ? 'Saving...' : contest ? 'Save changes' : 'Create contest'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContestPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState('all');

  const load = () => {
    setLoading(true);
    contestApi.adminList().then(r => setContests(r.data.contests || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const live     = contests.filter(c => c.status === 'live');
  const upcoming = contests.filter(c => c.status === 'upcoming');
  const ended    = contests.filter(c => c.status === 'ended');
  const draft    = contests.filter(c => c.status === 'draft');
  const tabMap   = { all: contests, live, upcoming, draft, ended };
  const shown    = tabMap[tab] || contests;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:'0 0 2px' }}>Contests</h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0 }}>Create and manage competitive programming contests</p>
        </div>
        <button onClick={() => setModal('new')} className="btn btn-primary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Plus size={13} /> New contest
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
        {[
          { label:'Live',     value:live.length,     color:'var(--success)' },
          { label:'Upcoming', value:upcoming.length, color:'var(--brand-blue)' },
          { label:'Draft',    value:draft.length,    color:'var(--text-muted)' },
          { label:'Total',    value:contests.length, color:'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <span style={{ fontSize:20, fontWeight:700, color, lineHeight:1 }}>{value}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id:'all',      label:`All (${contests.length})` },
          { id:'live',     label:`Live (${live.length})` },
          { id:'upcoming', label:`Upcoming (${upcoming.length})` },
          { id:'draft',    label:`Draft (${draft.length})` },
          { id:'ended',    label:`Ended (${ended.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab===t.id ? ' tab-active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th><th>Status</th><th>Start</th><th>End</th><th>Problems</th><th>Participants</th><th style={{ textAlign:'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i}>{[1,2,3,4,5,6,7].map(j => (
                  <td key={j}><div className="skeleton" style={{ height:14, width: j===1 ? 160 : 70 }} /></td>
                ))}</tr>
              ))
            ) : shown.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Trophy size={20} color="var(--text-muted)" />
                  <p>No contests found.</p>
                  <button onClick={() => setModal('new')} className="btn btn-primary btn-sm">New contest</button>
                </div>
              </td></tr>
            ) : shown.map(c => {
              const ss = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              return (
                <tr key={c.id}>
                  <td>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', margin:'0 0 1px' }}>{c.title}</p>
                    {c.description && <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{c.description}</p>}
                  </td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, display:'inline-flex', alignItems:'center', gap:4 }}>
                      {c.status==='live' && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', boxShadow:'0 0 4px var(--success)' }} />}
                      {ss.label}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{fmtDate(c.start_time)}</td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{fmtDate(c.end_time)}</td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{c.problem_count}</td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11} />{c.participant_count}</span>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                      <button onClick={() => navigate(`/admin/contests/${c.id}`)} title="Manage" className="btn btn-ghost btn-sm" style={{ width:28, height:28, padding:0 }}><Eye size={12} /></button>
                      <button onClick={() => setModal(c)} title="Edit" className="btn btn-ghost btn-sm" style={{ width:28, height:28, padding:0 }}><Pencil size={12} /></button>
                      <button onClick={() => setDeleteTarget(c)} title="Delete" className="btn btn-danger btn-sm" style={{ width:28, height:28, padding:0 }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <ContestFormModal contest={modal==='new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />}
      {deleteTarget && <DeleteConfirmModal contest={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={load} />}
    </div>
  );
}
