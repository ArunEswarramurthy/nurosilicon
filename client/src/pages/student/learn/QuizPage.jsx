import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { learnStudentApi } from '../../../lib/learnApi';

export default function QuizPage() {
  const { slug, quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      learnStudentApi.getQuiz(quizId),
      learnStudentApi.getQuizHistory(quizId),
    ]).then(([qr, hr]) => {
      setQuiz(qr.data.quiz);
      setHistory(hr.data.attempts);
    }).catch(e => {
      if (e.response?.status === 403) navigate(-1);
    }).finally(() => setLoading(false));
    return () => clearInterval(timerRef.current);
  }, [quizId]);

  const startQuiz = async () => {
    try {
      const r = await learnStudentApi.startAttempt(quizId);
      setAttempt(r.data.attempt);
      setCurrentQ(0);
      if (quiz.time_limit) {
        setTimeLeft(quiz.time_limit);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to start quiz');
    }
  };

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { doSubmit(true); return; }
    timerRef.current = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const doSubmit = async (forced = false) => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const r = await learnStudentApi.submitAttempt(quizId, { answers });
      setResult(r.data);
      setAttempt(null);
      setTimeLeft(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Submit failed');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = () => {
    if (!confirm('Submit quiz? You cannot change answers after submission.')) return;
    doSubmit(false);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQ = quiz?.questions?.length || 0;

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }
  if (!quiz) return null;

  /* ── RESULT SCREEN ── */
  if (result) {
    const passed = result.passed;
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Score card */}
        <div style={{ background: passed ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: `1.5px solid ${passed ? '#6ee7b7' : '#fde68a'}`, borderRadius: 20, padding: '32px 28px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: passed ? '#ecfdf5' : '#fffbeb', border: `1.5px solid ${passed ? '#6ee7b7' : '#fde68a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {passed
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            }
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0a0a1a', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {passed ? 'Quiz Passed!' : 'Keep Practicing'}
          </h2>
          <div style={{ fontSize: 48, fontWeight: 900, color: passed ? '#059669' : '#d97706', lineHeight: 1, marginBottom: 6 }}>
            {result.score}%
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            {result.earned} / {result.totalMarks} marks · Passing score: {result.passingPercentage}%
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ height: 40, padding: '0 20px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}
            >
              <ChevronLeft size={13} style={{ display: 'inline', marginRight: 4 }} />Back to Lesson
            </button>
            {!passed && history.length < quiz.max_attempts && (
              <button
                onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0); startQuiz(); }}
                style={{ height: 40, padding: '0 20px', borderRadius: 10, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                Try Again
              </button>
            )}
          </div>
        </div>

        {/* Review */}
        {result.questions && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0a0a1a', marginBottom: 14 }}>Answer Review</h3>
            {result.questions.map((q, i) => (
              <div
                key={q.id}
                style={{ background: '#fff', border: `1.5px solid ${q.isCorrect ? '#6ee7b7' : '#fecaca'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  {q.isCorrect
                    ? <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                    : <XCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a1a', lineHeight: 1.5 }}>Q{i + 1}: {q.text}</span>
                </div>
                <div style={{ paddingLeft: 26, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Your answer: <strong style={{ color: q.isCorrect ? '#059669' : '#dc2626' }}>{String(q.studentAnswer ?? '—')}</strong>
                  </div>
                  {!q.isCorrect && (
                    <div style={{ fontSize: 12, color: '#059669' }}>
                      Correct: <strong>{String(q.correct)}</strong>
                    </div>
                  )}
                  {q.explanation && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, padding: '8px 10px', background: '#f8fafc', borderRadius: 7, borderLeft: '3px solid #e8ecf4', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── QUIZ TAKING SCREEN ── */
  if (attempt) {
    const q = quiz.questions[currentQ];
    const mins = Math.floor((timeLeft || 0) / 60);
    const secs = String((timeLeft || 0) % 60).padStart(2, '0');
    const isLow = timeLeft !== null && timeLeft < 60;

    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0a0a1a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{quiz.title}</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Question {currentQ + 1} of {totalQ} · {answeredCount} answered</p>
          </div>
          {timeLeft !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: isLow ? '#fef2f2' : '#f1f4f9', border: `1.5px solid ${isLow ? '#fecaca' : '#e8ecf4'}`, color: isLow ? '#dc2626' : '#374151', fontSize: 14, fontWeight: 800, fontFamily: 'monospace' }}>
              <Clock size={14} />{mins}:{secs}
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${i === currentQ ? '#00A6FF' : answers[quiz.questions[i].id] ? '#10B981' : '#e8ecf4'}`, background: i === currentQ ? '#e6f6ff' : answers[quiz.questions[i].id] ? '#ecfdf5' : '#fff', color: i === currentQ ? '#00A6FF' : answers[quiz.questions[i].id] ? '#10B981' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 16, padding: '24px 24px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Question {currentQ + 1} · {q.marks} mark{q.marks !== 1 ? 's' : ''}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a0a1a', lineHeight: 1.55, marginBottom: 20 }}>{q.text}</p>

          {/* MCQ */}
          {q.type === 'mcq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.options || []).map((opt, oi) => {
                const selected = answers[q.id] === String(oi);
                return (
                  <label
                    key={oi}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${selected ? '#00A6FF' : '#e8ecf4'}`, background: selected ? '#e6f6ff' : '#fafbfc', cursor: 'pointer', fontSize: 14, color: selected ? '#0369a1' : '#374151', fontWeight: selected ? 600 : 400, transition: 'all 0.12s' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? '#00A6FF' : '#c4cdd6'}`, background: selected ? '#00A6FF' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                      {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <input type="radio" name={q.id} value={String(oi)} checked={selected} onChange={() => setAnswers(a => ({ ...a, [q.id]: String(oi) }))} style={{ display: 'none' }} />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {q.type === 'true_false' && (
            <div className="quiz-tf-row" style={{ display: 'flex', gap: 12 }}>
              {['true', 'false'].map(v => {
                const selected = answers[q.id] === v;
                return (
                  <label
                    key={v}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10, border: `1.5px solid ${selected ? '#00A6FF' : '#e8ecf4'}`, background: selected ? '#e6f6ff' : '#fafbfc', cursor: 'pointer', fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? '#0369a1' : '#374151', transition: 'all 0.12s' }}
                  >
                    <input type="radio" name={q.id} value={v} checked={selected} onChange={() => setAnswers(a => ({ ...a, [q.id]: v }))} style={{ display: 'none' }} />
                    {v === 'true' ? 'True' : 'False'}
                  </label>
                );
              })}
            </div>
          )}

          {/* Fill blank / Short answer */}
          {(q.type === 'fill_blank' || q.type === 'short_answer') && (
            <input
              className="input"
              style={{ height: 44, fontSize: 14 }}
              value={answers[q.id] || ''}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder={q.type === 'fill_blank' ? 'Type your answer...' : 'Write a short answer...'}
            />
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            style={{ height: 40, padding: '0 18px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#fff', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontSize: 13, color: '#374151', opacity: currentQ === 0 ? 0.4 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Prev
          </button>

          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {answeredCount}/{totalQ} answered
          </div>

          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ(q => q + 1)}
              style={{ height: 40, padding: '0 18px', borderRadius: 10, background: '#00A6FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ height: 40, padding: '0 20px', borderRadius: 10, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── INTRO SCREEN ── */
  const attemptsLeft = quiz.max_attempts - history.length;
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: '4px 0' }}
      >
        <ChevronLeft size={13} /> Back
      </button>

      <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0a0a1a,#1a1a2e)', padding: '28px 28px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>{quiz.title}</h2>
          {quiz.instructions && (
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{quiz.instructions}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="quiz-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1.5px solid #e8ecf4' }}>
          {[
            ['Questions', totalQ],
            ['Total Marks', quiz.total_marks],
            ['Pass Score', `${quiz.passing_percentage}%`],
            ...(quiz.time_limit ? [['Time Limit', `${Math.floor(quiz.time_limit / 60)}m`]] : []),
            ['Attempts Left', attemptsLeft > 0 ? attemptsLeft : 'None'],
            ['Max Attempts', quiz.max_attempts],
          ].slice(0, 6).map(([label, value]) => (
            <div key={label} style={{ padding: '16px 12px', textAlign: 'center', borderRight: '1px solid #f1f4f9', borderBottom: '1px solid #f1f4f9' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a1a', lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Previous attempts */}
        {history.length > 0 && (
          <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #e8ecf4' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Previous Attempts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f4f9' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Attempt {a.attempt_no}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: a.passed ? '#059669' : '#dc2626' }}>{a.score}%</span>
                    {a.passed
                      ? <CheckCircle size={14} style={{ color: '#10B981' }} />
                      : <XCircle size={14} style={{ color: '#EF4444' }} />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '20px 24px' }}>
          {attemptsLeft <= 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #fecaca' }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Maximum attempts reached. No more attempts allowed.</span>
            </div>
          ) : (
            <>
              {attemptsLeft <= 1 && attemptsLeft > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fffbeb', borderRadius: 9, border: '1.5px solid #fde68a', marginBottom: 14 }}>
                  <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#92400e' }}>This is your last attempt — make it count!</span>
                </div>
              )}
              <button
                onClick={startQuiz}
                style={{ width: '100%', height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#00A6FF,#A020F0)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 16px rgba(0,166,255,0.30)', letterSpacing: '-0.01em' }}
              >
                Start Quiz
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
