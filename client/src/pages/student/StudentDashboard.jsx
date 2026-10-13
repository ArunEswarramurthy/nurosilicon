import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, FolderOpen, Trophy, ArrowRight, CheckCircle2,
  Flame, ChevronRight, TrendingUp, BookOpen, BarChart2,
  Bell, Calendar, Clock, MapPin, Activity, Megaphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { labApi } from '../../lib/labApi';
import { contestApi } from '../../lib/contestApi';

/* -- stat card matching screenshot -- */
function StatBox({ icon: Icon, label, value, delta, barColor, loading }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '14px 16px', background: '#fff', borderRight: '1px solid #e8ecf4', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f4f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color="#00A6FF" strokeWidth={1.6} />
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 28, width: 60, borderRadius: 6 }} />
        : <span style={{ fontSize: 26, fontWeight: 800, color: '#0a0a1a', lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</span>
      }
      {delta !== undefined && (
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{delta}</span>
      )}
      <div style={{ height: 3, borderRadius: 99, background: '#f1f4f9', marginTop: 2 }}>
        <div style={{ height: '100%', borderRadius: 99, background: barColor || '#00A6FF', width: '0%', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

/* -- quick access card -- */
function QuickCard({ icon: Icon, label, desc, to, navigate, accentColor }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 14px',
        background: hov ? '#f8fafc' : '#fff',
        border: `1.5px solid ${hov ? accentColor : '#e8ecf4'}`,
        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.15s', width: '100%',
        boxShadow: hov ? `0 4px 16px ${accentColor}22` : 'none',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, background: `${accentColor}15`, border: `1.5px solid ${accentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={accentColor} strokeWidth={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0a0a1a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{label}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
      </div>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: hov ? `${accentColor}15` : '#f1f4f9', border: `1px solid ${hov ? accentColor + '44' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        <ArrowRight size={13} color={hov ? accentColor : '#94a3b8'} />
      </div>
    </button>
  );
}

const STATUS_BADGE = {
  live:     { label: 'Live',     bg: '#ecfdf5', color: '#10b981', border: '#6ee7b7' },
  upcoming: { label: 'Upcoming', bg: '#e6f6ff', color: '#00A6FF', border: '#b3e4ff' },
  ended:    { label: 'Ended',    bg: '#f1f4f9', color: '#94a3b8', border: '#e2e8f0' },
};

/* -- mini calendar -- */
function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Calendar size={14} color="#00A6FF" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a' }}>Calendar</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>{'<'}</button>
          <button style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>{'>'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a1a' }}>{monthName} {year}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94a3b8', padding: '2px 0' }}>{d}</div>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {row.map((d, ci) => (
            <div key={ci} style={{
              textAlign: 'center', fontSize: 12, fontWeight: d === today ? 700 : 400,
              padding: '4px 2px', borderRadius: 6, cursor: d ? 'pointer' : 'default',
              background: d === today ? 'linear-gradient(135deg,#00A6FF,#A020F0)' : 'transparent',
              color: d === today ? '#fff' : d ? '#0a0a1a' : 'transparent',
              transition: 'all 0.1s',
            }}>{d || ''}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [todayChallenge, setTodayChallenge] = useState(null);
  const [contests, setContests]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [stats, setStats] = useState({ total: 0, solved: 0, attempted: 0, points: 0 });

  useEffect(() => {
    labApi.dcToday().then(r => setTodayChallenge(r.data.challenge)).catch(() => {});
    contestApi.list().then(r =>
      setContests((r.data.contests || []).filter(c => c.status !== 'ended').slice(0, 4))
    ).catch(() => {});
    labApi.list({}).then(r => {
      const p = r.data.problems || [];
      setStats({
        total:     p.length,
        solved:    p.filter(x => x.my_status === 'passed').length,
        attempted: p.filter(x => x.my_status !== 'not_attempted').length,
        points:    p.filter(x => x.my_status === 'passed').reduce((s, x) => s + (Number(x.reward_points) || 0), 0),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;

  const ANNOUNCEMENTS = [
    { dot: '#00A6FF', title: 'Welcome to NuroSilicon!',  sub: 'Start exploring labs, practice problems and contests.', date: 'Today' },
    { dot: '#A020F0', title: 'New Verilog Lab added',    sub: 'Practice Verilog with real-world examples.',            date: 'Yesterday' },
    { dot: '#10b981', title: 'Upcoming Contest',         sub: 'Stay tuned for our next coding contest!',               date: '2 days ago' },
  ];

  const RECENT = [
    { icon: Activity,  label: 'No submissions yet',          sub: 'Solve problems to see your activity here.' },
    { icon: BookOpen,  label: 'No lab activity',             sub: 'Open a lab and write your first code.'     },
    { icon: Trophy,    label: 'No contest participation yet', sub: 'Join upcoming contests to test your skills.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .dash-quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .dash-two-col    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-contest-cal{ display: grid; grid-template-columns: 1fr 260px; gap: 12px; }
        .dash-stats-row  { display: flex; flex-wrap: wrap; }
        .dash-stats-row > div { flex: 1 1 140px; min-width: 0; }
        @media (max-width: 1100px) {
          .dash-quick-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .dash-contest-cal{ grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dash-quick-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .dash-two-col    { grid-template-columns: 1fr; }
          .dash-contest-cal{ grid-template-columns: 1fr; }
          .dash-stats-row > div { flex: 1 1 120px; border-right: none !important; border-bottom: 1px solid #e8ecf4; }
        }
        @media (max-width: 480px) {
          .dash-quick-grid { grid-template-columns: minmax(0,1fr); }
          .dash-stats-row > div { flex: 1 1 100%; }
        }
        @media (max-width: 600px) {
          .dash-hero-deco { display: none !important; }
        }
      `}</style>

      {/* -- HERO BANNER -- */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)',
        minHeight: 190, display: 'flex', alignItems: 'stretch',
        border: '1.5px solid #1a1a2e',
      }}>
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 200, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Left text */}
        <div style={{ flex: 1, padding: '22px 28px', position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Student Portal</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Welcome back, <span style={{ background: 'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: '0 0 16px' }}>Practice. Simulate. Compete. Build your engineering future.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '8px 24px' }}>
            {[
              { icon: Cpu,        label: 'HDL Labs',          sub: 'Write & simulate Verilog/SystemVerilog', color: '#00A6FF' },
              { icon: BookOpen,   label: 'Practice Problems',  sub: 'Topic-wise questions with instant evaluation', color: '#A020F0' },
              { icon: Trophy,     label: 'Live Contests',      sub: 'Compete and improve your rank',         color: '#00E5FF' },
              { icon: BarChart2,  label: 'Objective Tests',    sub: 'MCQ, True/False and more',              color: '#00A6FF' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={14} color={color} strokeWidth={1.6} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right decorative text */}
        <div className="dash-hero-deco" style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', padding: '20px 24px 20px 0', position: 'relative', zIndex: 2 }}>
          {['Learn','Simulate','Solve','Grow'].map((w, i) => (
            <p key={w} style={{ margin: '2px 0', fontSize: 20 + i * 2, fontWeight: 800, color: i % 2 === 0 ? '#fff' : 'rgba(255,255,255,0.25)', letterSpacing: '-0.03em', lineHeight: 1.1, textAlign: 'right' }}>{w}</p>
          ))}
        </div>
      </div>

      {/* -- STATS ROW -- */}
      <div className="dash-stats-row" style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <StatBox icon={BookOpen}  label="Problems Solved" value={stats.solved}    delta={`- ${pct}%`}  barColor="#00A6FF" loading={loading} />
        <StatBox icon={Activity}  label="Attempted"       value={stats.attempted} delta={`- ${stats.total > 0 ? Math.round(stats.attempted/stats.total*100) : 0}%`} barColor="#10b981" loading={loading} />
        <StatBox icon={TrendingUp} label="Completion"     value={`${pct}%`}       barColor="#A020F0" loading={loading} />
        <StatBox icon={Trophy}    label="Reward Points"   value={stats.points}    barColor="#f59e0b" loading={loading} />
        {/* Progress card */}
        <div style={{ flex: '1 1 180px', minWidth: 0, background: 'linear-gradient(135deg,#7c3aed,#00A6FF)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={13} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Your Progress</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{stats.solved} / {stats.total}</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.25)' }}>
            <div style={{ height: '100%', borderRadius: 99, background: '#fff', width: `${pct}%`, transition: 'width 0.4s' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', margin: 0 }}>Start solving problems to see your progress!</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
          </div>
        </div>
      </div>

      {/* -- DAILY CHALLENGE -- */}
      {todayChallenge && (() => {
        const solved = todayChallenge.my_status === 'solved';
        return (
          <div style={{ background: solved ? '#ecfdf5' : 'linear-gradient(135deg,#fffbeb,#fff7ed)', border: `1.5px solid ${solved ? '#6ee7b7' : '#fde68a'}`, borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: solved ? '#ecfdf5' : '#fef3c7', border: `1.5px solid ${solved ? '#6ee7b7' : '#fde68a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flame size={17} color={solved ? '#10b981' : '#f59e0b'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: solved ? '#10b981' : '#f59e0b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Daily Challenge</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0a0a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todayChallenge.problem?.title}</p>
            </div>
            {solved
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#10b981' }}><CheckCircle2 size={15} /> Completed</div>
              : <button onClick={() => navigate(`/student/lab/${todayChallenge.problem?.id}?dc=${todayChallenge.id}`)} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Solve now →</button>
            }
          </div>
        );
      })()}

      {/* -- QUICK ACCESS -- */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#0a0a1a', margin: '0 0 1px', letterSpacing: '-0.02em' }}>Quick Access</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Jump into the most important sections</p>
        </div>
        <div className="dash-quick-grid">
          <QuickCard icon={Cpu}        label="Engineering Lab"  desc="Verilog, C, C++, Python, Java, SQL" to="/student/lab"             navigate={navigate} accentColor="#00A6FF" />
          <QuickCard icon={FolderOpen} label="Objective Banks"  desc="MCQ, True/False, Fill-in-the-blank"  to="/student/eng-lab-folders" navigate={navigate} accentColor="#A020F0" />
          <QuickCard icon={Trophy}     label="Contests"         desc="Compete and earn your rank"          to="/student/contests"        navigate={navigate} accentColor="#00E5FF" />
          <QuickCard icon={BookOpen}   label="Practice"         desc="Topic-wise problems"                 to="/student/eng-lab-folders" navigate={navigate} accentColor="#10b981" />
        </div>
      </div>

      {/* -- UPCOMING CONTESTS + BOTTOM ROW -- */}
      <div className="dash-two-col">

        {/* Recent Activity */}
        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f4f9' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: '0 0 1px', letterSpacing: '-0.01em' }}>Recent Activity</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Your latest learning activity</p>
            </div>
            <button onClick={() => navigate('/student/lab')} style={{ fontSize: 12, color: '#00A6FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={12} /></button>
          </div>
          {RECENT.map(({ icon: Icon, label, sub }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < RECENT.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f4f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color="#94a3b8" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a1a', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>
              </div>
              <ChevronRight size={13} color="#e2e8f0" />
            </div>
          ))}
        </div>

        {/* Announcements */}
        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f4f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#e6f6ff', border: '1px solid #b3e4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={12} color="#00A6FF" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: 0, letterSpacing: '-0.01em' }}>Announcements</p>
            </div>
            <button style={{ fontSize: 12, color: '#00A6FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={12} /></button>
          </div>
          {ANNOUNCEMENTS.map(({ dot, title, sub, date }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: i < ANNOUNCEMENTS.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: '0 0 2px' }}>{title}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>{date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* -- CONTESTS + CALENDAR -- */}
      <div className="dash-contest-cal">

        {/* Upcoming contests */}
        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f4f9' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: 0, letterSpacing: '-0.01em' }}>Upcoming Contests</p>
            <button onClick={() => navigate('/student/contests')} style={{ fontSize: 12, color: '#00A6FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={12} /></button>
          </div>
          {loading ? (
            <div style={{ padding: 12 }}>{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 6 }} />)}</div>
          ) : contests.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Trophy size={22} color="#e2e8f0" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No upcoming contests</p>
            </div>
          ) : contests.map((c, i) => {
            const s = STATUS_BADGE[c.status] || STATUS_BADGE.ended;
            const d = c.start_time ? new Date(c.start_time) : null;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < contests.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => navigate('/student/contests')}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {d && (
                  <div style={{ width: 44, flexShrink: 0, textAlign: 'center', background: '#f1f4f9', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '6px 4px' }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#00A6FF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.toLocaleString('default',{month:'short'})}</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0a0a1a', lineHeight: 1.1 }}>{d.getDate()}</p>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0a0a1a', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {d && <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />Online</span>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Mini Calendar */}
        <MiniCalendar />
      </div>

    </div>
  );
}
