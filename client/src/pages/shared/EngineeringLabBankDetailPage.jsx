import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Plus, Trash2, Pencil, Check,
  ChevronDown, ChevronUp, Cpu, Search, Send,
  Play, Shuffle, Zap, Clock, X,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { engLabBankApi } from '../../lib/engineeringApi';
import { DIFF_BADGES } from '../../lib/questionTypes';
import { useAuth } from '../../context/AuthContext';

// â€â€ Test Config Modal â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€
function TestConfigModal({ bank, questions, onClose, onStart }) {
  const [cfg, setCfg] = useState({ mode: 'random', count: 10, easy: 3, medium: 4, hard: 3, secPerQ: 90 });
  const setC = (k, v) => setCfg((f) => ({ ...f, [k]: v }));
  const easy   = questions.filter((q) => q.difficulty === 'easy').length;
  const medium = questions.filter((q) => q.difficulty === 'medium').length;
  const hard   = questions.filter((q) => q.difficulty === 'hard').length;
  const total  = questions.length;
  const testCount = cfg.mode === 'random' ? Math.min(cfg.count, total) : cfg.easy + cfg.medium + cfg.hard;
  const estMins   = Math.ceil((testCount * cfg.secPerQ) / 60);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e4e8f0', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.14)' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e4e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={15} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bank?.name}</p>
              {bank?.description && <p style={{ fontSize: 11, color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bank.description}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e4e8f0', background: '#f4f6fb', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Pool stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[{ label: 'Easy', value: easy, color: '#059669', bg: '#ecfdf5', bdr: '#6ee7b7' }, { label: 'Medium', value: medium, color: '#d97706', bg: '#fffbeb', bdr: '#fcd34d' }, { label: 'Hard', value: hard, color: '#dc2626', bg: '#fef2f2', bdr: '#fca5a5' }].map(({ label, value, color, bg, bdr }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 26, fontWeight: 900, color, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 10, color, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Mode */}
          <div style={{ background: '#f4f6fb', border: '1px solid #e4e8f0', borderRadius: 14, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Test Mode</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{ mode: 'random', icon: Shuffle, title: 'Random', sub: 'Pick N random Qs' }, { mode: 'custom', icon: Zap, title: 'Custom', sub: 'Set difficulty mix' }].map(({ mode, icon: Icon, title, sub }) => (
                <button key={mode} onClick={() => setC('mode', mode)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `2px solid ${cfg.mode === mode ? '#6366f1' : '#e4e8f0'}`, background: cfg.mode === mode ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.mode === mode ? '#eef2ff' : '#f4f6fb', border: `1px solid ${cfg.mode === mode ? '#c7d2fe' : '#e4e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} style={{ color: cfg.mode === mode ? '#6366f1' : '#9ca3af' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: cfg.mode === mode ? '#6366f1' : '#111827' }}>{title}</p>
                    <p style={{ fontSize: 10, margin: 0, color: '#9ca3af' }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Random count */}
          {cfg.mode === 'random' && (
            <div style={{ background: '#f4f6fb', border: '1px solid #e4e8f0', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>Questions</p>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#6366f1' }}>{Math.min(cfg.count, total)}</span>
              </div>
              <input type="range" min={1} max={total} value={cfg.count} onChange={(e) => setC('count', parseInt(e.target.value))} style={{ width: '100%', accentColor: '#6366f1', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[5, 10, 15, 20, total].filter((v, i, a) => a.indexOf(v) === i && v <= total).map((n) => (
                  <button key={n} onClick={() => setC('count', n)} style={{ padding: '4px 12px', borderRadius: 7, border: `1.5px solid ${cfg.count === n ? '#6366f1' : '#e4e8f0'}`, background: cfg.count === n ? '#6366f1' : '#fff', color: cfg.count === n ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {n === total ? 'All' : n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom difficulty */}
          {cfg.mode === 'custom' && (
            <div style={{ background: '#f4f6fb', border: '1px solid #e4e8f0', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Difficulty Mix</p>
              {[{ key: 'easy', label: 'Easy', max: easy, color: '#059669' }, { key: 'medium', label: 'Medium', max: medium, color: '#d97706' }, { key: 'hard', label: 'Hard', max: hard, color: '#dc2626' }].map(({ key, label, max, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, width: 48, flexShrink: 0 }}>{label}</span>
                  <input type="range" min={0} max={max} value={cfg[key]} onChange={(e) => setC(key, parseInt(e.target.value))} style={{ flex: 1, accentColor: color }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color, width: 22, textAlign: 'right' }}>{cfg[key]}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', width: 24 }}>/{max}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e4e8f0' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{cfg.easy + cfg.medium + cfg.hard}</span>
              </div>
            </div>
          )}

          {/* Time */}
          <div style={{ background: '#f4f6fb', border: '1px solid #e4e8f0', borderRadius: 14, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={10} /> Time per Question</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[30, 60, 90, 120, 180].map((s) => (
                <button key={s} onClick={() => setC('secPerQ', s)} style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${cfg.secPerQ === s ? '#6366f1' : '#e4e8f0'}`, background: cfg.secPerQ === s ? '#6366f1' : '#fff', color: cfg.secPerQ === s ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: 14, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[{ label: 'Questions', value: testCount, color: '#6366f1' }, { label: 'Duration', value: `~${estMins}m`, color: '#059669' }, { label: 'Sec / Q', value: `${cfg.secPerQ}s`, color: '#d97706' }].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
                <p style={{ fontSize: 9, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Start */}
          <button onClick={() => onStart(cfg)} disabled={testCount === 0}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: testCount === 0 ? '#e4e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: testCount === 0 ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 14, cursor: testCount === 0 ? 'not-allowed' : 'pointer', boxShadow: testCount === 0 ? 'none' : '0 6px 20px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Play size={15} /> {testCount === 0 ? 'Select at least 1 question' : `Start Test - ${testCount} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

const OBJ_TYPES = [
  { value: 'mcq_single', label: 'MCQ Single' },
  { value: 'mcq_multi',  label: 'MCQ Multi'  },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill Blank'  },
];

const TYPE_COLOR = {
  mcq_single: 'bg-blue-50 text-blue-700 border-blue-200',
  mcq_multi:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  true_false: 'bg-teal-50 text-teal-700 border-teal-200',
  fill_blank: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function EngineeringLabBankDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const base = location.pathname.startsWith('/student') ? '/student' : '/admin';
  const { user }   = useAuth();
  const isStudent  = user?.role === 'student';

  const [bank, setBank]             = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const load = () => {
    setLoading(true);
    engLabBankApi.get(id)
      .then((r) => { setBank(r.data.bank); setQuestions(r.data.questions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete "${q.title}"?`)) return;
    await engLabBankApi.deleteQuestion(id, q.id).catch(() => {});
    load();
  };

  const filtered = questions.filter((q) => {
    if (typeFilter && q.type !== typeFilter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalMarks   = questions.reduce((s, q) => s + (parseFloat(q.marks) || 0), 0);
  const countByType  = (type) => questions.filter((q) => q.type === type).length;

  if (loading && !bank) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;

  const handleStart = (cfg) => {
    setShowConfig(false);
    navigate(`/student/eng-lab-banks/${id}/test`, {
      state: { allQ: questions, cfg, bank },
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Inter,sans-serif', paddingBottom:32 }}>
      {showConfig && (
        <TestConfigModal bank={bank} questions={questions} onClose={() => setShowConfig(false)} onStart={handleStart} />
      )}

      {/* â€â€ HERO BANNER â€â€ */}
      <div style={{ borderRadius:16, overflow:'hidden', position:'relative', background:'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)', minHeight:170, display:'flex', alignItems:'stretch', border:'1.5px solid #1a1a2e' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-60, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents:'none' }} />

        <div style={{ flex:1, padding:'20px 24px', position:'relative', zIndex:2 }}>
          {/* Back */}
          <button onClick={() => navigate(-1)}
            style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:7, padding:'4px 10px', color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:500, cursor:'pointer', marginBottom:12 }}>
            <ChevronLeft size={13} /> Back
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
            <div style={{ width:52, height:52, borderRadius:13, background:'rgba(160,32,240,0.20)', border:'1.5px solid rgba(160,32,240,0.40)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Cpu size={22} color="#A020F0" strokeWidth={1.6} />
            </div>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 3px', letterSpacing:'-0.025em' }}>{bank?.name}</h1>
              {bank?.description && <p style={{ fontSize:13, color:'rgba(255,255,255,0.50)', margin:0 }}>{bank.description}</p>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(0,166,255,0.15)', color:'#00A6FF', border:'1px solid rgba(0,166,255,0.3)' }}>{questions.length} questions</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }}>{totalMarks} marks</span>
            {bank?.bank_type && <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(160,32,240,0.15)', color:'#A020F0', border:'1px solid rgba(160,32,240,0.3)' }}>{bank.bank_type}</span>}
          </div>
        </div>

        <div style={{ width:140, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'space-between', alignItems:'flex-end', padding:'20px 24px', position:'relative', zIndex:2 }}>
          {isStudent && questions.length > 0 && (
            <button onClick={() => setShowConfig(true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,166,255,0.30)', whiteSpace:'nowrap' }}>
              <Play size={12} /> Take Test
            </button>
          )}
          {!isStudent && (
            <button onClick={() => navigate(`${base}/eng-lab-banks/${id}/add-question`)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,166,255,0.30)', whiteSpace:'nowrap' }}>
              <Plus size={12} /> Add Question
            </button>
          )}
          <div style={{ textAlign:'right' }}>
            {['Browse','Practice','Master'].map((w,i) => (
              <p key={w} style={{ margin:'1px 0', fontSize:14+i*2, fontWeight:800, color:i%2===0?'#fff':'rgba(255,255,255,0.22)', letterSpacing:'-0.02em', lineHeight:1.15 }}>{w}</p>
            ))}
          </div>
        </div>
      </div>

      {/* â€â€ STAT BOXES â€â€ */}
      <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', flexWrap:'wrap' }}>
        {[
          { label:'Total Questions', value:questions.length,                                              color:'#00A6FF', bg:'#e6f6ff', border:'#b3e4ff' },
          { label:'Total Marks',     value:totalMarks,                                                    color:'#A020F0', bg:'#f3e6fd', border:'#d9a8f8' },
          { label:'Easy',            value:questions.filter(q=>q.difficulty==='easy').length,             color:'#10b981', bg:'#ecfdf5', border:'#6ee7b7' },
          { label:'Hard',            value:questions.filter(q=>q.difficulty==='hard').length,             color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
        ].map(({ label, value, color, bg, border:bd }, i, arr) => (
          <div key={label} style={{ flex:1, minWidth:100, padding:'14px 18px', borderRight:i<arr.length-1?'1px solid #e8ecf4':'none', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:bg, border:`1.5px solid ${bd}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Cpu size={15} color={color} strokeWidth={1.6} />
            </div>
            <div>
              <p style={{ fontSize:22, fontWeight:800, color:'#0a0a1a', margin:0, lineHeight:1, letterSpacing:'-0.04em' }}>{value}</p>
              <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0', fontWeight:500 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* â€â€ TYPE BREAKDOWN â€â€ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {OBJ_TYPES.map(t => (
          <div key={t.value} style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:12, padding:'12px 14px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize:20, fontWeight:800, color:'#0a0a1a', margin:'0 0 3px', letterSpacing:'-0.03em' }}>{countByType(t.value)}</p>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0, fontWeight:500 }}>{t.label}</p>
          </div>
        ))}
      </div>

      {/* â€â€ SEARCH + FILTER â€â€ */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          <input style={{ width:'100%', height:36, paddingLeft:30, paddingRight:12, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#0a0a1a', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }}
            placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor='#00A6FF'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[{ value:'', label:'All Types' }, ...OBJ_TYPES].map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              style={{ height:36, padding:'0 14px', borderRadius:8, border:`1.5px solid ${typeFilter===t.value?'#00A6FF':'#e2e8f0'}`, background:typeFilter===t.value?'#00A6FF':'#fff', color:typeFilter===t.value?'#fff':'#4a5568', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* â€â€ QUESTIONS LIST â€â€ */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#e6f6ff', border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <Cpu size={22} color="#00A6FF" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', margin:'0 0 4px' }}>{questions.length===0?'No questions yet':'No questions match your filter'}</p>
          <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{questions.length===0?'Add questions to get started':'Try clearing the search or type filter'}</p>
          {questions.length===0 && !isStudent && (
            <button onClick={() => navigate(`${base}/eng-lab-banks/${id}/add-question`)}
              style={{ marginTop:14, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={13} /> Add First Question
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((q, idx) => {
            const isOpen    = expanded === q.id;
            const tc        = TYPE_COLOR[q.type] || 'bg-gray-50 text-gray-700 border-gray-200';
            const typeLabel = OBJ_TYPES.find(t => t.value === q.type)?.label || q.type;
            const diffColor = q.difficulty==='easy'?{c:'#10b981',bg:'#ecfdf5',bd:'#6ee7b7'}:q.difficulty==='hard'?{c:'#ef4444',bg:'#fef2f2',bd:'#fecaca'}:{c:'#f59e0b',bg:'#fffbeb',bd:'#fde68a'};
            return (
              <div key={q.id} style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', transition:'all 0.15s' }}
                onMouseEnter={e => { if(!isOpen) e.currentTarget.style.borderColor='#c8d0dc'; }}
                onMouseLeave={e => { if(!isOpen) e.currentTarget.style.borderColor='#e8ecf4'; }}>

                {/* Question row */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', width:24, flexShrink:0, paddingTop:2 }}>{idx+1}.</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:600, color:'#0a0a1a', margin:'0 0 6px', lineHeight:1.5, letterSpacing:'-0.01em' }}>{q.title}</p>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tc}`}>{typeLabel}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:diffColor.bg, color:diffColor.c, border:`1px solid ${diffColor.bd}`, textTransform:'capitalize' }}>{q.difficulty}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'#f1f4f9', color:'#94a3b8', border:'1px solid #e2e8f0' }}>{q.marks}m{q.negative_marks>0?` (-${q.negative_marks})`:''}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <button onClick={() => setExpanded(isOpen?null:q.id)}
                      style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#f1f4f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}>
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {!isStudent && (
                      <>
                        <button onClick={() => navigate(`${base}/eng-lab-banks/${id}/questions/${q.id}/edit`)}
                          style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', transition:'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#e6f6ff'; e.currentTarget.style.color='#00A6FF'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#94a3b8'; }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(q)}
                          style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', transition:'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#94a3b8'; }}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded answer */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid #f1f4f9', padding:'14px 16px', background:'#fafbfc', display:'flex', flexDirection:'column', gap:10 }}>
                    {q.body && (
                      <div style={{ fontSize:13, color:'#4a5568', background:'#fff', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', lineHeight:1.7 }}
                        dangerouslySetInnerHTML={{ __html: q.body }} />
                    )}
                    {q.options?.length>0 && q.type!=='fill_blank' && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:6 }}>
                        {q.options.map((opt,oi) => (
                          <div key={oi} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, border:`1px solid ${opt.is_correct?'#6ee7b7':'#e2e8f0'}`, background:opt.is_correct?'#ecfdf5':'#fff' }}>
                            <span style={{ width:22, height:22, borderRadius:6, background:opt.is_correct?'#10b981':'#f1f4f9', color:opt.is_correct?'#fff':'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+oi)}</span>
                            <span style={{ fontSize:12, color:opt.is_correct?'#065f46':'#374151', flex:1 }}>{opt.option_text}</span>
                            {opt.is_correct && <Check size={12} color="#10b981" />}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type==='fill_blank' && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'#e6f6ff', border:'1px solid #b3e4ff' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#00A6FF' }}>Answer:</span>
                        <span style={{ fontSize:12, color:'#0a0a1a', fontFamily:'monospace' }}>{q.answer_text||q.options?.[0]?.option_text||'-'}</span>
                      </div>
                    )}
                    {q.explanation && (
                      <div style={{ padding:'8px 12px', borderRadius:10, background:'#e6f6ff', border:'1px solid #b3e4ff', fontSize:12, color:'#0a0a1a', lineHeight:1.6 }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
