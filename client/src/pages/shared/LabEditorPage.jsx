import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Plus, Trash2, Play, Loader2, ArrowLeft, Save, Eye, EyeOff, Lock, FlaskConical, Code2, Settings } from 'lucide-react';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { labApi } from '../../lib/labApi';

const HDL = ['systemverilog'];

const LANG_OPTIONS = [
  { value: 'systemverilog', label: 'SystemVerilog', color: 'bg-blue-100 text-blue-700' },
  { value: 'c',             label: 'C',             color: 'bg-gray-100 text-gray-700' },
  { value: 'cpp',           label: 'C++',           color: 'bg-sky-100 text-sky-700' },
  { value: 'python',        label: 'Python',        color: 'bg-yellow-100 text-yellow-700' },
  { value: 'java',          label: 'Java',          color: 'bg-orange-100 text-orange-700' },
  { value: 'embedded_c',    label: 'Embedded C',    color: 'bg-green-100 text-green-700' },
  { value: 'sql',           label: 'MySQL/SQL',     color: 'bg-blue-100 text-blue-800' },
];

function monacoLang(lang) {
  if (HDL.includes(lang)) return 'verilog';
  if (['c', 'cpp', 'embedded_c'].includes(lang)) return 'c';
  if (lang === 'sql') return 'sql';
  return lang;
}

const EMPTY_FORM = {
  title: '', description: '', language: 'c', category: '', difficulty: 'easy',
  level: 1, marks: 10, reward_points: 10, medal_image_url: '', time_limit_s: 10, starter_code: '', solution_code: '',
  testbench: '', visible_test_cases: [], test_cases: [], hidden_test_cases: [],
  allowed_languages: [], question_no: '', group_id: '', group_ids: [],
};

const LANG_GROUPS = [
  { label: 'Programming',   langs: ['c','cpp','python','java'] },
  { label: 'Database',      langs: ['sql'] },
  { label: 'Hardware (HDL)',langs: ['systemverilog'] },
  { label: 'Embedded',      langs: ['embedded_c'] },
];

const CATEGORY_DEFAULT = {
  'Programming':    'c',
  'Database':       'sql',
  'Hardware (HDL)': 'systemverilog',
  'Embedded':       'embedded_c',
};

const TABS = [
  { id: 'details',   label: 'Details',     icon: Settings },
  { id: 'code',      label: 'Code',        icon: Code2 },
  { id: 'testcases', label: 'Test Cases',  icon: FlaskConical },
];

function SectionLabel({ children, sub }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-ink">{children}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function LabEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  // Determine back path based on current URL prefix
  const backPath = '/admin/lab';

  const [form, setForm]       = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('details');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => { labApi.groups().then(r => setGroups(r.data.groups || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (!isEdit) return;
    labApi.getFull(id)
      .then((r) => {
        const p = r.data.problem;
        setForm({
          title: p.title || '', description: p.description || '',
          language: p.language || 'verilog', category: p.category || '',
          difficulty: p.difficulty || 'easy', level: p.level || 1,
          marks: p.marks || 10, reward_points: p.reward_points ?? p.marks ?? 10, medal_image_url: p.medal_image_url || '', time_limit_s: p.time_limit_s || 10,
          starter_code: p.starter_code || '', solution_code: p.solution_code || '',
          testbench: p.testbench || '',
          visible_test_cases: p.visible_test_cases || [],
          test_cases: p.test_cases || [],
          hidden_test_cases: p.hidden_test_cases || [],
          allowed_languages: p.allowed_languages || [],
          question_no: p.question_no ?? '', group_id: p.group_id || '', group_ids: (p.groups || []).map((group) => group.id),
        });
      })
      .catch(() => navigate(backPath))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTC    = () => set('test_cases', [...form.test_cases, { stdin: '', expected_output: '' }]);
  const removeTC = (i) => set('test_cases', form.test_cases.filter((_, idx) => idx !== i));
  const updateTC = (i, k, v) => set('test_cases', form.test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));

  const addHTC    = () => set('hidden_test_cases', [...(form.hidden_test_cases || []), { stdin: '', expected_output: '' }]);
  const removeHTC = (i) => set('hidden_test_cases', (form.hidden_test_cases || []).filter((_, idx) => idx !== i));
  const updateHTC = (i, k, v) => set('hidden_test_cases', (form.hidden_test_cases || []).map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));

  const addVTC    = () => set('visible_test_cases', [...form.visible_test_cases, {}]);
  const removeVTC = (i) => set('visible_test_cases', form.visible_test_cases.filter((_, idx) => idx !== i));
  const updateVTC = (i, raw) => {
    const obj = {};
    raw.split(',').forEach((pair) => {
      const [k, v] = pair.split('=').map((s) => s.trim());
      if (k) obj[k] = isNaN(v) ? v : Number(v);
    });
    set('visible_test_cases', form.visible_test_cases.map((tc, idx) => idx === i ? obj : tc));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isEdit) await labApi.update(id, form);
      else await labApi.create(form);
      navigate(backPath);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving');
      setSaving(false);
    }
  };

  const handleTestCompile = async () => {
    if (!form.starter_code) return;
    setTesting(true); setTestResult(null);
    try {
      const r = await labApi.runFree(form.language, form.starter_code, '');
      setTestResult(r.data);
    } catch (err) {
      setTestResult({ compile_error: err.response?.data?.message || 'Failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const isHDL = HDL.includes(form.language);
  const langInfo = LANG_OPTIONS.find((l) => l.value === form.language);

  return (
    <form onSubmit={handleSave} className="animate-fade-in flex flex-col gap-0">

      {/* -- Top bar ------------------------------------------------------ */}
      <div className="bg-white border border-line rounded-2xl px-5 py-3 flex items-center gap-3 mb-5 flex-wrap">
        <button type="button" onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink text-sm transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="w-px h-5 bg-line" />
        <h1 className="font-bold text-ink text-base flex-1 min-w-0 truncate">
          {isEdit ? `Edit: ${form.title || 'Problem'}` : 'New Lab Problem'}
        </h1>
        {form.language && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${langInfo?.color}`}>
            {langInfo?.label}
          </span>
        )}
        <button type="button" onClick={handleTestCompile} disabled={testing || !form.starter_code}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-sm text-ink-muted hover:border-brand hover:text-brand transition-colors disabled:opacity-40">
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Test Compile
        </button>
        <button type="button" onClick={() => navigate(backPath)}
          className="px-4 py-1.5 rounded-lg border border-line text-sm text-ink-muted hover:bg-surface-secondary transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Problem'}
        </button>
      </div>

      {/* -- Tab nav ------------------------------------------------------ */}
      <div className="bg-white border border-line rounded-2xl px-2 mb-5 flex gap-1">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} type="button" onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              tab === tid ? 'bg-brand/10 text-brand' : 'text-ink-muted hover:text-ink hover:bg-surface-secondary'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* -- Error banner ------------------------------------------------- */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-5">{error}</div>
      )}

      {/* -- Tab: Details ------------------------------------------------- */}
      {tab === 'details' && (
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* Left */}
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
              <SectionLabel>Basic Info</SectionLabel>

              <div className="grid grid-cols-4 gap-3">
                <FieldGroup label="Q. No">
                  <input
                    className="input text-center font-bold"
                    type="number" min="1"
                    value={form.question_no}
                    onChange={(e) => set('question_no', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="1"
                  />
                </FieldGroup>
                <div className="col-span-3">
                  <FieldGroup label="Title">
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder="e.g. AND Gate, Fibonacci, Binary Search"
                      required
                    />
                  </FieldGroup>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Problem Type">
                  <div className="flex flex-wrap gap-2">
                    {LANG_GROUPS.map((group) => (
                      <button key={group.label} type="button"
                        onClick={() => {
                          set('language', CATEGORY_DEFAULT[group.label]);
                          set('allowed_languages', []);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                          group.langs.includes(form.language)
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-line text-ink-muted hover:border-brand/40'
                        }`}>
                        {group.label}
                      </button>
                    ))}
                  </div>
                </FieldGroup>
                <FieldGroup label="Category">
                  <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. gates, recursion" />
                </FieldGroup>
              </div>
                <FieldGroup label="Lab Groups">
                  <div className="flex flex-wrap gap-2 rounded-xl border border-line p-3">
                    {groups.length === 0 && <span className="text-xs text-ink-muted">No custom groups created yet.</span>}
                    {groups.map((group) => {
                      const checked = (form.group_ids || []).includes(group.id);
                      return <label key={group.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-semibold ${checked ? 'border-brand bg-brand/10 text-brand' : 'border-line text-ink-muted'}`}>
                        <input type="checkbox" checked={checked} onChange={(e) => set('group_ids', e.target.checked ? [...(form.group_ids || []), group.id] : (form.group_ids || []).filter((id) => id !== group.id))} />
                        {group.icon} {group.name}
                      </label>;
                    })}
                  </div>
                </FieldGroup>

              <FieldGroup label="Allowed Languages">
                <p className="text-xs text-ink-muted -mt-1 mb-2">Select which languages students can use. They pick one when solving.</p>
                <div className="flex flex-wrap gap-2">
                  {LANG_GROUPS.find((g) => g.langs.includes(form.language))?.langs.map((l) => {
                    const info = LANG_OPTIONS.find((o) => o.value === l);
                    const checked = (form.allowed_languages || []).includes(l);
                    return (
                      <label key={l}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-xs font-semibold transition-all select-none ${
                          checked ? 'border-brand bg-brand/5 text-brand' : 'border-line text-ink-muted hover:border-brand/40'
                        }`}>
                        <input type="checkbox" className="hidden" checked={checked}
                          onChange={(e) => {
                            const cur = form.allowed_languages || [];
                            const next = e.target.checked ? [...cur, l] : cur.filter((x) => x !== l);
                            set('allowed_languages', next);
                            // keep primary language in sync with first checked
                            if (next.length > 0) set('language', next[0]);
                          }} />
                        <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          checked ? 'bg-brand border-brand' : 'border-line'
                        }`}>
                          {checked && <span className="text-white text-[9px] leading-none">✓</span>}
                        </span>
                        {info?.label}
                      </label>
                    );
                  })}
                </div>
                {(form.allowed_languages || []).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Select at least one language</p>
                )}
              </FieldGroup>

              <div className="grid grid-cols-3 gap-3">
                <FieldGroup label="Difficulty">
                  <select className="input" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Level">
                  <select className="input" value={form.level} onChange={(e) => set('level', parseInt(e.target.value))}>
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>Level {n}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Marks">
                  <input className="input" type="number" value={form.marks} onChange={(e) => set('marks', parseFloat(e.target.value))} />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Medal Reward Points">
                  <input className="input" type="number" min="0" value={form.reward_points} onChange={(e) => set('reward_points', Math.max(0, parseInt(e.target.value, 10) || 0))} />
                </FieldGroup>
                <FieldGroup label="Medal Image URL">
                  <input className="input" type="url" value={form.medal_image_url} onChange={(e) => set('medal_image_url', e.target.value)} placeholder="https://.../medal.png" />
                </FieldGroup>
              </div>
              {form.medal_image_url && <img src={form.medal_image_url} alt="Medal preview" className="w-14 h-14 rounded-full object-cover border border-line" />}
              <FieldGroup label="Time Limit (seconds)">
                <input className="input" type="number" value={form.time_limit_s} onChange={(e) => set('time_limit_s', parseInt(e.target.value))} />
              </FieldGroup>
            </div>
          </div>

          {/* Right */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel sub="Supports bold, italic, lists, code blocks and images">
              Problem Description
            </SectionLabel>
            <textarea
              className="input text-sm min-h-[260px] resize-y w-full font-mono"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the problem clearly..."
            />
          </div>
        </div>
      )}

      {/* -- Tab: Code ---------------------------------------------------- */}
      {tab === 'code' && (
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* Starter code */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel sub="This is what students see when they open the problem">
              Starter Code
            </SectionLabel>
            <div className="h-80 rounded-xl overflow-hidden border border-line">
              <Editor
                height="100%"
                language={monacoLang(form.language)}
                value={form.starter_code}
                onChange={(v) => set('starter_code', v || '')}
                theme="vs-dark"
                options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </div>
            {testResult && (
              <div className={`rounded-xl p-3 text-xs font-mono ${testResult.compile_error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                {testResult.compile_error
                  ? <span>✗ {testResult.compile_error}</span>
                  : <span>✓ Compiled successfully · {testResult.runtime_ms}ms{testResult.stdout ? ` · ${testResult.stdout}` : ''}</span>
                }
              </div>
            )}
          </div>

          {/* Testbench / Reference solution */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
            {isHDL ? (
              <>
                <SectionLabel sub="Hidden from students - runs automatically to grade submissions">
                  Testbench
                </SectionLabel>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                  <span className="mt-0.5">⚠</span>
                  <span>Must include <code className="bg-amber-100 px-1 rounded">$dumpfile("dump.vcd")</code> and <code className="bg-amber-100 px-1 rounded">$dumpvars(0, tb)</code> for waveform</span>
                </div>
                <div className="h-80 rounded-xl overflow-hidden border border-line">
                  <Editor
                    height="100%"
                    language="verilog"
                    value={form.testbench}
                    onChange={(v) => set('testbench', v || '')}
                    theme="vs-dark"
                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                  />
                </div>
              </>
            ) : (
              <>
                <SectionLabel sub="Hidden from students - for your reference only">
                  Reference Solution
                </SectionLabel>
                <div className="h-80 rounded-xl overflow-hidden border border-line">
                  <Editor
                    height="100%"
                    language={monacoLang(form.language)}
                    value={form.solution_code}
                    onChange={(v) => set('solution_code', v || '')}
                    theme="vs-dark"
                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -- Tab: Test Cases ---------------------------------------------- */}
      {tab === 'testcases' && (
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* Visible */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-brand" />
              <div>
                <p className="text-sm font-semibold text-ink">Visible Test Cases</p>
                <p className="text-xs text-ink-muted">
                  {isHDL ? 'Example signal values shown to students in the problem panel (key=value pairs)' : 'Students can see input and expected output'}
                </p>
              </div>
            </div>

            {isHDL ? (
              <div className="flex flex-col gap-2">
                {form.visible_test_cases.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-xs font-mono"
                      defaultValue={Object.entries(tc).map(([k, v]) => `${k}=${v}`).join(', ')}
                      onBlur={(e) => updateVTC(i, e.target.value)}
                      placeholder="a=0, b=0, y=0"
                    />
                    <button type="button" onClick={() => removeVTC(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button type="button" onClick={addVTC}
                  className="flex items-center gap-1.5 text-xs text-brand hover:underline mt-1">
                  <Plus size={13} /> Add Row
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {form.test_cases.length === 0 && (
                  <p className="text-xs text-ink-muted text-center py-4 border border-dashed border-line rounded-xl">No visible test cases yet</p>
                )}
                {form.test_cases.map((tc, i) => (
                  <div key={i} className="border border-line rounded-xl p-3 flex flex-col gap-2 bg-surface-secondary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-muted">Test {i + 1}</span>
                      <button type="button" onClick={() => removeTC(i)} className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                    {form.language === 'sql' && (
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Setup SQL <span className="text-ink-muted">(CREATE TABLE + INSERT rows)</span></p>
                        <textarea className="input text-xs font-mono min-h-[80px] resize-y w-full" value={tc.setup_sql || ''} onChange={(e) => updateTC(i, 'setup_sql', e.target.value)} placeholder="CREATE TABLE users (id INT, name VARCHAR(50));&#10;INSERT INTO users VALUES (1,'Alice'),(2,'Bob');" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-ink-muted mb-1">{form.language === 'sql' ? 'Student writes this query' : 'Input (stdin)'}</p>
                        <textarea className="input text-xs font-mono min-h-[60px] resize-y w-full" value={tc.stdin || ''} onChange={(e) => updateTC(i, 'stdin', e.target.value)} placeholder={form.language === 'sql' ? '(shown to student as hint)' : '(empty)'} />
                      </div>
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Expected Output</p>
                        <textarea className="input text-xs font-mono min-h-[60px] resize-y w-full" value={tc.expected_output} onChange={(e) => updateTC(i, 'expected_output', e.target.value)} placeholder={form.language === 'sql' ? 'Alice\nBob' : 'expected output'} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addTC}
                  className="flex items-center justify-center gap-1.5 text-xs text-brand border border-dashed border-brand/40 rounded-xl py-2.5 hover:bg-brand/5 transition-colors">
                  <Plus size={13} /> Add Visible Test Case
                </button>
              </div>
            )}
          </div>

          {/* Hidden */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-ink">Hidden Test Cases</p>
                <p className="text-xs text-ink-muted">
                  {isHDL ? 'HDL problems use the testbench for grading - no hidden TCs needed' : 'Run on submit only - students see pass/fail but not input/output'}
                </p>
              </div>
            </div>

            {isHDL ? (
              <div className="flex flex-col gap-3 py-4 px-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">Testbench acts as hidden test cases</p>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  For SystemVerilog problems, the <strong>Testbench</strong> you wrote in the Code tab is the hidden grader.
                  It runs automatically on every student submission - students never see it.
                  Write all your PASS/FAIL checks inside the testbench using <code className="bg-blue-100 px-1 rounded">$display("PASS: ...")</code> and <code className="bg-blue-100 px-1 rounded">$display("FAIL: ...")</code>.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(form.hidden_test_cases || []).length === 0 && (
                  <p className="text-xs text-ink-muted text-center py-4 border border-dashed border-orange-200 rounded-xl">No hidden test cases yet</p>
                )}
                {(form.hidden_test_cases || []).map((tc, i) => (
                  <div key={i} className="border border-orange-200 rounded-xl p-3 flex flex-col gap-2 bg-orange-50/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-600 flex items-center gap-1"><Lock size={10} /> Hidden {i + 1}</span>
                      <button type="button" onClick={() => removeHTC(i)} className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                    {form.language === 'sql' && (
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Setup SQL <span className="text-orange-500">(hidden from student)</span></p>
                        <textarea className="input text-xs font-mono min-h-[80px] resize-y w-full" value={tc.setup_sql || ''} onChange={(e) => updateHTC(i, 'setup_sql', e.target.value)} placeholder="CREATE TABLE orders (id INT, amount DECIMAL);&#10;INSERT INTO orders VALUES (1,100),(2,200);" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-ink-muted mb-1">{form.language === 'sql' ? 'Hint (optional)' : 'Input (stdin)'}</p>
                        <textarea className="input text-xs font-mono min-h-[60px] resize-y w-full" value={tc.stdin || ''} onChange={(e) => updateHTC(i, 'stdin', e.target.value)} placeholder="(empty)" />
                      </div>
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Expected Output</p>
                        <textarea className="input text-xs font-mono min-h-[60px] resize-y w-full" value={tc.expected_output} onChange={(e) => updateHTC(i, 'expected_output', e.target.value)} placeholder="expected output" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addHTC}
                  className="flex items-center justify-center gap-1.5 text-xs text-orange-600 border border-dashed border-orange-300 rounded-xl py-2.5 hover:bg-orange-50 transition-colors">
                  <Plus size={13} /> Add Hidden Test Case
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </form>
  );
}
