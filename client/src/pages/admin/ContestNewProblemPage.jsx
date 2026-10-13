import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft, Save, Code2, Settings, FlaskConical,
  Plus, Trash2, Cpu, Database, Zap, CheckCircle2,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { labApi } from '../../lib/labApi';
import { contestApi } from '../../lib/contestApi';

const LANG_OPTIONS = [
  { value: 'c',             label: 'C',             group: 'programming' },
  { value: 'cpp',           label: 'C++',           group: 'programming' },
  { value: 'python',        label: 'Python',        group: 'programming' },
  { value: 'java',          label: 'Java',          group: 'programming' },
  { value: 'sql',           label: 'MySQL/SQL',     group: 'database'    },
  { value: 'systemverilog', label: 'SystemVerilog', group: 'hardware'    },
  { value: 'verilog',       label: 'Verilog',       group: 'hardware'    },
  { value: 'embedded_c',    label: 'Embedded C',    group: 'embedded'    },
];

const PROBLEM_TYPES = [
  { type: 'programming', label: '💻 Programming', defaultLang: 'cpp',           icon: Code2,     color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { type: 'database',    label: '🗄️ Database',    defaultLang: 'sql',           icon: Database,  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { type: 'hardware',    label: '⚡ Hardware',     defaultLang: 'systemverilog', icon: Cpu,       color: '#7C3AED', bg: '#f5f3ff', border: '#c4b5fd' },
  { type: 'embedded',    label: '🔌 Embedded',    defaultLang: 'embedded_c',    icon: Zap,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
];

const HDL = ['verilog', 'vhdl', 'systemverilog'];

function monacoLang(lang) {
  if (HDL.includes(lang)) return 'verilog';
  if (['c', 'cpp', 'embedded_c'].includes(lang)) return 'c';
  if (lang === 'sql') return 'sql';
  return lang;
}

const EMPTY = {
  title: '', description: '', language: 'cpp', category: '',
  difficulty: 'easy', level: 1, marks: 100, time_limit_s: 10,
  starter_code: '', solution_code: '', testbench: '',
  test_cases: [{ stdin: '', expected_output: '' }],
  hidden_test_cases: [], visible_test_cases: [], allowed_languages: [],
};

export default function ContestNewProblemPage() {
  const { id: contestId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isHDL = HDL.includes(form.language);
  const currentType = PROBLEM_TYPES.find((t) => LANG_OPTIONS.find((l) => l.value === form.language)?.group === t.type) || PROBLEM_TYPES[0];

  // Test cases helpers
  const addTC     = () => set('test_cases', [...form.test_cases, { stdin: '', expected_output: '' }]);
  const removeTC  = (i) => set('test_cases', form.test_cases.filter((_, idx) => idx !== i));
  const updateTC  = (i, k, v) => set('test_cases', form.test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));
  const addHTC    = () => set('hidden_test_cases', [...form.hidden_test_cases, { stdin: '', expected_output: '' }]);
  const removeHTC = (i) => set('hidden_test_cases', form.hidden_test_cases.filter((_, idx) => idx !== i));
  const updateHTC = (i, k, v) => set('hidden_test_cases', form.hidden_test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (isHDL && !form.testbench.trim()) { setError('Testbench is required for HDL problems'); return; }
    if (!isHDL && form.test_cases.length === 0) { setError('At least one test case is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await labApi.create({ ...form, question_no: null });
      const newProblem = res.data.problem;
      await contestApi.adminAddProblem(contestId, { problem_id: newProblem.id, marks: form.marks });
      setSuccess(true);
      setTimeout(() => navigate(`/admin/contests/${contestId}`), 1200);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create problem');
      setSaving(false);
    }
  };

  // Shared input style
  const inp = {
    width: '100%', padding: '10px 13px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
    transition: 'border-color 0.15s',
  };

  const Label = ({ children }) => (
    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
      {children}
    </label>
  );

  const TABS = [
    { id: 'details',   label: 'Details',    icon: Settings },
    { id: 'code',      label: 'Code',       icon: Code2 },
    { id: 'testcases', label: 'Test Cases', icon: FlaskConical },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/admin/contests/${contestId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to Contest
        </button>
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Creating problem for contest</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>{form.title || 'New Problem'}</p>
        </div>
        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: currentType.bg, border: `1px solid ${currentType.border}`, color: currentType.color, fontSize: 12, fontWeight: 700 }}>
          <currentType.icon size={13} /> {currentType.label}
        </div>
        <button onClick={handleSave} disabled={saving || success}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', background: success ? '#059669' : saving ? '#e5e7eb' : 'linear-gradient(135deg,#7C3AED,#9333EA)', color: success || !saving ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 14, cursor: saving || success ? 'not-allowed' : 'pointer', boxShadow: saving || success ? 'none' : '0 4px 14px rgba(124,58,237,0.25)' }}>
          {success ? <><CheckCircle2 size={15} /> Added!</> : saving ? <><Spinner size="sm" /> Saving...</> : <><Save size={15} /> Create & Add to Contest</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '4px', display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 11, border: 'none', background: tab === id ? 'linear-gradient(135deg,#7C3AED,#9333EA)' : 'transparent', color: tab === id ? '#fff' : '#6b7280', fontWeight: tab === id ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* -- DETAILS TAB -- */}
      {tab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 16px' }}>Basic Info</p>

              <div style={{ marginBottom: 14 }}>
                <Label>Title *</Label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Two Sum, AND Gate, Binary Search"
                  style={inp} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label>Problem Type</Label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PROBLEM_TYPES.map((pt) => (
                    <button key={pt.type} onClick={() => set('language', pt.defaultLang)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `2px solid ${currentType.type === pt.type ? pt.color : '#e5e7eb'}`, background: currentType.type === pt.type ? pt.bg : '#fff', color: currentType.type === pt.type ? pt.color : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <pt.icon size={13} /> {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label>Language</Label>
                <select value={form.language} onChange={(e) => set('language', e.target.value)} style={inp}>
                  {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <Label>Difficulty</Label>
                  <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} style={inp}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <Label>Marks</Label>
                  <input type="number" value={form.marks} onChange={(e) => set('marks', Number(e.target.value))} style={inp} />
                </div>
                <div>
                  <Label>Time Limit (s)</Label>
                  <input type="number" value={form.time_limit_s} onChange={(e) => set('time_limit_s', Number(e.target.value))} style={inp} />
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <input value={form.category} onChange={(e) => set('category', e.target.value)}
                  placeholder="e.g. arrays, gates, recursion" style={inp} />
              </div>
            </div>
          </div>

          {/* Right - Description */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>Problem Description</p>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the problem clearly. Include constraints, input/output format, examples..."
              rows={18}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>
      )}

      {/* -- CODE TAB -- */}
      {tab === 'code' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>Starter Code</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 12px' }}>What students see when they open the problem</p>
            <div style={{ height: 420, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb' }}>
              <Editor height="100%" language={monacoLang(form.language)}
                value={form.starter_code} onChange={(v) => set('starter_code', v || '')}
                theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 } }} />
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${isHDL ? '#fcd34d' : '#e5e7eb'}`, borderRadius: 16, padding: '20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>
              {isHDL ? 'Testbench *' : 'Reference Solution'}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 12px' }}>
              {isHDL ? 'Hidden from students - runs automatically to grade submissions' : 'Hidden from students - for your reference only'}
            </p>
            {isHDL && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#d97706', marginBottom: 10 }}>
                ⚠ Must include <code>$dumpfile("dump.vcd")</code> and <code>$dumpvars(0, tb)</code> for waveform support
              </div>
            )}
            <div style={{ height: isHDL ? 380 : 420, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${isHDL ? '#fcd34d' : '#e5e7eb'}` }}>
              <Editor height="100%" language={monacoLang(form.language)}
                value={isHDL ? form.testbench : form.solution_code}
                onChange={(v) => set(isHDL ? 'testbench' : 'solution_code', v || '')}
                theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 } }} />
            </div>
          </div>
        </div>
      )}

      {/* -- TEST CASES TAB -- */}
      {tab === 'testcases' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Visible test cases */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>👁 Visible Test Cases</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Students can see input and expected output</p>
              </div>
              {!isHDL && (
                <button onClick={addTC}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#7C3AED', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {isHDL ? (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px', fontSize: 12, color: '#2563eb', lineHeight: 1.6 }}>
                ℹ️ For HDL problems, the <strong>Testbench</strong> you wrote in the Code tab acts as the grader. Students see pass/fail per test case from the testbench output.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.test_cases.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0', border: '1.5px dashed #e5e7eb', borderRadius: 10 }}>No test cases yet</p>
                )}
                {form.test_cases.map((tc, i) => (
                  <div key={i} style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Test {i + 1}</span>
                      <button onClick={() => removeTC(i)} style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', fontWeight: 600 }}>Input (stdin)</p>
                        <textarea value={tc.stdin} onChange={(e) => updateTC(i, 'stdin', e.target.value)}
                          placeholder="(empty)" rows={3}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', fontWeight: 600 }}>Expected Output</p>
                        <textarea value={tc.expected_output} onChange={(e) => updateTC(i, 'expected_output', e.target.value)}
                          placeholder="expected" rows={3}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hidden test cases */}
          <div style={{ background: '#fff', border: '1px solid #fcd34d', borderRadius: 16, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>🔒 Hidden Test Cases</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Run on submit only - students see pass/fail, not input/output</p>
              </div>
              {!isHDL && (
                <button onClick={addHTC}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #fcd34d', background: '#fffbeb', color: '#d97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {isHDL ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '14px', fontSize: 12, color: '#d97706', lineHeight: 1.6 }}>
                ⚠ HDL grading is done entirely by the testbench. No hidden test cases needed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.hidden_test_cases.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0', border: '1.5px dashed #fcd34d', borderRadius: 10 }}>No hidden test cases yet</p>
                )}
                {form.hidden_test_cases.map((tc, i) => (
                  <div key={i} style={{ border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px', background: '#fffbeb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>🔒 Hidden {i + 1}</span>
                      <button onClick={() => removeHTC(i)} style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', fontWeight: 600 }}>Input (stdin)</p>
                        <textarea value={tc.stdin} onChange={(e) => updateHTC(i, 'stdin', e.target.value)}
                          placeholder="(empty)" rows={3}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #fcd34d', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', fontWeight: 600 }}>Expected Output</p>
                        <textarea value={tc.expected_output} onChange={(e) => updateHTC(i, 'expected_output', e.target.value)}
                          placeholder="expected" rows={3}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #fcd34d', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={() => navigate(`/admin/contests/${contestId}`)}
          style={{ padding: '10px 20px', borderRadius: 11, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || success}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 11, border: 'none', background: success ? '#059669' : saving ? '#e5e7eb' : 'linear-gradient(135deg,#7C3AED,#9333EA)', color: success || !saving ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 14, cursor: saving || success ? 'not-allowed' : 'pointer', boxShadow: saving || success ? 'none' : '0 4px 16px rgba(124,58,237,0.25)' }}>
          {success ? <><CheckCircle2 size={15} /> Added to Contest!</> : saving ? <><Spinner size="sm" /> Saving...</> : <><Save size={15} /> Create & Add to Contest</>}
        </button>
      </div>
    </div>
  );
}
