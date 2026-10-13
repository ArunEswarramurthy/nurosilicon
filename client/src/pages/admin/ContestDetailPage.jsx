import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Trophy, Plus, Trash2, Search, Cpu, Code2, Database, Zap, ChevronLeft, Users, BarChart2, X, FileText, Lock, Eye, Settings, FlaskConical } from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { contestApi } from '../../lib/contestApi';
import { labApi } from '../../lib/labApi';

const TYPE_STYLE = {
  programming: { icon: Code2,    color: '#059669', bg: '#f0fdf4', label: 'Programming' },
  database:    { icon: Database, color: '#2563eb', bg: '#eff6ff', label: 'Database' },
  hardware:    { icon: Cpu,      color: '#0A6CFF', bg: '#f5f3ff', label: 'Hardware (HDL)' },
  embedded:    { icon: Zap,      color: '#d97706', bg: '#fffbeb', label: 'Embedded' },
  objective:   { icon: BarChart2,color: '#dc2626', bg: '#fef2f2', label: 'Objective' },
};
const HDL_LANGS = ['verilog', 'vhdl', 'systemverilog'];
const DIFF_COLOR = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };

const LANG_OPTIONS = [
  { value: 'c',             label: 'C',             group: 'programming' },
  { value: 'cpp',           label: 'C++',           group: 'programming' },
  { value: 'python',        label: 'Python',        group: 'programming' },
  { value: 'java',          label: 'Java',          group: 'programming' },
  { value: 'sql',           label: 'MySQL/SQL',     group: 'database'    },
  { value: 'systemverilog', label: 'SystemVerilog', group: 'hardware'    },
  { value: 'embedded_c',    label: 'Embedded C',    group: 'embedded'    },
];

const EMPTY_PROBLEM = {
  title: '', description: '', language: 'cpp', category: '', difficulty: 'easy',
  level: 1, marks: 100, time_limit_s: 10, starter_code: '', solution_code: '',
  testbench: '', test_cases: [{ stdin: '', expected_output: '' }],
  hidden_test_cases: [], visible_test_cases: [], allowed_languages: [],
};

function monacoLang(lang) {
  if (['verilog','vhdl','systemverilog'].includes(lang)) return 'verilog';
  if (['c','cpp','embedded_c'].includes(lang)) return 'c';
  if (lang === 'sql') return 'sql';
  return lang;
}

const inp = { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };

// -- Create Problem Form (inline inside modal) ---------------------------------
function CreateProblemForm({ contestId, onClose, onAdded }) {
  const [form, setForm] = useState(EMPTY_PROBLEM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createTab, setCreateTab] = useState('details'); // details | code | testcases
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isHDL = ['verilog','vhdl','systemverilog'].includes(form.language);

  const addTC    = () => set('test_cases', [...form.test_cases, { stdin: '', expected_output: '' }]);
  const removeTC = (i) => set('test_cases', form.test_cases.filter((_, idx) => idx !== i));
  const updateTC = (i, k, v) => set('test_cases', form.test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));
  const addHTC    = () => set('hidden_test_cases', [...form.hidden_test_cases, { stdin: '', expected_output: '' }]);
  const removeHTC = (i) => set('hidden_test_cases', form.hidden_test_cases.filter((_, idx) => idx !== i));
  const updateHTC = (i, k, v) => set('hidden_test_cases', form.hidden_test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc));

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (isHDL && !form.testbench.trim()) { setError('Testbench is required for HDL problems'); return; }
    if (!isHDL && form.test_cases.length === 0) { setError('At least one test case is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await labApi.create({ ...form, question_no: null });
      const newProblem = res.data.problem;
      await contestApi.adminAddProblem(contestId, { problem_id: newProblem.id, marks: form.marks });
      onAdded();
      onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed to create problem'); }
    finally { setSaving(false); }
  };

  const tabBtn = (id, label, Icon) => (
    <button onClick={() => setCreateTab(id)}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: 'none', borderBottom: `2px solid ${createTab === id ? '#0A6CFF' : 'transparent'}`, background: 'transparent', color: createTab === id ? '#0A6CFF' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      <Icon size={12} />{label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        {tabBtn('details', 'Details', Settings)}
        {tabBtn('code', 'Code', Code2)}
        {tabBtn('testcases', 'Test Cases', FlaskConical)}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {error && <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '7px 11px', borderRadius: 8, marginBottom: 12 }}>{error}</p>}

        {/* DETAILS TAB */}
        {createTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Title *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Two Sum, AND Gate" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Problem Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['programming','💻 Programming','cpp'],['database','🗄️ Database','sql'],['hardware','⚡ Hardware','systemverilog'],['embedded','🔌 Embedded','embedded_c']].map(([type, label, lang]) => (
                  <button key={type} onClick={() => set('language', lang)}
                    style={{ padding: '6px 12px', borderRadius: 9, border: `1.5px solid ${LANG_OPTIONS.find(l=>l.value===form.language)?.group===type ? '#0A6CFF' : '#e5e7eb'}`, background: LANG_OPTIONS.find(l=>l.value===form.language)?.group===type ? '#f5f3ff' : '#fff', color: LANG_OPTIONS.find(l=>l.value===form.language)?.group===type ? '#0A6CFF' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Language</label>
              <select value={form.language} onChange={(e) => set('language', e.target.value)} style={inp}>
                {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Difficulty</label>
                <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} style={inp}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Marks</label>
                <input type="number" value={form.marks} onChange={(e) => set('marks', Number(e.target.value))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Category</label>
                <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. arrays" style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} placeholder="Describe the problem clearly..." style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {createTab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Starter Code</label>
              <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb' }}>
                <Editor height="100%" language={monacoLang(form.language)} value={form.starter_code}
                  onChange={(v) => set('starter_code', v || '')} theme="vs-dark"
                  options={{ fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                {isHDL ? 'Testbench *' : 'Reference Solution'}
              </label>
              <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${isHDL ? '#fcd34d' : '#e5e7eb'}` }}>
                <Editor height="100%" language={monacoLang(form.language)}
                  value={isHDL ? form.testbench : form.solution_code}
                  onChange={(v) => set(isHDL ? 'testbench' : 'solution_code', v || '')} theme="vs-dark"
                  options={{ fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
              </div>
              {isHDL && <p style={{ fontSize: 10, color: '#d97706', marginTop: 4 }}>⚠ Must include $dumpfile("dump.vcd") and $dumpvars(0, tb)</p>}
            </div>
          </div>
        )}

        {/* TEST CASES TAB */}
        {createTab === 'testcases' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isHDL ? (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#2563eb' }}>
                ℹ️ For HDL problems, the Testbench you wrote in the Code tab acts as the grader. No separate test cases needed.
              </div>
            ) : (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Visible Test Cases *</label>
                    <button onClick={addTC} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#0A6CFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={11} /> Add</button>
                  </div>
                  {form.test_cases.map((tc, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                      <textarea value={tc.stdin} onChange={(e) => updateTC(i, 'stdin', e.target.value)} placeholder="Input (stdin)" rows={2} style={{ ...inp, resize: 'vertical', fontSize: 12, fontFamily: 'monospace' }} />
                      <textarea value={tc.expected_output} onChange={(e) => updateTC(i, 'expected_output', e.target.value)} placeholder="Expected output" rows={2} style={{ ...inp, resize: 'vertical', fontSize: 12, fontFamily: 'monospace' }} />
                      <button onClick={() => removeTC(i)} style={{ padding: 6, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', marginTop: 2 }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.07em' }}>🔒 Hidden Test Cases</label>
                    <button onClick={addHTC} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={11} /> Add</button>
                  </div>
                  {form.hidden_test_cases.map((tc, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                      <textarea value={tc.stdin} onChange={(e) => updateHTC(i, 'stdin', e.target.value)} placeholder="Input (stdin)" rows={2} style={{ ...inp, resize: 'vertical', fontSize: 12, fontFamily: 'monospace', borderColor: '#fcd34d' }} />
                      <textarea value={tc.expected_output} onChange={(e) => updateHTC(i, 'expected_output', e.target.value)} placeholder="Expected output" rows={2} style={{ ...inp, resize: 'vertical', fontSize: 12, fontFamily: 'monospace', borderColor: '#fcd34d' }} />
                      <button onClick={() => removeHTC(i)} style={{ padding: 6, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', marginTop: 2 }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving}
          style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: saving ? '#e5e7eb' : 'linear-gradient(135deg,#0A6CFF,#0055D4)', color: saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {saving ? <Spinner size="sm" /> : <Plus size={13} />}
          {saving ? 'Creating & Adding...' : 'Create & Add to Contest'}
        </button>
      </div>
    </div>
  );
}

// -- Add Problem Modal (Pick Existing OR Create New) ---------------------------
function AddProblemModal({ contestId, existing, onClose, onAdded }) {
  const [tab, setTab] = useState('pick'); // pick | create
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [marks, setMarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    labApi.list({}).then((r) => setProblems(r.data.problems || [])).finally(() => setLoading(false));
  }, []);

  const existingIds = new Set(existing.map((cp) => cp.problem_id));
  const filtered = problems.filter((p) => {
    if (existingIds.has(p.id)) return false;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const isHDL = HDL_LANGS.includes(p.language);
    const matchType = typeFilter === 'all' ||
      (typeFilter === 'hardware' && isHDL) ||
      (typeFilter === 'database' && p.language === 'sql') ||
      (typeFilter === 'embedded' && p.language === 'embedded_c') ||
      (typeFilter === 'programming' && !isHDL && p.language !== 'sql' && p.language !== 'embedded_c');
    return matchSearch && matchType;
  });

  const addExisting = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await contestApi.adminAddProblem(contestId, { problem_id: selected.id, marks: marks ? Number(marks) : undefined });
      onAdded(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 660, height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0A6CFF,#0055D4)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Add Problem to Contest</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fafafa' }}>
          <button onClick={() => setTab('pick')}
            style={{ flex: 1, padding: '11px', border: 'none', borderBottom: `2px solid ${tab === 'pick' ? '#0A6CFF' : 'transparent'}`, background: 'transparent', color: tab === 'pick' ? '#0A6CFF' : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Search size={13} /> Pick from Lab
          </button>
          <button onClick={() => setTab('create')}
            style={{ flex: 1, padding: '11px', border: 'none', borderBottom: `2px solid ${tab === 'create' ? '#0A6CFF' : 'transparent'}`, background: 'transparent', color: tab === 'create' ? '#0A6CFF' : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={13} /> Create New Problem
          </button>
        </div>

        {/* Pick existing tab */}
        {tab === 'pick' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                {[['all','All'],['programming','💻 Programming'],['database','🗄️ Database'],['hardware','⚡ Hardware'],['embedded','🔌 Embedded']].map(([v, l]) => (
                  <button key={v} onClick={() => setTypeFilter(v)}
                    style={{ padding: '4px 10px', borderRadius: 99, border: `1px solid ${typeFilter === v ? '#0A6CFF' : '#e5e7eb'}`, background: typeFilter === v ? '#0A6CFF' : '#fff', color: typeFilter === v ? '#fff' : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search problems..."
                  style={{ width: '100%', padding: '8px 12px 8px 28px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
              {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {filtered.map((p) => {
                    const isHDL = HDL_LANGS.includes(p.language);
                    const typeKey = isHDL ? 'hardware' : p.language === 'sql' ? 'database' : p.language === 'embedded_c' ? 'embedded' : 'programming';
                    const ts = TYPE_STYLE[typeKey];
                    const Icon = ts.icon;
                    return (
                      <button key={p.id} onClick={() => setSelected(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, border: `1.5px solid ${selected?.id === p.id ? '#0A6CFF' : '#e5e7eb'}`, background: selected?.id === p.id ? '#f5f3ff' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={13} color={ts.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{ts.label} · {p.category}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{p.marks}m</span>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>No problems found</p>}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
              {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Override marks (optional)"
                  style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={addExisting} disabled={!selected || saving}
                  style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: !selected || saving ? '#e5e7eb' : 'linear-gradient(135deg,#0A6CFF,#0055D4)', color: !selected || saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: !selected || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <Spinner size="sm" /> : <Plus size={13} />} Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create new tab */}
        {tab === 'create' && (
          <CreateProblemForm contestId={contestId} onClose={onClose} onAdded={onAdded} />
        )}
      </div>
    </div>
  );
}

// -- Add Objective Modal -------------------------------------------------------
function AddObjectiveModal({ contestId, onClose, onAdded }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [marks, setMarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    contestApi.adminQuestionBanks(contestId)
      .then((r) => setBanks(r.data.banks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allQ = banks.flatMap((b) => (b.questions || []).map((q) => ({ ...q, bank_name: b.name })));
  const filtered = allQ.filter((q) => !search || q.title.toLowerCase().includes(search.toLowerCase()));

  const QTYPE_LABEL = { mcq_single: 'MCQ', mcq_multi: 'Multi-Select', true_false: 'True/False', fill_blank: 'Fill Blank' };

  const add = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await contestApi.adminAddObjective(contestId, { question_id: selected.id, marks: marks ? Number(marks) : undefined });
      onAdded(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0A6CFF,#0055D4)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Objective</p>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Add MCQ / Objective Question</h3>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..."
              style={{ width: '100%', padding: '8px 12px 8px 28px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Question list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <BarChart2 size={32} style={{ margin: '0 auto 10px', color: '#e5e7eb' }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>No objective questions found</p>
              <p style={{ fontSize: 12, margin: 0 }}>Add MCQ questions to a Question Bank first</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((q) => (
                <button key={q.id} onClick={() => setSelected(q)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 11, border: `1.5px solid ${selected?.id === q.id ? '#0A6CFF' : '#e5e7eb'}`, background: selected?.id === q.id ? '#f5f3ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <BarChart2 size={13} color="#dc2626" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px' }}>{QTYPE_LABEL[q.type] || q.type} · {q.bank_name} · {q.marks}m</p>
                    {(q.options || []).slice(0, 3).map((o) => (
                      <p key={o.id} style={{ fontSize: 11, color: o.is_correct ? '#059669' : '#6b7280', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.is_correct ? '✓' : '○'} {o.option_text}
                      </p>
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
          {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Override marks (optional)"
              style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={add} disabled={!selected || saving}
              style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: !selected || saving ? '#e5e7eb' : 'linear-gradient(135deg,#0A6CFF,#0055D4)', color: !selected || saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: !selected || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <Spinner size="sm" /> : <Plus size={13} />} Add Objective
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showObjective, setShowObjective] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = () => {
    setLoading(true);
    contestApi.adminGet(id).then((r) => setContest(r.data.contest)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const remove = async (cpId) => {
    if (!window.confirm('Remove this problem from the contest?')) return;
    setRemoving(cpId);
    await contestApi.adminRemoveProblem(id, cpId).catch(() => {});
    setRemoving(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!contest) return null;

  const problems = contest.contest_problems || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/contests')} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-ink-muted">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="page-title flex items-center gap-2"><Trophy size={20} className="text-brand" /> {contest.title}</h1>
          <p className="page-sub">{new Date(contest.start_time).toLocaleString('en-IN')} → {new Date(contest.end_time).toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => navigate(`/admin/contests/${id}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:text-brand hover:border-brand transition-colors">
          <BarChart2 size={14} /> Leaderboard
        </button>
        <button onClick={() => navigate(`/admin/contests/${id}/new-problem`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand text-brand font-semibold text-sm hover:bg-brand hover:text-white transition-colors">
          <Plus size={14} /> Create New Problem
        </button>
        <button onClick={() => setShowObjective(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-700 font-semibold text-sm"><BarChart2 size={14} /> Add Objective</button><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm"><Search size={14} /> Pick from Lab</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3 text-center">
          <p className="text-2xl font-bold text-brand">{problems.length}</p>
          <p className="text-xs text-ink-muted">Problems</p>
        </Card>
        <Card className="py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{problems.reduce((s, p) => s + (p.marks || 0), 0)}</p>
          <p className="text-xs text-ink-muted">Total Marks</p>
        </Card>
        <Card className="py-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {Math.round((new Date(contest.end_time) - new Date(contest.start_time)) / 60000)} min
          </p>
          <p className="text-xs text-ink-muted">Duration</p>
        </Card>
      </div>

      {/* Problems table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <p className="font-semibold text-ink text-sm">Problems</p>
          <p className="text-xs text-ink-muted">{problems.length} added</p>
        </div>
        {problems.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Code2 size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold">No problems added yet</p>
            <p className="text-sm mt-1">Click "Add Problem" to add problems from the lab</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary border-b border-line">
              <tr>
                {['#', 'Problem', 'Type', 'Difficulty', 'Marks', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-ink-secondary font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {problems.map((cp, idx) => {
                const ts = TYPE_STYLE[cp.problem_type] || TYPE_STYLE.programming;
                const Icon = ts.icon;
                return (
                  <tr key={cp.id} className="border-b border-line hover:bg-surface-secondary transition-colors">
                    <td className="px-4 py-3 text-ink-muted text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{cp.problem?.title || '-'}</td>
                    <td className="px-4 py-3">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: ts.color, background: ts.bg, padding: '3px 9px', borderRadius: 99, width: 'fit-content' }}>
                        <Icon size={11} /> {ts.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_COLOR[cp.problem?.difficulty]}`}>{cp.problem?.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{cp.marks}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(cp.id)} disabled={removing === cp.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-600 transition-colors">
                        {removing === cp.id ? <Spinner size="xs" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showAdd && <AddProblemModal contestId={id} existing={problems} onClose={() => setShowAdd(false)} onAdded={load} />}
      {showObjective && <AddObjectiveModal contestId={id} onClose={() => setShowObjective(false)} onAdded={load} />}
    </div>
  );
}

