import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Trophy, Clock, CheckCircle2, XCircle, ChevronLeft,
  Users, BarChart2, Code2, Cpu, Database, Zap, Loader2,
  FlaskConical, Play, Send, RotateCcw, AlertCircle,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { contestApi } from '../../lib/contestApi';
import { useSocket } from '../../context/SocketContext';

const HDL = ['verilog', 'vhdl', 'systemverilog'];
const LANG_LABEL = {
  verilog: 'Verilog', vhdl: 'VHDL', systemverilog: 'SystemVerilog',
  c: 'C', cpp: 'C++', python: 'Python', java: 'Java',
  embedded_c: 'Embedded C', sql: 'MySQL/SQL',
};
const TYPE_STYLE = {
  programming: { icon: Code2,    color: '#059669', bg: '#f0fdf4' },
  database:    { icon: Database, color: '#2563eb', bg: '#eff6ff' },
  hardware:    { icon: Cpu,      color: '#7C3AED', bg: '#f5f3ff' },
  embedded:    { icon: Zap,      color: '#d97706', bg: '#fffbeb' },
  objective:   { icon: BarChart2,color: '#dc2626', bg: '#fef2f2' },
};
const SWITCHER_LANGS = ['c', 'cpp', 'python', 'java'];
const ALL_STARTERS = {
  c: '#include <stdio.h>\nint main() {\n    \n    return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    \n    return 0;\n}',
  python: '# Write your solution\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}',
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
      .then(r => setBoard(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [contestId]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:24 }}><Spinner /></div>;
  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid #1e2d3d' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Leaderboard</p>
        <p style={{ fontSize:10, color:'#30363d', margin:'2px 0 0' }}>Updates every 30s</p>
      </div>
      {board.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'#30363d' }}>
          <Users size={28} style={{ margin:'0 auto 8px' }} />
          <p style={{ fontSize:12 }}>No submissions yet</p>
        </div>
      ) : board.map(entry => (
        <div key={entry.user?.id} style={{ padding:'9px 14px', borderBottom:'1px solid #1e2d3d', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, fontWeight:800, color: entry.rank<=3 ? ['#f59e0b','#9ca3af','#d97706'][entry.rank-1] : '#8b949e', width:22, flexShrink:0 }}>#{entry.rank}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.user?.name}</p>
            <p style={{ fontSize:10, color:'#8b949e', margin:0 }}>{entry.solved} solved</p>
          </div>
          <span style={{ fontSize:13, fontWeight:800, color:'#A855F7' }}>{entry.total_score?.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

function ResultPanel({ running, result }) {
  if (running) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10 }}>
      <Loader2 size={24} style={{ color:'#A855F7', animation:'spin 1s linear infinite' }} />
      <p style={{ fontSize:12, color:'#8b949e' }}>Judging...</p>
    </div>
  );
  if (!result) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, color:'#30363d' }}>
      <FlaskConical size={24} />
      <p style={{ fontSize:12 }}>Submit to see results</p>
    </div>
  );
  const isRun = result.mode === 'run';
  const passed = result.status === 'passed';
  const isError = result.status === 'error';
  return (
    <div style={{ padding:12, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ padding:'10px 12px', borderRadius:10, background: passed ? '#00d4aa0d' : isError ? '#ef44440d' : '#ef44440d', border:`1px solid ${passed ? '#00d4aa30' : '#ef444430'}` }}>
        <p style={{ fontSize:13, fontWeight:800, color: passed ? '#00d4aa' : '#f87171', margin:'0 0 3px' }}>
          {isRun ? (passed ? '✓ Sample Tests Passed' : isError ? '✗ Error' : '✗ Wrong Answer') : (passed ? '✓ Accepted' : isError ? '✗ Error' : '✗ Wrong Answer')}
        </p>
        {result.total > 0 && <p style={{ fontSize:11, color:'#8b949e', margin:0 }}>{result.passed}/{result.total} test cases passed</p>}
        {result.score > 0 && !isRun && <p style={{ fontSize:11, color:'#f59e0b', margin:'2px 0 0', fontWeight:700 }}>+{result.score?.toFixed(0)} pts</p>}
        {isRun && <p style={{ fontSize:10, color:'#8b949e', margin:'3px 0 0' }}>Run mode — no points awarded</p>}
      </div>
      {result.compile_error && (
        <pre style={{ fontSize:11, color:'#f87171', background:'#0d1117', padding:'8px 10px', borderRadius:8, fontFamily:'monospace', whiteSpace:'pre-wrap', margin:0 }}>{result.compile_error}</pre>
      )}
      {(result.results || []).map((r, i) => (
        <div key={i} style={{ padding:'7px 10px', borderRadius:8, background:'#0d1117', border:`1px solid ${r.passed ? '#00d4aa20' : '#ef444420'}`, display:'flex', alignItems:'center', gap:8 }}>
          {r.hidden ? <span style={{ fontSize:11, color:'#8b949e' }}>🔒 Hidden</span>
            : r.passed ? <CheckCircle2 size={13} color="#00d4aa" /> : <XCircle size={13} color="#f87171" />}
          <span style={{ fontSize:11, color: r.passed ? '#00d4aa' : '#f87171', fontWeight:600 }}>
            {r.hidden ? `Hidden ${i+1}` : r.name || `Case ${i+1}`}
          </span>
          {!r.hidden && r.error && <span style={{ fontSize:10, color:'#f87171', marginLeft:'auto' }}>{r.error}</span>}
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
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [rightTab, setRightTab] = useState('leaderboard');
  const [confirmExit, setConfirmExit] = useState(false);
  const pendingSubId = useRef(null);
  const countdown = useCountdown(contest?.end_time || new Date());

  const draftKey = (probId, lang) => `contest_${id}_${probId}_${lang}`;

  const doSelectProblem = useCallback((cp) => {
    setSelectedProblem(cp);
    setResult(null);
    if (cp.problem_source === 'objective') return;
    const isHDL = cp.problem && HDL.includes(cp.problem.language);
    const lang = isHDL ? cp.problem.language : 'cpp';
    setChosenLang(lang);
    try {
      const draft = localStorage.getItem(draftKey(cp.problem_id, lang));
      setCode(draft || cp.problem?.starter_code || ALL_STARTERS[lang] || '');
    } catch { setCode(cp.problem?.starter_code || ALL_STARTERS[lang] || ''); }
  }, [id]); // eslint-disable-line

  useEffect(() => {
    contestApi.get(id)
      .then(r => {
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
    const onRunning = ({ submission_id }) => {
      if (submission_id === pendingSubId.current) setSubmitting(true);
    };
    const onResult = (data) => {
      if (data.submission_id === pendingSubId.current) {
        setSubmitting(false);
        setRunning(false);
        setResult({ ...data, mode: 'submit' });
        setRightTab('results');
        contestApi.get(id).then(r => setContest(r.data.contest)).catch(() => {});
      }
    };
    socket.on('lab:running', onRunning);
    socket.on('lab:result', onResult);
    return () => { socket.off('lab:running', onRunning); socket.off('lab:result', onResult); };
  }, [socket, id]);

  const handleCodeChange = (val) => {
    setCode(val || '');
    if (selectedProblem?.problem_id) {
      try { localStorage.setItem(draftKey(selectedProblem.problem_id, chosenLang), val || ''); } catch {}
    }
  };

  const switchLang = (l) => {
    setChosenLang(l);
    try {
      const draft = localStorage.getItem(draftKey(selectedProblem?.problem_id, l));
      setCode(draft || ALL_STARTERS[l] || '');
    } catch { setCode(ALL_STARTERS[l] || ''); }
    setResult(null);
  };

  const resetCode = () => {
    if (!selectedProblem) return;
    const fresh = selectedProblem.problem?.starter_code || ALL_STARTERS[chosenLang] || '';
    setCode(fresh);
    try { localStorage.removeItem(draftKey(selectedProblem.problem_id, chosenLang)); } catch {}
  };

  const handleRun = async () => {
    if (!selectedProblem || running || submitting) return;
    setRunning(true); setResult(null); setRightTab('results');
    try {
      const r = await contestApi.run(id, { problem_id: selectedProblem.problem_id, source_code: code, chosen_language: chosenLang });
      setResult({ ...r.data, mode: 'run' });
    } catch (err) {
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Run failed', mode: 'run' });
    } finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    if (!selectedProblem || submitting || running) return;
    setSubmitting(true); setResult(null); setRightTab('results');
    try {
      const r = await contestApi.submit(id, { problem_id: selectedProblem.problem_id, source_code: code, chosen_language: chosenLang });
      pendingSubId.current = r.data.submission_id;
    } catch (err) {
      setSubmitting(false);
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Submit failed', mode: 'submit' });
    }
  };

  const submitMCQ = async (optionId) => {
    if (!selectedProblem) return;
    try {
      const r = await contestApi.submitObjective(id, { question_id: selectedProblem.question_id, selected_option_id: optionId });
      setResult({ ...r.data, objective: true, mode: 'submit' });
      setRightTab('results');
      contestApi.get(id).then(r => setContest(r.data.contest)).catch(() => {});
    } catch (e) {
      setResult({ status: 'error', compile_error: e.response?.data?.message || 'Failed', objective: true, mode: 'submit' });
      setRightTab('results');
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
  const probIdx = selectedProblem ? problems.findIndex(p => p.id === selectedProblem.id) : -1;
  const isEnded = countdown === 'Ended';
  const busy = running || submitting;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#070816', color:'#e2e8f0', fontFamily:'Inter, system-ui, sans-serif', overflow:'hidden' }}>

      {/* Top bar */}
      <div style={{ height:48, background:'#0a0e1a', borderBottom:'1px solid #1e2d3d', display:'flex', alignItems:'center', padding:'0 14px', gap:10, flexShrink:0 }}>
        <button onClick={() => setConfirmExit(true)} style={{ display:'flex', alignItems:'center', gap:5, color:'#8b949e', background:'none', border:'none', cursor:'pointer', fontSize:12, padding:'4px 8px', borderRadius:6 }}>
          <ChevronLeft size={15} /> Exit
        </button>
        <div style={{ width:1, height:16, background:'#1e2d3d' }} />
        <Trophy size={14} color="#A855F7" />
        <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contest.title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'#1e2d3d', padding:'4px 10px', borderRadius:7, border:'1px solid #30363d' }}>
          <Clock size={12} color={isEnded ? '#f87171' : '#f59e0b'} />
          <span style={{ fontSize:12, fontWeight:800, color: isEnded ? '#f87171' : '#f59e0b', fontFamily:'monospace' }}>{countdown}</span>
        </div>
        {!isObjective && selectedProblem && (
          <>
            <button onClick={handleRun} disabled={busy || isEnded || isObjective}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid #30363d', background: busy ? '#1e2d3d' : '#161b22', color: busy ? '#8b949e' : '#e2e8f0', fontWeight:600, fontSize:12, cursor: busy || isEnded ? 'not-allowed' : 'pointer' }}>
              {running ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> : <Play size={12} />}
              Run
            </button>
            <button onClick={handleSubmit} disabled={busy || isEnded}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:7, border:'none', background: busy || isEnded ? '#1e2d3d' : '#A855F7', color: busy || isEnded ? '#8b949e' : '#fff', fontWeight:700, fontSize:12, cursor: busy || isEnded ? 'not-allowed' : 'pointer' }}>
              {submitting ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> : <Send size={12} />}
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Problem list sidebar */}
        <div style={{ width:210, background:'#0a0e1a', borderRight:'1px solid #1e2d3d', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
          <div style={{ padding:'9px 12px', borderBottom:'1px solid #1e2d3d' }}>
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
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background: isSelected ? '#1e2d3d' : 'transparent', border:'none', borderLeft:`3px solid ${isSelected ? '#A855F7' : 'transparent'}`, cursor:'pointer', textAlign:'left', transition:'all 0.1s' }}>
                <div style={{ width:26, height:26, borderRadius:7, background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={12} color={ts.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, fontWeight:700, color: isSelected ? '#e2e8f0' : '#8b949e', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {String.fromCharCode(65+idx)}. {label}
                  </p>
                  <p style={{ fontSize:10, color:'#30363d', margin:0 }}>{cp.marks}pts</p>
                </div>
                {mySub?.status === 'passed' && <CheckCircle2 size={12} color="#00d4aa" />}
                {mySub?.status === 'failed' && <XCircle size={12} color="#f87171" />}
              </button>
            );
          })}
        </div>

        {/* Problem description */}
        <div style={{ width:320, background:'#0a0e1a', borderRight:'1px solid #1e2d3d', overflowY:'auto', flexShrink:0 }}>
          {selectedProblem ? (
            <div style={{ padding:16 }}>
              <h2 style={{ fontSize:14, fontWeight:800, color:'#f0f6fc', margin:'0 0 8px' }}>
                {String.fromCharCode(65+probIdx)}. {isObjective ? selectedProblem.question?.title : selectedProblem.problem?.title}
              </h2>
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, color:'#f59e0b', background:'#1e2d3d' }}>{selectedProblem.marks} pts</span>
                {isObjective && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, color:'#dc2626', background:'#1e2d3d' }}>MCQ</span>}
              </div>
              {isObjective ? (
                <p style={{ fontSize:13, lineHeight:1.7, color:'#c9d1d9' }}>{selectedProblem.question?.body || selectedProblem.question?.title}</p>
              ) : (
                <div>
                  <div style={{ fontSize:13, lineHeight:1.7, color:'#c9d1d9' }}
                    dangerouslySetInnerHTML={{ __html: selectedProblem.problem?.description || 'No description.' }} />
                  {(selectedProblem.problem?.test_cases || []).slice(0,2).map((tc, i) => (
                    <div key={i} style={{ marginTop:12, background:'#0d1117', border:'1px solid #30363d', borderRadius:10, padding:'10px 12px' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 6px' }}>Example {i+1}</p>
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
                {SWITCHER_LANGS.map(l => (
                  <button key={l} onClick={() => switchLang(l)}
                    style={{ padding:'3px 9px', borderRadius:5, border:'none', background: chosenLang===l ? '#A855F7' : 'transparent', color: chosenLang===l ? '#fff' : '#8b949e', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            )}
            {!showLangSwitcher && selectedProblem && !isObjective && (
              <span style={{ fontSize:11, fontWeight:600, color:'#A855F7' }}>{LANG_LABEL[chosenLang]}</span>
            )}
            {isObjective && <span style={{ fontSize:11, fontWeight:600, color:'#dc2626' }}>Objective Question</span>}
            <div style={{ flex:1 }} />
            {!isObjective && selectedProblem && (
              <button onClick={resetCode} title="Reset code" style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, border:'1px solid #30363d', background:'transparent', color:'#8b949e', fontSize:11, cursor:'pointer' }}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

            {/* Monaco or MCQ */}
            <div style={{ flex:1, overflow: isObjective ? 'auto' : 'hidden' }}>
              {isObjective ? (
                <div style={{ padding:'20px 24px' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Select your answer</p>
                  {(selectedProblem.question?.options || []).sort((a,b) => a.order_index - b.order_index).map(opt => {
                    const mySub = selectedProblem.my_submission;
                    const isSelected = mySub?.selected_option_id === opt.id;
                    const locked = mySub?.is_correct;
                    return (
                      <button key={opt.id} onClick={() => !locked && submitMCQ(opt.id)}
                        style={{ display:'block', width:'100%', textAlign:'left', padding:'12px 16px', marginBottom:10, borderRadius:12, border:`1.5px solid ${isSelected ? (mySub.is_correct ? '#00d4aa' : '#f87171') : '#30363d'}`, background: isSelected ? (mySub.is_correct ? '#00d4aa0d' : '#ef44440d') : '#0d1117', color:'#e2e8f0', fontSize:13, cursor: locked ? 'default' : 'pointer', transition:'all 0.15s' }}>
                        <span style={{ fontWeight:600 }}>{opt.option_text}</span>
                        {isSelected && <span style={{ marginLeft:10, fontSize:11, fontWeight:700, color: mySub.is_correct ? '#00d4aa' : '#f87171' }}>{mySub.is_correct ? '✓ Correct' : '✗ Wrong'}</span>}
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
                <Editor height="100%" language={monacoLang(chosenLang)} value={code} onChange={handleCodeChange} theme="vs-dark"
                  options={{ fontSize:13, minimap:{ enabled:false }, scrollBeyondLastLine:false, wordWrap:'on', fontFamily:'JetBrains Mono, Fira Code, Consolas, monospace', padding:{ top:10 }, tabSize:2 }} />
              )}
            </div>

            {/* Right panel */}
            <div style={{ width:260, background:'#0a0e1a', borderLeft:'1px solid #1e2d3d', display:'flex', flexDirection:'column', flexShrink:0 }}>
              <div style={{ display:'flex', borderBottom:'1px solid #1e2d3d', flexShrink:0 }}>
                {[['leaderboard', BarChart2, 'Board'], ['results', FlaskConical, 'Results']].map(([t, Icon, label]) => (
                  <button key={t} onClick={() => setRightTab(t)}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 6px', border:'none', borderBottom:`2px solid ${rightTab===t ? '#A855F7' : 'transparent'}`, background:'transparent', color: rightTab===t ? '#A855F7' : '#8b949e', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                {rightTab === 'leaderboard' && <LeaderboardPanel contestId={id} />}
                {rightTab === 'results' && <ResultPanel running={submitting || running} result={result} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit confirm */}
      {confirmExit && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#0a0e1a', border:'1px solid #30363d', borderRadius:14, padding:24, maxWidth:360, width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <AlertCircle size={18} color="#f59e0b" />
              <p style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', margin:0 }}>Exit Contest?</p>
            </div>
            <p style={{ fontSize:13, color:'#8b949e', margin:'0 0 18px', lineHeight:1.6 }}>Your code drafts are saved locally. Submissions already made will be counted.</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setConfirmExit(false)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1px solid #30363d', background:'transparent', color:'#8b949e', fontWeight:600, fontSize:13, cursor:'pointer' }}>Stay</button>
              <button onClick={() => navigate('/student/contests')} style={{ flex:1, padding:'9px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
