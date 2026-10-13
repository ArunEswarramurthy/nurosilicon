import { useEffect, useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Plus, Upload, Search, Pencil, Trash2, KeyRound, LogOut, Ban,
  ChevronLeft, ChevronRight, Cpu, ShieldAlert, ShieldCheck,
  AlertTriangle, CheckCircle2, RefreshCw, X, Users,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { adminApi } from '../../lib/adminApi';

const STATUSES   = ['active', 'inactive', 'suspended'];
const USER_EMPTY = { name: '', email: '', department: '', batch: '', section: '', student_id: '', phone: '' };

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12,
          background: t.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1.5px solid ${t.type === 'error' ? '#FECACA' : '#6EE7B7'}`,
          color: t.type === 'error' ? '#EF4444' : '#10B981',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          animation: 'slideUp 0.18s ease-out',
          minWidth: 260,
        }}>
          {t.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Confirm Dialog ── */
function ConfirmDialog({ msg, onConfirm, onCancel, danger = true }) {
  return (
    <Modal isOpen onClose={onCancel} title="Confirm action">
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>{msg}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}

/* ── UserModal ── */
function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState(user ? { ...user } : { ...USER_EMPTY, password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (user) {
        const ALLOWED = ['name', 'email', 'department', 'batch', 'section', 'phone', 'student_id', 'status'];
        const VALID_STATUSES = new Set(['active', 'inactive', 'suspended']);
        const payload = Object.fromEntries(
          ALLOWED.filter(f => form[f] !== undefined).map(f => [f, form[f]])
        );
        if (payload.status && !VALID_STATUSES.has(payload.status)) payload.status = 'active';
        await adminApi.updateUser(user.id, payload);
      } else {
        await adminApi.createUser(form);
      }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={user ? 'Edit user' : 'New user'}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--danger)' }}>
            <AlertTriangle size={13} />{error}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 10 }}>
          <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        {!user && <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 10 }}>
          <Input label="Department" value={form.department || ''} onChange={e => set('department', e.target.value)} placeholder="e.g. Computer Science" />
          <Input label="Phone" type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="9876543210" />
        </div>
        <Input label="Student ID" value={form.student_id || ''} onChange={e => set('student_id', e.target.value.toLowerCase())} placeholder="e.g. cs2024001" required={!user} />
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Status</label>
            <select className="select" value={form.status || 'active'} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── ResetPasswordModal ── */
function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try { await adminApi.resetPassword(user.id, password); setDone(true); }
    catch (err) { setError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Reset password — ${user.name}`}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--success)', marginBottom: 16 }}>
            <CheckCircle2 size={16} /> Password reset successfully.
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ fontSize: 13, color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <Input label="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Reset'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ── CsvImportModal ── */
function CsvImportModal({ onClose, onDone, toast }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const REQUIRED = ['name', 'email', 'password', 'student_id'];

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const errs = [];
        data.forEach((row, i) => { REQUIRED.forEach(f => { if (!row[f]) errs.push({ row: i + 1, error: `Missing ${f}` }); }); });
        setErrors(errs); setPreview(data); setResults(null);
      },
    });
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const { data } = await adminApi.bulkImport(preview);
      setResults(data.results);
      onDone();
      toast('Import complete', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Import failed', 'error');
    } finally { setImporting(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Import users (CSV)" wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Required columns: <code style={{ fontSize: 11, background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>name, email, password, student_id</code>
          {' '}— optional: department, batch, section, phone
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          <Button variant="secondary" onClick={() => fileRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={13} /> Choose CSV
          </Button>
          {preview && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{preview.length} rows loaded</span>}
        </div>
        {preview && !results && (
          <>
            {errors.length > 0 && (
              <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '10px 12px', maxHeight: 120, overflowY: 'auto' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', margin: '0 0 6px' }}>Validation errors ({errors.length})</p>
                {errors.map((e, i) => <p key={i} style={{ fontSize: 11, color: 'var(--danger)', margin: '2px 0' }}>Row {e.row}: {e.error}</p>)}
              </div>
            )}
            <div className="table-wrap" style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table className="table">
                <thead><tr>{['#', 'Name', 'Email', 'Student ID', 'Dept', 'Batch'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>{row.name}</td><td>{row.email}</td>
                      <td>{row.student_id}</td><td>{row.department}</td><td>{row.batch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={doImport} disabled={importing || errors.length > 0}>
                {importing ? 'Importing...' : `Import ${preview.length} rows`}
              </Button>
            </div>
          </>
        )}
        {results && (
          <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr>{['Row', 'Email', 'Status', 'Error'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.row}>
                    <td style={{ color: 'var(--text-muted)' }}>{r.row}</td>
                    <td>{r.email}</td>
                    <td><span style={{ color: r.status === 'ok' ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{r.status}</span></td>
                    <td style={{ color: 'var(--danger)', fontSize: 12 }}>{r.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Avatar ── */
function Avatar({ name }) {
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #A855F715, #00A6FF15)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#A855F7', fontSize: 10, fontWeight: 700 }}>{initials}</span>
    </div>
  );
}

/* ── ActionBtn ── */
function ActionBtn({ title, onClick, icon: Icon, danger }) {
  return (
    <button
      title={title} onClick={onClick}
      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? 'var(--danger)' : 'var(--text-muted)', transition: 'var(--t)' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'var(--danger-soft)' : 'var(--surface)'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-muted)'; }}
    >
      <Icon size={13} strokeWidth={1.5} />
    </button>
  );
}

/* ── Main Page ── */
export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [total, setTotal]     = useState(0);
  const [modal, setModal]     = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirm, setConfirm] = useState(null); // { msg, onConfirm }
  const [toasts, setToasts]   = useState([]);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const load = useCallback(async (p = page) => {
    setLoading(true); setLoadError('');
    try {
      const res = await adminApi.getUsers({ ...filters, page: p, limit: 20 });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setUsers([]);
      setLoadError(err.response?.data?.message || 'Could not load student accounts.');
    } finally { setLoading(false); }
  }, [filters, page]);

  const filtersKey = JSON.stringify(filters);
  useEffect(() => { setPage(1); load(1); }, [filtersKey]); // eslint-disable-line
  useEffect(() => { if (page !== 1) load(); }, [page]);    // eslint-disable-line

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const action = (type, user) => {
    const msgs = {
      delete:       `Delete ${user.name}? This cannot be undone.`,
      suspend:      `Suspend ${user.name}?`,
      'force-logout': `Force logout ${user.name}?`,
      unflag:       `Remove flag from ${user.name}?`,
    };
    setConfirm({
      msg: msgs[type],
      danger: type === 'delete',
      onConfirm: async () => {
        setConfirm(null);
        try {
          if (type === 'delete')        await adminApi.deleteUser(user.id);
          if (type === 'suspend')       await adminApi.suspendUser(user.id);
          if (type === 'force-logout')  await adminApi.forceLogout(user.id);
          if (type === 'unflag')        await adminApi.unflagUser(user.id);
          addToast(`${user.name} — ${type} done`);
          load();
        } catch (err) { addToast(err.response?.data?.message || 'Error', 'error'); }
      },
    });
  };

  const toggleLabPermission = async user => {
    const next = !user.can_use_lab;
    try {
      await adminApi.setUserPermissions(user.id, { can_use_lab: next });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, can_use_lab: next } : u));
      addToast(`Lab access ${next ? 'granted' : 'revoked'} for ${user.name}`);
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const STATUS_STYLE = {
    active:    { bg: 'var(--success-soft)', color: 'var(--success)',    border: 'var(--success-border)' },
    suspended: { bg: 'var(--danger-soft)',  color: 'var(--danger)',     border: 'var(--danger-border)'  },
    inactive:  { bg: 'var(--surface)',      color: 'var(--text-muted)', border: 'var(--border)'         },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Dark Hero Banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0D0D1A 0%, #0A1628 60%, #12082A 100%)',
        borderRadius: 20, padding: 'clamp(22px,3vw,32px) clamp(20px,3vw,32px)',
        border: '1px solid rgba(0,166,255,0.2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(0,229,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -40, right: 60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #00A6FF, #00E5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,166,255,0.4)' }}>
                <Users size={16} color="#fff" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00A6FF' }}>Student Accounts</span>
            </div>
            <h1 style={{ fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              Users{' '}
              <span style={{ background: 'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                ({total})
              </span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Manage, import, and control student access</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setModal('csv')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Import CSV
            </Button>
            <Button onClick={() => setModal('create')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> New user
            </Button>
          </div>
        </div>
      </div>

      {/* ── Load error ── */}
      {loadError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', border: '1px solid var(--danger-border)', borderRadius: 12, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => load()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> {loading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search name or email..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        </div>
        <select className="select" style={{ width: 140 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th className="users-col-dept">Department</th>
              <th className="users-col-id">Student ID</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5,6].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 1 ? 120 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state"><p>No users found. Try adjusting your filters.</p></div>
                </td>
              </tr>
            ) : (
              users.map(u => {
                const ss = STATUS_STYLE[u.status] || STATUS_STYLE.inactive;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.name} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                          {u.is_flagged && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <ShieldAlert size={9} /> Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="users-col-dept" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.department || '-'}</td>
                    <td className="users-col-id" style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{u.student_id || '-'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, textTransform: 'capitalize' }}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        {u.role === 'student' && (
                          <button
                            title={u.can_use_lab ? 'Revoke lab access' : 'Grant lab access'}
                            onClick={() => toggleLabPermission(u)}
                            style={{ height: 28, padding: '0 8px', borderRadius: 7, border: '1px solid var(--border)', background: u.can_use_lab ? 'var(--blue-soft)' : 'transparent', color: u.can_use_lab ? 'var(--blue)' : 'var(--text-muted)', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'var(--t)' }}
                          >
                            <Cpu size={11} /> Lab
                          </button>
                        )}
                        <ActionBtn title="Edit" onClick={() => setModal({ type: 'edit', user: u })} icon={Pencil} />
                        <ActionBtn title="Reset password" onClick={() => setModal({ type: 'reset', user: u })} icon={KeyRound} />
                        <ActionBtn title="Force logout" onClick={() => action('force-logout', u)} icon={LogOut} />
                        {u.is_flagged
                          ? <ActionBtn title="Remove flag" onClick={() => action('unflag', u)} icon={ShieldCheck} />
                          : <ActionBtn title="Suspend" onClick={() => action('suspend', u)} icon={Ban} />
                        }
                        <ActionBtn title="Delete" onClick={() => action('delete', u)} icon={Trash2} danger />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {pages} · {total} users
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', fontSize: 12 }}>
                <ChevronLeft size={13} /> Prev
              </Button>
              <Button variant="secondary" disabled={page === pages} onClick={() => setPage(p => p + 1)} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', fontSize: 12 }}>
                Next <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === 'create'      && <UserModal onClose={() => setModal(null)} onSaved={() => { setModal(null); addToast('User created'); load(); }} />}
      {modal === 'csv'         && <CsvImportModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} toast={addToast} />}
      {modal?.type === 'edit'  && <UserModal user={modal.user} onClose={() => setModal(null)} onSaved={() => { setModal(null); addToast('User updated'); load(); }} />}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog msg={confirm.msg} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <Toast toasts={toasts} />
    </div>
  );
}
