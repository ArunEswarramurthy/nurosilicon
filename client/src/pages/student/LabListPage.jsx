import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle2, XCircle, Circle, ChevronRight,
  Cpu, Code2, Database, Zap, ExternalLink, BookOpen,
  BarChart2, FlaskConical, Layers,
} from 'lucide-react';
import StudentRequestError, { getStudentRequestError } from '../../components/ui/StudentRequestError';
import { labApi, verilogApi } from '../../lib/labApi';

const LANG_LABEL = {
  systemverilog: 'SystemVerilog', verilog: 'Verilog',
  c: 'C', cpp: 'C++', python: 'Python', java: 'Java',
  embedded_c: 'Embedded C', sql: 'MySQL/SQL', vhdl: 'VHDL',
};

const DIFF_STYLE = {
  easy:   { bg: '#ecfdf5', color: '#10b981', border: '#6ee7b7' },
  medium: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
  hard:   { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
};

/* accent color per group */
const GROUP_COLORS = ['#00A6FF','#A020F0','#10b981','#f59e0b','#ef4444','#00E5FF','#6366f1','#ec4899'];
const GROUP_ICONS  = [Cpu, Code2, FlaskConical, Database, Zap, BarChart2, Layers, BookOpen];

function StatusBadge({ status }) {
  if (status === 'passed') return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#10b981', background:'#ecfdf5', border:'1px solid #6ee7b7', padding:'2px 8px', borderRadius:99, flexShrink:0 }}>
      <CheckCircle2 size={10} /> Passed
    </span>
  );
  if (status === 'failed') return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#ef4444', background:'#fef2f2', border:'1px solid #fecaca', padding:'2px 8px', borderRadius:99, flexShrink:0 }}>
      <XCircle size={10} /> Failed
    </span>
  );
  return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#94a3b8', background:'#f1f4f9', border:'1px solid #e2e8f0', padding:'2px 8px', borderRadius:99, flexShrink:0 }}>
      <Circle size={10} /> Todo
    </span>
  );
}

function GroupCard({ group, problems, navigate, color, Icon }) {
  const [hov, setHov] = useState(false);
  const gp     = problems.filter(p => (group.problem_ids || []).includes(p.id));
  const solved = gp.filter(p => p.my_status === 'passed').length;
  const total  = gp.length;
  const pct    = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <button
      onClick={() => navigate('/student/lab/group/' + group.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', flexDirection:'column', gap:0,
        background: hov ? '#fafbfc' : '#fff',
        border:`1.5px solid ${hov ? color : '#e8ecf4'}`,
        borderRadius:14, cursor:'pointer', textAlign:'left',
        transition:'all 0.15s', overflow:'hidden',
        boxShadow: hov ? `0 4px 16px ${color}22` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* colored top border */}
      <div style={{ height:3, background:color, borderRadius:'99px 99px 0 0' }} />
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`${color}15`, border:`1.5px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={16} color={color} strokeWidth={1.6} />
            </div>
            <div>
              <p style={{ fontSize:13.5, fontWeight:700, color:'#0a0a1a', margin:0, letterSpacing:'-0.01em' }}>{group.label}</p>
            </div>
          </div>
          <ChevronRight size={14} color={hov ? color : '#94a3b8'} style={{ flexShrink:0, marginTop:2, transition:'all 0.15s' }} />
        </div>
        <p style={{ fontSize:12, color:'#94a3b8', margin:0, lineHeight:1.5 }}>{group.desc}</p>
        <div style={{ marginTop:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{solved} / {total} solved</span>
            <span style={{ fontSize:11, fontWeight:700, color }}>{pct}%</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:'#f1f4f9', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.4s' }} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function LabListPage() {
  const navigate = useNavigate();
  const [problems, setProblems]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dc, setDc]                     = useState(null);
  const [customGroups, setCustomGroups] = useState([]);
  const [search, setSearch]             = useState('');
  const [filterLang, setFilterLang]     = useState('');
  const [filterDiff, setFilterDiff]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView]                 = useState('list');
  const [loadError, setLoadError] = useState('');

  const RESPONSIVE = `
    .lab-filter-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .lab-filter-row .lab-search { flex:1; min-width:160px; position:relative; }
    .lab-filter-selects { display:flex; gap:8px; flex-wrap:wrap; }
    .lab-groups-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
    @media (max-width: 768px) {
      .lab-filter-selects select { width:100%; }
    }
    @media (max-width: 480px) {
      .lab-groups-grid { grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); }
    }
  `;

  const loadProblems = async () => {
    setLoading(true);
    setLoadError('');
    const [dailyResult, groupsResult, labResult, verilogResult] = await Promise.allSettled([
      labApi.dcToday(),
      labApi.groups(),
      labApi.list({}),
      verilogApi.list({}),
    ]);
    if (dailyResult.status === 'fulfilled') setDc(dailyResult.value.data.challenge);
    if (groupsResult.status === 'fulfilled') setCustomGroups(groupsResult.value.data.groups || []);
    const labProbs = labResult.status === 'fulfilled' ? labResult.value.data.problems || [] : [];
    const vProbs = verilogResult.status === 'fulfilled' ? (verilogResult.value.data || []).map(p => ({
        ...p,
        language: p.language || 'verilog',
        my_status: p.my_status?.status ?? p.my_status ?? null,
        _isVerilog: true,
      })) : [];
    setProblems([...labProbs, ...vProbs]);
    const failedResult = [dailyResult, groupsResult, labResult, verilogResult]
      .find(result => result.status === 'rejected');
    if (failedResult) {
      setLoadError(getStudentRequestError(failedResult.reason, 'Some lab problems could not be loaded.'));
    }
    setLoading(false);
  };

  useEffect(() => { loadProblems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = problems.filter(p => {
    const ms  = !search       || p.title.toLowerCase().includes(search.toLowerCase());
    const ml  = !filterLang   || p.language === filterLang;
    const md  = !filterDiff   || p.difficulty === filterDiff;
    const mst = !filterStatus || p.my_status === filterStatus;
    return ms && ml && md && mst;
  });

  const stats = {
    total:     problems.length,
    solved:    problems.filter(p => p.my_status === 'passed').length,
    attempted: problems.filter(p => p.my_status === 'failed').length,
  };

  const allGroups = customGroups.map((g, i) => ({
    ...g,
    label: g.name,
    desc: g.description || 'Custom group',
    _color: GROUP_COLORS[i % GROUP_COLORS.length],
    _icon: GROUP_ICONS[i % GROUP_ICONS.length],
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Inter, sans-serif' }}>
      <style>{RESPONSIVE}</style>

      {/* -- HERO BANNER -- */}
      <div style={{
        borderRadius:16, overflow:'hidden', position:'relative',
        background:'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)',
        minHeight:180, display:'flex', alignItems:'stretch',
        border:'1.5px solid #1a1a2e',
      }}>
        {/* grid overlay */}
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        {/* glow orbs */}
        <div style={{ position:'absolute', top:-60, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents:'none' }} />

        {/* Left text */}
        <div style={{ flex:1, padding:'22px 28px', position:'relative', zIndex:2 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 6px' }}>Engineering Lab</p>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
            Engineering{' '}
            <span style={{ background:'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Lab</span>
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.50)', margin:'0 0 20px' }}>
            Practice programming, HDL and embedded engineering problems
          </p>

          {/* Stat chips */}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { icon:BookOpen,    label:'Total problems', value:stats.total,     color:'#00A6FF' },
              { icon:CheckCircle2,label:'Solved',         value:stats.solved,    color:'#10b981' },
              { icon:BarChart2,   label:'Attempted',      value:stats.attempted, color:'#f59e0b' },
            ].map(({ icon:Icon, label, value, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={13} color={color} strokeWidth={1.6} />
                </div>
                <div>
                  <p style={{ margin:0, fontSize:16, fontWeight:800, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>{loading ? '-' : value}</p>
                  <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.45)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Free IDE button + decorative text */}
        <div style={{ width:160, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'space-between', alignItems:'flex-end', padding:'20px 24px', position:'relative', zIndex:2 }}>
          <button
            onClick={() => navigate('/student/lab/ide')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,0.20)', background:'rgba(255,255,255,0.08)', color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
          >
            <ExternalLink size={12} /> Free IDE
          </button>
          <div style={{ textAlign:'right' }}>
            {['Build','Simulate','Solve','Repeat.'].map((w, i) => (
              <p key={w} style={{ margin:'1px 0', fontSize:15+i*2, fontWeight:800, color:i%2===0?'#fff':'rgba(255,255,255,0.22)', letterSpacing:'-0.03em', lineHeight:1.1 }}>{w}</p>
            ))}
          </div>
        </div>
      </div>

      {loadError && <StudentRequestError message={loadError} onRetry={loadProblems} retrying={loading} />}

      {/* -- DAILY CHALLENGE -- */}
      {dc && (() => {
        const solved = dc.my_status === 'solved';
        const diff   = dc.problem?.difficulty || 'easy';
        const ds     = DIFF_STYLE[diff] || DIFF_STYLE.easy;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px',
            background: '#fff',
            border: '1.5px solid #e8ecf4',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
          }}>
            {/* left flame + label */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: solved ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${solved ? '#6ee7b7' : '#fde68a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {solved
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>
                }
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: solved ? '#10b981' : '#f59e0b',
              }}>Daily Challenge</span>
            </div>

            {/* divider */}
            <div style={{ width: 1, height: 20, background: '#e8ecf4', flexShrink: 0 }} />

            {/* difficulty badge */}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px',
              borderRadius: 99, background: ds.bg, color: ds.color,
              border: `1px solid ${ds.border}`, textTransform: 'capitalize',
              flexShrink: 0,
            }}>{diff}</span>

            {/* problem title */}
            <p style={{
              flex: 1, minWidth: 0,
              fontSize: 14, fontWeight: 700, color: '#0a0a1a',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', letterSpacing: '-0.01em',
            }}>{dc.problem?.title}</p>

            {/* marks */}
            {dc.problem?.marks && (
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#94a3b8',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>{dc.problem.marks} pts</span>
            )}

            {/* CTA */}
            {solved ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700, color: '#10b981',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={14} /> Completed
              </span>
            ) : (
              <button
                onClick={() => navigate(`/student/lab/${dc.problem.id}?dc=${dc.id}`)}
                style={{
                  height: 34, padding: '0 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#00A6FF,#A020F0)',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer', flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,166,255,0.25)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Solve now →
              </button>
            )}
          </div>
        );
      })()}

      {/* -- VIEW TOGGLE -- */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', background:'#f1f4f9', borderRadius:10, padding:3, gap:2 }}>
          {[{ id:'list', label:'All problems' }, { id:'groups', label:'By topic' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                height:32, padding:'0 16px', borderRadius:8, border:'none',
                background: view===id ? '#fff' : 'transparent',
                color: view===id ? '#0a0a1a' : '#94a3b8',
                fontWeight: view===id ? 700 : 500,
                fontSize:13, cursor:'pointer',
                boxShadow: view===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition:'all 0.15s',
                borderBottom: view===id ? '2px solid #00A6FF' : '2px solid transparent',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* -- GROUPS VIEW -- */}
      {view === 'groups' && (
        <>
          <div className="lab-groups-grid">
            {loading
              ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:130, borderRadius:14 }} />)
              : allGroups.map(group => (
                  <GroupCard key={group.id} group={group} problems={problems} navigate={navigate} color={group._color} Icon={group._icon} />
                ))
            }
          </div>

          {/* Empty state */}
          {!loading && allGroups.length === 0 && (
            <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'48px 24px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#e6f6ff', border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Cpu size={22} color="#00A6FF" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize:15, fontWeight:700, color:'#0a0a1a', margin:'0 0 4px' }}>Your next challenge starts here</p>
              <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Choose a topic to explore available problems.</p>
            </div>
          )}

          {/* No problems in groups */}
          {!loading && allGroups.length > 0 && problems.length === 0 && (
            <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
              <p style={{ fontSize:15, fontWeight:700, color:'#0a0a1a', margin:'0 0 4px' }}>Your next challenge starts here</p>
              <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Choose a topic to explore available problems.</p>
            </div>
          )}
        </>
      )}

      {/* -- LIST VIEW -- */}
      {view === 'list' && (
        <>
          <div className="lab-filter-row">
            <div className="lab-search">
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
              <input
                style={{ width:'100%', height:36, paddingLeft:30, paddingRight:12, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#0a0a1a', outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.15s' }}
                placeholder="Search problems..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => e.target.style.borderColor='#00A6FF'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'}
              />
            </div>
            <div className="lab-filter-selects">
            {[
              { value:filterLang,   onChange:e=>setFilterLang(e.target.value),   opts:[['','All languages'],...Object.entries(LANG_LABEL)] },
              { value:filterDiff,   onChange:e=>setFilterDiff(e.target.value),   opts:[['','All difficulties'],['easy','Easy'],['medium','Medium'],['hard','Hard']] },
              { value:filterStatus, onChange:e=>setFilterStatus(e.target.value), opts:[['','All statuses'],['not_attempted','Not attempted'],['failed','Attempted'],['passed','Passed']] },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={sel.onChange}
                style={{ height:36, padding:'0 28px 0 10px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#0a0a1a', outline:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
                {sel.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1.5px solid #e8ecf4' }}>
                  {['#','PROBLEM','LANGUAGE','DIFFICULTY','MARKS','STATUS',''].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f4f9' }}>
                      {[40,180,100,80,60,80,80].map((w,j) => (
                        <td key={j} style={{ padding:'13px 16px' }}>
                          <div className="skeleton" style={{ height:13, width:w, borderRadius:5 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding:'40px', textAlign:'center' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:'#f1f4f9', border:'1.5px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Cpu size={20} color="#94a3b8" strokeWidth={1.5} />
                        </div>
                        <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>No problems found. Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const ds = DIFF_STYLE[p.difficulty] || DIFF_STYLE.easy;
                    const solveUrl = (p._isVerilog ? '/student/verilog/' : '/student/lab/') + p.id;
                    return (
                      <tr key={p.id} style={{ borderBottom: idx < filtered.length-1 ? '1px solid #f1f4f9' : 'none', transition:'background 0.1s', cursor:'pointer' }}
                        onClick={() => navigate(solveUrl)}
                        onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ padding:'12px 16px', color:'#94a3b8', fontSize:12, width:40 }}>{p.question_no || idx+1}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <p style={{ fontSize:13, fontWeight:600, color:'#0a0a1a', margin:'0 0 2px', letterSpacing:'-0.01em' }}>{p.title}</p>
                          {p.category && <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{p.category}</p>}
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'#4a5568' }}>{LANG_LABEL[p.language] || p.language}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:99, background:ds.bg, color:ds.color, border:`1px solid ${ds.border}`, textTransform:'capitalize' }}>{p.difficulty}</span>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'#4a5568', fontWeight:600 }}>{p.marks}</td>
                        <td style={{ padding:'12px 16px' }}><StatusBadge status={p.my_status} /></td>
                        <td style={{ padding:'12px 16px', textAlign:'right' }}>
                          <button onClick={e => { e.stopPropagation(); navigate(solveUrl); }}
                            style={{ height:30, padding:'0 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', color:'#0a0a1a', fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor='#00A6FF'; e.currentTarget.style.color='#00A6FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#0a0a1a'; }}
                          >Solve</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
