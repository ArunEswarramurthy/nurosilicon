import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2,
  XCircle, Trophy, RotateCcw, Send, Cpu, AlertCircle,
  Shuffle, Zap, Flag, BookOpen, Target, Play,
  Maximize2, Minimize2, Download, FileText,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import StudentRequestError, { getStudentRequestError } from '../../components/ui/StudentRequestError';
import { engLabBankApi } from '../../lib/engineeringApi';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// -- Clean white/light palette -------------------------------------------------
const C = {
  bg:       '#f4f6fb',
  surface:  '#ffffff',
  card:     '#ffffff',
  cardHov:  '#f8f9ff',
  border:   '#e4e8f0',
  border2:  '#d1d8e8',
  text:     '#111827',
  sub:      '#6b7280',
  dim:      '#9ca3af',
  brand:    '#6366f1',
  brand2:   '#8b5cf6',
  brandBg:  '#6366f10d',
  brandBdr: '#6366f130',
  green:    '#059669',
  greenBg:  '#ecfdf5',
  greenBdr: '#6ee7b7',
  red:      '#dc2626',
  redBg:    '#fef2f2',
  redBdr:   '#fca5a5',
  yellow:   '#d97706',
  yellowBg: '#fffbeb',
  yellowBdr:'#fcd34d',
  blue:     '#2563eb',
  blueBg:   '#eff6ff',
  blueBdr:  '#93c5fd',
};

const TYPE_COLOR = {
  mcq_single: { bg: C.blueBg,   border: C.blueBdr,   text: C.blue,   label: 'MCQ Single'   },
  mcq_multi:  { bg: '#f5f3ff',  border: '#c4b5fd',   text: C.brand2, label: 'MCQ Multi'    },
  true_false: { bg: C.greenBg,  border: C.greenBdr,  text: C.green,  label: 'True / False' },
  fill_blank: { bg: C.yellowBg, border: C.yellowBdr, text: C.yellow, label: 'Fill Blank'   },
};

const DIFF_COLOR = {
  easy:   { bg: C.greenBg,  border: C.greenBdr,  text: C.green  },
  medium: { bg: C.yellowBg, border: C.yellowBdr, text: C.yellow },
  hard:   { bg: C.redBg,    border: C.redBdr,    text: C.red    },
};

function buildTestSet(allQuestions, cfg) {
  const pool = cfg.questionType && cfg.questionType !== 'all'
    ? allQuestions.filter((q) => q.type === cfg.questionType)
    : allQuestions;
  if (cfg.mode === 'random') {
    const n = Math.min(cfg.count, pool.length);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  }
  const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
  return [
    ...pick(pool.filter((q) => q.difficulty === 'easy'),   cfg.easy),
    ...pick(pool.filter((q) => q.difficulty === 'medium'), cfg.medium),
    ...pick(pool.filter((q) => q.difficulty === 'hard'),   cfg.hard),
  ].sort(() => Math.random() - 0.5);
}

// -- Result Screen -------------------------------------------------------------
function ResultScreen({ questions, answers, bank, onRetry, onBack, timeTaken, attempt }) {
  const [showReview, setShowReview] = useState(true);
  const resultsByQuestion = new Map((attempt?.results || []).map((result) => [result.question_id, result]));
  const scored   = questions.map((q) => ({ q, correct: resultsByQuestion.get(q.id)?.correct === true }));
  const correct  = attempt.correct_count;
  const total    = attempt.total_questions;
  const marks    = attempt.score;
  const maxMarks = attempt.max_score;
  const pct      = attempt.score_percent;
  const now      = new Date();
  const completedStr = now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  const timeFmt  = timeTaken != null ? `${String(Math.floor(timeTaken/3600)).padStart(2,'0')}:${String(Math.floor((timeTaken%3600)/60)).padStart(2,'0')}:${String(timeTaken%60).padStart(2,'0')}` : '00:00:00';

  const grade = pct >= 90 ? { label: 'Excellent!',   sub: 'Outstanding performance! Keep it up.', color: '#059669', bg: '#ecfdf5', bdr: '#6ee7b7' }
              : pct >= 70 ? { label: 'Good Job!',     sub: 'Well done, keep it up!',               color: '#6366f1', bg: '#eef2ff', bdr: '#c7d2fe' }
              : pct >= 50 ? { label: 'Keep Going!',   sub: "You're getting there! Keep practicing.", color: '#d97706', bg: '#fffbeb', bdr: '#fcd34d' }
              :             { label: 'Need Practice', sub: "Don't worry! Keep practicing and you'll improve.", color: '#dc2626', bg: '#fef2f2', bdr: '#fca5a5' };

  const downloadPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const gradeColor = grade.color;
    const optionRow = (opt, oi, userAnswer, qType) => {
      const isSel  = qType === 'mcq_multi' ? (userAnswer || []).includes(opt.id) : userAnswer === opt.id;
      const isRight = opt.is_correct;
      const bg    = isRight ? '#ecfdf5' : isSel ? '#fef2f2' : '#f9fafb';
      const border = isRight ? '#6ee7b7' : isSel ? '#fca5a5' : '#e5e7eb';
      const color  = isRight ? '#059669' : isSel ? '#dc2626' : '#374151';
      const icon   = isRight ? '✓' : isSel ? '✗' : String.fromCharCode(65 + oi);
      const iconBg = isRight ? '#059669' : isSel ? '#dc2626' : '#e5e7eb';
      const iconColor = (isRight || isSel) ? '#fff' : '#6b7280';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:${bg};border:1px solid ${border};margin-bottom:6px">
          <span style="width:22px;height:22px;border-radius:6px;background:${iconBg};color:${iconColor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${icon}</span>
          <span style="font-size:13px;color:${color};font-weight:${isRight || isSel ? 600 : 400}">${opt.option_text}</span>
        </div>`;
    };

    const questionBlocks = scored.map(({ q, correct: isCorrect }, idx) => {
      const userAnswer = answers[q.id];
      const tc = TYPE_COLOR[q.type] || TYPE_COLOR.mcq_single;
      const dc = DIFF_COLOR[q.difficulty] || DIFF_COLOR.medium;
      const borderColor = isCorrect ? '#6ee7b7' : '#fca5a5';
      const leftColor   = isCorrect ? '#059669' : '#dc2626';
      const statusBg    = isCorrect ? '#ecfdf5' : '#fef2f2';
      const statusColor = isCorrect ? '#059669' : '#dc2626';
      const statusText  = isCorrect ? '✓ Correct' : '✗ Wrong';

      let answerBlock = '';
      if (q.type === 'fill_blank') {
        answerBlock = `
          <div style="margin-top:10px;padding:10px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
            <span style="font-size:12px;color:#6b7280">Your answer: </span>
            <span style="font-size:12px;font-weight:700;color:${isCorrect ? '#059669' : '#dc2626'}">${userAnswer || '(blank)'}</span>
            ${!isCorrect ? `<br><span style="font-size:12px;color:#6b7280">Correct: </span><span style="font-size:12px;font-weight:700;color:#059669">${q.answer_text || q.options?.[0]?.option_text || ''}</span>` : ''}
          </div>`;
      } else if (q.options?.length) {
        answerBlock = `<div style="margin-top:10px">${q.options.map((opt, oi) => optionRow(opt, oi, userAnswer, q.type)).join('')}</div>`;
      }

      const explanationBlock = q.explanation
        ? `<div style="margin-top:10px;padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #93c5fd;font-size:12px;color:#1d4ed8"><strong>Explanation:</strong> ${q.explanation}</div>`
        : '';

      return `
        <div style="margin-bottom:16px;border:1px solid ${borderColor};border-radius:14px;padding:16px;border-left:4px solid ${leftColor};page-break-inside:avoid">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:700;color:#6b7280">Q${idx + 1}</span>
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}">${tc.label}</span>
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${dc.bg};color:${dc.text};border:1px solid ${dc.border};text-transform:capitalize">${q.difficulty}</span>
                <span style="font-size:10px;color:#6b7280;padding:2px 8px;border-radius:20px;background:#f9fafb;border:1px solid #e5e7eb">${q.marks}m</span>
              </div>
              <p style="font-size:14px;font-weight:600;color:#111827;margin:0;line-height:1.6">${q.title}</p>
            </div>
            <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${statusBg};color:${statusColor};white-space:nowrap;flex-shrink:0">${statusText}</span>
          </div>
          ${answerBlock}
          ${explanationBlock}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${bank?.name || 'Test'} - Result</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Inter, system-ui, sans-serif; background: #f4f6fb; color: #111827; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;padding:32px 24px">

  <!-- Header Banner -->
  <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);border-radius:20px;padding:32px;margin-bottom:24px;position:relative;overflow:hidden">
    <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08)"></div>
    <div style="position:absolute;bottom:-30px;left:80px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.06)"></div>
    <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px">
      <div>
        <p style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">NuroSilicon - Test Result</p>
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:4px;line-height:1.3">${bank?.name || 'Test Result'}</h1>
        <p style="font-size:12px;color:rgba(255,255,255,0.65)">${dateStr} &nbsp;·&nbsp; ${timeStr}</p>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:16px;padding:16px 24px;flex-shrink:0">
        <p style="font-size:48px;font-weight:900;color:#fff;line-height:1;margin-bottom:4px">${pct}%</p>
        <p style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;text-transform:uppercase;letter-spacing:1px">${grade.label}</p>
      </div>
    </div>
  </div>

  <!-- Stats Row -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${[
      { label: 'Score',    value: `${marks.toFixed(1)}/${maxMarks}`, color: '#6366f1', bg: '#eef2ff', bdr: '#c7d2fe' },
      { label: 'Correct',  value: correct,                           color: '#059669', bg: '#ecfdf5', bdr: '#6ee7b7' },
      { label: 'Wrong',    value: total - correct,                   color: '#dc2626', bg: '#fef2f2', bdr: '#fca5a5' },
      { label: 'Total Qs', value: total,                             color: '#d97706', bg: '#fffbeb', bdr: '#fcd34d' },
    ].map(({ label, value, color, bg, bdr }) =>
      `<div style="background:${bg};border:1px solid ${bdr};border-radius:14px;padding:16px 12px;text-align:center">
        <p style="font-size:26px;font-weight:900;color:${color};margin-bottom:3px;line-height:1">${value}</p>
        <p style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;opacity:0.8">${label}</p>
      </div>`
    ).join('')}
  </div>

  <!-- Section Title -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
    <div style="flex:1;height:1px;background:#e5e7eb"></div>
    <span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap">Question Breakdown</span>
    <div style="flex:1;height:1px;background:#e5e7eb"></div>
  </div>

  <!-- Questions -->
  ${questionBlocks}

  <!-- Footer -->
  <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;text-align:center">
    <p style="font-size:11px;color:#9ca3af">Generated by <strong style="color:#6366f1">NuroSilicon Platform</strong> &nbsp;·&nbsp; ${dateStr} ${timeStr}</p>
  </div>

</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  // radial progress circle
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <div style={{ background: '#f4f6fb', fontFamily: 'Inter,system-ui,sans-serif', paddingBottom: 80, margin: '-16px -20px' }}>

      {/* ── HERO CARD ── */}
      <div style={{ background: '#fff', borderRadius: 20, margin: '16px 24px 16px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e8ecf4', position: 'relative', overflow: 'hidden' }}>
        {/* bg blobs */}
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background: grade.color + '0d', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, left:60, width:100, height:100, borderRadius:'50%', background: grade.color + '08', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
          {/* Left: icon + text */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:16, flex:1, minWidth:220 }}>
            <div style={{ width:56, height:56, borderRadius:16, background: grade.bg, border:`1.5px solid ${grade.bdr}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={grade.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize:22, fontWeight:900, color: grade.color, margin:'0 0 4px', letterSpacing:'-0.3px' }}>{grade.label}</h2>
              <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 10px', lineHeight:1.5 }}>{grade.sub}</p>
              {/* bank + tags */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                {bank?.name && <span style={{ fontSize:11, fontWeight:700, color:'#374151', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:99, padding:'2px 10px' }}>{bank.name}</span>}
                {questions[0] && (() => { const tc = TYPE_COLOR[questions[0].type] || TYPE_COLOR.mcq_single; return <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:tc.bg, color:tc.text, border:`1px solid ${tc.border}` }}>{tc.label}</span>; })()}
                {questions[0]?.difficulty && (() => { const dc = DIFF_COLOR[questions[0].difficulty] || DIFF_COLOR.medium; return <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:dc.bg, color:dc.text, border:`1px solid ${dc.border}`, textTransform:'capitalize' }}>{questions[0].difficulty}</span>; })()}
                <span style={{ fontSize:11, fontWeight:600, color:'#6b7280', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:99, padding:'2px 9px' }}>{maxMarks} mark{maxMarks !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:'#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Completed {completedStr}
                </span>
                <span style={{ fontSize:11, color:'#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={11} /> Time Taken: {timeFmt}
                </span>
              </div>
            </div>
          </div>

          {/* Right: radial score */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, flexShrink:0 }}>
            <svg width={140} height={140} style={{ transform:'rotate(-90deg)' }}>
              <circle cx={70} cy={70} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
              <circle cx={70} cy={70} r={r} fill="none" stroke={grade.color} strokeWidth={10}
                strokeDasharray={circ} strokeDashoffset={dash}
                strokeLinecap="round"
                style={{ transition:'stroke-dashoffset 1s ease' }} />
            </svg>
            <div style={{ position:'relative', marginTop:-110, marginBottom:60, textAlign:'center', pointerEvents:'none' }}>
              <p style={{ fontSize:32, fontWeight:900, color:'#111827', margin:0, lineHeight:1 }}>{pct}%</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0', fontWeight:600, textTransform:'uppercase', letterSpacing:0.8 }}>Score</p>
            </div>
            {/* legend */}
            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:130 }}>
              {[
                { dot:'#059669', label:`${correct} Correct Answers` },
                { dot:'#dc2626', label:`${total - correct} Wrong Answers` },
                { dot:'#6366f1', label:`${marks.toFixed(1)}/${maxMarks} Total Marks` },
              ].map(({ dot, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:dot, flexShrink:0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div style={{ background:'#fff', borderRadius:16, margin:'0 24px 16px', border:'1px solid #e8ecf4', boxShadow:'0 1px 6px rgba(0,0,0,0.04)', display:'flex', flexWrap:'wrap', overflow:'hidden' }}>
        {[
          { label:'Total Questions', value: total,                    color:'#374151', Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          { label:'Correct Answers',  value: correct,                  color:'#059669', Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> },
          { label:'Wrong Answers',    value: total - correct,          color:'#dc2626', Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
          { label:'Marks Scored',     value:`${marks.toFixed(1)}/${maxMarks}`, color:'#6366f1', Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg> },
          { label:'Time Taken',       value: timeFmt,                  color:'#d97706', Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
        ].map(({ Icon, label, value, color }, i, arr) => (
          <div key={label} style={{ flex:1, minWidth:100, padding:'16px 14px', borderRight: i < arr.length-1 ? '1px solid #f3f4f6' : 'none', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color }}><Icon /></span>
            <div>
              <p style={{ fontSize:18, fontWeight:800, color, margin:0, lineHeight:1 }}>{value}</p>
              <p style={{ fontSize:10, color:'#9ca3af', margin:'3px 0 0', fontWeight:500 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── QUESTION-WISE PERFORMANCE ── */}
      <div style={{ background:'#fff', borderRadius:16, margin:'0 24px 16px', border:'1px solid #e8ecf4', boxShadow:'0 1px 6px rgba(0,0,0,0.04)', padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <p style={{ fontSize:14, fontWeight:700, color:'#111827', margin:0 }}>Question-wise Performance</p>
          <div style={{ display:'flex', gap:14 }}>
            {[{ dot:'#059669', label:'Correct' }, { dot:'#dc2626', label:'Wrong' }, { dot:'#9ca3af', label:'Not Visited' }].map(({ dot, label }) => (
              <span key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6b7280' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:dot }} />{label}
                {label === 'Correct' && ` (${correct})`}
                {label === 'Wrong' && ` (${total - correct})`}
                {label === 'Not Visited' && ` (${total - Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '' && (Array.isArray(answers[k]) ? answers[k].length > 0 : true)).length})`}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {scored.map(({ q, correct: isCorrect }, idx) => {
            const answered = answers[q.id] !== undefined && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true);
            const bg = isCorrect ? '#059669' : answered ? '#dc2626' : '#e5e7eb';
            const fg = answered ? '#fff' : '#9ca3af';
            return (
              <div key={q.id} style={{ width:32, height:32, borderRadius:8, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, cursor:'pointer' }}
                title={q.title}>
                {idx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MOTIVATIONAL BANNER ── */}
      <div style={{ background:'linear-gradient(135deg,#f0f4ff,#faf5ff)', borderRadius:16, margin:'0 24px 80px', border:'1px solid #e0e7ff', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#4f46e5', margin:'0 0 4px' }}>{grade.label}</p>
          <p style={{ fontSize:12, color:'#6b7280', margin:0, lineHeight:1.5 }}>Review the solutions, identify your mistakes, and practice more questions to improve your score.</p>
        </div>
        <div style={{ width:48, height:48, borderRadius:12, background:'#eef2ff', border:'1px solid #c7d2fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
      </div>

      {/* ── ANSWER REVIEW ── */}
      {showReview && (
        <div style={{ margin:'0 24px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {scored.map(({ q, correct: isCorrect }, idx) => {
            const userAnswer = answers[q.id];
            const tc = TYPE_COLOR[q.type] || TYPE_COLOR.mcq_single;
            return (
              <div key={q.id} style={{ background:'#fff', border:`1px solid ${isCorrect ? '#6ee7b7' : '#fca5a5'}`, borderRadius:14, padding:16, borderLeft:`4px solid ${isCorrect ? '#059669' : '#dc2626'}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                  {isCorrect ? <CheckCircle2 size={16} style={{ color:'#059669', flexShrink:0, marginTop:2 }} /> : <XCircle size={16} style={{ color:'#dc2626', flexShrink:0, marginTop:2 }} />}
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'0 0 6px' }}>{idx + 1}. {q.title}</p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:tc.bg, color:tc.text, border:`1px solid ${tc.border}` }}>{tc.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background: isCorrect ? '#ecfdf5' : '#fef2f2', color: isCorrect ? '#059669' : '#dc2626', border:`1px solid ${isCorrect ? '#6ee7b7' : '#fca5a5'}` }}>{isCorrect ? `+${q.marks}m` : '0m'}</span>
                    </div>
                  </div>
                </div>
                {q.type !== 'fill_blank' && q.options?.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginLeft:26 }}>
                    {q.options.map((opt) => {
                      const isSel = q.type === 'mcq_multi' ? (userAnswer || []).includes(opt.id) : userAnswer === opt.id;
                      const isRight = opt.is_correct;
                      return (
                        <div key={opt.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:8, fontSize:12, background: isRight ? '#ecfdf5' : isSel ? '#fef2f2' : '#f9fafb', border:`1px solid ${isRight ? '#6ee7b7' : isSel ? '#fca5a5' : '#e5e7eb'}`, color: isRight ? '#059669' : isSel ? '#dc2626' : '#6b7280' }}>
                          {isRight ? <CheckCircle2 size={11} /> : isSel ? <XCircle size={11} /> : <span style={{ width:11 }} />}
                          {opt.option_text}
                        </div>
                      );
                    })}
                  </div>
                )}
                {q.type === 'fill_blank' && (
                  <div style={{ marginLeft:26, display:'flex', flexDirection:'column', gap:4 }}>
                    <p style={{ fontSize:12, color:'#6b7280' }}>Your answer: <span style={{ fontWeight:700, color: isCorrect ? '#059669' : '#dc2626' }}>{userAnswer || '(blank)'}</span></p>
                    {!isCorrect && <p style={{ fontSize:12, color:'#6b7280' }}>Correct: <span style={{ fontWeight:700, color:'#059669' }}>{q.answer_text || q.options?.[0]?.option_text}</span></p>}
                  </div>
                )}
                {q.explanation && (
                  <div style={{ marginLeft:26, marginTop:8, background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#1d4ed8' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #e8ecf4', padding:'12px 24px', display:'flex', gap:10, alignItems:'center', boxShadow:'0 -4px 20px rgba(0,0,0,0.06)', zIndex:100 }}>
        <button onClick={onRetry} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <RotateCcw size={14} /> Retry Test
        </button>
        <button onClick={downloadPDF} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <FileText size={14} /> Download PDF
        </button>
        <button onClick={() => setShowReview(v => !v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <BookOpen size={14} /> {showReview ? 'Hide' : 'Show'} Answer Review
        </button>
        <button onClick={onBack} style={{ flex:1.4, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>
          <ChevronLeft size={14} /> Back to Bank
        </button>
      </div>
    </div>
  );
}

// -- Config Screen removed - config is now on the bank detail page -------------
// Kept as minimal fallback for direct URL access
function ConfigScreen({ bank, allQuestions, cfg, setCfg, onStart, onBack }) {
  const easy   = allQuestions.filter((q) => q.difficulty === 'easy').length;
  const medium = allQuestions.filter((q) => q.difficulty === 'medium').length;
  const hard   = allQuestions.filter((q) => q.difficulty === 'hard').length;
  const total  = allQuestions.length;
  const setC   = (k, v) => setCfg((f) => ({ ...f, [k]: v }));
  const testCount = cfg.mode === 'random' ? Math.min(cfg.count, total) : cfg.easy + cfg.medium + cfg.hard;
  const estMins   = Math.ceil((testCount * cfg.secPerQ) / 60);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.brand},${C.brand2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={15} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bank?.name}</p>
              {bank?.description && <p style={{ fontSize: 11, color: C.sub, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bank.description}</p>}
            </div>
          </div>
          <button onClick={onBack} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[{ label: 'Easy', value: easy, color: C.green, bg: C.greenBg, bdr: C.greenBdr }, { label: 'Medium', value: medium, color: C.yellow, bg: C.yellowBg, bdr: C.yellowBdr }, { label: 'Hard', value: hard, color: C.red, bg: C.redBg, bdr: C.redBdr }].map(({ label, value, color, bg, bdr }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 26, fontWeight: 900, color, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 10, color, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Test Mode</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{ mode: 'random', icon: Shuffle, title: 'Random', sub: 'Pick N random Qs' }, { mode: 'custom', icon: Zap, title: 'Custom', sub: 'Set difficulty mix' }].map(({ mode, icon: Icon, title, sub }) => (
                <button key={mode} onClick={() => setC('mode', mode)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `2px solid ${cfg.mode === mode ? C.brand : C.border}`, background: cfg.mode === mode ? C.brandBg : C.surface, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.mode === mode ? C.brandBg : C.bg, border: `1px solid ${cfg.mode === mode ? C.brandBdr : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} style={{ color: cfg.mode === mode ? C.brand : C.dim }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: cfg.mode === mode ? C.brand : C.text }}>{title}</p>
                    <p style={{ fontSize: 10, margin: 0, color: C.dim }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {cfg.mode === 'random' && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>Questions</p>
                <span style={{ fontSize: 24, fontWeight: 900, color: C.brand }}>{Math.min(cfg.count, total)}</span>
              </div>
              <input type="range" min={1} max={total} value={cfg.count} onChange={(e) => setC('count', parseInt(e.target.value))} style={{ width: '100%', accentColor: C.brand, marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[5, 10, 15, 20, total].filter((v, i, a) => a.indexOf(v) === i && v <= total).map((n) => (
                  <button key={n} onClick={() => setC('count', n)} style={{ padding: '4px 12px', borderRadius: 7, border: `1.5px solid ${cfg.count === n ? C.brand : C.border}`, background: cfg.count === n ? C.brand : C.surface, color: cfg.count === n ? '#fff' : C.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {n === total ? 'All' : n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {cfg.mode === 'custom' && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Difficulty Mix</p>
              {[{ key: 'easy', label: 'Easy', max: easy, color: C.green }, { key: 'medium', label: 'Medium', max: medium, color: C.yellow }, { key: 'hard', label: 'Hard', max: hard, color: C.red }].map(({ key, label, max, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, width: 48, flexShrink: 0 }}>{label}</span>
                  <input type="range" min={0} max={max} value={cfg[key]} onChange={(e) => setC(key, parseInt(e.target.value))} style={{ flex: 1, accentColor: color }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color, width: 22, textAlign: 'right' }}>{cfg[key]}</span>
                  <span style={{ fontSize: 10, color: C.dim, width: 24 }}>/{max}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.sub }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.brand }}>{cfg.easy + cfg.medium + cfg.hard}</span>
              </div>
            </div>
          )}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={10} /> Time per Question</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[30, 60, 90, 120, 180].map((s) => (
                <button key={s} onClick={() => setC('secPerQ', s)} style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${cfg.secPerQ === s ? C.brand : C.border}`, background: cfg.secPerQ === s ? C.brand : C.surface, color: cfg.secPerQ === s ? '#fff' : C.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: `linear-gradient(135deg,${C.brandBg},#f5f3ff)`, border: `1px solid ${C.brandBdr}`, borderRadius: 14, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[{ label: 'Questions', value: testCount, color: C.brand }, { label: 'Duration', value: `~${estMins}m`, color: C.green }, { label: 'Sec / Q', value: `${cfg.secPerQ}s`, color: C.yellow }].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
                <p style={{ fontSize: 9, color: C.dim, margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={onStart} disabled={testCount === 0}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: testCount === 0 ? C.border : `linear-gradient(135deg,${C.brand},${C.brand2})`, color: testCount === 0 ? C.dim : '#fff', fontWeight: 800, fontSize: 14, cursor: testCount === 0 ? 'not-allowed' : 'pointer', boxShadow: testCount === 0 ? 'none' : `0 6px 20px ${C.brand}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Play size={15} /> {testCount === 0 ? 'Select at least 1 question' : `Start Test - ${testCount} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Main Export ---------------------------------------------------------------
export default function EngLabTestPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const stateData = location.state;

  const [bank, setBank]           = useState(stateData?.bank || null);
  const [allQuestions, setAllQ]   = useState(stateData?.allQ || []);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(!stateData);
  const [phase, setPhase]         = useState(stateData ? 'test' : 'config');
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState({});
  const [timeLeft, setTimeLeft]   = useState(0);
  const [timeTaken, setTimeTaken]  = useState(0);
  const [flagged, setFlagged]     = useState({});
  const [attemptResult, setAttemptResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cfg, setCfg] = useState(stateData?.cfg || { mode: 'random', count: 10, easy: 3, medium: 4, hard: 3, secPerQ: 90 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const submissionInFlight = useRef(false);

  // Fullscreen helpers
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) enterFullscreen();
    else exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  useEffect(() => {
    if (stateData?.allQ && stateData?.cfg) {
      const qs = buildTestSet(stateData.allQ, stateData.cfg);
      setQuestions(qs);
      setTimeLeft(qs.length * stateData.cfg.secPerQ);
      setTimeTaken(0);
      setPhase('test');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBank = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await engLabBankApi.get(id);
      setBank(data.bank);
      setAllQ(data.questions || []);
      setPhase('ready');
    } catch (error) {
      setLoadError(getStudentRequestError(error, 'Could not load this practice bank. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!stateData) loadBank();
  }, [loadBank, stateData]);

  const finishTest = useCallback(async (currentAnswers, currentQuestions, elapsed) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await engLabBankApi.submitAttempt(id, {
        question_ids: currentQuestions.map((question) => question.id),
        answers: currentAnswers,
        elapsed_seconds: elapsed,
      });
      const resultsByQuestion = new Map(data.results.map((result) => [result.question_id, result]));
      const reviewedQuestions = currentQuestions.map((question) => {
        const result = resultsByQuestion.get(question.id);
        const correctOptionIds = new Set(result.correct_option_ids);
        return {
          ...question,
          answer_text: result.correct_answer_text,
          explanation: result.explanation,
          options: (question.options || []).map((option) => ({
            ...option,
            is_correct: correctOptionIds.has(option.id),
          })),
        };
      });
      setAttemptResult(data);
      setQuestions(reviewedQuestions);
      setTimeTaken(data.elapsed_seconds);
      setPhase('result');
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Could not submit the test. Please try again.');
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }, [id]);

  const submitTest = useCallback(() => {
    exitFullscreen();
    const elapsed = Math.max(0, questions.length * cfg.secPerQ - timeLeft + (timeLeft <= 1 ? 1 : 0));
    finishTest(answers, questions, elapsed);
  }, [answers, cfg.secPerQ, finishTest, questions, timeLeft]);

  useEffect(() => {
    if (phase !== 'test' || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => {
      if (s <= 1) { clearInterval(t); submitTest(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, submitTest, timeLeft]);

  const setAnswer   = useCallback((qId, val) => setAnswers((p) => ({ ...p, [qId]: val })), []);
  const toggleMulti = useCallback((qId, optId) => setAnswers((p) => {
    const cur = p[qId] || [];
    return { ...p, [qId]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
  }), []);

  const startTest = () => {
    const qs = buildTestSet(allQuestions, cfg);
    if (!qs.length) return;
    setQuestions(qs); setAnswers({}); setFlagged({});
    setAttemptResult(null); setSubmitError(''); setSubmitting(false); submissionInFlight.current = false;
    setCurrent(0);     setTimeLeft(qs.length * cfg.secPerQ);
    setTimeTaken(0);
    setPhase('test');
  };

  const handleRetry = () => {
    const qs = buildTestSet(allQuestions, cfg);
    setQuestions(qs); setAnswers({}); setFlagged({});
    setAttemptResult(null); setSubmitError(''); setSubmitting(false); submissionInFlight.current = false;
    setCurrent(0); setTimeLeft(qs.length * cfg.secPerQ);
    setTimeTaken(0);
    setPhase('test');
    enterFullscreen();
  };

  const goBack = () => {
    exitFullscreen();
    stateData ? navigate(-1) : navigate(`/student/eng-lab-banks/${id}`);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size="lg" />
    </div>
  );

  if (loadError) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <StudentRequestError message={loadError} onRetry={loadBank} retrying={loading} />
      <button onClick={goBack} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontWeight: 700, cursor: 'pointer' }}>
        Go Back
      </button>
    </div>
  );

  if (!allQuestions.length) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: C.sub }}>
      <Cpu size={48} style={{ opacity: 0.2 }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No questions in this bank yet.</p>
      <button onClick={goBack} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: C.brand, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  if (phase === 'ready') return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, color: C.sub }}>
      <BookOpen size={44} color={C.brand} />
      <h1 style={{ margin: 0, color: C.text, fontSize: 24 }}>{bank?.name || 'Practice bank'}</h1>
      <p style={{ maxWidth: 480, margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
        This practice contains {allQuestions.length} question{allQuestions.length === 1 ? '' : 's'}. Your timer starts when you choose to begin. Your answers are submitted to the server for grading.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={goBack} style={{ padding: '11px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontWeight: 700, cursor: 'pointer' }}>
          Go Back
        </button>
        <button onClick={startTest} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.brand}, ${C.brand2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Start Practice
        </button>
      </div>
    </div>
  );

  if (phase === 'result') return (
    <ResultScreen questions={questions} answers={answers} bank={bank} onRetry={handleRetry} onBack={goBack} timeTaken={timeTaken} attempt={attemptResult} />
  );

  if (!questions.length) return null;

  const q         = questions[current];
  const curAnswer = answers[q.id];
  const isMulti   = q.type === 'mcq_multi';
  const isFill    = q.type === 'fill_blank';
  const answered  = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a !== undefined && a !== '' && (Array.isArray(a) ? a.length > 0 : true);
  }).length;
  const pctDone   = Math.round((answered / questions.length) * 100);
  const timerPct  = (timeLeft / (questions.length * cfg.secPerQ)) * 100;
  const timerCrit = timeLeft < 20;
  const timerWarn = timeLeft < 60;
  const timerColor = timerCrit ? C.red : timerWarn ? C.yellow : C.brand;
  const timerBg    = timerCrit ? C.redBg : timerWarn ? C.yellowBg : C.brandBg;
  const timerBdr   = timerCrit ? C.redBdr : timerWarn ? C.yellowBdr : C.brandBdr;
  const tc = TYPE_COLOR[q.type] || TYPE_COLOR.mcq_single;
  const dc = DIFF_COLOR[q.difficulty] || DIFF_COLOR.medium;


  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#f4f6fb', fontFamily:'Inter,system-ui,sans-serif', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{ flexShrink:0, background:'#1e1b4b', padding:'0 20px', height:52, display:'flex', alignItems:'center', gap:16, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        {/* Logo + bank */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'#fff', fontSize:12, fontWeight:900 }}>N</span>
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bank?.name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
              <div style={{ width:120, height:3, background:'rgba(255,255,255,0.15)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pctDone}%`, background:'linear-gradient(90deg,#818cf8,#a78bfa)', borderRadius:99, transition:'width 0.4s' }} />
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>{answered}/{questions.length} answered</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:8, background: timerCrit ? 'rgba(220,38,38,0.15)' : timerWarn ? 'rgba(217,119,6,0.15)' : 'rgba(99,102,241,0.15)', border:`1px solid ${timerCrit ? 'rgba(220,38,38,0.4)' : timerWarn ? 'rgba(217,119,6,0.4)' : 'rgba(99,102,241,0.4)'}` }}>
          <Clock size={13} style={{ color: timerCrit ? '#f87171' : timerWarn ? '#fbbf24' : '#818cf8' }} />
          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color: timerCrit ? '#f87171' : timerWarn ? '#fbbf24' : '#c7d2fe', letterSpacing:1.5 }}>{fmt(timeLeft)}</span>
        </div>

        {/* Submit */}
        <button onClick={submitTest} disabled={submitting}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:submitting ? 'wait' : 'pointer', flexShrink:0, opacity:submitting ? 0.7 : 1 }}>
          <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Test'}
        </button>

        {/* Close / fullscreen */}
        <button onClick={toggleFullscreen}
          style={{ width:30, height:30, borderRadius:7, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

        {/* LEFT: Question */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px 80px', background:'#f4f6fb' }}>
          <div style={{ maxWidth:700, margin:'0 auto' }}>
            {submitError && (
              <div role="alert" style={{ marginBottom:12, padding:'10px 14px', borderRadius:9, background:C.redBg, border:`1px solid ${C.redBdr}`, color:C.red, fontSize:13 }}>
                {submitError}
              </div>
            )}

            {/* Question meta */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>Question {current+1} of {questions.length}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:tc.bg, color:tc.text, border:`1px solid ${tc.border}` }}>{tc.label}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:dc.bg, color:dc.text, border:`1px solid ${dc.border}`, textTransform:'capitalize' }}>{q.difficulty}</span>
                <span style={{ fontSize:11, color:'#6b7280', padding:'2px 9px', borderRadius:99, background:'#f3f4f6', border:'1px solid #e5e7eb' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => setFlagged(f => ({ ...f, [q.id]: !f[q.id] }))}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:`1px solid ${flagged[q.id] ? '#fcd34d' : '#e5e7eb'}`, background:flagged[q.id] ? '#fffbeb' : '#fff', color:flagged[q.id] ? '#d97706' : '#6b7280', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <Flag size={12} /> {flagged[q.id] ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {/* Question card */}
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'20px 22px', marginBottom:16, borderLeft:'4px solid #6366f1', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize:15, fontWeight:600, color:'#111827', lineHeight:1.7, margin:0 }}>{q.title}</p>
              {q.body && (
                <div style={{ marginTop:12, background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#475569', lineHeight:1.7 }}
                  dangerouslySetInnerHTML={{ __html: q.body }} />
              )}
            </div>

            {/* Fill blank */}
            {isFill && (
              <input style={{ width:'100%', padding:'13px 16px', borderRadius:10, border:`2px solid ${curAnswer ? '#6366f1' : '#e5e7eb'}`, background:'#fff', color:'#111827', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                placeholder="Type your answer here..."
                value={curAnswer || ''}
                onChange={e => setAnswer(q.id, e.target.value)} />
            )}

            {/* Options */}
            {!isFill && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {isMulti && (
                  <p style={{ fontSize:12, color:'#6b7280', display:'flex', alignItems:'center', gap:5, margin:'0 0 4px' }}>
                    <AlertCircle size={12} /> Select all correct options
                  </p>
                )}
                {q.options?.map((opt, oi) => {
                  const isSelected = isMulti ? (curAnswer || []).includes(opt.id) : curAnswer === opt.id;
                  return (
                    <button key={opt.id} onClick={() => isMulti ? toggleMulti(q.id, opt.id) : setAnswer(q.id, opt.id)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:10, border:`1.5px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`, background:isSelected ? '#eef2ff' : '#fff', color:isSelected ? '#3730a3' : '#374151', fontSize:14, fontWeight:isSelected ? 600 : 400, textAlign:'left', cursor:'pointer', transition:'all 0.15s', width:'100%', boxShadow:isSelected ? '0 2px 8px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <span style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:isSelected ? '#6366f1' : '#f3f4f6', color:isSelected ? '#fff' : '#6b7280', border:`1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`, transition:'all 0.15s' }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span style={{ flex:1 }}>{opt.option_text}</span>
                      {isSelected && <CheckCircle2 size={16} style={{ color:'#6366f1', flexShrink:0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Navigator */}
        <aside style={{ width:210, flexShrink:0, background:'#fff', borderLeft:'1px solid #e5e7eb', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
            {['Questions','Summary'].map((tab, ti) => (
              <div key={tab} style={{ flex:1, padding:'11px 0', textAlign:'center', fontSize:12, fontWeight:700, color: ti===0 ? '#6366f1' : '#9ca3af', borderBottom: ti===0 ? '2px solid #6366f1' : '2px solid transparent', cursor:'pointer' }}>{tab}</div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
            {[
              { dot:'#6366f1', label:'All',      value: questions.length },
              { dot:'#059669', label:'Answered',  value: answered },
              { dot:'#d97706', label:'Flagged',   value: Object.values(flagged).filter(Boolean).length },
              { dot:'#9ca3af', label:'Not Ans',   value: questions.length - answered },
            ].map(({ dot, label, value }) => (
              <div key={label} style={{ padding:'8px 2px', textAlign:'center' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:dot, margin:'0 auto 3px' }} />
                <p style={{ fontSize:14, fontWeight:800, color:'#111827', margin:0, lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:9, color:'#9ca3af', margin:'2px 0 0', lineHeight:1 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 10px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5 }}>
              {questions.map((qq, i) => {
                const isAns = answers[qq.id] !== undefined && answers[qq.id] !== '' && (Array.isArray(answers[qq.id]) ? answers[qq.id].length > 0 : true);
                const isCur = i === current;
                const isFlg = flagged[qq.id];
                return (
                  <button key={qq.id} onClick={() => setCurrent(i)}
                    style={{ height:30, borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
                      border:`1.5px solid ${isCur ? '#6366f1' : isFlg ? '#fcd34d' : isAns ? '#6ee7b7' : '#e5e7eb'}`,
                      background: isCur ? '#6366f1' : isFlg ? '#fef3c7' : isAns ? '#dcfce7' : '#f9fafb',
                      color: isCur ? '#fff' : isFlg ? '#92400e' : isAns ? '#065f46' : '#6b7280' }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #e5e7eb', flexShrink:0 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#374151', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.8 }}>Legend</p>
            {[
              { bg:'#f9fafb', border:'#e5e7eb', label:'Not Visited' },
              { bg:'#eef2ff', border:'#6366f1', label:'Current Question' },
              { bg:'#dcfce7', border:'#6ee7b7', label:'Answered' },
              { bg:'#fef3c7', border:'#fcd34d', label:'Flagged' },
            ].map(({ bg, border, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'#374151', marginBottom:4 }}>
                <span style={{ width:16, height:16, borderRadius:4, background:bg, border:`1.5px solid ${border}`, flexShrink:0 }} />
                {label}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ flexShrink:0, background:'#fff', borderTop:'1px solid #e5e7eb', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, boxShadow:'0 -2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setCurrent(c => Math.max(0, c-1))} disabled={current === 0}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', color: current===0 ? '#d1d5db' : '#374151', fontWeight:600, fontSize:13, cursor: current===0 ? 'not-allowed' : 'pointer' }}>
          <ChevronLeft size={14} /> Previous
        </button>

        <div style={{ display:'flex', gap:5 }}>
          {[Math.max(0, current-1), current, Math.min(questions.length-1, current+1)]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(i => (
              <button key={i} onClick={() => setCurrent(i)}
                style={{ width:32, height:32, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:`1.5px solid ${i===current ? '#6366f1' : '#e5e7eb'}`, background: i===current ? '#6366f1' : '#fff', color: i===current ? '#fff' : '#6b7280' }}>
                {i + 1}
              </button>
            ))}
        </div>

        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(c => c+1)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={submitTest} disabled={submitting}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontWeight:700, fontSize:13, cursor:submitting ? 'wait' : 'pointer', opacity:submitting ? 0.7 : 1 }}>
            <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
