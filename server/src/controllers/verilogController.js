'use strict';

const { VerilogProblem, VerilogSubmission } = require('../models');
const { runVerilog, checkIverilog, makeRunId } = require('../utils/verilogSandbox');
const { analyzeRTL, generateTruthTable, generateSequentialTable } = require('../utils/rtlAnalyzer');
const { publicizeResultPayload, sanitizeResultEntry } = require('../utils/publicResult');
const SEED_PROBLEMS = require('../utils/verilogProblems');

let _io = null;
function setIo(io) { _io = io; }
function emit(userId, event, data) { if (_io) _io.to(`user:${userId}`).emit(event, data); }

// ── GET /api/verilog/health ───────────────────────────────────────────────────
exports.health = async (req, res) => {
  const available = await checkIverilog();
  res.json({ iverilog: available, message: available ? 'Icarus Verilog is installed' : 'iverilog not found — install Icarus Verilog' });
};

// ── GET /api/verilog/problems ─────────────────────────────────────────────────
exports.listProblems = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.difficulty) where.difficulty = req.query.difficulty;
    if (req.query.level)      where.level       = parseInt(req.query.level);
    if (req.query.category)   where.category    = req.query.category;

    const problems = await VerilogProblem.findAll({
      where,
      attributes: ['id','title','difficulty','level','category','marks','subject_id','topic_id','created_at'],
      order: [['level','ASC'],['difficulty','ASC'],['title','ASC']],
    });

    const userId = req.user?.id;
    if (userId) {
      const subs = await VerilogSubmission.findAll({
        where: { user_id: userId, mode: 'submit' },
        attributes: ['problem_id','status','score'],
      });
      const subMap = {};
      for (const s of subs) {
        if (!subMap[s.problem_id] || s.score > (subMap[s.problem_id].score || 0))
          subMap[s.problem_id] = { status: s.status, score: s.score };
      }
      return res.json(problems.map(p => ({ ...p.toJSON(), my_status: subMap[p.id] || null })));
    }

    res.json(problems);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/verilog/problems/:id ─────────────────────────────────────────────
exports.getProblem = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id, {
      attributes: { exclude: ['testbench'] },
    });
    if (!p || !p.is_active) return res.status(404).json({ message: 'Problem not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/verilog/problems/:id/full (super_admin only) ───────────────────
exports.getProblemFull = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id);
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/verilog/problems ────────────────────────────────────────────────
exports.createProblem = async (req, res) => {
  try {
    const { title, description, starter_code, testbench, visible_test_cases,
            difficulty, level, category, marks, time_limit_s, subject_id, topic_id, lang_type } = req.body;
    if (!title || !description || !starter_code || !testbench)
      return res.status(400).json({ message: 'title, description, starter_code, testbench are required' });

    const p = await VerilogProblem.create({
      title, description, starter_code, testbench,
      visible_test_cases: visible_test_cases || [],
      difficulty: difficulty || 'easy',
      level: level || 1,
      category: category || 'combinational',
      marks: marks || 10,
      time_limit_s: time_limit_s || 10,
      lang_type: lang_type || 'rtl_coding',
      subject_id: subject_id || null,
      topic_id: topic_id || null,
      created_by: req.user.id,
    });
    res.status(201).json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PUT /api/verilog/problems/:id ─────────────────────────────────────────────
exports.updateProblem = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id);
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    await p.update(req.body);
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── DELETE /api/verilog/problems/:id ─────────────────────────────────────────
exports.deleteProblem = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id);
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    await p.update({ is_active: false });
    res.json({ message: 'Problem deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/verilog/problems/:id/run ───────────────────────────────────────
exports.run = async (req, res) => {
  try {
    const { source_code } = req.body;
    if (!source_code?.trim()) return res.status(400).json({ message: 'source_code is required' });

    const problem = await VerilogProblem.findByPk(req.params.id);
    if (!problem || !problem.is_active) return res.status(404).json({ message: 'Problem not found' });

    const sub = await VerilogSubmission.create({
      problem_id: problem.id,
      user_id: req.user.id,
      source_code,
      mode: 'run',
      status: 'running',
    });

    emit(req.user.id, 'verilog:running', { submission_id: sub.id });
    res.status(202).json({ submission_id: sub.id, status: 'running' });

    setImmediate(async () => {
      try {
        const result = await runVerilog(source_code, problem.testbench, problem.time_limit_s * 1000, problem.lang_type || 'rtl_coding');
        const status = result.compile_error ? 'error' : result.timeout ? 'timeout' : result.passed === result.total && result.total > 0 ? 'passed' : 'failed';
        await sub.update({
          status,
          compile_error: result.compile_error || null,
          results: (result.results || []).map((entry) => ({ ...entry, is_hidden: true })),
          waveform_vcd: result.waveform_vcd,
          runtime_ms: result.runtime_ms,
          passed_cases: result.passed,
          total_cases: result.total,
          score: 0,
        });
        emit(req.user.id, 'verilog:result', publicizeResultPayload({
          submission_id: sub.id, mode: 'run', status,
          run_id: result.run_id,
          compile_error: result.compile_error,
          results: (result.results || []).map((entry) => ({ ...entry, is_hidden: true })),
          waveform_vcd: result.waveform_vcd,
          passed: result.passed, total: result.total,
          runtime_ms: result.runtime_ms,
        }));
      } catch (e) {
        await sub.update({ status: 'error', compile_error: e.message });
        emit(req.user.id, 'verilog:result', publicizeResultPayload({ submission_id: sub.id, status: 'error', compile_error: e.message }));
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/verilog/problems/:id/submit ────────────────────────────────────
exports.submit = async (req, res) => {
  try {
    const { source_code } = req.body;
    if (!source_code?.trim()) return res.status(400).json({ message: 'source_code is required' });

    const problem = await VerilogProblem.findByPk(req.params.id);
    if (!problem || !problem.is_active) return res.status(404).json({ message: 'Problem not found' });

    const sub = await VerilogSubmission.create({
      problem_id: problem.id,
      user_id: req.user.id,
      source_code,
      mode: 'submit',
      status: 'running',
    });

    emit(req.user.id, 'verilog:running', { submission_id: sub.id });
    res.status(202).json({ submission_id: sub.id, status: 'running' });

    setImmediate(async () => {
      try {
        const result = await runVerilog(source_code, problem.testbench, problem.time_limit_s * 1000, problem.lang_type || 'rtl_coding');
        const allPassed = !result.compile_error && !result.timeout && result.passed === result.total && result.total > 0;
        const status = result.compile_error ? 'error' : result.timeout ? 'timeout' : allPassed ? 'passed' : 'failed';
        const score = allPassed ? problem.marks : result.total > 0 ? Math.round((result.passed / result.total) * problem.marks * 100) / 100 : 0;

        await sub.update({
          status, score,
          compile_error: result.compile_error || null,
          results: (result.results || []).map((entry) => ({ ...entry, is_hidden: true })),
          waveform_vcd: result.waveform_vcd,
          runtime_ms: result.runtime_ms,
          passed_cases: result.passed,
          total_cases: result.total,
        });
        emit(req.user.id, 'verilog:result', publicizeResultPayload({
          submission_id: sub.id, mode: 'submit', status, score,
          run_id: result.run_id,
          compile_error: result.compile_error,
          results: (result.results || []).map((entry) => ({ ...entry, is_hidden: true })),
          waveform_vcd: result.waveform_vcd,
          passed: result.passed, total: result.total,
          runtime_ms: result.runtime_ms,
        }));
      } catch (e) {
        await sub.update({ status: 'error', compile_error: e.message });
        emit(req.user.id, 'verilog:result', publicizeResultPayload({ submission_id: sub.id, status: 'error', compile_error: e.message }));
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/verilog/submissions/:id ─────────────────────────────────────────
exports.getSubmission = async (req, res) => {
  try {
    const sub = await VerilogSubmission.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!sub) return res.status(404).json({ message: 'Submission not found' });
    const stored = sub.toJSON();
    stored.results = Array.isArray(stored.results)
      ? stored.results.map((result) => ({ ...result, is_hidden: true }))
      : [];
    const publicSub = publicizeResultPayload(stored);
    publicSub.results = publicSub.results.map(sanitizeResultEntry);
    res.json(publicSub);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/verilog/problems/:id/my-submissions ─────────────────────────────
exports.mySubmissions = async (req, res) => {
  try {
    const subs = await VerilogSubmission.findAll({
      where: { problem_id: req.params.id, user_id: req.user.id, mode: 'submit' },
      attributes: ['id','status','score','runtime_ms','submitted_at'],
      order: [['submitted_at','DESC']],
      limit: 20,
    });
    res.json(subs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/verilog/problems/:id/schematic ─────────────────────────────────
exports.getSchematic = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id, { attributes: ['id','schematic_data'] });
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    res.json({ schematic: p.schematic_data || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PUT /api/verilog/problems/:id/schematic ───────────────────────────────────
exports.saveSchematic = async (req, res) => {
  try {
    const p = await VerilogProblem.findByPk(req.params.id);
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    const { schematic } = req.body;
    if (!schematic || typeof schematic !== 'object') return res.status(400).json({ message: 'schematic object required' });
    await p.update({ schematic_data: schematic });
    res.json({ message: 'Schematic saved', schematic: p.schematic_data });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/verilog/problems/:id/analyze ──────────────────────────────────
// Parses student RTL source and returns a dynamic schematic graph + truth table.
// Does NOT run the simulator — pure static analysis.
exports.analyze = async (req, res) => {
  try {
    const { source_code } = req.body;
    if (!source_code?.trim()) return res.status(400).json({ message: 'source_code is required' });

    const problem = await VerilogProblem.findByPk(req.params.id);
    if (!problem || !problem.is_active) return res.status(404).json({ message: 'Problem not found' });

    const schematic  = analyzeRTL(source_code);
    let truthTable   = null;
    let seqTable     = null;

    if (!schematic.error) {
      if (schematic.isSequential) {
        // Sequential/FSM: generate state-transition table instead of combinational truth table
        seqTable = generateSequentialTable(source_code);
      } else {
        truthTable = generateTruthTable(source_code);
      }
    }

    res.json({
      schematic,
      truth_table:       truthTable,
      sequential_table:  seqTable,
      source_hash: require('crypto').createHash('sha1').update(source_code).digest('hex').slice(0, 16),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/verilog/seed ────────────────────────────────────────────────────
exports.seedProblems = async (req, res) => {
  try {
    const userId = req.user.id;
    let created = 0;
    for (const p of SEED_PROBLEMS) {
      const [, built] = await VerilogProblem.findOrCreate({
        where: { title: p.title, created_by: userId },
        defaults: { ...p, created_by: userId, lang_type: 'rtl_coding', time_limit_s: 10 },
      });
      if (built) created++;
    }
    res.json({ message: `Seed complete. ${created} new problems created.`, total: SEED_PROBLEMS.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports.setIo = setIo;
