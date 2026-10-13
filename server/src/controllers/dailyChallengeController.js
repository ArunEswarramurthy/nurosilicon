'use strict';

const { DailyChallenge, DailyChallengeSubmission, LabProblem } = require('../models');
const { Op } = require('sequelize');

// ── helpers ───────────────────────────────────────────────────────────────────
function todayIST() {
  // Returns YYYY-MM-DD in IST (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

const HDL_LANGS = ['verilog', 'vhdl', 'systemverilog'];

// ── ADMIN: GET /api/daily-challenge/admin ─────────────────────────────────────
// List all scheduled challenges (past + future)
exports.adminList = async (req, res) => {
  try {
    const challenges = await DailyChallenge.findAll({
      include: [{ model: LabProblem, as: 'problem', attributes: ['id', 'title', 'language', 'difficulty'] }],
      order: [['scheduled_date', 'DESC']],
    });
    res.json({ challenges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── ADMIN: POST /api/daily-challenge/admin ────────────────────────────────────
// Schedule a problem as a daily challenge on a specific date
exports.adminCreate = async (req, res) => {
  try {
    const { problem_id, scheduled_date } = req.body;
    if (!problem_id || !scheduled_date)
      return res.status(400).json({ message: 'problem_id and scheduled_date required' });

    const problem = await LabProblem.findByPk(problem_id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const type = HDL_LANGS.includes(problem.language) ? 'systemverilog' : 'programming';

    // Upsert — one challenge per day
    const [challenge, created] = await DailyChallenge.findOrCreate({
      where: { scheduled_date },
      defaults: { problem_id, type, title: problem.title, created_by: req.user.id },
    });

    if (!created) {
      // Update existing
      await challenge.update({ problem_id, type, title: problem.title });
    }

    res.status(created ? 201 : 200).json({ challenge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── ADMIN: DELETE /api/daily-challenge/admin/:id ──────────────────────────────
exports.adminDelete = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Not found' });
    await challenge.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── STUDENT: GET /api/daily-challenge/today ───────────────────────────────────
// Returns today's challenge + student's solve status
exports.getToday = async (req, res) => {
  try {
    const today = todayIST();
    const challenge = await DailyChallenge.findOne({
      where: { scheduled_date: today, is_active: true },
      include: [{
        model: LabProblem, as: 'problem',
        attributes: { exclude: ['testbench', 'solution_code', 'hidden_test_cases'] },
      }],
    });

    if (!challenge) return res.json({ challenge: null });

    const mySubmission = await DailyChallengeSubmission.findOne({
      where: { challenge_id: challenge.id, user_id: req.user.id },
    });

    res.json({ challenge: { ...challenge.toJSON(), my_status: mySubmission?.status || null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── STUDENT: GET /api/daily-challenge/past ────────────────────────────────────
// Returns past challenges (before today) so students can still solve them
exports.getPast = async (req, res) => {
  try {
    const today = todayIST();
    const challenges = await DailyChallenge.findAll({
      where: { scheduled_date: { [Op.lt]: today }, is_active: true },
      include: [{ model: LabProblem, as: 'problem', attributes: ['id', 'title', 'language', 'difficulty', 'category'] }],
      order: [['scheduled_date', 'DESC']],
      limit: 30,
    });

    // Attach student solve status
    const ids = challenges.map((c) => c.id);
    const mySubs = ids.length ? await DailyChallengeSubmission.findAll({
      where: { challenge_id: { [Op.in]: ids }, user_id: req.user.id },
    }) : [];
    const subMap = Object.fromEntries(mySubs.map((s) => [s.challenge_id, s.status]));

    const data = challenges.map((c) => ({ ...c.toJSON(), my_status: subMap[c.id] || null }));
    res.json({ challenges: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── STUDENT: POST /api/daily-challenge/:id/mark-solved ───────────────────────
// Called by the IDE after a successful submit — marks the daily challenge solved
// NOTE: does NOT count toward heatmap (heatmap uses LabSubmission, not this)
exports.markSolved = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const today = todayIST();
    const isPast = challenge.scheduled_date < today;

    const [sub, created] = await DailyChallengeSubmission.findOrCreate({
      where: { challenge_id: challenge.id, user_id: req.user.id },
      defaults: {
        problem_id: challenge.problem_id,
        status: 'solved',
        solved_at: new Date(),
        is_past: isPast,
      },
    });

    if (!created && sub.status !== 'solved') {
      await sub.update({ status: 'solved', solved_at: new Date(), is_past: isPast });
    }

    res.json({ status: sub.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
