'use strict';

const { Op } = require('sequelize');
const {
  Contest, ContestProblem, ContestRegistration, ContestSubmission,
  LabProblem, LabSubmission, Question, QuestionOption, QuestionBank, User,
} = require('../models');
const { runLabCode } = require('../utils/labSandbox');
const { publicizeResultPayload, sanitizeResultEntry } = require('../utils/publicResult');

const HDL = ['verilog', 'vhdl', 'systemverilog'];

function contestStatus(c) {
  const now = new Date();
  if (c.status === 'draft') return 'draft';
  if (new Date(c.start_time) > now) return 'upcoming';
  if (new Date(c.end_time) < now) return 'ended';
  return 'live';
}

function safeResults(results) {
  return (results || []).map(sanitizeResultEntry);
}

// ── ADMIN: list all contests ──────────────────────────────────────────────────
exports.adminList = async (req, res) => {
  try {
    const contests = await Contest.findAll({
      include: [
        { model: ContestProblem, as: 'contest_problems', attributes: ['id', 'problem_type'] },
        { model: ContestRegistration, as: 'registrations', attributes: ['id'] },
      ],
      order: [['start_time', 'DESC']],
    });
    const data = contests.map((c) => ({
      ...c.toJSON(),
      status: contestStatus(c),
      problem_count: c.contest_problems?.length || 0,
      participant_count: c.registrations?.length || 0,
    }));
    res.json({ contests: data });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: create contest ─────────────────────────────────────────────────────
exports.adminCreate = async (req, res) => {
  try {
    const { title, description, start_time, end_time, is_public, max_participants, rules, status } = req.body;
    if (!title || !start_time || !end_time)
      return res.status(400).json({ message: 'title, start_time, end_time required' });
    if (new Date(end_time) <= new Date(start_time))
      return res.status(400).json({ message: 'end_time must be after start_time' });
    const contest = await Contest.create({
      title, description, start_time, end_time,
      is_public: is_public !== false,
      max_participants: max_participants || null,
      rules: rules || null,
      status: status || 'draft',
      created_by: req.user.id,
    });
    res.status(201).json({ contest });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: update contest ─────────────────────────────────────────────────────
exports.adminUpdate = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    const fields = ['title', 'description', 'start_time', 'end_time', 'status', 'is_public', 'max_participants', 'rules'];
    fields.forEach((f) => { if (req.body[f] !== undefined) contest[f] = req.body[f]; });
    await contest.save();
    res.json({ contest });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: delete contest — guard against live contests with submissions ───────
exports.adminDelete = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    const liveStatus = contestStatus(contest);
    if (liveStatus === 'live') {
      return res.status(400).json({ message: 'Cannot delete a live contest. End it first.' });
    }
    const subCount = await ContestSubmission.count({ where: { contest_id: contest.id } });
    if (subCount > 0 && liveStatus !== 'draft') {
      return res.status(400).json({ message: `Cannot delete: ${subCount} submission(s) exist. Archive instead.` });
    }
    await contest.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: get contest detail ─────────────────────────────────────────────────
exports.adminGet = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id, {
      include: [{
        model: ContestProblem, as: 'contest_problems',
        include: [
          { model: LabProblem, as: 'problem' },
          { model: Question,   as: 'question', include: [{ model: QuestionOption, as: 'options' }] },
        ],
      }],
      order: [[{ model: ContestProblem, as: 'contest_problems' }, 'order_index', 'ASC']],
    });
    if (!contest) return res.status(404).json({ message: 'Not found' });
    const regCount = await ContestRegistration.count({ where: { contest_id: contest.id } });
    res.json({ contest: { ...contest.toJSON(), status: contestStatus(contest), participant_count: regCount } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: add coding problem ─────────────────────────────────────────────────
exports.addProblem = async (req, res) => {
  try {
    const { problem_id, marks, problem_type, order_index } = req.body;
    if (!problem_id) return res.status(400).json({ message: 'problem_id required' });
    const problem = await LabProblem.findByPk(problem_id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const autoType = problem_type || (
      HDL.includes(problem.language) ? 'hardware' :
      problem.language === 'sql' ? 'database' :
      problem.language === 'embedded_c' ? 'embedded' : 'programming'
    );
    const [cp, created] = await ContestProblem.findOrCreate({
      where: { contest_id: req.params.id, problem_id },
      defaults: { marks: marks || problem.marks || 100, problem_type: autoType, order_index: order_index || 0, problem_source: 'lab' },
    });
    if (!created) await cp.update({ marks: marks || cp.marks, problem_type: autoType });
    res.status(created ? 201 : 200).json({ contest_problem: cp });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: add objective (MCQ) question ───────────────────────────────────────
exports.addObjectiveQuestion = async (req, res) => {
  try {
    const { question_id, marks, order_index } = req.body;
    if (!question_id) return res.status(400).json({ message: 'question_id required' });
    const question = await Question.findByPk(question_id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const [cp, created] = await ContestProblem.findOrCreate({
      where: { contest_id: req.params.id, question_id },
      defaults: {
        marks: marks || question.marks || 1,
        problem_type: 'objective',
        problem_source: 'objective',
        order_index: order_index || 0,
      },
    });
    if (!created) await cp.update({ marks: marks || cp.marks });
    res.status(created ? 201 : 200).json({ contest_problem: cp });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: list question banks for picking MCQs ───────────────────────────────
exports.listQuestionBanks = async (req, res) => {
  try {
    const banks = await QuestionBank.findAll({
      include: [{
        model: Question, as: 'questions',
        where: { type: { [Op.in]: ['mcq_single', 'mcq_multi', 'true_false', 'fill_blank'] } },
        required: false,
        include: [{ model: QuestionOption, as: 'options', attributes: ['id', 'option_text', 'is_correct', 'order_index'] }],
      }],
      order: [['created_at', 'DESC']],
    });
    res.json({ banks });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── ADMIN: remove problem/question from contest ───────────────────────────────
exports.removeProblem = async (req, res) => {
  try {
    await ContestProblem.destroy({ where: { contest_id: req.params.id, id: req.params.cpId } });
    res.json({ message: 'Removed' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: list public contests ─────────────────────────────────────────────
exports.studentList = async (req, res) => {
  try {
    const contests = await Contest.findAll({
      where: { status: { [Op.ne]: 'draft' } },
      include: [
        { model: ContestProblem, as: 'contest_problems', attributes: ['id', 'problem_type'] },
        { model: ContestRegistration, as: 'registrations', attributes: ['id', 'user_id'] },
      ],
      order: [['start_time', 'DESC']],
    });
    const data = contests.map((c) => {
      const json = c.toJSON();
      return {
        ...json,
        status: contestStatus(c),
        problem_count: json.contest_problems?.length || 0,
        participant_count: json.registrations?.length || 0,
        is_registered: json.registrations?.some((r) => r.user_id === req.user.id) || false,
      };
    });
    res.json({ contests: data });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: get contest detail ───────────────────────────────────────────────
exports.studentGet = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id, {
      include: [{
        model: ContestProblem, as: 'contest_problems',
        include: [
          { model: LabProblem, as: 'problem', attributes: { exclude: ['testbench', 'solution_code', 'hidden_test_cases'] } },
          {
            model: Question, as: 'question',
            attributes: { exclude: ['explanation'] },
            include: [{ model: QuestionOption, as: 'options', attributes: ['id', 'option_text', 'order_index'] }],
          },
        ],
      }],
      order: [[{ model: ContestProblem, as: 'contest_problems' }, 'order_index', 'ASC']],
    });
    if (!contest || contest.status === 'draft') return res.status(404).json({ message: 'Not found' });

    const reg = await ContestRegistration.findOne({ where: { contest_id: contest.id, user_id: req.user.id } });
    const status = contestStatus(contest);
    const json = contest.toJSON();
    const regCount = await ContestRegistration.count({ where: { contest_id: contest.id } });

    if (status === 'upcoming' || !reg) {
      json.contest_problems = [];
    } else {
      const mySubs = await ContestSubmission.findAll({
        where: { contest_id: contest.id, user_id: req.user.id },
      });
      const labSubMap = Object.fromEntries(mySubs.filter(s => s.problem_id).map((s) => [s.problem_id, s]));
      const objSubMap = Object.fromEntries(mySubs.filter(s => s.question_id).map((s) => [s.question_id, s]));
      json.contest_problems = json.contest_problems.map((cp) => ({
        ...cp,
        my_submission: cp.problem_source === 'objective'
          ? (objSubMap[cp.question_id] || null)
          : (labSubMap[cp.problem_id] || null),
      }));
    }

    res.json({ contest: { ...json, status, is_registered: !!reg, participant_count: regCount } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: register ─────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest || contest.status === 'draft') return res.status(404).json({ message: 'Contest not found' });
    if (contestStatus(contest) === 'ended') return res.status(400).json({ message: 'Contest has ended' });
    if (contest.max_participants) {
      const count = await ContestRegistration.count({ where: { contest_id: contest.id } });
      if (count >= contest.max_participants) return res.status(400).json({ message: 'Contest is full' });
    }
    const [, created] = await ContestRegistration.findOrCreate({
      where: { contest_id: contest.id, user_id: req.user.id },
      defaults: { registered_at: new Date() },
    });
    res.status(created ? 201 : 200).json({ registered: true, message: created ? 'Registered!' : 'Already registered' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: run code (sample tests only, no scoring) ────────────────────────
exports.run = async (req, res) => {
  try {
    const { problem_id, source_code, chosen_language } = req.body;
    if (!problem_id || !source_code) return res.status(400).json({ message: 'problem_id and source_code required' });
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    if (contestStatus(contest) !== 'live') return res.status(400).json({ message: 'Contest is not live' });
    const reg = await ContestRegistration.findOne({ where: { contest_id: contest.id, user_id: req.user.id } });
    if (!reg) return res.status(403).json({ message: 'Not registered' });
    const problem = await LabProblem.findByPk(problem_id, { attributes: { exclude: ['hidden_test_cases', 'solution_code'] } });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const lang = chosen_language || problem.language;
    const tl = (problem.time_limit_s || 10) * 1000;
    // Run against visible test cases only
    const result = await runLabCode(lang, source_code, problem, tl, 'run');
    res.json({
      compile_error: result.compile_error || null,
      results: safeResults(result.results),
      passed: result.passed || 0,
      total: result.total || 0,
      stdout: result.stdout || '',
      runtime_ms: result.runtime_ms || 0,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: submit coding problem ───────────────────────────────────────────
exports.submit = async (req, res) => {
  try {
    const { problem_id, source_code, chosen_language } = req.body;
    if (!problem_id || !source_code) return res.status(400).json({ message: 'problem_id and source_code required' });
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    if (contestStatus(contest) !== 'live') return res.status(400).json({ message: 'Contest is not live' });
    const reg = await ContestRegistration.findOne({ where: { contest_id: contest.id, user_id: req.user.id } });
    if (!reg) return res.status(403).json({ message: 'Not registered' });
    const cp = await ContestProblem.findOne({ where: { contest_id: contest.id, problem_id } });
    if (!cp) return res.status(404).json({ message: 'Problem not in this contest' });
    const problem = await LabProblem.findByPk(problem_id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const lang = chosen_language || problem.language;
    const labSub = await LabSubmission.create({ problem_id, user_id: req.user.id, language: lang, source_code, mode: 'submit', status: 'running' });
    const io = global._gradingIo;
    if (io) io.to(`user:${req.user.id}`).emit('lab:running', { submission_id: labSub.id, contest_id: contest.id });
    res.json({ submission_id: labSub.id, status: 'running' });
    setImmediate(async () => {
      try {
        const tl = (problem.time_limit_s || 10) * 1000;
        const result = await runLabCode(lang, source_code, problem, tl, 'submit');
        const passed = result.passed || 0, total = result.total || 0;
        const score = total > 0 ? (passed / total) * cp.marks : 0;
        const status = result.compile_error ? 'error' : (result.timeout ? 'timeout' : (passed === total && total > 0 ? 'passed' : 'failed'));
        await labSub.update({ status, compile_error: result.compile_error || null, results: result.results || [], stdout: result.stdout || null, runtime_ms: result.runtime_ms || 0, passed_cases: passed, total_cases: total, score });
        // Upsert ContestSubmission — keep best score, don't accumulate
        const existing = await ContestSubmission.findOne({ where: { contest_id: contest.id, problem_id, user_id: req.user.id } });
        if (existing) {
          const bestScore = Math.max(existing.score, score);
          const bestStatus = bestScore === cp.marks ? 'passed' : (status === 'passed' ? 'passed' : existing.status === 'passed' ? 'passed' : status);
          await existing.update({ lab_submission_id: labSub.id, language: lang, status: bestStatus, score: bestScore, passed_cases: passed, total_cases: total, attempt_count: existing.attempt_count + 1, submitted_at: new Date() });
        } else {
          await ContestSubmission.create({ contest_id: contest.id, problem_id, user_id: req.user.id, problem_source: 'lab', lab_submission_id: labSub.id, language: lang, status, score, passed_cases: passed, total_cases: total });
        }
        if (io) io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({ submission_id: labSub.id, contest_id: contest.id, mode: 'submit', status, compile_error: result.compile_error, results: safeResults(result.results), stdout: result.stdout, passed, total, runtime_ms: result.runtime_ms, score }));
      } catch (err) {
        console.error('Contest submit error:', err);
        await labSub.update({ status: 'error', compile_error: err.message });
        if (io) io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({ submission_id: labSub.id, contest_id: contest.id, mode: 'submit', status: 'error', compile_error: err.message }));
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── STUDENT: submit MCQ answer ────────────────────────────────────────────────
exports.submitObjective = async (req, res) => {
  try {
    const { question_id, selected_option_id } = req.body;
    if (!question_id || !selected_option_id) return res.status(400).json({ message: 'question_id and selected_option_id required' });
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    if (contestStatus(contest) !== 'live') return res.status(400).json({ message: 'Contest is not live' });
    const reg = await ContestRegistration.findOne({ where: { contest_id: contest.id, user_id: req.user.id } });
    if (!reg) return res.status(403).json({ message: 'Not registered' });
    const cp = await ContestProblem.findOne({ where: { contest_id: contest.id, question_id } });
    if (!cp) return res.status(404).json({ message: 'Question not in this contest' });
    const option = await QuestionOption.findByPk(selected_option_id);
    if (!option || option.question_id !== question_id) return res.status(400).json({ message: 'Invalid option' });
    const is_correct = option.is_correct;
    const score = is_correct ? cp.marks : 0;
    const status = is_correct ? 'passed' : 'failed';
    const existing = await ContestSubmission.findOne({ where: { contest_id: contest.id, question_id, user_id: req.user.id } });
    if (existing) {
      // Don't allow re-attempt if already correct
      if (existing.is_correct) return res.json({ is_correct: true, score: existing.score, status: 'passed', already_correct: true });
      await existing.update({ selected_option_id, is_correct, score: Math.max(existing.score, score), status, attempt_count: existing.attempt_count + 1, submitted_at: new Date() });
    } else {
      await ContestSubmission.create({ contest_id: contest.id, question_id, user_id: req.user.id, problem_source: 'objective', selected_option_id, is_correct, score, status, language: 'objective' });
    }
    res.json({ is_correct, score, status });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── LEADERBOARD — fixed: best score per problem, not sum of all rows ──────────
exports.leaderboard = async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id, {
      include: [{ model: ContestProblem, as: 'contest_problems', attributes: ['problem_id', 'question_id', 'marks'] }],
    });
    if (!contest) return res.status(404).json({ message: 'Not found' });

    const subs = await ContestSubmission.findAll({
      where: { contest_id: contest.id },
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'photo_url', 'department', 'batch'] }],
    });

    // Build per-user, per-problem best score map
    const userMap = {};
    for (const s of subs) {
      if (!userMap[s.user_id]) {
        userMap[s.user_id] = { user: s.student, problems: {}, last_accepted: null };
      }
      const key = s.problem_id || s.question_id;
      const prev = userMap[s.user_id].problems[key];
      // Keep best score per problem
      if (!prev || s.score > prev.score) {
        userMap[s.user_id].problems[key] = { score: s.score, status: s.status, attempts: s.attempt_count };
      }
      if (s.status === 'passed') {
        const t = new Date(s.submitted_at);
        if (!userMap[s.user_id].last_accepted || t > userMap[s.user_id].last_accepted) {
          userMap[s.user_id].last_accepted = t;
        }
      }
    }

    const board = Object.values(userMap).map((u) => {
      const total_score = Object.values(u.problems).reduce((sum, p) => sum + (p.score || 0), 0);
      const solved = Object.values(u.problems).filter(p => p.status === 'passed').length;
      return { user: u.user, total_score, solved, problems: u.problems, last_accepted: u.last_accepted };
    })
      .sort((a, b) => b.total_score - a.total_score || (a.last_accepted || 0) - (b.last_accepted || 0))
      .map((u, i) => ({ rank: i + 1, ...u }));

    res.json({ leaderboard: board, problem_count: contest.contest_problems?.length || 0 });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};
