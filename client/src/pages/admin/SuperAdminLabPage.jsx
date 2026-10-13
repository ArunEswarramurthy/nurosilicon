import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Activity, Cpu, Search, Database, Eye, EyeOff, Layers, AlertTriangle, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { labApi } from '../../lib/labApi';

const LANG_LABEL = { systemverilog:'SystemVerilog', verilog:'Verilog', c:'C', cpp:'C++', python:'Python', java:'Java', embedded_c:'Embedded C', sql:'MySQL/SQL' };
const LANGS = ['all','systemverilog','verilog','c','cpp','python','java','embedded_c','sql'];
const DIFF_STYLE = {
  easy:   { bg:'var(--success-soft)',  color:'var(--success)',  border:'var(--success-border)' },
  medium: { bg:'var(--warning-soft)',  color:'var(--warning)',  border:'var(--warning-border)' },
  hard:   { bg:'var(--danger-soft)',   color:'var(--danger)',   border:'var(--danger-border)'  },
};

function HealthModal({ onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { labApi.health().then(r => setData(r.data.compilers)).catch(() => setData({})); }, []);
  const items = [
    { key:'iverilog', label:'iverilog', desc:'Verilog / SystemVerilog' },
    { key:'gcc',      label:'gcc',      desc:'C Language'              },
    { key:'gpp',      label:'g++',      desc:'C++ Language'            },
    { key:'python3',  label:'python3',  desc:'Python Language'         },
    { key:'java',     label:'java',     desc:'Java Language'           },
    { key:'avr_gcc',  label:'avr-gcc',  desc:'Embedded C'              },
    { key:'mysql',    label:'mysql',    desc:'MySQL / SQL'             },
  ];
  return (
    <Modal isOpen onClose={onClose} title="Compiler health check">
      {!data ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Checking...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: data[key] ? 'var(--success-soft)' : 'var(--danger-soft)', border: `1px solid ${data[key] ? 'var(--success-border)' : 'var(--danger-border)'}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1px' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
              </div>
              {data[key]
                ? <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Installed</span>
                : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={12} /> Not found</span>
              }
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function GroupModal({ group, onClose, onSaved }) {
  const [name, setName]   = useState(group?.name || '');
  const [desc, setDesc]   = useState(group?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) { setError('Group name is required'); return; }
    setSaving(true); setError('');
    try {
      if (group) await labApi.updateGroup(group.id, { name, description: desc });
      else await labApi.createGroup({ name, description: desc });
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={group ? 'Edit group' : 'New group'}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13, color: 'var(--danger)' }}>
            <AlertTriangle size={13} />{error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Group name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Verilog / SystemVerilog" required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Description</label>
          <input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AssignProblemsModal({ group, onClose, onSaved }) {
  const [allProblems, setAllProblems] = useState([]);
  const [pLoading, setPLoading]       = useState(true);
  const [selected, setSelected] = useState(new Set(group.problem_ids || []));
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    labApi.list({}).then(r => setAllProblems(r.data.problems || [])).catch(() => {}).finally(() => setPLoading(false));
  }, []);

  const filtered = allProblems.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));
  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    setSaving(true);
    try {
      const currentIds = new Set(group.problem_ids || []);
      const toAdd    = [...selected].filter(id => !currentIds.has(id));
      const toRemove = [...currentIds].filter(id => !selected.has(id));
      await labApi.assignGroup(group.id, { problem_ids: toAdd, remove_ids: toRemove });
      onSaved(); onClose();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Assign problems - ${group.name}`} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setSelected(new Set(filtered.map(p => p.id)))} className="btn btn-secondary btn-sm">Select all</button>
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm">Clear</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{selected.size} selected</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          {pLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filtered.map((p, i) => {
            const isSel = selected.has(p.id);
            return (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: isSel ? 'var(--brand-blue-soft)' : 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'var(--t)' }}>
                <input type="checkbox" checked={isSel} onChange={() => toggle(p.id)} style={{ accentColor: 'var(--brand-blue)', width: 14, height: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: isSel ? 600 : 400, color: isSel ? 'var(--brand-blue)' : 'var(--text-primary)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{LANG_LABEL[p.language] || p.language} · {p.difficulty}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving...' : `Save - ${selected.size} problems`}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function SuperAdminLabPage() {
  const navigate = useNavigate();
  const [problems, setProblems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lang, setLang]             = useState('all');
  const [diff, setDiff]             = useState('all');
  const [search, setSearch]         = useState('');
  const [showHealth, setShowHealth] = useState(false);
  const [seeding, setSeeding]       = useState(false);
  const [groups, setGroups]         = useState([]);
  const [groupModal, setGroupModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (lang !== 'all') params.language   = lang;
    if (diff !== 'all') params.difficulty = diff;
    labApi.list(params).then(r => setProblems(r.data.problems || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const loadGroups = () => { labApi.groups().then(r => setGroups(r.data.groups || [])).catch(() => {}); };
  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { load(); }, [lang, diff]); // eslint-disable-line

  const toggleActive = async p => {
    await labApi.update(p.id, { is_active: !p.is_active }).catch(() => {});
    load();
  };

  const deleteProblem = async p => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    await labApi.remove(p.id).catch(() => {});
    load();
  };

  const deleteGroup = async g => {
    if (!window.confirm(`Delete group "${g.name}"?`)) return;
    await labApi.removeGroup(g.id).catch(() => {});
    loadGroups();
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed default problems? Existing ones will be skipped.')) return;
    setSeeding(true);
    try { const r = await labApi.seed(); alert(r.data.message); load(); }
    catch (err) { alert(err.response?.data?.message || 'Seed failed'); }
    finally { setSeeding(false); }
  };

  const filtered = problems.filter(p => {
    return !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.category || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Engineering Lab</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Manage all lab problems - Verilog, DSA, Embedded C, SQL</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHealth(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={13} /> Health
          </button>
          <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={13} /> {seeding ? 'Seeding...' : 'Seed defaults'}
          </button>
          <button onClick={() => navigate('/admin/lab/new')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> New problem
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total problems', value: problems.length },
          { label: 'Active',         value: problems.filter(p => p.is_active).length },
          { label: 'Inactive',       value: problems.filter(p => !p.is_active).length },
          { label: 'Groups',         value: groups.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Groups */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={15} color="var(--brand-blue)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Lab groups</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({groups.length})</span>
          </div>
          <button onClick={() => setGroupModal('create')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={12} /> New group
          </button>
        </div>
        {groups.length === 0 ? (
          <div className="empty-state">
            <Layers size={20} color="var(--text-muted)" />
            <p>No groups yet. Create groups to organise problems by topic.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1, background: 'var(--border)' }}>
            {groups.map(g => (
              <div key={g.id} style={{ background: 'var(--bg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.problem_count || 0} problems</span>
                </div>
                {g.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{g.description}</p>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setAssignModal(g)} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 11 }}>Assign problems</button>
                  <button onClick={() => setGroupModal(g)} className="btn btn-secondary btn-sm" style={{ width: 28, padding: 0 }}><Pencil size={11} /></button>
                  <button onClick={() => deleteGroup(g)} className="btn btn-danger btn-sm" style={{ width: 28, padding: 0 }}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 150 }} value={lang} onChange={e => setLang(e.target.value)}>
          <option value="all">All languages</option>
          {LANGS.filter(l => l !== 'all').map(l => <option key={l} value={l}>{LANG_LABEL[l] || l}</option>)}
        </select>
        <select className="select" style={{ width: 130 }} value={diff} onChange={e => setDiff(e.target.value)}>
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} problems</span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Language</th>
              <th>Difficulty</th>
              <th>Level</th>
              <th>Marks</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 2 ? 160 : 60 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <Cpu size={20} color="var(--text-muted)" />
                    <p>No problems found. Try adjusting your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const ds = DIFF_STYLE[p.difficulty] || DIFF_STYLE.easy;
                return (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.6 }}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.question_no ? `Q${p.question_no}` : idx + 1}</td>
                    <td>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 1px' }}>{p.title}</p>
                        {p.category && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{p.category}</p>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{LANG_LABEL[p.language] || p.language}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 'var(--radius-sm)', background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, textTransform: 'capitalize' }}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>L{p.level}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.marks}</td>
                    <td>
                      {p.is_active
                        ? <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={11} /> Active</span>
                        : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={11} /> Inactive</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate(`/admin/lab/${p.id}/edit`)} title="Edit" className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0 }}><Pencil size={12} /></button>
                        <button onClick={() => toggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'} className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0 }}>
                          {p.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => deleteProblem(p)} title="Delete" className="btn btn-danger btn-sm" style={{ width: 28, height: 28, padding: 0 }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showHealth  && <HealthModal onClose={() => setShowHealth(false)} />}
      {groupModal  && <GroupModal group={groupModal === 'create' ? null : groupModal} onClose={() => setGroupModal(null)} onSaved={() => { setGroupModal(null); loadGroups(); }} />}
      {assignModal && <AssignProblemsModal group={assignModal} onClose={() => setAssignModal(null)} onSaved={() => { setAssignModal(null); loadGroups(); load(); }} />}
    </div>
  );
}
