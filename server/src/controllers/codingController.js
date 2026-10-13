'use strict';

const { Question, TestCase, Language, Submission, SubmissionResult, TestAttempt } = require('../models');
const { execute, executeHDL } = require('../utils/sandbox');
const { publicizeResultPayload, publicErrorMessage } = require('../utils/publicResult');

// ── direct in-process grader (used when Redis is unavailable) ─────────────────
async function gradeDirectly(submissionId) {
  const sub = await Submission.findByPk(submissionId, {
    include: [{ model: Language, as: 'language', required: false }],
  });
  if (!sub) return;

  await sub.update({ status: 'running' });

  // ── waveform_analysis: testbench-based grading ──────────────────────────
  const qForType = await Question.findByPk(sub.question_id, { attributes: ['type', 'marks', 'testbench', 'time_limit'] });
  if (qForType?.type === 'waveform_analysis') {
    const maxMarks    = qForType.marks ?? 1;
    const timeLimitMs = (qForType.time_limit || 10) * 1000;

    // Guard: testbench not configured yet
    if (!qForType.testbench || !qForType.testbench.trim()) {
      await sub.update({ status: 'error', score: 0 });
      if (global._gradingIo) {
        global._gradingIo.to(`user:${sub.user_id}`).emit('submission:result', {
          submission_id: submissionId, mode: sub.mode, status: 'error', score: 0,
          compile_error: 'No testbench configured for this question. Please contact your instructor.',
          results: [], test_cases_passed: 0, test_cases_total: 0,
        });
      }
      return;
    }

    const hdlResult   = await executeHDL(sub.source_code, qForType.testbench, timeLimitMs);

    const finalStatus = hdlResult.compile_error ? 'error'
      : hdlResult.timedOut ? 'timeout'
      : hdlResult.total === 0 ? 'error'
      : hdlResult.passed === hdlResult.total ? 'passed' : 'failed';

    const score = hdlResult.total > 0
      ? Math.round((hdlResult.passed / hdlResult.total) * maxMarks * 100) / 100
      : 0;

    await sub.update({
      status: finalStatus, score,
      test_cases_passed: hdlResult.passed,
      test_cases_total:  hdlResult.total,
      runtime_ms: hdlResult.runtime_ms,
      waveform_vcd: hdlResult.waveform_vcd || null,
      compile_error: hdlResult.compile_error || null,
    });

    const sampleCases = await require('../models').TestCase.findAll({
      where: { question_id: sub.question_id, is_hidden: false },
      attributes: ['input', 'expected_output'],
      order: [['created_at', 'ASC']],
    }).catch(() => []);

    const hdlSafeResults = hdlResult.results.map((r, i) => ({
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
    // Persist results as JSON on the submission so getSubmission can return them
    await sub.update({ hdl_results: JSON.stringify(hdlSafeResults) }).catch(() => {});
    if (global._gradingIo) {
      global._gradingIo.to(`user:${sub.user_id}`).emit('submission:result', publicizeResultPayload({
        submission_id: submissionId, mode: sub.mode,
        status: finalStatus, score,
        test_cases_passed: hdlResult.passed,
        test_cases_total:  hdlResult.total,
        hidden_passed: hdlResult.passed, hidden_total: hdlResult.total,
        scoring_basis: 'testbench',
        runtime_ms: hdlResult.runtime_ms,
        compile_error: hdlResult.compile_error,
        waveform_vcd: hdlResult.waveform_vcd || null,
        results: hdlSafeResults,
      }));
    }
    return;
  }

  const whereClause = { question_id: sub.question_id };
  if (sub.mode === 'run') whereClause.is_hidden = false;
  const testCases = await TestCase.findAll({ where: whereClause });

  let passed = 0, totalWeight = 0, earnedWeight = 0;
  let hiddenTotal = 0, hiddenTotalWeight = 0, hiddenEarnedWeight = 0;
  let totalRuntimeMs = 0, maxMemoryKb = 0;
  let compileError = null, hasTimeout = false;

  for (const tc of testCases) {
    totalWeight += tc.weight;
    if (tc.is_hidden) hiddenTotalWeight += tc.weight;

    let result;
    try {
      result = await execute(sub.language, sub.source_code, tc.input);
    } catch (err) {
      result = { stdout: '', stderr: String(err.message), runtimeMs: 0, memoryKb: 0, timedOut: false, compileError: String(err.message) };
    }
    if (result.compileError && !compileError) compileError = result.compileError;
    if (!compileError && result.stderr && !result.timedOut) {
      if (/SyntaxError|IndentationError|ImportError|ModuleNotFoundError/.test(result.stderr)) {
        compileError = result.stderr;
      }
    }
    const normalizeOutput = (value) => String(value || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const actualOut   = normalizeOutput(result.stdout);
    const expectedOut = normalizeOutput(tc.expected_output);
    // Case-insensitive boolean normalisation: accept Python True/False, JS true/false, 1/0
    const normOut = (s) => {
      const l = s.toLowerCase();
      if (l === 'true'  || l === '1') return 'true';
      if (l === 'false' || l === '0') return 'false';
      return l;
    };
    const tcPassed = !result.timedOut && !result.compileError &&
      (actualOut === expectedOut || normOut(actualOut) === normOut(expectedOut));
    if (tcPassed) {
      passed++;
      earnedWeight += tc.weight;
      if (tc.is_hidden) hiddenEarnedWeight += tc.weight;
    } else if (result.timedOut) hasTimeout = true;
    if (tc.is_hidden) hiddenTotal++;
    totalRuntimeMs += result.runtimeMs || 0;
    maxMemoryKb = Math.max(maxMemoryKb, result.memoryKb || 0);
    await SubmissionResult.create({
      submission_id: submissionId, test_case_id: tc.id, passed: tcPassed,
      actual_output: result.stdout.trim(), runtime_ms: result.runtimeMs, memory_kb: result.memoryKb,
      error_message: result.timedOut ? 'Time limit exceeded' : (result.stderr || result.compileError || null),
    });
  }

  let finalStatus;
  if (compileError) finalStatus = 'error';
  else if (!testCases.length) finalStatus = 'error';
  else if (passed === testCases.length) finalStatus = 'passed';
  else if (hasTimeout) finalStatus = 'timeout';
  else finalStatus = 'failed';

  const question = await Question.findByPk(sub.question_id, { attributes: ['marks'] });
  const maxMarks = question?.marks ?? 1;
  let score;
  if (hiddenTotalWeight > 0) {
    score = Math.round((hiddenEarnedWeight / hiddenTotalWeight) * maxMarks * 100) / 100;
  } else {
    score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * maxMarks * 100) / 100 : 0;
  }

  await sub.update({ status: finalStatus, score, test_cases_passed: passed,
    test_cases_total: testCases.length, runtime_ms: totalRuntimeMs, memory_kb: maxMemoryKb });

  try {
    const results = await SubmissionResult.findAll({
      where: { submission_id: submissionId },
      include: [{ model: TestCase, as: 'test_case', attributes: ['id', 'is_hidden', 'input', 'expected_output'] }],
    });
    const safeResults = results.map((r) => ({
      test_case_id: r.test_case_id, is_hidden: r.test_case.is_hidden, passed: r.passed,
      runtime_ms: r.runtime_ms, memory_kb: r.memory_kb,
      actual_output: r.test_case.is_hidden ? null : r.actual_output,
      expected_output: r.test_case.is_hidden ? null : r.test_case.expected_output,
      error_message: r.test_case.is_hidden ? (r.error_message ? 'Error' : null) : r.error_message,
    }));
    if (global._gradingIo) {
      global._gradingIo.to(`user:${sub.user_id}`).emit('submission:result', publicizeResultPayload({
        submission_id: submissionId, mode: sub.mode, status: finalStatus, score,
        test_cases_passed: passed, test_cases_total: testCases.length,
        hidden_passed: hiddenTotal > 0 ? Math.round((hiddenEarnedWeight / (hiddenTotalWeight || 1)) * hiddenTotal) : null,
        hidden_total: hiddenTotal,
        scoring_basis: hiddenTotalWeight > 0 ? 'hidden_only' : 'all_cases',
        runtime_ms: totalRuntimeMs, compile_error: compileError, results: safeResults,
      }));
    }
  } catch (error) {
    console.error('Failed to emit coding submission result', error);
  }
}

// ── GET /api/coding/languages ─────────────────────────────────────────────────
exports.languages = async (req, res) => {
  try {
    const langs = await Language.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'monaco_id', 'file_extension', 'time_limit_ms', 'memory_limit_mb'],
      order: [['name', 'ASC']],
    });

    // If table is empty, return built-in defaults so the UI never breaks
    if (langs.length === 0) {
      return res.json({
        languages: [
          { id: 1, name: 'Python',     monaco_id: 'python',     file_extension: '.py',   time_limit_ms: 5000, memory_limit_mb: 128 },
          { id: 2, name: 'JavaScript', monaco_id: 'javascript', file_extension: '.js',   time_limit_ms: 5000, memory_limit_mb: 128 },
          { id: 3, name: 'C',          monaco_id: 'c',          file_extension: '.c',    time_limit_ms: 3000, memory_limit_mb: 64  },
          { id: 4, name: 'C++',        monaco_id: 'cpp',        file_extension: '.cpp',  time_limit_ms: 3000, memory_limit_mb: 64  },
          { id: 5, name: 'Java',       monaco_id: 'java',       file_extension: '.java', time_limit_ms: 8000, memory_limit_mb: 256 },
        ],
      });
    }

    res.json({ languages: langs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/coding/question/:questionId ──────────────────────────────────────
exports.getQuestion = async (req, res) => {
  try {
    const q = await Question.findByPk(req.params.questionId, {
      attributes: [
        'id', 'type', 'title', 'body', 'difficulty', 'marks', 'topic', 'subtopic',
        'constraints', 'input_format', 'output_format', 'sample_input', 'sample_output',
        'code_snippet', 'testbench', 'time_limit', 'memory_limit', 'supported_languages',
      ],
      include: [{
        model: TestCase,
        as: 'test_cases',
        where: { is_hidden: false },
        required: false,
        attributes: ['id', 'input', 'expected_output', 'weight'],
      }],
    });
    if (!q) return res.status(404).json({ message: 'Question not found' });

    res.json({
      question: {
        ...q.toJSON(),
        input_format: q.input_format || null,
        output_format: q.output_format || null,
        code_snippet: q.code_snippet || null,
        sample_input: q.sample_input || null,
        sample_output: q.sample_output || null,
        supported_languages: q.supported_languages || ['cpp', 'java', 'python', 'c', 'javascript'],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── shared enqueue logic ──────────────────────────────────────────────────────
async function enqueue(req, res, mode) {
  try {
    const { question_id, language_id, source_code, attempt_id } = req.body;

    if (!question_id || !language_id || !source_code?.trim()) {
      return res.status(400).json({ message: 'question_id, language_id, and source_code are required' });
    }

    const [question, language] = await Promise.all([
      Question.findByPk(question_id, { attributes: ['id', 'type'] }),
      Language.findByPk(language_id),
    ]);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    // Allow language_id even if not in DB (fallback built-in languages)
    if (language && !language.is_active) return res.status(400).json({ message: 'Unsupported language' });

    // Validate attempt ownership if provided
    if (attempt_id) {
      const attempt = await TestAttempt.findOne({
        where: { id: attempt_id, user_id: req.user.id, status: 'in_progress' },
      });
      if (!attempt) return res.status(403).json({ message: 'Invalid or expired attempt' });
    }

    const submission = await Submission.create({
      question_id,
      user_id: req.user.id,
      attempt_id: attempt_id || null,
      language_id,
      source_code,
      mode,
      status: 'pending',
    });

    // Grade directly in-process (Redis removed)
    setImmediate(() => gradeDirectly(submission.id).catch(() => {}));

    res.status(202).json({ submission_id: submission.id, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.run    = (req, res) => enqueue(req, res, 'run');
exports.submit = (req, res) => enqueue(req, res, 'submit');

// ── HDL run/submit (no language_id needed) ────────────────────────────────────
async function enqueueHDL(req, res, mode) {
  try {
    const { question_id, source_code, attempt_id } = req.body;
    if (!question_id || !source_code?.trim())
      return res.status(400).json({ message: 'question_id and source_code are required' });

    const question = await Question.findByPk(question_id, { attributes: ['id', 'type', 'testbench', 'marks', 'time_limit'] });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.type !== 'waveform_analysis')
      return res.status(400).json({ message: `Expected waveform_analysis, got: ${question.type}` });

    // Soft-validate attempt — don't block if attempt lookup fails
    if (attempt_id) {
      const attempt = await TestAttempt.findOne({ where: { id: attempt_id, user_id: req.user.id } });
      if (!attempt) return res.status(403).json({ message: 'Invalid attempt' });
    }

    const submission = await Submission.create({
      question_id, user_id: req.user.id,
      attempt_id: attempt_id || null,
      language_id: null,
      source_code, mode, status: 'pending',
    });

    setImmediate(() => gradeDirectly(submission.id).catch(() => {}));
    res.status(202).json({ submission_id: submission.id, status: 'pending' });
  } catch (err) {
    console.error('enqueueHDL error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.runHDL    = (req, res) => enqueueHDL(req, res, 'run');
exports.submitHDL = (req, res) => enqueueHDL(req, res, 'submit');

// ── GET /api/coding/submission/:id ────────────────────────────────────────────
exports.getSubmission = async (req, res) => {
  try {
    const sub = await Submission.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: Language, as: 'language', attributes: ['name', 'monaco_id'] }],
    });
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    const results = await SubmissionResult.findAll({
      where: { submission_id: sub.id },
      include: [{ model: TestCase, as: 'test_case', attributes: ['id', 'is_hidden', 'input', 'expected_output'] }],
    });

    // HDL submissions have no SubmissionResult rows — use stored hdl_results JSON
    let safeResults;
    if (sub.language_id === null && results.length === 0) {
      try {
        const stored = sub.hdl_results ? JSON.parse(sub.hdl_results) : [];
        safeResults = stored.map((result) => ({ ...result, is_hidden: true }));
      } catch { safeResults = []; }
    } else {
      safeResults = results
        .filter((r) => r.test_case)
        .map((r) => ({
          test_case_id: r.test_case_id,
          is_hidden: r.test_case.is_hidden,
          passed: r.passed,
          runtime_ms: r.runtime_ms,
          memory_kb: r.memory_kb,
          actual_output: r.test_case.is_hidden ? null : r.actual_output,
          expected_output: r.test_case.is_hidden ? null : r.test_case.expected_output,
          error_message: r.test_case.is_hidden ? (r.error_message ? 'Error' : null) : r.error_message,
        }));
    }

    const compileErr = safeResults.find((r) => r.error_message)?.error_message || null;

    const publicSubmission = publicizeResultPayload({
        id: sub.id,
        status: sub.status,
        mode: sub.mode,
        score: sub.score,
        test_cases_passed: sub.test_cases_passed,
        test_cases_total: sub.test_cases_total,
        runtime_ms: sub.runtime_ms,
        language: sub.language,
        similarity_flagged: sub.similarity_flagged,
        waveform_vcd: null,
        compile_error: sub.compile_error ? publicErrorMessage(sub.compile_error) : (sub.status === 'error' ? 'Compilation or runtime error' : null),
        results: safeResults,
    });
    res.json({
      submission: {
        id: publicSubmission.id,
        status: publicSubmission.status,
        mode: publicSubmission.mode,
        score: publicSubmission.score,
        test_cases_passed: publicSubmission.test_cases_passed,
        test_cases_total: publicSubmission.test_cases_total,
        runtime_ms: publicSubmission.runtime_ms,
        language: publicSubmission.language,
        similarity_flagged: publicSubmission.similarity_flagged,
        waveform_vcd: publicSubmission.waveform_vcd,
        compile_error: publicSubmission.compile_error,
      },
      results: publicSubmission.results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/coding/question/:questionId/submissions ──────────────────────────
exports.mySubmissions = async (req, res) => {
  try {
    const { attempt_id } = req.query;
    const where = { question_id: req.params.questionId, user_id: req.user.id, mode: 'submit' };
    if (attempt_id) where.attempt_id = attempt_id;
    const subs = await Submission.findAll({
      where,
      attributes: ['id', 'status', 'score', 'runtime_ms', 'submitted_at', 'language_id'],
      include: [{ model: Language, as: 'language', attributes: ['name'] }],
      order: [['submitted_at', 'DESC']],
      limit: 20,
    });
    res.json({ submissions: subs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
