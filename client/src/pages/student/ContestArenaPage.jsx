import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Trophy, Clock, CheckCircle2, XCircle, ChevronLeft,
  Users, BarChart2, Code2, Cpu, Database, Zap, Loader2, FlaskConical,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { contestApi } from '../../lib/contestApi';
import { useSocket } from '../../context/SocketContext';

const HDL = ['verilog', 'vhdl', 'systemverilog'];
const BRAND_ARENA = '#0A6CFF';
const LANG_LABEL = { verilog:'Verilog', vhdl:'VHDL', systemverilog:'SystemVerilog', c:'C', cpp:'C++', python:'Python', java:'Java', embedded_c:'Embedded C', sql:'MySQL/SQL' };
const TYPE_STYLE = {
  programming: { icon: Code2,    color: '#059669', bg: '#f0fdf4' },
  database:    { icon: Database, color: '#2563eb', bg: '#eff6ff' },
  hardware:    { icon: Cpu,      color: '#0A6CFF', bg: '#f5f3ff' },
  embedded:    { icon: Zap,      color: '#d97706', bg: '#fffbeb' },
  objective:   { icon: BarChart2,color: '#dc2626', bg: '#fef2f2' },
};
const DIFF_COLOR = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
const SWITCHER_LANGS = ['c', 'cpp', 'python', 'java'];
const ALL_STARTERS = {
  c: '#include <stdio.h>\nint main() {\n    return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}',
  python: '# Write your solution\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n    }\n}',
};

function monacoLang(lang) {
  if (HDL.includes(lang)) return 'verilog';
  if (['c','cpp','embedded_c'].includes(lang)) return 'c';
  return lang;
}

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  return remaining;
}

function LeaderboardPanel({ contestId }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = () => contestApi.leaderboard(contestId)
      .then((r) => setBoard(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [contestId]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:24 }}><Spinner /></div>;
  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2d3d' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Leaderboard</p>
        <p style={{ fontSize:10, color:'#30363d', margin:'2px 0 0' }}>Updates every 30s</p>
      </div>
      {board.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'#30363d' }}>
          <Users size={28} style={{ margin:'0 auto 8px' }} />
          <p style={{ fontSize:12 }}>No submissions yet</p>
        </div>
      ) : board.map((entry) => (
        <div key={entry.user?.id} style={{ padding:'10px 16px', borderBottom:'1px solid #1e2d3d', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, fontWeight:800, color: entry.rank<=3 ? ['#f59e0b','#9ca3af','#d97706'][entry.rank-1] : '#8b949e', width:20, flexShrink:0 }}>#{entry.rank}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.user?.name}</p>
            <p style={{ fontSize:10, color:'#8b949e', margin:0 }}>{entry.solved} solved</p>
          </div>
          <span style={{ fontSize:13, fontWeight:800, color:'#0A6CFF' }}>{entry.total_score.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ContestArenaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [code, setCode] = useState('');
  const [chosenLang, setChosenLang] = useState('cpp');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('leaderboard');
  const pendingSubId = useRef(null);

  const countdown = useCountdown(contest?.end_time || new Date());

  const doSelectProblem = (cp) => {
    setSelectedProblem(cp);
    setResult(null);
    if (cp.problem_source === 'objective') return;
    const isHDL = cp.problem && HDL.includes(cp.problem.language);
    const lang = isHDL ? cp.problem.language : 'cpp';
    setChosenLang(lang);
    const draft = localStorage.getItem(`contest_${id}_${cp.problem_id}_${lang}`);
    setCode(draft || cp.problem?.starter_code || ALL_STARTERS[lang] || '');
  };

  useEffect(() => {
    contestApi.get(id)
      .then((r) => {
        const ct = r.data.contest;
        setContest(ct);
        const probs = ct.contest_problems || [];
        if (probs.length > 0) doSelectProblem(probs[0]);
      })
      .catch(() => navigate('/student/contests'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!socket) return;
    const onRunning = ({ submission_id }) => { if (submission_id === pendingSubId.current) setRunning(true); };
    const onResult = (data) => {
      if (data.submission_id === pendingSubId.current) {
        setRunning(false);
        setResult(data);
        setTab('results');
        contestApi.get(id).then((r) => setContest(r.data.contest)).catch(() => {});
      }
    };
    socket.on('lab:running', onRunning);
    socket.on('lab:result', onResult);
    return () => { socket.off('lab:running', onRunning); socket.off('lab:result', onResult); };
  }, [socket, id]);

  const handleCodeChange = (val) => {
    setCode(val || '');
    if (selectedProblem?.problem_id) {
      try { localStorage.setItem(`contest_${id}_${selectedProblem.problem_id}_${chosenLang}`, val || ''); } catch { }
    }
  };

  const switchLang = (l) => {
    setChosenLang(l);
    const draft = localStorage.getItem(`contest_${id}_${selectedProblem?.problem_id}_${l}`);
    setCode(draft || ALL_STARTERS[l] || '');
    setResult(null);
  };

  const submitCode = async () => {
    if (!selectedProblem || running) return;
    setRunning(true); setResult(null); setTab('results');
    try {
      const r = await contestApi.submit(id, { problem_id: selectedProblem.problem_id, source_code: code, chosen_language: chosenLang });
      pendingSubId.current = r.data.submission_id;
    } catch (err) {
      setRunning(false);
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Submit failed' });
    }
  };

  const submitMCQ = async (optionId) => {
    if (!selectedProblem) return;
    try {
      const r = await contestApi.submitObjective(id, { question_id: selectedProblem.question_id, selected_option_id: optionId });
      setResult({ status: r.data.status, is_correct: r.data.is_correct, score: r.data.score, objective: true });
      setTab('results');
      contestApi.get(id).then((res) => setContest(res.data.contest)).catch(() => {});
    } catch (e) {
      setResult({ status: 'error', compile_error: e.response?.data?.message || 'Failed', objective: true });
      setTab('results');
    }
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#070816' }}>
      <Spinner size="lg" />
    </div>
  );
  if (!contest) return null;

  const problems = contest.contest_problems || [];
  const isObjective = selectedProblem?.problem_source === 'objective';
  const isHDL = !isObjective && selectedProblem?.problem && HDL.includes(selectedProblem.problem.language);
  const showLangSwitcher = selectedProblem && !isHDL && !isObjective;
  const probIdx = selectedProblem ? problems.findIndex((p) => p.id === selectedProblem.id) : -1;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#070816', color:'#e2e8f0', fontFamily:'Inter, system-ui, sans-serif', overflow:'hidden' }}>

      {/* Top bar */}
      <div style={{ height:48, background:'#0a0e1a', borderBottom:'1px solid #1e2d3d', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 }}>
        <button onClick={() => navigate('/student/contests')} style={{ display:'flex', alignItems:'center', gap:5, color:'#8b949e', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>
          <ChevronLeft size={15} /> Contests
        </button>
        <div style={{ width:1, height:16, background:'#1e2d3d' }} />
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Trophy size={15} color="#0A6CFF" />
          <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{contest.title}</span>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'#1e2d3d', padding:'5px 12px', borderRadius:8, border:'1px solid #30363d' }}>
          <Clock size={12} color="#f59e0b" />
          <span style={{ fontSize:12, fontWeight:800, color:'#f59e0b', fontFamily:'monospace' }}>{countdown}</span>
        </div>
        {!isObjective && (
          <button onClick={submitCode} disabled={running || !selectedProblem}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:'none', background: running ? '#1e2d3d' : '#0A6CFF', color:'#fff', fontWeight:700, fontSize:12, cursor: running ? 'not-allowed' : 'pointer' }}>
            {running
              ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> Running...</>
              : <><CheckCircle2 size={12} /> Submit</>}
          </button>
        )}
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Problem list sidebar */}
        <div style={{ width:220, background:'#0a0e1a', borderRight:'1px solid #1e2d3d', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e2d3d' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Problems ({problems.length})</p>
          </div>
          {problems.map((cp, idx) => {
            const ts = TYPE_STYLE[cp.problem_type] || TYPE_STYLE.programming;
            const Icon = ts.icon;
            const mySub = cp.my_submission;
            const isSelected = selectedProblem?.id === cp.id;
            const label = cp.problem_source === 'objective' ? cp.question?.title : cp.problem?.title;
            return (
              <button key={cp.id} onClick={() => doSelectProblem(cp)}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', background: isSelected ? '#1e2d3d' : 'transparent', border:'none', borderLeft:`3px solid ${isSelected ? '#0A6CFF' : 'transparent'}`, cursor:'pointer', textAlign:'left', transition:'all 0.1s' }}>
                <div style={{ width:26, height:26, borderRadius:7, background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={12} color={ts.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, fontWeight:700, color: isSelected ? '#e2e8f0' : '#8b949e', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {String.fromCharCode(65 + idx)}. {label}
                  </p>
                  <p style={{ fontSize:10, color:'#30363d', margin:0 }}>{cp.marks}pts</p>
                </div>
                {mySub?.status === 'passed' && <CheckCircle2 size={13} color="#00d4aa" />}
                {mySub?.status === 'failed' && <XCircle size={13} color="#f87171" />}
              </button>
            );
          })}
        </div>

        {/* Problem description panel */}
        <div style={{ width:340, background:'#0a0e1a', borderRight:'1px solid #1e2d3d', overflowY:'auto', flexShrink:0 }}>
          {selectedProblem ? (
            <div style={{ padding:'16px' }}>
              <h2 style={{ fontSize:15, fontWeight:800, color:'#f0f6fc', margin:'0 0 8px' }}>
                {String.fromCharCode(65 + probIdx)}. {isObjective ? selectedProblem.question?.title : selectedProblem.problem?.title}
              </h2>
              <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, color: DIFF_COLOR[isObjective ? selectedProblem.question?.difficulty : selectedProblem.problem?.difficulty], background:'#1e2d3d', textTransform:'capitalize' }}>
                  {isObjective ? selectedProblem.question?.difficulty : selectedProblem.problem?.difficulty}
                </span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, color:'#f59e0b', background:'#1e2d3d' }}>{selectedProblem.marks} pts</span>
                {isObjective && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, color:'#dc2626', background:'#1e2d3d' }}>MCQ</span>}
              </div>

              {isObjective ? (
                <p style={{ fontSize:13, lineHeight:1.7, color:'#c9d1d9' }}>
                  {selectedProblem.question?.body || selectedProblem.question?.title}
                </p>
              ) : (
                <div>
                  <div style={{ fontSize:13, lineHeight:1.7, color:'#c9d1d9' }}
                    dangerouslySetInnerHTML={{ __html: selectedProblem.problem?.description || 'No description.' }} />
                  {(selectedProblem.problem?.test_cases || []).slice(0, 2).map((tc, i) => (
                    <div key={i} style={{ marginTop:12, background:'#0d1117', border:'1px solid #30363d', borderRadius:10, padding:'10px 12px' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 6px' }}>Example {i + 1}</p>
                      <p style={{ fontSize:10, color:'#8b949e', margin:'0 0 2px' }}>Input</p>
                      <pre style={{ fontSize:11, color:'#e2e8f0', background:'#161b22', padding:'6px 8px', borderRadius:6, margin:'0 0 6px', fontFamily:'monospace' }}>{tc.stdin || '(none)'}</pre>
                      <p style={{ fontSize:10, color:'#8b949e', margin:'0 0 2px' }}>Output</p>
                      <pre style={{ fontSize:11, color:'#00d4aa', background:'#161b22', padding:'6px 8px', borderRadius:6, margin:0, fontFamily:'monospace' }}>{tc.expected_output}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#30363d' }}>
              <p style={{ fontSize:13 }}>Select a problem</p>
            </div>
          )}
        </div>

        {/* Editor + right panel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Toolbar */}
          <div style={{ height:38, background:'#0d1117', borderBottom:'1px solid #1e2d3d', display:'flex', alignItems:'center', padding:'0 12px', gap:8, flexShrink:0 }}>
            {showLangSwitcher && (
              <div style={{ display:'flex', gap:3, background:'#070816', border:'1px solid #30363d', borderRadius:7, padding:3 }}>
                {SWITCHER_LANGS.map((l) => (
                  <button key={l} onClick={() => switchLang(l)}
                    style={{ padding:'3px 10px', borderRadius:5, border:'none', background: chosenLang === l ? '#0A6CFF' : 'transparent', color: chosenLang === l ? '#fff' : '#8b949e', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            )}
            {!showLangSwitcher && selectedProblem && !isObjective && (
              <span style={{ fontSize:11, fontWeight:600, color:'#0A6CFF' }}>{LANG_LABEL[chosenLang]}</span>
            )}
            {isObjective && (
              <span style={{ fontSize:11, fontWeight:600, color:'#dc2626' }}>📋 Objective Question</span>
            )}
            <div style={{ flex:1 }} />
            {result && !result.objective && (
              <span style={{ fontSize:11, fontWeight:700, color: result.status === 'passed' ? '#00d4aa' : '#f87171' }}>
                {result.status === 'passed' ? '✓ Accepted' : result.status === 'error' ? '✗ Error' : `✗ ${result.passed ?? 0}/${result.total ?? 0} passed`}
              </span>
            )}
          </div>

          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

            {/* Monaco or MCQ options */}
            <div style={{ flex:1, overflow: isObjective ? 'auto' : 'hidden' }}>
              {isObjective ? (
                <div style={{ padding:'20px 24px' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                    Select your answer
                  </p>
                  {(selectedProblem.question?.options || [])
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((opt) => {
                      const mySub = selectedProblem.my_submission;
                      const isSelected = mySub?.selected_option_id === opt.id;
                      const locked = mySub?.is_correct;
                      return (
                        <button key={opt.id} onClick={() => !locked && submitMCQ(opt.id)}
                          style={{
                            display:'block', width:'100%', textAlign:'left',
                            padding:'12px 16px', marginBottom:10, borderRadius:12,
                            border:`1.5px solid ${isSelected ? (mySub.is_correct ? '#00d4aa' : '#f87171') : '#30363d'}`,
                            background: isSelected ? (mySub.is_correct ? '#00d4aa0d' : '#ef44440d') : '#0d1117',
                            color:'#e2e8f0', fontSize:13, cursor: locked ? 'default' : 'pointer',
                            transition:'all 0.15s',
                          }}>
                          <span style={{ fontWeight:600 }}>{opt.option_text}</span>
                          {isSelected && (
                            <span style={{ marginLeft:10, fontSize:11, fontWeight:700, color: mySub.is_correct ? '#00d4aa' : '#f87171' }}>
                              {mySub.is_correct ? '✓ Correct' : '✗ Wrong - try again'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  {selectedProblem.my_submission?.is_correct && (
                    <div style={{ padding:'12px 16px', borderRadius:12, background:'#00d4aa0d', border:'1px solid #00d4aa30', color:'#00d4aa', fontSize:13, fontWeight:700, marginTop:8 }}>
                      ✓ Correct! +{selectedProblem.my_submission.score} pts
                    </div>
                  )}
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={monacoLang(chosenLang)}
                  value={code}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{ fontSize:13, minimap:{ enabled:false }, scrollBeyondLastLine:false, wordWrap:'on', fontFamily:'JetBrains Mono, Fira Code, Consolas, monospace', padding:{ top:10 }, tabSize:2 }}
                />
              )}
            </div>

            {/* Right panel: leaderboard / results */}
            <div style={{ width:260, background:'#0a0e1a', borderLeft:'1px solid #1e2d3d', display:'flex', flexDirection:'column', flexShrink:0 }}>
              <div style={{ display:'flex', borderBottom:'1px solid #1e2d3d', flexShrink:0 }}>
                {[['leaderboard', BarChart2, 'Board'], ['results', FlaskConical, 'Results']].map(([t, Icon, label]) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 6px', border:'none', borderBottom:`2px solid ${tab === t ? '#0A6CFF' : 'transparent'}`, background:'transparent', color: tab === t ? '#0A6CFF' : '#8b949e', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                {tab === 'leaderboard' && <LeaderboardPanel contestId={id} />}
                {tab === 'results' && (
                  <div style={{ padding:12, overflowY:'auto', height:'100%' }}>
                    {running && (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10 }}>
                        <Loader2 size={24} style={{ color:'#0A6CFF', animation:'spin 1s linear infinite' }} />
                        <p style={{ fontSize:12, color:'#8b949e' }}>Running...</p>
                      </div>
                    )}
                    {!result && !running && (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, color:'#30363d' }}>
                        <FlaskConical size={24} />
                        <p style={{ fontSize:12 }}>{isObjective ? 'Click an option to answer' : 'Submit to see results'}</p>
                      </div>
                    )}
                    {result && !running && (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <div style={{ padding:'10px 12px', borderRadius:10, background: result.status === 'passed' ? '#00d4aa0d' : '#ef44440d', border:`1px solid ${result.status === 'passed' ? '#00d4aa30' : '#ef444430'}` }}>
                          <p style={{ fontSize:13, fontWeight:800, color: result.status === 'passed' ? '#00d4aa' : '#f87171', margin:'0 0 4px' }}>
                            {result.status === 'passed' ? '✓ Accepted' : result.status === 'error' ? '✗ Error' : '✗ Wrong Answer'}
                          </p>
                          {result.objective
                            ? <p style={{ fontSize:11, color:'#8b949e', margin:0 }}>{result.is_correct ? `+${result.score} pts earned` : 'Incorrect - try another option'}</p>
                            : result.total > 0 && <p style={{ fontSize:11, color:'#8b949e', margin:0 }}>{result.passed}/{result.total} test cases passed</p>
                          }
                          {result.score > 0 && !result.objective && <p style={{ fontSize:11, color:'#f59e0b', margin:'2px 0 0', fontWeight:700 }}>+{result.score.toFixed(0)} pts</p>}
                        </div>
                        {result.compile_error && (
                          <pre style={{ fontSize:11, color:'#f87171', background:'#0d1117', padding:'8px 10px', borderRadius:8, fontFamily:'monospace', whiteSpace:'pre-wrap', margin:0 }}>{result.compile_error}</pre>
                        )}
                        {!result.objective && (result.results || []).map((r, i) => (
                          <div key={i} style={{ padding:'8px 10px', borderRadius:8, background:'#0d1117', border:`1px solid ${r.passed ? '#00d4aa20' : '#ef444420'}`, display:'flex', alignItems:'center', gap:8 }}>
                            {r.hidden
                              ? <span style={{ fontSize:11, color:'#8b949e' }}>🔒 Hidden</span>
                              : r.passed ? <CheckCircle2 size={13} color="#00d4aa" /> : <XCircle size={13} color="#f87171" />}
                            <span style={{ fontSize:11, color: r.passed ? '#00d4aa' : '#f87171', fontWeight:600 }}>
                              {r.hidden ? `Hidden ${i+1}` : r.name || `Case ${i+1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
