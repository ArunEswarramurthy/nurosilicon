import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Clock, Users, CheckCircle2, Search,
  Wifi, CalendarDays, BarChart2, ChevronDown,
  ArrowRight, MoreHorizontal,
} from 'lucide-react';
import StudentRequestError, { getStudentRequestError } from '../../components/ui/StudentRequestError';
import { contestApi } from '../../lib/contestApi';

const STATUS_STYLE = {
  live:     { label: 'Live',     bg: '#ecfdf5', color: '#10b981', border: '#6ee7b7' },
  upcoming: { label: 'Upcoming', bg: '#e6f6ff', color: '#00A6FF', border: '#b3e4ff' },
  draft:    { label: 'Draft',    bg: '#f1f4f9', color: '#94a3b8', border: '#e2e8f0' },
  ended:    { label: 'Ended',    bg: '#f1f4f9', color: '#94a3b8', border: '#e2e8f0' },
};

function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    '\n' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start, end) {
  if (!start || !end) return '-';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function fmtDays(start, end) {
  if (!start || !end) return '';
  const days = Math.round((new Date(end) - new Date(start)) / 86400000);
  return `(${days} day${days !== 1 ? 's' : ''})`;
}

export default function ContestListPage() {
  const navigate = useNavigate();
  const [contests, setContests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [registering, setRegistering] = useState(null);
  const [tab, setTab]                 = useState('all');
  const [search, setSearch]           = useState('');
  const [loadError, setLoadError]     = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await contestApi.list();
      setContests(response.data.contests || []);
    } catch (error) {
      setLoadError(getStudentRequestError(error, 'Could not load contests.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const register = async id => {
    setRegistering(id);
    try { await contestApi.register(id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Registration failed'); }
    finally { setRegistering(null); }
  };

  const filtered = contests
    .filter(c => tab === 'all' || c.status === tab)
    .filter(c => !search || c.title?.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    live:     contests.filter(c => c.status === 'live').length,
    upcoming: contests.filter(c => c.status === 'upcoming').length,
    ended:    contests.filter(c => c.status === 'ended').length,
  };

  const TABS = [
    { id: 'all',      label: 'All Contests' },
    { id: 'live',     label: 'Live'         },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'ended',    label: 'Ended'        },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'Inter, sans-serif' }}>

      {/* -- HERO BANNER -- */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)',
        minHeight: 170, display: 'flex', alignItems: 'stretch',
        border: '1.5px solid #1a1a2e',
      }}>
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 180, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Left text */}
        <div style={{ flex: 1, padding: '22px 28px', position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Contests</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Compete. Learn.{' '}
            <span style={{ background: 'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Grow.
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: '0 0 20px' }}>
            Participate in coding contests, test your skills, and climb the leaderboard.
          </p>
          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: Wifi,        label: 'Real-time coding contests', color: '#00A6FF' },
              { icon: BarChart2,   label: 'Improve problem solving skills', color: '#A020F0' },
              { icon: Users,       label: 'Compete with peers', color: '#00E5FF' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} strokeWidth={1.6} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right decorative */}
        <div style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', padding: '20px 24px 20px 0', position: 'relative', zIndex: 2 }}>
          {['Practice','Simulate','Compete','Grow'].map((w, i) => (
            <p key={w} style={{ margin: '1px 0', fontSize: 16 + i * 2, fontWeight: 800, color: i % 2 === 0 ? '#fff' : 'rgba(255,255,255,0.22)', letterSpacing: '-0.03em', lineHeight: 1.1, textAlign: 'right' }}>{w}</p>
          ))}
        </div>
      </div>

      {loadError && <StudentRequestError message={loadError} onRetry={load} retrying={loading} />}

      {/* -- STAT BOXES -- */}
      <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap' }}>
        {[
          { icon: Wifi,        label: 'Live Contests',    sub: 'Happening now',           value: counts.live,     color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
          { icon: CalendarDays,label: 'Upcoming',         sub: 'Register and participate', value: counts.upcoming, color: '#00A6FF', bg: '#e6f6ff', border: '#b3e4ff' },
          { icon: Clock,       label: 'Ended',            sub: 'View past contests',       value: counts.ended,    color: '#94a3b8', bg: '#f1f4f9', border: '#e2e8f0' },
          { icon: BarChart2,   label: 'My Rank',          sub: 'Participate to get ranked', value: '-',            color: '#A020F0', bg: '#f3e6fd', border: '#d9a8f8' },
        ].map(({ icon: Icon, label, sub, value, color, bg, border }, i, arr) => (
          <div key={label} style={{ flex: 1, minWidth: 140, padding: '14px 18px', borderRight: i < arr.length - 1 ? '1px solid #e8ecf4' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} strokeWidth={1.6} />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0a0a1a', margin: 0, lineHeight: 1, letterSpacing: '-0.04em' }}>{loading ? <span className="skeleton" style={{ display: 'inline-block', width: 32, height: 22, borderRadius: 5 }} /> : value}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0a0a1a', margin: '2px 0 1px' }}>{label}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* -- TABS + SEARCH + SORT -- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Tabs pill group */}
        <div style={{ display: 'flex', background: '#f1f4f9', borderRadius: 10, padding: 3, gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                height: 32, padding: '0 14px', borderRadius: 8, border: 'none',
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#0a0a1a' : '#94a3b8',
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: 13, cursor: 'pointer',
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
                borderBottom: tab === t.id ? '2px solid #00A6FF' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: tab === t.id ? '#00A6FF' : '#e2e8f0', color: tab === t.id ? '#fff' : '#94a3b8' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            style={{ height: 34, paddingLeft: 30, paddingRight: 12, width: 200, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, color: '#0a0a1a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            placeholder="Search contests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#00A6FF'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Sort */}
        <button style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, color: '#4a5568', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif' }}>
          Latest First <ChevronDown size={13} color="#94a3b8" />
        </button>
      </div>

      {/* -- TABLE -- */}
      <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf4' }}>
              {['CONTEST','STATUS','START','DURATION','PROBLEMS','PARTICIPANTS','ACTION'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f4f9' }}>
                  {[180,80,100,80,70,90,100].map((w,j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div className="skeleton" style={{ height: 13, width: w, borderRadius: 5 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f4f9', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={20} color="#94a3b8" strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No contests found{tab !== 'all' ? ` in "${tab}"` : ''}.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => {
                const s = STATUS_STYLE[c.status] || STATUS_STYLE.ended;
                const dur = fmtDuration(c.start_time, c.end_time);
                const days = fmtDays(c.start_time, c.end_time);
                const dt = c.start_time ? new Date(c.start_time) : null;
                return (
                  <tr key={c.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f4f9' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Contest name */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#e6f6ff,#f3e6fd)', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trophy size={14} color="#00A6FF" strokeWidth={1.6} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: '0 0 2px', cursor: 'pointer' }}
                            onClick={() => navigate('/student/contests/' + c.id)}
                            onMouseEnter={e => e.currentTarget.style.color = '#00A6FF'}
                            onMouseLeave={e => e.currentTarget.style.color = '#0a0a1a'}
                          >{c.title}</p>
                          {c.is_registered && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle2 size={9} /> Registered
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}>
                        {c.status === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981' }} />}
                        {s.label}
                      </span>
                    </td>

                    {/* Start */}
                    <td style={{ padding: '13px 16px' }}>
                      {dt ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarDays size={13} color="#94a3b8" />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0a0a1a', margin: 0 }}>
                              {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                              {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ) : <span style={{ color: '#94a3b8' }}>-</span>}
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={13} color="#94a3b8" />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#0a0a1a', margin: 0 }}>{dur}</p>
                          {days && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{days}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Problems */}
                    <td style={{ padding: '13px 16px' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>{c.problem_count ?? 0}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Problems</p>
                      </div>
                    </td>

                    {/* Participants */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={13} color="#94a3b8" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>{c.participant_count ?? 0}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Registered</p>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.status === 'live' && c.is_registered && (
                          <button onClick={() => navigate('/student/contests/' + c.id)}
                            style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(0,166,255,0.25)', whiteSpace: 'nowrap' }}>
                            Enter <ArrowRight size={12} />
                          </button>
                        )}
                        {!c.is_registered && (c.status === 'upcoming' || c.status === 'live') && (
                          <button onClick={() => register(c.id)} disabled={registering === c.id}
                            style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#0a0a1a', fontWeight: 600, fontSize: 12, cursor: registering === c.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (registering !== c.id) { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.color = '#00A6FF'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0a0a1a'; }}
                          >
                            {registering === c.id ? 'Registering...' : 'Register'}
                          </button>
                        )}
                        {c.status === 'upcoming' && c.is_registered && (
                          <button onClick={() => navigate('/student/contests/' + c.id)}
                            style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1.5px solid #b3e4ff', background: '#e6f6ff', color: '#00A6FF', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            View Details <ArrowRight size={12} />
                          </button>
                        )}
                        {c.status === 'ended' && (
                          <button onClick={() => navigate('/student/contests/' + c.id)}
                            style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#4a5568', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Results
                          </button>
                        )}
                        <button style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f4f9'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
