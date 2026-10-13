import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Play, CheckCircle, Loader2, CheckCircle2, XCircle, Terminal,
  Activity, FlaskConical, FileCode2, BookOpen, BarChart2,
  Lightbulb, StickyNote, Share2, RotateCcw, Medal, ChevronLeft,
  ChevronRight, Star, Moon, Maximize2,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import WaveformViewer from '../../components/WaveformViewer';
import { labApi } from '../../lib/labApi';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const HDL = ['verilog', 'vhdl', 'systemverilog'];

const LANG_META = {
  verilog:      { label: 'Verilog',     short: 'V',   color: '#a78bfa', bg: '#1e1040' },
  systemverilog:{ label: 'SystemVerilog', short: 'SV', color: '#818cf8', bg: '#1e1040' },
  vhdl:         { label: 'VHDL',        short: 'VH',  color: '#6366f1', bg: '#1e1040' },
  c:            { label: 'C',           short: 'C',   color: '#60a5fa', bg: '#0f1e35' },
  cpp:          { label: 'C++',         short: 'C++', color: '#38bdf8', bg: '#0f1e35' },
  python:       { label: 'Python',      short: 'Py',  color: '#facc15', bg: '#1f1a00' },
  java:         { label: 'Java',        short: 'Jv',  color: '#fb923c', bg: '#1f0f00' },
  embedded_c:   { label: 'Embedded C',  short: 'EC',  color: '#34d399', bg: '#001f10' },
  sql:          { label: 'SQL',         short: 'SQL', color: '#22d3ee', bg: '#001f25' },
};

const DIFF_STYLE = {
  easy:   { bg: '#10b98120', color: '#10b981', border: '#10b98140' },
  medium: { bg: '#f59e0b20', color: '#f59e0b', border: '#f59e0b40' },
  hard:   { bg: '#ef444420', color: '#ef4444', border: '#ef444440' },
};

const BRAND = '#00A6FF';
const BG_MAIN  = '#0d0d0d';
const BG_SIDE  = '#141414';
const BG_PANEL = '#1a1a1a';
const BORDER   = '#2a2a2a';

const LEFT_TABS = [
  { id: 'problem',     label: 'Description', icon: BookOpen },
  { id: 'submissions', label: 'Submissions',  icon: BarChart2 },
  { id: 'hints',       label: 'Hints',        icon: Lightbulb },
  { id: 'notes',       label: 'Notes',        icon: StickyNote },
  { id: 'results',     label: 'Results',      icon: FlaskConical },
];

const RESULT_TABS = [
  { id: 'testcases', label: 'Test Cases', icon: FlaskConical },
  { id: 'console',   label: 'Console',    icon: Terminal },
  { id: 'waveform',  label: 'Waveform',   icon: Activity },
];


function monacoLang(lang) {
  if (['verilog','vhdl','systemverilog'].includes(lang)) return 'verilog';
  if (['c','cpp','embedded_c'].includes(lang)) return 'c';
  if (lang === 'sql') return 'sql';
  return lang || 'plaintext';
}

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function parseVerilogLine(name) {
  if (!name) return { input: '', expected: '', got: '' };
  const pi = name.indexOf(' | ');
  if (pi !== -1) {
    const input = name.slice(0, pi).trim();
    const rest  = name.slice(pi + 3);
    const em = rest.match(/expected=(\S+)/);
    const gm = rest.match(/got=(\S+)/);
    return { input, expected: em ? em[1] : rest, got: gm ? gm[1] : '' };
  }
  const ei = name.lastIndexOf('=');
  if (ei !== -1) {
    return { input: name.slice(0, ei).trim(), expected: name.slice(ei + 1).trim(), got: name.slice(ei + 1).trim() };
  }
  return { input: name, expected: '', got: '' };
}

const ALL_LANG_STARTERS = {
  c:            '#include <stdio.h>\nint main() {\n    // Write your solution here\n    return 0;\n}',
  cpp:          '#include <iostream>\nusing namespace std;\nint main() {\n    // Write your solution here\n    return 0;\n}',
  python:       '# Write your solution here\n',
  java:         'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  embedded_c:   '#include <stdio.h>\n// Simulated AVR Embedded C\nint main(void) {\n    // Write your solution here\n    return 0;\n}',
  sql:          '-- Write your SQL query here\nSELECT * FROM your_table;',
  systemverilog:'module solution(\n  input logic clk,\n  input logic rst,\n  output logic y\n);\n  // Write your SystemVerilog code here\nendmodule',
};

export default function LabIDEPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dcId = searchParams.get('dc');
  const { socket } = useSocket();

  const [problem, setProblem]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [code, setCode]               = useState('');
  const [chosenLang, setChosenLang]   = useState(null);
  const [leftTab, setLeftTab]         = useState('problem');
  const [resultTab, setResultTab]     = useState('testcases');
  const [leftWidth, setLeftWidth]     = useState(400);
  const [running, setRunning]         = useState(false);
  const [result, setResult]           = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes]             = useState('');
  const [saved, setSaved]             = useState(false);
  const pendingSubId = useRef(null);
  const saveTimer    = useRef(null);

  const draftKey = (lang) => `lab_draft_${id}_${lang}`;

  const handleCodeChange = (val) => {
    setCode(val || '');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(draftKey(chosenLang), val || ''); setSaved(true); setTimeout(() => setSaved(false), 1500); } catch {}
    }, 800);
  };

  // Poll submission every 500ms until it leaves 'running'/'pending'
  // This is the reliable path — works even when socket URL is misconfigured
  const pollSubmission = useCallback(async (subId, mode) => {
    const MAX = 60; // 30s
    for (let i = 0; i < MAX; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (pendingSubId.current !== subId) return; // superseded
      try {
        const r = await labApi.getSubmission(subId);
        const sub = r.data.submission || r.data;
        if (sub.status === 'running' || sub.status === 'pending') continue;
        pendingSubId.current = null;
        const data = {
          submission_id: subId, mode,
          status:        sub.status,
          score:         sub.score,
          compile_error: sub.compile_error,
          results:       sub.results || [],
          waveform_vcd:  sub.waveform_vcd,
          stdout:        sub.stdout,
          passed:        sub.passed_cases,
          total:         sub.total_cases,
          runtime_ms:    sub.runtime_ms,
        };
        setRunning(false);
        setResult(data);
        setLeftTab('results');
        if (data.waveform_vcd) setResultTab('waveform');
        else if (data.compile_error) setResultTab('console');
        else setResultTab('testcases');
        if (mode === 'submit') {
          labApi.mySubmissions(id).then(r => setSubmissions(r.data.submissions || r.data || [])).catch(() => {});
          if (dcId && data.status === 'passed') labApi.dcMarkSolved(dcId).catch(() => {});
        }
        return;
      } catch { /* network blip — keep polling */ }
    }
    setRunning(false);
    setResult({ status: 'error', compile_error: 'Timed out waiting for result. Please try again.' });
    setLeftTab('results'); setResultTab('console');
  }, [id, dcId]); // eslint-disable-line

  useEffect(() => {
    labApi.get(id)
      .then((r) => {
        const p = r.data.problem || r.data;
        setProblem(p);
        const allowed = p.allowed_languages?.length ? p.allowed_languages : [p.language];
        const def = allowed[0];
        setChosenLang(def);
        const draft = localStorage.getItem(`lab_draft_${id}_${def}`);
        setCode(draft !== null ? draft : (p.starter_code || ALL_LANG_STARTERS[def] || ''));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    labApi.mySubmissions(id).then((r) => setSubmissions(Array.isArray(r.data) ? r.data : r.data.submissions || [])).catch(() => {});
  }, [id]); // eslint-disable-line

  const startDrag = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startW = leftWidth;
    const onMove = (ev) => setLeftWidth(Math.min(700, Math.max(280, startW + ev.clientX - startX)));
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  // Socket = fast path. Poll = reliable fallback.
  useEffect(() => {
    if (!socket) return;
    const onResult = (data) => {
      if (data.submission_id !== pendingSubId.current) return;
      pendingSubId.current = null; // stop poll loop
      setRunning(false);
      setResult(data);
      setLeftTab('results');
      if (data.waveform_vcd) setResultTab('waveform');
      else if (data.compile_error) setResultTab('console');
      else setResultTab('testcases');
      if (data.mode === 'submit') {
        labApi.mySubmissions(id).then(r => setSubmissions(r.data.submissions || r.data || [])).catch(() => {});
        if (dcId && data.status === 'passed') labApi.dcMarkSolved(dcId).catch(() => {});
      }
    };
    socket.on('lab:result', onResult);
    return () => socket.off('lab:result', onResult);
  }, [socket, id, dcId]); // eslint-disable-line

  const handleRun = async () => {
    if (running) return;
    setRunning(true); setResult(null); setLeftTab('results'); setResultTab('testcases');
    try {
      const r = await labApi.run(id, code, chosenLang);
      const subId = r.data.submission_id;
      pendingSubId.current = subId;
      pollSubmission(subId, 'run');
    } catch (err) {
      setRunning(false);
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Failed to run' });
    }
  };

  const handleSubmit = async () => {
    if (running) return;
    setRunning(true); setResult(null); setLeftTab('results'); setResultTab('testcases');
    try {
      const r = await labApi.submit(id, code, chosenLang);
      const subId = r.data.submission_id;
      pendingSubId.current = subId;
      pollSubmission(subId, 'submit');
    } catch (err) {
      setRunning(false);
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Failed to submit' });
    }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background: BG_MAIN }}><Spinner size="lg" /></div>;
  if (!problem) return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'100vh', background: BG_MAIN, gap:12 }}>
      <span style={{ fontSize:14, color:'#ef4444' }}>Problem not found or inactive.</span>
      <button onClick={() => navigate('/student/lab')} style={{ padding:'8px 20px', borderRadius:8, background: BRAND, color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>Back to Lab</button>
    </div>
  );

  const isHDL = HDL.includes(chosenLang || problem.language);
  const switcherLangs = problem.allowed_languages?.length
    ? problem.allowed_languages
    : HDL.includes(problem.language) ? [problem.language] : ['c','cpp','python','java'];
  const meta = LANG_META[chosenLang || problem.language] || LANG_META.c;
  const diff = DIFF_STYLE[problem.difficulty] || DIFF_STYLE.easy;
  const fileLabel = isHDL ? 'design.sv' : `solution.${chosenLang === 'python' ? 'py' : chosenLang === 'java' ? 'java' : chosenLang === 'cpp' ? 'cpp' : 'c'}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background: BG_MAIN, color:'#e2e8f0', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 16px', height:48, flexShrink:0, background:'#111', borderBottom:`1px solid ${BORDER}` }}>
        <button onClick={() => navigate('/student/lab')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'-0.02em' }}>
          <FileCode2 size={16} color={BRAND} /> NuroSilicon
        </button>
        <div style={{ width:1, height:16, background: BORDER }} />
        <button onClick={() => navigate('/student/lab')} style={{ background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:12, fontWeight:500 }}>Problems</button>
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555', padding:'2px 4px' }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize:12, color:'#555' }}>{problem.question_no || 1} / 256</span>
          <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555', padding:'2px 4px' }}><ChevronRight size={14} /></button>
        </div>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><Star size={14} /></button>
        <div style={{ flex:1 }} />
        {/* status */}
        {!running && result?.status === 'passed' && <span style={{ fontSize:11, fontWeight:700, color:'#10b981', background:'#10b98118', border:'1px solid #10b98140', padding:'3px 10px', borderRadius:99, display:'flex', alignItems:'center', gap:5 }}><CheckCircle2 size={11}/>Accepted</span>}
        {!running && result?.status === 'failed' && <span style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'#ef444418', border:'1px solid #ef444440', padding:'3px 10px', borderRadius:99, display:'flex', alignItems:'center', gap:5 }}><XCircle size={11}/>Wrong Answer</span>}
        {!running && result?.status === 'error'  && <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b', background:'#f59e0b18', border:'1px solid #f59e0b40', padding:'3px 10px', borderRadius:99, display:'flex', alignItems:'center', gap:5 }}><XCircle size={11}/>Error</span>}
        {running && <span style={{ fontSize:11, color:'#f59e0b', display:'flex', alignItems:'center', gap:5 }}><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/>Running...</span>}
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><Moon size={14}/></button>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><Maximize2 size={14}/></button>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><Share2 size={14}/></button>
        {/* Run */}
        <button onClick={handleRun} disabled={running} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 18px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#222', color:'#e2e8f0', fontWeight:600, fontSize:13, cursor:'pointer', opacity: running ? 0.5 : 1 }}>
          {running ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> : <Play size={13} fill="currentColor"/>} Run Code
        </button>
        {/* Submit */}
        <button onClick={handleSubmit} disabled={running} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 18px', borderRadius:8, border:'none', background: BRAND, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', opacity: running ? 0.5 : 1 }}>
          <CheckCircle size={13}/> Submit
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── LANG SIDEBAR — only show langs available for this problem ── */}
        {switcherLangs.length > 1 && (
          <div style={{ width:64, flexShrink:0, background:'#111', borderRight:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:8, gap:4 }}>
            {switcherLangs.map(l => {
              const m = LANG_META[l] || { label: l, short: l.slice(0,2).toUpperCase(), color:'#888', bg:'#1a1a1a' };
              const active = (chosenLang || problem.language) === l;
              return (
                <button key={l} onClick={() => {
                  setChosenLang(l);
                  const draft = localStorage.getItem(`lab_draft_${id}_${l}`);
                  setCode(draft !== null ? draft : (problem.starter_code || ALL_LANG_STARTERS[l] || ''));
                  setResult(null);
                }}
                  title={m.label}
                  style={{ width:48, height:48, borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, border: active ? `1.5px solid ${m.color}` : '1.5px solid transparent', background: active ? m.bg : 'transparent', cursor:'pointer', transition:'all 0.15s' }}>
                  <span style={{ fontSize:11, fontWeight:800, color: active ? m.color : '#555', letterSpacing:'-0.02em' }}>{m.short}</span>
                  <span style={{ fontSize:9, color: active ? m.color : '#444', fontWeight:600 }}>{m.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── LEFT PANEL ── */}
        <div style={{ width: leftWidth, flexShrink:0, display:'flex', flexDirection:'column', background: BG_SIDE, borderRight:`1px solid ${BORDER}` }}>
          {/* tab bar */}
          <div style={{ display:'flex', borderBottom:`1px solid ${BORDER}`, flexShrink:0, overflowX:'auto' }}>
            {LEFT_TABS.map(({ id: tid, label, icon: Icon }) => (
              <button key={tid} onClick={() => setLeftTab(tid)} style={{ display:'flex', alignItems:'center', gap:5, padding:'10px 14px', fontSize:12, fontWeight: leftTab===tid ? 700 : 500, color: leftTab===tid ? BRAND : '#666', background:'none', border:'none', borderBottom: leftTab===tid ? `2px solid ${BRAND}` : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                <Icon size={12}/>{label}
                {tid==='results' && result?.total > 0 && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:99, background: result.passed===result.total ? '#10b98120' : '#ef444420', color: result.passed===result.total ? '#10b981' : '#ef4444', marginLeft:2 }}>{result.passed}/{result.total}</span>
                )}
              </button>
            ))}
          </div>

          {/* tab content */}
          <div style={{ flex:1, overflowY:'auto' }}>

            {/* DESCRIPTION */}
            {leftTab==='problem' && (
              <div style={{ padding:20 }}>
                <h1 style={{ fontSize:17, fontWeight:800, color:'#f0f6fc', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                  {problem.question_no ? `${problem.question_no}. ` : ''}{problem.title}
                </h1>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background: diff.bg, color: diff.color, border:`1px solid ${diff.border}`, textTransform:'capitalize' }}>{problem.difficulty}</span>
                  {problem.category && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#00A6FF15', color: BRAND, border:'1px solid #00A6FF30' }}>{problem.category}</span>}
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#222', color:'#888', border:`1px solid ${BORDER}` }}>{meta.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'#f59e0b15', color:'#f59e0b', border:'1px solid #f59e0b30', marginLeft:'auto' }}>{problem.marks} pts</span>
                </div>
                <div style={{ fontSize:13, lineHeight:1.8, color:'#c9d1d9', marginBottom:20, whiteSpace:'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: problem.description || 'No description provided.' }}
                />
                {(problem.visible_test_cases?.length > 0 || problem.test_cases?.length > 0) && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Examples</p>
                    {isHDL
                      ? (problem.visible_test_cases||[]).map((tc,i) => (
                          <div key={i} style={{ background:'#111', border:`1px solid ${BORDER}`, borderRadius:10, padding:12, fontFamily:'monospace', fontSize:12 }}>
                            <p style={{ fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', margin:'0 0 8px' }}>Example {i+1}</p>
                            {Object.entries(tc).map(([k,v]) => (
                              <div key={k} style={{ display:'flex', gap:8 }}>
                                <span style={{ color:'#666' }}>{k} =</span>
                                <span style={{ color: BRAND }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ))
                      : (problem.test_cases||[]).slice(0,2).map((tc,i) => (
                          <div key={i} style={{ background:'#111', border:`1px solid ${BORDER}`, borderRadius:10, padding:12 }}>
                            <p style={{ fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', margin:'0 0 8px' }}>Example {i+1}</p>
                            <div style={{ display:'flex', flexDirection:'column', gap:6, fontFamily:'monospace', fontSize:12 }}>
                              <div><span style={{ color:'#555', fontSize:10 }}>Input</span><div style={{ background:'#0d0d0d', color:'#e2e8f0', padding:'4px 8px', borderRadius:6, marginTop:2 }}>{tc.stdin||'(none)'}</div></div>
                              <div><span style={{ color:'#555', fontSize:10 }}>Output</span><div style={{ background:'#0d0d0d', color:'#10b981', padding:'4px 8px', borderRadius:6, marginTop:2 }}>{tc.expected_output}</div></div>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* SUBMISSIONS */}
            {leftTab==='submissions' && (
              <div style={{ padding:16 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 12px' }}>My Submissions</p>
                {submissions.length===0
                  ? <div style={{ textAlign:'center', padding:'40px 0', color:'#444', fontSize:13 }}>No submissions yet</div>
                  : submissions.map((s,i) => (
                    <div key={s.id} style={{ background:'#111', border:`1px solid ${BORDER}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
                      <div style={{ height:2, background: s.status==='passed' ? '#10b981' : s.status==='error' ? '#ef4444' : '#f59e0b' }} />
                      <div style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color: s.status==='passed' ? '#10b981' : s.status==='error' ? '#ef4444' : '#f59e0b' }}>
                            {s.status==='passed' ? 'Accepted' : s.status==='error' ? 'Error' : 'Wrong Answer'}
                          </span>
                          <span style={{ fontSize:10, color:'#555' }}>#{submissions.length-i}</span>
                        </div>
                        <div style={{ display:'flex', gap:10, fontSize:11, color:'#555' }}>
                          <span>{s.score?.toFixed(1)} / {problem.marks} pts</span>
                          <span>•</span><span>{s.runtime_ms}ms</span>
                          <span>•</span><span style={{ marginLeft:'auto' }}>{timeAgo(s.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* HINTS */}
            {leftTab==='hints' && (
              <div style={{ padding:20 }}>
                <div style={{ background:'#111', border:`1px solid ${BORDER}`, borderRadius:10, padding:14, fontSize:13, color:'#555' }}>No hints available.</div>
              </div>
            )}

            {/* NOTES */}
            {leftTab==='notes' && (
              <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8, height:'100%' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>My Notes</p>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Write your notes here..."
                  style={{ flex:1, minHeight:300, background:'#111', border:`1px solid ${BORDER}`, borderRadius:10, padding:12, fontSize:13, color:'#e2e8f0', resize:'none', outline:'none', fontFamily:'inherit' }} />
              </div>
            )}

            {/* RESULTS */}
            {leftTab==='results' && (
              <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
                <div style={{ display:'flex', borderBottom:`1px solid ${BORDER}`, flexShrink:0 }}>
                  {RESULT_TABS.filter(t => t.id!=='waveform' || isHDL).map(({ id:tid, label, icon:Icon }) => (
                    <button key={tid} onClick={() => setResultTab(tid)} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', fontSize:11, fontWeight: resultTab===tid ? 700 : 500, color: resultTab===tid ? BRAND : '#666', background:'none', border:'none', borderBottom: resultTab===tid ? `2px solid ${BRAND}` : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
                      <Icon size={11}/>{label}
                      {tid==='testcases' && result?.total > 0 && <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:99, background: result.passed===result.total ? '#10b98120' : '#ef444420', color: result.passed===result.total ? '#10b981' : '#ef4444', marginLeft:2 }}>{result.passed}/{result.total}</span>}
                    </button>
                  ))}
                </div>
                <div style={{ flex:1, overflowY:'auto' }}>
                  {/* TEST CASES */}
                  {resultTab==='testcases' && (
                    <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                      {running && <div style={{ textAlign:'center', padding:'40px 0', color:'#555', fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}><Loader2 size={24} style={{ color: BRAND, animation:'spin 1s linear infinite' }}/> Running...</div>}
                      {!result && !running && <div style={{ textAlign:'center', padding:'40px 0', color:'#444', fontSize:13 }}>Click Run Code to test your solution</div>}
                      {result?.compile_error && (
                        <div style={{ textAlign:'center', padding:'24px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                          <XCircle size={24} style={{ color:'#ef4444' }}/>
                          <p style={{ fontSize:13, fontWeight:600, color:'#ef4444', margin:0 }}>Compile Error</p>
                          <button onClick={() => setResultTab('console')} style={{ fontSize:11, padding:'4px 12px', borderRadius:6, background:'#1a0000', color:'#ef4444', border:'1px solid #ef444440', cursor:'pointer' }}>View Console →</button>
                        </div>
                      )}
                      {result && !result.compile_error && (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background: result.passed===result.total && result.total>0 ? '#10b98110' : '#ef444410', border:`1px solid ${result.passed===result.total && result.total>0 ? '#10b98130' : '#ef444430'}` }}>
                            {result.passed===result.total && result.total>0 ? <CheckCircle2 size={16} style={{ color:'#10b981' }}/> : <XCircle size={16} style={{ color:'#ef4444' }}/>}
                            <span style={{ fontSize:13, fontWeight:700, color: result.passed===result.total && result.total>0 ? '#10b981' : '#ef4444' }}>
                              {result.passed===result.total && result.total>0 ? 'All Test Cases Passed' : `${result.passed??0} / ${result.total??0} Passed`}
                            </span>
                            <div style={{ marginLeft:'auto', display:'flex', gap:10, fontSize:11, color:'#666' }}>
                              {result.runtime_ms > 0 && <span>{result.runtime_ms}ms</span>}
                              {result.score > 0 && <span style={{ color:'#f59e0b', fontWeight:700 }}>{result.score?.toFixed(1)}/{problem.marks}pts</span>}
                            </div>
                          </div>
                          {result.mode==='submit' && result.status==='passed' && (
                            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, background:'#f59e0b10', border:'1px solid #f59e0b30' }}>
                              <div style={{ width:44, height:44, borderRadius:'50%', background:'#f59e0b20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Medal size={22} style={{ color:'#fbbf24' }}/></div>
                              <div>
                                <p style={{ fontSize:13, fontWeight:700, color:'#fbbf24', margin:'0 0 2px' }}>Medal unlocked!</p>
                                <p style={{ fontSize:11, color:'#d6a84f', margin:0 }}>+{result.reward_points ?? problem.reward_points ?? 0} reward points</p>
                              </div>
                            </div>
                          )}
                          {(result.results||[]).map((r,i) => {
                            const parsed = parseVerilogLine(r.name);
                            const inputStr  = r.stdin    || (isHDL ? parsed.input    : '');
                            const expectStr = r.expected || (isHDL ? parsed.expected : '');
                            const gotStr    = r.got      || (isHDL && !r.passed ? parsed.got : '');
                            const pc = r.passed ? '#10b981' : '#ef4444';
                            return (
                              <div key={i} style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${r.passed ? '#10b98122' : '#ef444422'}`, background:'#111' }}>
                                {/* header row */}
                                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid ${r.passed ? '#10b98115' : '#ef444415'}` }}>
                                  <div style={{ width:22, height:22, borderRadius:'50%', background: r.passed ? '#10b98120' : '#ef444420', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    {r.passed ? <CheckCircle2 size={12} style={{ color:'#10b981' }}/> : <XCircle size={12} style={{ color:'#ef4444' }}/>}
                                  </div>
                                  <span style={{ fontSize:12, fontWeight:600, color:'#ccc', flex:1, fontFamily:'monospace' }}>{r.name || `Case ${i+1}`}</span>
                                  <span style={{ fontSize:10, fontWeight:800, padding:'2px 10px', borderRadius:99, background: r.passed ? '#10b98118' : '#ef444418', color: pc, letterSpacing:'0.05em' }}>{r.passed ? 'PASS' : 'FAIL'}</span>
                                </div>
                                {/* input / expected / got grid */}
                                <div style={{ display:'grid', gridTemplateColumns: !r.passed && gotStr ? '1fr 1fr 1fr' : '1fr 1fr', gap:1, background: BORDER }}>
                                  {[
                                    { label:'Input',       val: inputStr  || '(none)', color:'#e2e8f0' },
                                    { label:'Expected',    val: expectStr || '—',      color:'#10b981' },
                                    ...(!r.passed && gotStr ? [{ label:'Your Output', val: gotStr, color:'#ef4444' }] : []),
                                  ].map(({ label, val, color }) => (
                                    <div key={label} style={{ background:'#0d0d0d', padding:'10px 12px' }}>
                                      <p style={{ fontSize:10, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 6px' }}>{label}</p>
                                      <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:600, color, background:'#111', padding:'6px 10px', borderRadius:6, border:`1px solid ${BORDER}` }}>{val}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                  {/* CONSOLE */}
                  {resultTab==='console' && (
                    <div style={{ padding:12 }}>
                      {!result && !running && <div style={{ textAlign:'center', padding:'40px 0', color:'#444', fontSize:13 }}>Console output will appear here</div>}
                      {result && (
                        <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${BORDER}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#111', borderBottom:`1px solid ${BORDER}` }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }}/>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }}/>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:'#10b981' }}/>
                            <span style={{ fontSize:10, color:'#555', marginLeft:6, fontFamily:'monospace' }}>stdout</span>
                          </div>
                          <div style={{ padding:14, background:'#0d0d0d', minHeight:80 }}>
                            {result.compile_error
                              ? <pre style={{ fontSize:12, fontFamily:'monospace', color:'#ef4444', whiteSpace:'pre-wrap', margin:0 }}>{result.compile_error}</pre>
                              : result.stdout
                                ? <pre style={{ fontSize:12, fontFamily:'monospace', color:'#c9d1d9', whiteSpace:'pre-wrap', margin:0 }}>{result.stdout}</pre>
                                : <span style={{ fontSize:12, fontFamily:'monospace', color:'#444' }}>// no output</span>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* WAVEFORM */}
                  {resultTab==='waveform' && isHDL && (
                    <div style={{ padding:8, height:'100%' }}><WaveformViewer vcdText={result?.waveform_vcd}/></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DRAG HANDLE ── */}
        <div onMouseDown={startDrag} style={{ width:4, flexShrink:0, cursor:'col-resize', background: BORDER, transition:'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = BRAND}
          onMouseLeave={e => e.currentTarget.style.background = BORDER}
        />

        {/* ── RIGHT: EDITOR ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background: BG_MAIN }}>

          {/* editor top bar */}
          <div style={{ display:'flex', alignItems:'center', height:40, flexShrink:0, background:'#111', borderBottom:`1px solid ${BORDER}`, paddingLeft:4 }}>
            {/* file tab */}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 14px', height:'100%', borderBottom:`2px solid ${meta.color}`, background: BG_MAIN }}>
              <FileCode2 size={12} style={{ color: meta.color }}/>
              <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{fileLabel}</span>
              {saved && <span style={{ fontSize:10, color:'#10b981', marginLeft:4 }}>✓ saved</span>}
            </div>
            {isHDL && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 14px', height:'100%', color:'#555' }}>
                <FileCode2 size={12}/>
                <span style={{ fontSize:12 }}>testbench.sv</span>
              </div>
            )}
            <div style={{ flex:1 }}/>
            {/* reset */}
            <button onClick={() => { const s = problem.starter_code || ALL_LANG_STARTERS[chosenLang] || ''; setCode(s); try { localStorage.removeItem(draftKey(chosenLang)); } catch {} setResult(null); }}
              title="Reset to starter code"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'0 12px', height:'100%', background:'none', border:'none', borderLeft:`1px solid ${BORDER}`, color:'#555', cursor:'pointer', fontSize:11 }}>
              <RotateCcw size={12}/> Reset
            </button>
          </div>

          {/* Monaco */}
          <div style={{ flex:1, overflow:'hidden' }}>
            <Editor
              height="100%"
              language={monacoLang(chosenLang || problem.language)}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                fontLigatures: true,
                padding: { top: 14, bottom: 14 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                tabSize: 2,
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
