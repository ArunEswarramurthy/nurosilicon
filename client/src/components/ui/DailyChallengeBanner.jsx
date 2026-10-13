import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Cpu, Code2, CheckCircle2, Clock, ChevronDown, ChevronUp, ArrowRight, Trophy } from 'lucide-react';
import { labApi } from '../../lib/labApi';
import Spinner from '../ui/Spinner';

const DIFF_STYLE = {
  easy:   { bg: 'var(--success-soft)', color: 'var(--success)', border: 'var(--success-border)' },
  medium: { bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'var(--warning-border)' },
  hard:   { bg: 'var(--danger-soft)',  color: 'var(--danger)',  border: 'var(--danger-border)'  },
};
const HDL_LANGS = ['verilog', 'vhdl', 'systemverilog'];

function Countdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const midnight = new Date(ist);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight - ist) / 1000);
  });
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: 1 }}>{h}:{m}:{s}</span>;
}

export default function DailyChallengeBanner() {
  const navigate = useNavigate();
  const [today, setToday]         = useState(null);
  const [past, setPast]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showPast, setShowPast]   = useState(false);
  const [pastLoading, setPastLoading] = useState(false);

  useEffect(() => {
    labApi.dcToday().then(r => setToday(r.data.challenge)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadPast = async () => {
    if (past.length > 0) { setShowPast(v => !v); return; }
    setPastLoading(true);
    try {
      const r = await labApi.dcPast();
      setPast(r.data.challenges || []);
      setShowPast(true);
    } catch { } finally { setPastLoading(false); }
  };

  if (loading) return null;

  const isHDL = today?.problem && HDL_LANGS.includes(today.problem.language);
  const solved = today?.my_status === 'solved';
  const ds = DIFF_STYLE[today?.problem?.difficulty] || DIFF_STYLE.easy;

  return (
    <div style={{ marginBottom: 24 }}>
      {today && (
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: '1.5px solid var(--blue-mid)',
          marginBottom: 10,
          boxShadow: '0 4px 20px rgba(0,166,255,0.10)',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #00A6FF 0%, #A020F0 100%)',
            padding: '9px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarDays size={13} color="#fff" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Problem of the Day</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.20)', padding: '3px 9px', borderRadius: 99 }}>
              <Clock size={10} color="rgba(255,255,255,0.85)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)' }}><Countdown /></span>
            </div>
          </div>

          {/* Problem info */}
          <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isHDL ? 'var(--purple-soft)' : 'var(--blue-soft)', border: `1.5px solid ${isHDL ? 'var(--purple-mid)' : 'var(--blue-mid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isHDL ? <Cpu size={16} color="var(--purple)" /> : <Code2 size={16} color="var(--blue)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                {today.problem.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, textTransform: 'capitalize' }}>
                  {today.problem.difficulty}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{today.problem.category} · {today.problem.marks}pts</span>
              </div>
            </div>
            {solved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'var(--success-soft)', border: '1.5px solid var(--success-border)', color: 'var(--success)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                <CheckCircle2 size={13} /> Solved!
              </div>
            ) : (
              <button
                onClick={() => navigate(`/student/lab/${today.problem.id}?dc=${today.id}`)}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Solve <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Past challenges */}
      <button
        onClick={loadPast}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'var(--t)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Trophy size={11} color="var(--warning)" />
        Past Challenges
        {pastLoading ? <Spinner size="xs" /> : showPast ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {showPast && past.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {past.map(c => {
            const isHDL = c.problem && HDL_LANGS.includes(c.problem.language);
            const ds = DIFF_STYLE[c.problem?.difficulty] || DIFF_STYLE.easy;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/student/lab/${c.problem.id}?dc=${c.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'var(--t)', boxShadow: 'var(--shadow-xs)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, background: isHDL ? 'var(--purple-soft)' : 'var(--blue-soft)', border: `1.5px solid ${isHDL ? 'var(--purple-mid)' : 'var(--blue-mid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isHDL ? <Cpu size={15} color="var(--purple)" /> : <Code2 size={15} color="var(--blue)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{c.problem?.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{c.scheduled_date}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, textTransform: 'capitalize', flexShrink: 0 }}>{c.problem?.difficulty}</span>
                {c.my_status === 'solved'
                  ? <CheckCircle2 size={15} color="var(--success)" />
                  : <ArrowRight size={14} color="var(--text-muted)" />
                }
              </button>
            );
          })}
        </div>
      )}
      {showPast && past.length === 0 && !pastLoading && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No past challenges yet</p>
      )}
    </div>
  );
}
