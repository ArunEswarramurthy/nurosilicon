import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Play, CheckCircle, Loader2, CheckCircle2, XCircle, Terminal,
  Activity, FlaskConical, BookOpen, BarChart2, Lightbulb,
  StickyNote, GitBranch, RotateCcw, Medal, ChevronLeft, ChevronRight,
  Star, Cpu, AlertTriangle,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import WaveformViewer from '../../components/WaveformViewer';
import SchematicViewer from '../../components/SchematicViewer';
import { verilogApi } from '../../lib/labApi';
import { useSocket } from '../../context/SocketContext';

const BRAND  = '#00A6FF';
const BG     = '#0d0d0d';
const SIDE   = '#141414';
const PANEL  = '#111';
const BORDER = '#2a2a2a';

const DIFF_STYLE = {
  easy:   { bg: '#10b98120', color: '#10b981', border: '#10b98140' },
  medium: { bg: '#f59e0b20', color: '#f59e0b', border: '#f59e0b40' },
  hard:   { bg: '#ef444420', color: '#ef4444', border: '#ef444440' },
};

const LEFT_TABS = [
  { id: 'problem',     label: 'Description', icon: BookOpen },
  { id: 'schematic',   label: 'Schematic',   icon: GitBranch },
  { id: 'submissions', label: 'Submissions', icon: BarChart2 },
  { id: 'hints',       label: 'Hints',       icon: Lightbulb },
  { id: 'notes',       label: 'Notes',       icon: StickyNote },
  { id: 'results',     label: 'Results',     icon: FlaskConical },
];

const RESULT_TABS = [
  { id: 'testcases', label: 'Test Cases', icon: FlaskConical },
  { id: 'console',   label: 'Console',    icon: Terminal },
  { id: 'waveform',  label: 'Waveform',   icon: Activity },
];

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
  if (ei !== -1) return { input: name.slice(0, ei).trim(), expected: name.slice(ei + 1).trim(), got: name.slice(ei + 1).trim() };
  return { input: name, expected: '', got: '' };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VerilogIDEPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { socket } = useSocket();

  const [problem, setProblem]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [code, setCode]               = useState('');
  const [leftTab, setLeftTab]         = useState('problem');
  const [resultTab, setResultTab]     = useState('testcases');
  const [leftWidth, setLeftWidth]     = useState(420);
  const [running, setRunning]         = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [result, setResult]           = useState(null);
  const [schematic, setSchematic]     = useState(null);
  const [sourceHash, setSourceHash]   = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes]             = useState('');
  const [saved, setSaved]             = useState(false);

  // Submission-ID tracking — only accept socket events for the most recent submission
  const pendingSubId = useRef(null);
  const saveTimer    = useRef(null);

  const draftKey = () => `verilog_draft_${id}`;

  const handleCodeChange = (val) => {
    setCode(val || '');
    if (sourceHash) setSourceHash(prev => prev ? prev + '_stale' : null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(draftKey(), val || ''); setSaved(true); setTimeout(() => setSaved(false), 1500); } catch {}
    }, 800);
  };

  useEffect(() => {
    verilogApi.get(id)
      .then(r => {
        const p = r.data;
        setProblem(p);
        const draft = localStorage.getItem(draftKey());
        setCode(draft !== null ? draft : (p.starter_code || ''));
      })
      .catch(() => navigate('/student/lab'))
      .finally(() => setLoading(false));

    verilogApi.mySubmissions(id)
      .then(r => setSubmissions(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [id]); // eslint-disable-line

  const startDrag = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startW = leftWidth;
    const onMove = (ev) => setLeftWidth(Math.min(700, Math.max(280, startW + ev.clientX - startX)));
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  // Socket result handler — fast path when socket is connected
  // The poll loop above is the reliable fallback when socket fails
  useEffect(() => {
    if (!socket) return;
    const onResult = (data) => {
      if (data.submission_id !== pendingSubId.current) return;
      pendingSubId.current = null; // stop the poll loop
      setRunning(false);
      setResult(data);
      if (data.waveform_vcd) setResultTab('waveform');
      else if (data.compile_error) { setLeftTab('results'); setResultTab('console'); }
      else setResultTab('testcases');
      setLeftTab('results');
      if (data.mode === 'submit')
        verilogApi.mySubmissions(id).then(r => setSubmissions(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    };
    socket.on('verilog:result', onResult);
    return () => socket.off('verilog:result', onResult);
  }, [socket, id]);

  // Poll submission until it leaves 'running' state — works even when socket fails
  const pollSubmission = useCallback(async (subId, mode) => {
    const MAX_POLLS = 60;  // 60 × 500ms = 30s max
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (pendingSubId.current !== subId) return; // superseded by newer run
      try {
        const r = await verilogApi.getSubmission(subId);
        const sub = r.data;
        if (sub.status === 'running' || sub.status === 'pending') continue;
        // Done — build result payload matching socket event shape
        const data = {
          submission_id: subId,
          mode,
          status:        sub.status,
          score:         sub.score,
          compile_error: sub.compile_error,
          results:       sub.results || [],
          waveform_vcd:  sub.waveform_vcd,
          passed:        sub.passed_cases,
          total:         sub.total_cases,
          runtime_ms:    sub.runtime_ms,
          run_id:        null,
        };
        pendingSubId.current = null;
        setRunning(false);
        setResult(data);
        if (data.waveform_vcd) setResultTab('waveform');
        else if (data.compile_error) { setLeftTab('results'); setResultTab('console'); }
        else setResultTab('testcases');
        setLeftTab('results');
        if (mode === 'submit')
          verilogApi.mySubmissions(id).then(r => setSubmissions(Array.isArray(r.data) ? r.data : [])).catch(() => {});
        return;
      } catch { /* network blip — keep polling */ }
    }
    // Timed out
    setRunning(false);
    setResult({ status: 'error', compile_error: 'Timed out waiting for result. Please try again.' });
    setLeftTab('results'); setResultTab('console');
  }, [id]); // eslint-disable-line

  const handleRun = async () => {
    if (running) return;
    setRunning(true); setResult(null); setLeftTab('results'); setResultTab('testcases');
    try {
      const r = await verilogApi.run(id, code);
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
      const r = await verilogApi.submit(id, code);
      const subId = r.data.submission_id;
      pendingSubId.current = subId;
      pollSubmission(subId, 'submit');
    } catch (err) {
      setRunning(false);
      setResult({ status: 'error', compile_error: err.response?.data?.message || 'Failed to submit' });
    }
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setSchematic(null);
    setSourceHash(null);
    try {
      const r = await verilogApi.analyze(id, code);
      setSchematic(r.data.schematic || null);
      setSourceHash(r.data.source_hash || null);
      setLeftTab('schematic');
    } catch (err) {
      setSchematic({ error: err.response?.data?.message || 'Analysis failed' });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: BG }}>
      <Spinner size="lg" />
    </div>
  );
  if (!problem) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: BG, color: '#ef4444', fontSize: 14 }}>
      Problem not found
    </div>
  );

  const diff = DIFF_STYLE[problem.difficulty] || DIFF_STYLE.easy;
  const isSchematicStale = sourceHash?.includes('_stale');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: BG, color: '#e2e8f0', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 48, flexShrink: 0, background: '#111', borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => navigate('/student/lab')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14 }}>
          <GitBranch size={15} color={BRAND} /> NuroSilicon
        </button>
        <div style={{ width: 1, height: 14, background: BORDER }} />
        <button onClick={() => navigate('/student/lab')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12 }}>Problems</button>
        <div style={{ flex: 1 }} />
        {!running && result?.status === 'passed' && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#10b98118', border: '1px solid #10b98140', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={11} />Accepted
          </span>
        )}
        {!running && result?.status === 'failed' && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444440', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={11} />Wrong Answer
          </span>
        )}
        {!running && result?.status === 'error' && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b40', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={11} />Error
          </span>
        )}
        {running && (
          <span style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Loader2 size={12} className="animate-spin" />Running…
          </span>
        )}
        {/* Analyze button */}
        <button onClick={handleAnalyze} disabled={analyzing || running} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid #6366f140`, background: '#6366f115', color: '#a78bfa', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: (analyzing || running) ? 0.5 : 1 }}>
          {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />} Analyze
        </button>
        <button onClick={handleRun} disabled={running} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#1e1e1e', color: '#e2e8f0', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: running ? 0.5 : 1 }}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />} Run
        </button>
        <button onClick={handleSubmit} disabled={running} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: running ? 0.5 : 1 }}>
          <CheckCircle size={13} /> Submit
        </button>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ width: leftWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', background: SIDE, borderRight: `1px solid ${BORDER}` }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, overflowX: 'auto' }}>
            {LEFT_TABS.map(({ id: tid, label, icon: Icon }) => (
              <button key={tid} onClick={() => setLeftTab(tid)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 10px', fontSize: 11, fontWeight: leftTab === tid ? 700 : 500, color: leftTab === tid ? BRAND : '#666', background: 'none', border: 'none', borderBottom: leftTab === tid ? `2px solid ${BRAND}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Icon size={11} />{label}
                {tid === 'results' && result?.total > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: result.passed === result.total ? '#10b98120' : '#ef444420', color: result.passed === result.total ? '#10b981' : '#ef4444', marginLeft: 2 }}>
                    {result.passed}/{result.total}
                  </span>
                )}
                {tid === 'schematic' && schematic && !schematic.error && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSchematicStale ? '#f59e0b' : '#6366f1', marginLeft: 2, display: 'inline-block' }} title={isSchematicStale ? 'Stale — re-analyze' : 'Schematic ready'} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>

            {/* DESCRIPTION */}
            {leftTab === 'problem' && (
              <div style={{ padding: 20 }}>
                <h1 style={{ fontSize: 17, fontWeight: 800, color: '#f0f6fc', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{problem.title}</h1>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: diff.bg, color: diff.color, border: `1px solid ${diff.border}`, textTransform: 'capitalize' }}>{problem.difficulty}</span>
                  {problem.category && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#00A6FF15', color: BRAND, border: '1px solid #00A6FF30' }}>{problem.category}</span>}
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#a78bfa15', color: '#a78bfa', border: '1px solid #a78bfa30' }}>Verilog</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', marginLeft: 'auto' }}>{problem.marks} pts</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: '#c9d1d9', marginBottom: 20, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: problem.description || 'No description.' }} />
                {problem.visible_test_cases?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Examples</p>
                    {problem.visible_test_cases.map((tc, i) => (
                      <div key={i} style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', margin: '0 0 8px' }}>Example {i + 1}</p>
                        {Object.entries(tc).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: '#666' }}>{k} =</span>
                            <span style={{ color: BRAND }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SCHEMATIC */}
            {leftTab === 'schematic' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                {isSchematicStale && (
                  <div style={{ padding: '6px 12px', background: '#f59e0b15', borderBottom: '1px solid #f59e0b30', fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <AlertTriangle size={11} /> Code changed — click Analyze to refresh schematic
                  </div>
                )}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <SchematicViewer schematic={schematic} result={result} sourceHash={sourceHash} />
                </div>
              </div>
            )}

            {/* SUBMISSIONS */}
            {leftTab === 'submissions' && (
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>My Submissions</p>
                {submissions.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontSize: 13 }}>No submissions yet</div>
                  : submissions.map((s, i) => (
                    <div key={s.id} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: 2, background: s.status === 'passed' ? '#10b981' : s.status === 'error' ? '#ef4444' : '#f59e0b' }} />
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.status === 'passed' ? '#10b981' : s.status === 'error' ? '#ef4444' : '#f59e0b' }}>
                            {s.status === 'passed' ? 'Accepted' : s.status === 'error' ? 'Error' : 'Wrong Answer'}
                          </span>
                          <span style={{ fontSize: 10, color: '#555' }}>#{submissions.length - i}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#555' }}>
                          <span>{s.score?.toFixed(1)} / {problem.marks} pts</span>
                          <span>•</span><span>{s.runtime_ms}ms</span>
                          <span style={{ marginLeft: 'auto' }}>{timeAgo(s.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* HINTS */}
            {leftTab === 'hints' && (
              <div style={{ padding: 20 }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, fontSize: 13, color: '#555' }}>No hints available.</div>
              </div>
            )}

            {/* NOTES */}
            {leftTab === 'notes' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>My Notes</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write your notes here…"
                  style={{ flex: 1, minHeight: 300, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 13, color: '#e2e8f0', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            )}

            {/* RESULTS */}
            {leftTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                  {RESULT_TABS.map(({ id: tid, label, icon: Icon }) => (
                    <button key={tid} onClick={() => setResultTab(tid)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', fontSize: 11, fontWeight: resultTab === tid ? 700 : 500, color: resultTab === tid ? BRAND : '#666', background: 'none', border: 'none', borderBottom: resultTab === tid ? `2px solid ${BRAND}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <Icon size={11} />{label}
                      {tid === 'testcases' && result?.total > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: result.passed === result.total ? '#10b98120' : '#ef444420', color: result.passed === result.total ? '#10b981' : '#ef4444', marginLeft: 2 }}>
                          {result.passed}/{result.total}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>

                  {/* TEST CASES */}
                  {resultTab === 'testcases' && (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {running && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <Loader2 size={22} className="animate-spin" style={{ color: BRAND }} /> Running…
                        </div>
                      )}
                      {!result && !running && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontSize: 13 }}>Click Run to test your code</div>
                      )}
                      {result?.compile_error && (
                        <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <XCircle size={24} style={{ color: '#ef4444' }} />
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', margin: 0 }}>Compile Error</p>
                          <button onClick={() => setResultTab('console')} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: '#1a0000', color: '#ef4444', border: '1px solid #ef444440', cursor: 'pointer' }}>View Console →</button>
                        </div>
                      )}
                      {result && !result.compile_error && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: result.passed === result.total && result.total > 0 ? '#10b98110' : '#ef444410', border: `1px solid ${result.passed === result.total && result.total > 0 ? '#10b98130' : '#ef444430'}` }}>
                            {result.passed === result.total && result.total > 0
                              ? <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                              : <XCircle size={16} style={{ color: '#ef4444' }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: result.passed === result.total && result.total > 0 ? '#10b981' : '#ef4444' }}>
                              {result.passed === result.total && result.total > 0 ? 'All Test Cases Passed' : `${result.passed ?? 0} / ${result.total ?? 0} Passed`}
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 11, color: '#666' }}>
                              {result.runtime_ms > 0 && <span>{result.runtime_ms}ms</span>}
                              {result.score > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>{result.score?.toFixed(1)}/{problem.marks}pts</span>}
                            </div>
                          </div>
                          {(result.results || []).map((r, i) => {
                            const parsed    = parseVerilogLine(r.name);
                            const inputStr  = r.stdin    || parsed.input;
                            const expectStr = r.expected || parsed.expected;
                            const gotStr    = r.got      || (!r.passed ? parsed.got : '');
                            return (
                              <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${r.passed ? '#10b98122' : '#ef444422'}`, background: PANEL }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${r.passed ? '#10b98115' : '#ef444415'}` }}>
                                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.passed ? '#10b98120' : '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {r.passed ? <CheckCircle2 size={12} style={{ color: '#10b981' }} /> : <XCircle size={12} style={{ color: '#ef4444' }} />}
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', flex: 1, fontFamily: 'monospace' }}>{r.name || `Case ${i + 1}`}</span>
                                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: r.passed ? '#10b98118' : '#ef444418', color: r.passed ? '#10b981' : '#ef4444', letterSpacing: '0.05em' }}>{r.passed ? 'PASS' : 'FAIL'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: !r.passed && gotStr ? '1fr 1fr 1fr' : '1fr 1fr', gap: 1, background: BORDER }}>
                                  {[
                                    { label: 'Input',    val: inputStr  || '(none)', color: '#e2e8f0' },
                                    { label: 'Expected', val: expectStr || '—',      color: '#10b981' },
                                    ...(!r.passed && gotStr ? [{ label: 'Your Output', val: gotStr, color: '#ef4444' }] : []),
                                  ].map(({ label, val, color }) => (
                                    <div key={label} style={{ background: '#0d0d0d', padding: '10px 12px' }}>
                                      <p style={{ fontSize: 10, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{label}</p>
                                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color, background: PANEL, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}` }}>{val}</div>
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
                  {resultTab === 'console' && (
                    <div style={{ padding: 12 }}>
                      {!result && !running && <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontSize: 13 }}>Console output will appear here</div>}
                      {result && (
                        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: 10, color: '#555', marginLeft: 6, fontFamily: 'monospace' }}>stdout / stderr</span>
                          </div>
                          <div style={{ padding: 14, background: BG, minHeight: 80 }}>
                            {result.compile_error
                              ? <pre style={{ fontSize: 12, fontFamily: 'monospace', color: '#ef4444', whiteSpace: 'pre-wrap', margin: 0 }}>{result.compile_error}</pre>
                              : result.stdout
                                ? <pre style={{ fontSize: 12, fontFamily: 'monospace', color: '#c9d1d9', whiteSpace: 'pre-wrap', margin: 0 }}>{result.stdout}</pre>
                                : <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#444' }}>// no output</span>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WAVEFORM */}
                  {resultTab === 'waveform' && (
                    <div style={{ height: '100%', minHeight: 300 }}>
                      <WaveformViewer vcdText={result?.waveform_vcd} runId={result?.run_id} />
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

        {/* DRAG HANDLE */}
        <div onMouseDown={startDrag}
          style={{ width: 4, flexShrink: 0, cursor: 'col-resize', background: BORDER, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = BRAND}
          onMouseLeave={e => e.currentTarget.style.background = BORDER}
        />

        {/* RIGHT: EDITOR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: BG }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 40, flexShrink: 0, background: PANEL, borderBottom: `1px solid ${BORDER}`, paddingLeft: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: '100%', borderBottom: '2px solid #a78bfa', background: BG }}>
              <span style={{ fontSize: 11, color: '#a78bfa' }}>SV</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>design.sv</span>
              {saved && <span style={{ fontSize: 10, color: '#10b981', marginLeft: 4 }}>✓ saved</span>}
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { setCode(problem.starter_code || ''); try { localStorage.removeItem(draftKey()); } catch {} setResult(null); setSchematic(null); setSourceHash(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: '100%', background: 'none', border: 'none', borderLeft: `1px solid ${BORDER}`, color: '#555', cursor: 'pointer', fontSize: 11 }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language="verilog"
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false,
                wordWrap: 'on', lineNumbers: 'on',
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                fontLigatures: true, padding: { top: 14, bottom: 14 },
                cursorBlinking: 'smooth', smoothScrolling: true,
                tabSize: 2, bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
