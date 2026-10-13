import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Plus, Check, X,
  AlertCircle, Save, ArrowRight, Cpu,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import { engLabBankApi } from '../../lib/engineeringApi';
import { DIFFICULTIES } from '../../lib/questionTypes';

const OBJ_TYPES = [
  { value: 'mcq_single', label: 'MCQ Single',   color: 'bg-blue-600 text-white border-blue-600',   idle: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'mcq_multi',  label: 'MCQ Multi',    color: 'bg-cyan-600 text-white border-cyan-600',    idle: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  { value: 'true_false', label: 'True / False', color: 'bg-teal-600 text-white border-teal-600',   idle: 'border-teal-200 bg-teal-50 text-teal-700' },
  { value: 'fill_blank', label: 'Fill Blank',   color: 'bg-indigo-600 text-white border-indigo-600', idle: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
];

const DIFF_STYLE = {
  easy:   'border-green-300 bg-green-50 text-green-700',
  medium: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  hard:   'border-red-300 bg-red-50 text-red-700',
};

const EMPTY_FORM = () => ({
  type: 'mcq_single',
  title: '',
  body: '',
  difficulty: 'medium',
  marks: 1,
  negative_marks: 0,
  explanation: '',
  answer_text: '',
  options: [
    { option_text: '', is_correct: true  },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
});

export default function EngineeringLabAddQuestionPage() {
  const { id, qId } = useParams();           // id = bank id, qId = question id (edit mode)
  const navigate    = useNavigate();
  const location    = useLocation();
  const base = '/admin';
  const isEdit      = Boolean(qId);

  const [bank, setBank]     = useState(null);
  const [form, setForm]     = useState(EMPTY_FORM());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);   // flash after save-and-next

  // Load bank info
  useEffect(() => {
    engLabBankApi.get(id)
      .then((r) => setBank(r.data.bank))
      .catch(() => {});
  }, [id]);

  // Load question for edit
  useEffect(() => {
    if (!isEdit) { setLoading(false); return; }
    engLabBankApi.get(id).then((r) => {
      const q = (r.data.questions || []).find((q) => q.id === qId);
      if (!q) { setLoading(false); return; }
      setForm({
        type: q.type || 'mcq_single',
        title: q.title || '',
        body: q.body || '',
        difficulty: q.difficulty || 'medium',
        marks: q.marks ?? 1,
        negative_marks: q.negative_marks ?? 0,
        explanation: q.explanation || '',
        answer_text: q.answer_text || (q.type === 'fill_blank' && q.options?.[0]?.option_text) || '',
        options: q.options?.length
          ? q.options.map((o) => ({ option_text: o.option_text, is_correct: !!o.is_correct }))
          : EMPTY_FORM().options,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, qId, isEdit]);

  // Auto-set true/false options when type changes
  useEffect(() => {
    if (form.type === 'true_false') {
      setForm((f) => ({
        ...f,
        options: [
          { option_text: 'True',  is_correct: true  },
          { option_text: 'False', is_correct: false },
        ],
      }));
    } else if (form.type === 'mcq_single' || form.type === 'mcq_multi') {
      setForm((f) => {
        if (f.options.length === 2 && f.options[0].option_text === 'True') {
          return { ...f, options: EMPTY_FORM().options };
        }
        return f;
      });
    }
  }, [form.type]); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updateOption  = (i, text) => setForm((f) => { const o = [...f.options]; o[i] = { ...o[i], option_text: text }; return { ...f, options: o }; });
  const toggleCorrect = (i) => setForm((f) => ({
    ...f,
    options: f.options.map((o, j) =>
      f.type === 'mcq_multi'
        ? (j === i ? { ...o, is_correct: !o.is_correct } : o)
        : { ...o, is_correct: j === i }
    ),
  }));
  const addOption    = () => { if (form.options.length >= 6) return; setForm((f) => ({ ...f, options: [...f.options, { option_text: '', is_correct: false }] })); };
  const removeOption = (i) => { if (form.options.length <= 2) return; setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) })); };

  const validate = () => {
    if (!form.title.trim()) return 'Question title is required.';
    if (form.type === 'fill_blank' && !form.answer_text.trim()) return 'Expected answer is required.';
    if (form.type !== 'fill_blank' && !form.options.some((o) => o.is_correct)) return 'Mark at least one correct option.';
    if (form.type !== 'fill_blank' && form.options.filter((o) => o.option_text.trim()).length < 2) return 'At least 2 options with text are required.';
    return null;
  };

  const buildPayload = () => ({
    ...form,
    options: form.type === 'fill_blank'
      ? [{ option_text: form.answer_text.trim(), is_correct: true }]
      : form.options.filter((o) => o.option_text.trim()),
  });

  // Save and go back to bank
  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await engLabBankApi.updateQuestion(id, qId, buildPayload());
      } else {
        await engLabBankApi.addQuestion(id, buildPayload());
      }
      navigate(`${base}/eng-lab-banks/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error saving question.');
      setSaving(false);
    }
  };

  // Save and reset for next question
  const handleSaveNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      await engLabBankApi.addQuestion(id, buildPayload());
      setForm(EMPTY_FORM());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error saving question.');
    } finally {
      setSaving(false);
    }
  };

  const isFillBlank = form.type === 'fill_blank';
  const isTrueFalse = form.type === 'true_false';
  const lockedType  = bank?.bank_type && bank.bank_type !== 'mixed' ? bank.bank_type : null;
  const allowedTypes = lockedType ? OBJ_TYPES.filter((t) => t.value === lockedType) : OBJ_TYPES;

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;

  return (
    <div className="animate-fade-in flex flex-col gap-0 pb-16">

      {/* -- Top bar -- */}
      <div className="bg-white border border-line rounded-2xl px-5 py-3 flex items-center gap-3 mb-5 flex-wrap shadow-sm">
        <button type="button" onClick={() => navigate(`${base}/eng-lab-banks/${id}`)}
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink text-sm transition-colors">
          <ChevronLeft size={15} /> Back
        </button>
        <div className="w-px h-5 bg-line" />
        <Cpu size={16} className="text-brand shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-ink text-base truncate">
            {isEdit ? 'Edit Question' : 'Add Question'}
          </h1>
          {bank && <p className="text-xs text-ink-muted truncate">{bank.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(`${base}/eng-lab-banks/${id}`)}
            className="px-4 py-1.5 rounded-lg border border-line text-sm text-ink-muted hover:bg-surface-secondary transition-colors">
            Cancel
          </button>
          {!isEdit && (
            <button type="button" onClick={handleSaveNext} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-brand text-brand text-sm font-semibold hover:bg-brand/5 transition-colors disabled:opacity-50">
              <ArrowRight size={13} /> Save & Next
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50">
            {saving ? <span className="animate-spin text-base">⏳</span> : <Save size={13} />}
            {saving ? 'Saving...' : isEdit ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </div>

      {/* -- Success flash -- */}
      {saved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-2xl text-sm font-medium mb-5">
          <Check size={16} className="text-green-600 shrink-0" />
          Question saved! Fill in the next one below.
        </div>
      )}

      {/* -- Error -- */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-5">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* -- Two-column layout -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* -- LEFT: Type + Meta -- */}
        <div className="flex flex-col gap-5">

          {/* Question Type */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Question Type</label>
            <div className="grid grid-cols-2 gap-2">
              {allowedTypes.map((t) => (
                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.type === t.value ? t.color + ' shadow-sm' : 'border-line text-ink-muted hover:border-brand/40 hover:text-ink bg-surface-secondary'
                  }`}>
                  {form.type === t.value && <Check size={13} />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <label key={d} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-semibold capitalize transition-all ${
                  form.difficulty === d ? DIFF_STYLE[d] : 'border-line text-ink-muted hover:border-brand/30 bg-surface-secondary'
                }`}>
                  <input type="radio" name="difficulty" value={d} checked={form.difficulty === d}
                    onChange={() => set('difficulty', d)} className="sr-only" />
                  {d}
                </label>
              ))}
            </div>
          </div>

          {/* Marks */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Marks</label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Marks *" type="number" min="0.5" step="0.5"
                value={form.marks} onChange={(e) => set('marks', parseFloat(e.target.value) || 1)} required />
              <Input label="Negative Marks" type="number" min="0" step="0.25"
                value={form.negative_marks} onChange={(e) => set('negative_marks', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Options / Answer */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">

            {isFillBlank ? (
              <>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Expected Answer</label>
                <Input label="Answer *" placeholder="e.g. NAND  /  0  /  High impedance"
                  value={form.answer_text} onChange={(e) => set('answer_text', e.target.value)} required />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    Options
                    <span className="ml-1.5 font-normal normal-case text-ink-muted">
                      {form.type === 'mcq_multi' ? '- tick all correct' : '- click letter to mark correct'}
                    </span>
                  </label>
                  {!isTrueFalse && (
                    <button type="button" onClick={addOption} disabled={form.options.length >= 6}
                      className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-40 disabled:no-underline">
                      <Plus size={13} /> Add Option ({form.options.length}/6)
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                      opt.is_correct ? 'border-green-300 bg-green-50' : 'border-line bg-surface-secondary'
                    }`}>
                      {/* Letter / correct toggle */}
                      <button type="button" onClick={() => toggleCorrect(i)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                          opt.is_correct
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-white border border-line text-ink-muted hover:border-brand hover:text-brand'
                        }`}>
                        {opt.is_correct ? <Check size={14} /> : String.fromCharCode(65 + i)}
                      </button>

                      <input type="text"
                        className="input flex-1 py-2 text-sm bg-white"
                        placeholder={`Option ${String.fromCharCode(65 + i)}...`}
                        value={opt.option_text}
                        onChange={(e) => updateOption(i, e.target.value)}
                        readOnly={isTrueFalse} />

                      {form.options.length > 2 && !isTrueFalse && (
                        <button type="button" onClick={() => removeOption(i)}
                          className="text-ink-muted hover:text-red-500 p-1 transition-colors shrink-0">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {form.type === 'mcq_multi' && (
                  <p className="text-xs text-ink-muted">Click the letter button on each correct option to toggle it.</p>
                )}
              </>
            )}
          </div>

          {/* Explanation */}
          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Explanation (optional)</label>
            <textarea className="input resize-none text-sm" rows={3}
              placeholder="Why is this the correct answer? Shown after submission."
              value={form.explanation} onChange={(e) => set('explanation', e.target.value)} />
          </div>
        </div>

        {/* -- RIGHT: Title + Rich Description -- */}
        <div className="flex flex-col gap-5">

          <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <Input label="Question Title *"
              placeholder="e.g. What is the output of a NAND gate when both inputs are HIGH?"
              value={form.title} onChange={(e) => set('title', e.target.value)} required />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Problem Description</label>
              <p className="text-xs text-ink-muted -mt-1">Supports bold, italic, lists, code blocks and images</p>
              <textarea
                className="input resize-y text-sm min-h-[160px] w-full font-mono"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="Explain the problem, add circuit diagrams, format text..."
              />
            </div>
          </div>

          {/* Preview card */}
          {form.title && (
            <div className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Preview</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  form.type === 'mcq_single' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  form.type === 'mcq_multi'  ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  form.type === 'true_false' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                  'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {OBJ_TYPES.find((t) => t.value === form.type)?.label}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${
                  form.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                  form.difficulty === 'hard' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>{form.difficulty}</span>
                <span className="text-xs text-ink-muted bg-surface-secondary px-2.5 py-1 rounded-full border border-line">
                  {form.marks}m {form.negative_marks > 0 && `(-${form.negative_marks})`}
                </span>
              </div>
              <p className="font-semibold text-ink text-sm">{form.title}</p>
              {!isFillBlank && form.options.filter((o) => o.option_text.trim()).length > 0 && (
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {form.options.map((opt, i) => {
                    if (!opt.option_text.trim()) return null;
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        opt.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-surface-secondary border-line text-ink'
                      }`}>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          opt.is_correct ? 'bg-green-600 text-white' : 'bg-white border border-line text-ink-muted'
                        }`}>{String.fromCharCode(65 + i)}</span>
                        {opt.option_text}
                        {opt.is_correct && <Check size={11} className="ml-auto text-green-600" />}
                      </div>
                    );
                  })}
                </div>
              )}
              {isFillBlank && form.answer_text && (
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                  <strong>Answer:</strong> {form.answer_text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -- Bottom action bar -- */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-line px-8 py-3 flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate(`${base}/eng-lab-banks/${id}`)}
          className="px-5 py-2 rounded-xl border border-line text-sm text-ink-muted hover:bg-surface-secondary transition-colors">
          Cancel
        </button>
        {!isEdit && (
          <button type="button" onClick={handleSaveNext} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl border-2 border-brand text-brand text-sm font-bold hover:bg-brand/5 transition-all disabled:opacity-50">
            <ArrowRight size={14} /> Save & Add Next
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm">
          {saving ? '⏳ Saving...' : <><Save size={14} /> {isEdit ? 'Update Question' : 'Save Question'}</>}
        </button>
      </div>
    </div>
  );
}
