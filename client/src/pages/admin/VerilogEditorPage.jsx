import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Eye, Lock } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { verilogApi } from '../../lib/labApi';

const EMPTY = {
  title: '', description: '', category: 'combinational', difficulty: 'easy',
  level: 1, marks: 10, time_limit_s: 10, lang_type: 'rtl_coding',
  starter_code: 'module solution(\n    // ports here\n);\n    // Write your code here\n\nendmodule',
  testbench: 'module tb;\n  // instantiate solution here\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0, tb);\n    // test vectors\n    // $display("PASS: ...") or $display("FAIL: ...");\n    $finish;\n  end\nendmodule',
  visible_test_cases: [],
};

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

export default function VerilogEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('details');
  const [vtcRaw, setVtcRaw]   = useState('');

  useEffect(() => {
    if (!isEdit) return;
    verilogApi.getFull(id)
      .then(r => {
        const p = r.data;
        setForm({
          title: p.title || '', description: p.description || '',
          category: p.category || 'combinational', difficulty: p.difficulty || 'easy',
          level: p.level || 1, marks: p.marks || 10,
          time_limit_s: p.time_limit_s || 10, lang_type: p.lang_type || 'rtl_coding',
          starter_code: p.starter_code || '', testbench: p.testbench || '',
          visible_test_cases: p.visible_test_cases || [],
        });
        setVtcRaw(JSON.stringify(p.visible_test_cases || [], null, 2));
      })
      .catch(() => navigate('/admin/lab'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      let vtc = form.visible_test_cases;
      try { vtc = JSON.parse(vtcRaw); } catch {}
      const payload = { ...form, visible_test_cases: vtc };
      if (isEdit) await verilogApi.update(id, payload);
      else await verilogApi.create(payload);
      navigate('/admin/verilog');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size="lg" /></div>;

  const TABS = ['details', 'starter', 'testbench', 'testcases'];

  return (
    <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* Top bar */}
      <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <button type="button" onClick={() => navigate('/admin/verilog')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ width:1, height:18, background:'var(--border)' }} />
        <h1 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', flex:1, margin:0 }}>
          {isEdit ? `Edit: ${form.title || 'Problem'}` : 'New Verilog Problem'}
        </h1>
        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#a78bfa20', color:'#a78bfa', border:'1px solid #a78bfa40', fontWeight:600 }}>Verilog / SystemVerilog</span>
        <button type="button" onClick={() => navigate('/admin/verilog')}
          className="btn btn-secondary btn-sm">Cancel</button>
        <button type="submit" disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 18px', borderRadius:8, background:'#10b981', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Problem'}
        </button>
      </div>

      {/* Tab nav */}
      <div style={{ display:'flex', gap:2, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:4, marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ padding:'7px 18px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', fontSize:13, fontWeight: tab===t ? 700 : 500,
              background: tab===t ? 'var(--brand-blue)' : 'transparent',
              color: tab===t ? '#fff' : 'var(--text-muted)', textTransform:'capitalize' }}>
            {t === 'testcases' ? 'Test Cases' : t === 'starter' ? 'Starter Code' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div style={{ background:'var(--danger-soft)', border:'1px solid var(--danger-border)', color:'var(--danger)', padding:'10px 14px', borderRadius:'var(--radius-md)', fontSize:13, marginBottom:12 }}>{error}</div>}

      {/* DETAILS TAB */}
      {tab === 'details' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Basic Info</p>
            <Field label="Title">
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Binary to Gray Code Converter" required />
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Category">
                <input className="input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. combinational, fsm" />
              </Field>
              <Field label="Difficulty">
                <select className="input" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="Level (1-5)">
                <input className="input" type="number" min={1} max={5} value={form.level} onChange={e => set('level', parseInt(e.target.value))} />
              </Field>
              <Field label="Marks">
                <input className="input" type="number" min={1} value={form.marks} onChange={e => set('marks', parseFloat(e.target.value))} />
              </Field>
              <Field label="Time Limit (s)">
                <input className="input" type="number" min={5} max={60} value={form.time_limit_s} onChange={e => set('time_limit_s', parseInt(e.target.value))} />
              </Field>
              <Field label="Language Type">
                <select className="input" value={form.lang_type} onChange={e => set('lang_type', e.target.value)}>
                  <option value="rtl_coding">RTL Coding (Verilog/SV)</option>
                  <option value="waveform_analysis">Waveform Analysis</option>
                </select>
              </Field>
            </div>
          </div>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Problem Description</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>Supports plain text and Markdown</p>
            <textarea className="input" style={{ minHeight:280, resize:'vertical', fontFamily:'monospace', fontSize:13 }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe the problem, module interface, truth table, examples..." />
          </div>
        </div>
      )}

      {/* STARTER CODE TAB */}
      {tab === 'starter' && (
        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Eye size={15} color="var(--brand-blue)" />
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Starter Code</p>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>— shown to students when they open the problem</span>
          </div>
          <div style={{ height:480, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
            <Editor height="100%" language="verilog" value={form.starter_code}
              onChange={v => set('starter_code', v || '')} theme="vs-dark"
              options={{ fontSize:13, minimap:{ enabled:false }, scrollBeyondLastLine:false }} />
          </div>
        </div>
      )}

      {/* TESTBENCH TAB */}
      {tab === 'testbench' && (
        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Lock size={15} color="#f59e0b" />
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Hidden Testbench</p>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>— never shown to students, runs automatically on submit</span>
          </div>
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e' }}>
            Use <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>$display("PASS: ...")</code> and{' '}
            <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>$display("FAIL: ... | expected=X got=Y")</code> for grading.
            Always include <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>$dumpfile("dump.vcd")</code> and <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>$dumpvars(0, tb)</code>.
          </div>
          <div style={{ height:480, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
            <Editor height="100%" language="verilog" value={form.testbench}
              onChange={v => set('testbench', v || '')} theme="vs-dark"
              options={{ fontSize:13, minimap:{ enabled:false }, scrollBeyondLastLine:false }} />
          </div>
        </div>
      )}

      {/* TEST CASES TAB */}
      {tab === 'testcases' && (
        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Eye size={15} color="var(--brand-blue)" />
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Visible Test Cases</p>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>— shown to students as examples (JSON array of objects)</span>
          </div>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
            Example: <code style={{ background:'var(--surface)', padding:'1px 6px', borderRadius:3 }}>[{'{'}bin:"0001",gray:"0001"{'}'}, {'{'}bin:"0010",gray:"0011"{'}'}]</code>
          </p>
          <div style={{ height:360, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
            <Editor height="100%" language="json" value={vtcRaw}
              onChange={v => setVtcRaw(v || '[]')} theme="vs-dark"
              options={{ fontSize:13, minimap:{ enabled:false }, scrollBeyondLastLine:false }} />
          </div>
        </div>
      )}

    </form>
  );
}
