import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Clock, Users, CheckCircle2, Search,
  CalendarDays, BarChart2, ArrowRight, Wifi,
  AlertCircle, RefreshCw, Lock, ChevronRight,
} from 'lucide-react';
import { contestApi } from '../../lib/contestApi';

const STATUS = {
  live:     { label: 'Live',     bg: '#ecfdf5', color: '#059669', border: '#6ee7b7', dot: true },
  upcoming: { label: 'Upcoming', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: false },
  ended:    { label: 'Ended',    bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', dot: false },
  draft:    { label: 'Draft',    bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', dot: false },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start, end) {
  if (!start || !end) return '—';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.ended;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 5px ${s.color}` }} />}
      {s.label}
    </span>
  );
}

function RegisterModal({ contest, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setLoading(true); setError('');
    try {
      await contestApi.register(contest.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#A855F7,#00A6FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Register for Contest</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{contest.title}</p>
          </div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Start</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtDate(contest.start_time)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Duration</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtDuration(contest.start_time, contest.end_time)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Problems</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{contest.problem_count ?? '—'}</span>
          </div>
        </div>
        {contest.rules && (
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <strong>Rules:</strong> {contest.rules}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirm} disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#A855F7,#00A6FF)', color: loading ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Registering...' : 'Confirm Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContestCard({ contest, onRegister, navigate }) {
  const s = STATUS[contest.status] || STATUS.ended;
  const isLive = contest.status === 'live';
  const isUpcoming = contest.status === 'upcoming';
  const isEnded = contest.status === 'ended';

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8ecf4'; }}
      onClick={() => navigate('/student/contests/' + contest.id)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contest.title}</p>
          {contest.description && <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contest.description}</p>}
        </div>
        <StatusBadge status={contest.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={12} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(contest.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDuration(contest.start_time, contest.end_time)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={12} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#64748b' }}>{contest.problem_count ?? 0} problems</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={12} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#64748b' }}>{contest.participant_count ?? 0} registered</span>
        </div>
      </div>

      {contest.is_registered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#059669' }}>
          <CheckCircle2 size={12} /> Registered
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }} onClick={e => e.stopPropagation()}>
        {isLive && contest.is_registered && (
          <button onClick={() => navigate('/student/contests/' + contest.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#A855F7,#00A6FF)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            Enter Contest <ArrowRight size={12} />
          </button>
        )}
        {(isLive || isUpcoming) && !contest.is_registered && (
          <button onClick={() => onRegister(contest)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #A855F7', background: '#faf5ff', color: '#A855F7', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Register
          </button>
        )}
        {isUpcoming && contest.is_registered && (
          <button onClick={() => navigate('/student/contests/' + contest.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            View Details
          </button>
        )}
        {isEnded && (
          <button onClick={() => navigate('/student/contests/' + contest.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            View Results
          </button>
        )}
        <button onClick={() => navigate('/student/contests/' + contest.id)}
          style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ContestListPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [registerModal, setRegisterModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await contestApi.list();
      setContests(r.data.contests || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load contests.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const live     = contests.filter(c => c.status === 'live');
  const upcoming = contests.filter(c => c.status === 'upcoming');
  const mine     = contests.filter(c => c.is_registered);
  const ended    = contests.filter(c => c.status === 'ended');

  const tabMap = { all: contests, live, upcoming, mine, ended };
  const shown = (tabMap[tab] || contests).filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: 'all',      label: 'All',        count: contests.length },
    { id: 'live',     label: 'Live',       count: live.length },
    { id: 'upcoming', label: 'Upcoming',   count: upcoming.length },
    { id: 'mine',     label: 'My Contests',count: mine.length },
    { id: 'ended',    label: 'Completed',  count: ended.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Contests</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Compete, solve problems, and climb the leaderboard.</p>
        </div>
        {live.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 99, background: '#ecfdf5', border: '1px solid #6ee7b7', fontSize: 12, fontWeight: 700, color: '#059669' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', boxShadow: '0 0 6px #059669' }} />
            {live.length} contest{live.length > 1 ? 's' : ''} live now
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
        {[
          { icon: Wifi,         label: 'Live',       value: live.length,     color: '#059669', bg: '#ecfdf5' },
          { icon: CalendarDays, label: 'Upcoming',   value: upcoming.length, color: '#2563eb', bg: '#eff6ff' },
          { icon: CheckCircle2, label: 'Registered', value: mine.length,     color: '#A855F7', bg: '#faf5ff' },
          { icon: Trophy,       label: 'Completed',  value: ended.length,    color: '#64748b', bg: '#f8fafc' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {loading ? <span style={{ display: 'inline-block', width: 28, height: 18, borderRadius: 4, background: '#f1f5f9' }} /> : value}
              </p>
              <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={15} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ height: 32, padding: '0 12px', borderRadius: 8, border: 'none', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#0f172a' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: 12, cursor: 'pointer', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
              {t.label}
              {t.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: tab === t.id ? '#A855F7' : '#e2e8f0', color: tab === t.id ? '#fff' : '#64748b' }}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contests..."
            style={{ height: 34, paddingLeft: 30, paddingRight: 12, width: 200, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#A855F7'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        </div>
      </div>

      {/* Live contests featured */}
      {tab === 'all' && live.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', boxShadow: '0 0 6px #059669', display: 'inline-block' }} /> Live Now
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap: 14 }}>
            {live.map(c => <ContestCard key={c.id} contest={c} onRegister={setRegisterModal} navigate={navigate} />)}
          </div>
        </div>
      )}

      {/* Main grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, padding: '18px 20px', height: 180 }}>
              {[100,60,80,40].map((w,j) => <div key={j} style={{ height: 13, width: w, borderRadius: 5, background: '#f1f5f9', marginBottom: 10 }} />)}
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <Trophy size={36} style={{ margin: '0 auto 12px', color: '#e2e8f0' }} />
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: '#64748b' }}>No contests found</p>
          <p style={{ fontSize: 12, margin: 0 }}>{search ? `No results for "${search}"` : `No ${tab === 'all' ? '' : tab} contests yet.`}</p>
        </div>
      ) : (
        <div>
          {tab === 'all' && live.length > 0 && upcoming.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Upcoming</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap: 14 }}>
            {(tab === 'all' ? shown.filter(c => c.status !== 'live') : shown).map(c => (
              <ContestCard key={c.id} contest={c} onRegister={setRegisterModal} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {registerModal && (
        <RegisterModal
          contest={registerModal}
          onClose={() => setRegisterModal(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
