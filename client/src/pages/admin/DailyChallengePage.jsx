import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Trash2, Search, CheckCircle2, Clock, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { labApi } from '../../lib/labApi';

const LANG_LABEL = { systemverilog:'SystemVerilog', verilog:'Verilog', c:'C', cpp:'C++', python:'Python', java:'Java', embedded_c:'Embedded C', sql:'SQL' };
const HDL_LANGS  = ['verilog','vhdl','systemverilog'];

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function ScheduleModal({ onClose, onSaved }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [date, setDate]         = useState(todayIST());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => { labApi.list({}).then(r => setProblems(r.data.problems || [])).finally(() => setLoading(false)); }, []);

  const filtered = problems.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!selected || !date) return;
    setSaving(true); setError('');
    try { await labApi.dcAdminCreate({ problem_id: selected.id, scheduled_date: date }); onSaved(); onClose(); }
    catch (e) { setError(e.response?.data?.message || 'Failed to schedule'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Schedule daily challenge" wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Scheduled date</label>
          <input type="date" value={date} min={todayIST()} onChange={e => setDate(e.target.value)} className="input" />
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filtered.map((p, i) => (
            <button key={p.id} onClick={() => setSelected(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%', background: selected?.id === p.id ? 'var(--brand-blue-soft)' : 'transparent', border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'var(--t)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: selected?.id === p.id ? 600 : 400, color: selected?.id === p.id ? 'var(--brand-blue)' : 'var(--text-primary)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{LANG_LABEL[p.language]} · {p.difficulty}</p>
              </div>
              {selected?.id === p.id && <CheckCircle2 size={14} color="var(--brand-blue)" />}
            </button>
          ))}
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={save} disabled={!selected || !date || saving} className="btn btn-primary btn-sm">
            {saving ? 'Scheduling...' : 'Schedule challenge'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DailyChallengePage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [tab, setTab]               = useState('upcoming');

  const load = () => {
    setLoading(true);
    labApi.dcAdminList().then(r => setChallenges(r.data.challenges || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async id => {
    if (!window.confirm('Remove this challenge from the schedule?')) return;
    setDeleting(id);
    await labApi.dcAdminDelete(id).catch(() => {});
    setDeleting(null);
    load();
  };

  const today    = todayIST();
  const upcoming = challenges.filter(c => c.scheduled_date >= today);
  const past     = challenges.filter(c => c.scheduled_date < today);
  const shown    = tab === 'upcoming' ? upcoming : past;

  const DIFF_STYLE = {
    easy:   { bg: 'var(--success-soft)', color: 'var(--success)', border: 'var(--success-border)' },
    medium: { bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'var(--warning-border)' },
    hard:   { bg: 'var(--danger-soft)',  color: 'var(--danger)',  border: 'var(--danger-border)'  },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Daily Challenge</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Schedule the problem of the day - resets at midnight IST</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> Schedule challenge
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'Total scheduled', value: challenges.length },
          { label: 'Upcoming',        value: upcoming.length   },
          { label: 'Past',            value: past.length       },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { id: 'past',     label: `Past (${past.length})`         },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab === t.id ? ' tab-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Problem</th>
              <th>Language</th>
              <th>Difficulty</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 2 ? 160 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <CalendarDays size={20} color="var(--text-muted)" />
                    <p>{tab === 'upcoming' ? 'No upcoming challenges scheduled.' : 'No past challenges.'}</p>
                    {tab === 'upcoming' && (
                      <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">Schedule now</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              shown.map(c => {
                const isToday = c.scheduled_date === today;
                const ds = DIFF_STYLE[c.problem?.difficulty] || DIFF_STYLE.easy;
                return (
                  <tr key={c.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {c.scheduled_date}
                    </td>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{c.title}</p>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{LANG_LABEL[c.problem?.language] || c.problem?.language}</td>
                    <td>
                      {c.problem?.difficulty && (
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 'var(--radius-sm)', background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, textTransform: 'capitalize' }}>
                          {c.problem.difficulty}
                        </span>
                      )}
                    </td>
                    <td>
                      {isToday ? (
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> Today
                        </span>
                      ) : tab === 'upcoming' ? (
                        <span style={{ fontSize: 11, color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarDays size={11} /> Scheduled
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> Past
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => del(c.id)}
                        disabled={deleting === c.id}
                        className="btn btn-danger btn-sm"
                        style={{ width: 28, height: 28, padding: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && <ScheduleModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
