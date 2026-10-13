'use strict';

const { Op } = require('sequelize');
const { execute, executeHDL } = require('./sandbox');
const { Submission, SubmissionResult, TestCase, Language, Question, User } = require('../models');
const { publicizeResultPayload } = require('./publicResult');

let _io = null;

function setIo(io) { _io = io; }

function emit(userId, event, data) {
  if (_io) _io.to(`user:${userId}`).emit(event, data);
}

async function processJob(job) {
  const { submissionId } = job.data;

  const submission = await Submission.findByPk(submissionId, {
    include: [{ model: Language, as: 'language', required: false }],
  });
  if (!submission) return;

  await submission.update({ status: 'running' });
  emit(submission.user_id, 'submission:running', { submission_id: submissionId });

  const lang = submission.language;

  const question = await Question.findByPk(submission.question_id, { attributes: ['type', 'marks', 'testbench', 'time_limit'] });

  // ── waveform_analysis ──────────────────────────────────────────────────────
  if (question?.type === 'waveform_analysis') {
    const maxMarks    = question.marks ?? 1;
    const timeLimitMs = (question.time_limit || 10) * 1000;

    if (!question.testbench || !question.testbench.trim()) {
      await submission.update({ status: 'error', score: 0 });
      emit(submission.user_id, 'submission:result', publicizeResultPayload({
        submission_id: submissionId, mode: submission.mode, status: 'error', score: 0,
        compile_error: 'No testbench configured for this question.',
        results: [], test_cases_passed: 0, test_cases_total: 0,
      }));
      return;
    }

    const hdlResult = await executeHDL(submission.source_code, question.testbench, timeLimitMs);

    const finalStatus = hdlResult.compile_error ? 'error'
      : hdlResult.timedOut ? 'timeout'
      : hdlResult.total === 0 ? 'error'
      : hdlResult.passed === hdlResult.total ? 'passed' : 'failed';

    const score = hdlResult.total > 0
      ? Math.round((hdlResult.passed / hdlResult.total) * maxMarks * 100) / 100
      : 0;

    const sampleCases = await require('../models').TestCase.findAll({
      where: { question_id: submission.question_id, is_hidden: false },
      attributes: ['input', 'expected_output'],
      order: [['created_at', 'ASC']],
    }).catch(() => []);

    const safeResults = hdlResult.results.map((r, i) => ({
      test_case_id: null,
      is_hidden: i >= sampleCases.length,
      passed: r.passed,
      runtime_ms: null,
      memory_kb: null,
      input: i < sampleCases.length ? (sampleCases[i].input || null) : null,
      expected_output: i < sampleCases.length ? (sampleCases[i].expected_output || null) : null,
      actual_output: null,
      error_message: r.name || null,
    }));

    await submission.update({
      status: finalStatus, score,
      test_cases_passed: hdlResult.passed,
      test_cases_total:  hdlResult.total,
      runtime_ms: hdlResult.runtime_ms,
      waveform_vcd: hdlResult.waveform_vcd || null,
      compile_error: hdlResult.compile_error || null,
      hdl_results: JSON.stringify(safeResults),
    });

    emit(submission.user_id, 'submission:result', publicizeResultPayload({
      submission_id: submissionId, mode: submission.mode,
      status: finalStatus, score,
      test_cases_passed: hdlResult.passed,
      test_cases_total:  hdlResult.total,
      hidden_passed: hdlResult.passed, hidden_total: hdlResult.total,
      scoring_basis: 'testbench',
      runtime_ms: hdlResult.runtime_ms,
      compile_error: hdlResult.compile_error,
      waveform_vcd: hdlResult.waveform_vcd || null,
      results: safeResults,
    }));
    return;
  }

  // ── Standard test cases ────────────────────────────────────────────────────
  const whereClause = { question_id: submission.question_id };
  if (submission.mode === 'run') whereClause.is_hidden = false;

  const testCases = await TestCase.findAll({ where: whereClause });

  let passed = 0;
  let totalWeight = 0;
  let earnedWeight = 0;
  let hiddenTotal = 0;
  let hiddenTotalWeight = 0;
  let hiddenEarnedWeight = 0;
  let totalRuntimeMs = 0;
  let maxMemoryKb = 0;
  let finalStatus = 'pending';
  let compileError = null;
  let hasTimeout = false;

  for (const tc of testCases) {
    totalWeight += tc.weight;
    if (tc.is_hidden) hiddenTotalWeight += tc.weight;

    let result;
    try {
      result = await execute(lang, submission.source_code, tc.input);
    } catch (err) {
      result = { stdout: '', stderr: String(err.message), runtimeMs: 0, memoryKb: 0, timedOut: false, compileError: String(err.message) };
    }

    if (result.compileError && !compileError) compileError = result.compileError;
    if (!compileError && result.stderr && !result.timedOut) {
      if (/SyntaxError|IndentationError|ImportError|ModuleNotFoundError/.test(result.stderr)) {
        compileError = result.stderr;
      }
    }

    const norm = (v) => String(v || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const tcPassed = !result.timedOut && !result.compileError && norm(result.stdout) === norm(tc.expected_output);

    if (tcPassed) {
      passed++;
      earnedWeight += tc.weight;
      if (tc.is_hidden) hiddenEarnedWeight += tc.weight;
    } else if (result.timedOut) {
      hasTimeout = true;
    }

    if (tc.is_hidden) hiddenTotal++;
    totalRuntimeMs += result.runtimeMs || 0;
    maxMemoryKb = Math.max(maxMemoryKb, result.memoryKb || 0);

    await SubmissionResult.create({
      submission_id: submissionId,
      test_case_id: tc.id,
      passed: tcPassed,
      actual_output: norm(result.stdout),
      runtime_ms: result.runtimeMs,
      memory_kb: result.memoryKb,
      error_message: result.timedOut ? 'Time limit exceeded' : (result.stderr || result.compileError || null),
    });
  }

  if (compileError)              finalStatus = 'error';
  else if (testCases.length === 0) finalStatus = 'error';
  else if (passed === testCases.length) finalStatus = 'passed';
  else if (hasTimeout)           finalStatus = 'timeout';
  else                           finalStatus = 'failed';

  const maxMarks = question?.marks ?? 1;
  let score;
  if (hiddenTotalWeight > 0) {
    score = (hiddenEarnedWeight / hiddenTotalWeight) * maxMarks;
  } else {
    score = totalWeight > 0 ? (earnedWeight / totalWeight) * maxMarks : 0;
  }

  await submission.update({
    status: finalStatus,
    score: Math.round(score * 100) / 100,
    test_cases_passed: passed,
    test_cases_total: testCases.length,
    runtime_ms: totalRuntimeMs,
    memory_kb: maxMemoryKb,
  });

  const results = await SubmissionResult.findAll({
    where: { submission_id: submissionId },
    include: [{ model: TestCase, as: 'test_case', attributes: ['id', 'is_hidden', 'input', 'expected_output'] }],
  });

  const safeResults = results.map((r) => ({
    test_case_id: r.test_case_id,
    is_hidden: r.test_case.is_hidden,
    passed: r.passed,
    runtime_ms: r.runtime_ms,
    memory_kb: r.memory_kb,
    actual_output: r.test_case.is_hidden ? null : r.actual_output,
    expected_output: r.test_case.is_hidden ? null : r.test_case.expected_output,
    error_message: r.test_case.is_hidden ? (r.error_message ? 'Error' : null) : r.error_message,
  }));

  emit(submission.user_id, 'submission:result', publicizeResultPayload({
    submission_id: submissionId,
    mode: submission.mode,
    status: finalStatus,
    score,
    test_cases_passed: passed,
    test_cases_total: testCases.length,
    hidden_passed: hiddenEarnedWeight > 0 ? Math.round((hiddenEarnedWeight / (hiddenTotalWeight || 1)) * hiddenTotal) : (hiddenTotalWeight > 0 ? 0 : null),
    hidden_total: hiddenTotal,
    scoring_basis: hiddenTotalWeight > 0 ? 'hidden_only' : 'all_cases',
    runtime_ms: totalRuntimeMs,
    compile_error: compileError,
    results: safeResults,
  }));
}

function startWorker() {
  console.log('Grading worker: in-process mode (no Redis)');
  return null;
}

module.exports = { startWorker, setIo, processJob };
