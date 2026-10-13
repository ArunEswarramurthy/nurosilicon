'use strict';
const { Op } = require('sequelize');
const {
  CourseQuiz, CourseQuizQuestion, CourseQuizAttempt,
  Course, CourseEnrollment, sequelize,
} = require('../models');

// ── GET /api/learn/quiz/:quizId  (student) ────────────────────────────────────
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findOne({
      where: { id: req.params.quizId, status: 'published' },
      include: [{ model: CourseQuizQuestion, as: 'questions', order: [['order_index','ASC']] }],
    });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Verify enrollment
    const enrollment = await CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id: quiz.course_id },
    });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course' });

    // Count attempts
    const attemptCount = await CourseQuizAttempt.count({
      where: { quiz_id: quiz.id, user_id: req.user.id, submitted_at: { [Op.ne]: null } },
    });
    if (attemptCount >= quiz.max_attempts) {
      return res.status(403).json({ message: 'Maximum attempts reached', attemptCount, maxAttempts: quiz.max_attempts });
    }

    // Strip correct answers from questions
    const questions = quiz.questions.map(q => {
      const { correct, explanation, ...safe } = q.toJSON();
      return safe;
    });

    res.json({ quiz: { ...quiz.toJSON(), questions }, attemptCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
};

// ── POST /api/learn/quiz/:quizId/start ────────────────────────────────────────
exports.startAttempt = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findOne({ where: { id: req.params.quizId, status: 'published' } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const enrollment = await CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id: quiz.course_id },
    });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

    const submittedCount = await CourseQuizAttempt.count({
      where: { quiz_id: quiz.id, user_id: req.user.id, submitted_at: { [Op.ne]: null } },
    });
    if (submittedCount >= quiz.max_attempts) {
      return res.status(403).json({ message: 'Maximum attempts reached' });
    }

    // Check for in-progress attempt
    const inProgress = await CourseQuizAttempt.findOne({
      where: { quiz_id: quiz.id, user_id: req.user.id, submitted_at: null },
    });
    if (inProgress) return res.json({ attempt: inProgress });

    const attempt_no = submittedCount + 1;
    const attempt = await CourseQuizAttempt.create({
      quiz_id: quiz.id,
      user_id: req.user.id,
      attempt_no,
      started_at: new Date(),
    });
    res.status(201).json({ attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start attempt' });
  }
};

// ── POST /api/learn/quiz/:quizId/submit ───────────────────────────────────────
exports.submitAttempt = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findOne({
      where: { id: req.params.quizId, status: 'published' },
      include: [{ model: CourseQuizQuestion, as: 'questions' }],
    });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const attempt = await CourseQuizAttempt.findOne({
      where: { quiz_id: quiz.id, user_id: req.user.id, submitted_at: null },
    });
    if (!attempt) return res.status(400).json({ message: 'No active attempt found' });

    // Enforce time limit server-side
    if (quiz.time_limit && attempt.started_at) {
      const elapsed = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
      if (elapsed > quiz.time_limit + 30) { // 30s grace
        await attempt.update({ submitted_at: new Date(), score: 0, passed: false, answers: req.body.answers || {} });
        return res.status(400).json({ message: 'Time limit exceeded', score: 0, passed: false });
      }
    }

    const { answers = {} } = req.body;

    // Grade server-side
    let earned = 0;
    const gradedAnswers = {};
    for (const q of quiz.questions) {
      const studentAnswer = answers[q.id];
      let correct = false;
      if (q.type === 'mcq' || q.type === 'true_false') {
        correct = studentAnswer !== undefined && String(studentAnswer) === String(q.correct);
      } else if (q.type === 'fill_blank') {
        correct = studentAnswer !== undefined &&
          String(studentAnswer).trim().toLowerCase() === String(q.correct).trim().toLowerCase();
      }
      // short_answer requires manual grading — not auto-scored
      if (correct) earned += q.marks;
      gradedAnswers[q.id] = { answer: studentAnswer, correct, marks: correct ? q.marks : 0 };
    }

    const totalMarks = quiz.questions.reduce((s, q) => s + q.marks, 0);
    const score = totalMarks > 0 ? Math.round((earned / totalMarks) * 100 * 10) / 10 : 0;
    const passed = score >= quiz.passing_percentage;

    await attempt.update({ answers: gradedAnswers, score, passed, submitted_at: new Date() });

    // Return explanations if quiz allows
    const result = {
      score, passed, earned, totalMarks,
      passingPercentage: quiz.passing_percentage,
      attemptNo: attempt.attempt_no,
    };
    if (quiz.show_explanations) {
      result.questions = quiz.questions.map(q => ({
        id: q.id, text: q.text, type: q.type,
        correct: q.correct, explanation: q.explanation,
        studentAnswer: answers[q.id],
        isCorrect: gradedAnswers[q.id]?.correct || false,
      }));
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
};

// ── GET /api/learn/quiz/:quizId/history ───────────────────────────────────────
exports.history = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findByPk(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const attempts = await CourseQuizAttempt.findAll({
      where: { quiz_id: quiz.id, user_id: req.user.id, submitted_at: { [Op.ne]: null } },
      order: [['attempt_no','ASC']],
      attributes: ['id','attempt_no','score','passed','started_at','submitted_at'],
    });
    res.json({ attempts, maxAttempts: quiz.max_attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

// ── Admin: CRUD quizzes ───────────────────────────────────────────────────────
exports.adminList = async (req, res) => {
  try {
    const quizzes = await CourseQuiz.findAll({
      where: { course_id: req.params.courseId },
      include: [{ model: CourseQuizQuestion, as: 'questions', attributes: ['id','type','marks'] }],
      order: [['created_at','DESC']],
    });
    res.json({ quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
};

exports.adminCreate = async (req, res) => {
  try {
    const { title, instructions, time_limit, passing_percentage, max_attempts, randomize, show_explanations, lesson_id, module_id } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
    const quiz = await CourseQuiz.create({
      course_id: req.params.courseId,
      lesson_id: lesson_id || null,
      module_id: module_id || null,
      title: title.trim(),
      instructions: instructions?.trim() || '',
      time_limit: time_limit ? parseInt(time_limit) : null,
      passing_percentage: parseFloat(passing_percentage) || 60,
      max_attempts: parseInt(max_attempts) || 3,
      randomize: Boolean(randomize),
      show_explanations: show_explanations !== false,
    });
    res.status(201).json({ quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create quiz' });
  }
};

exports.adminUpdate = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findOne({ where: { id: req.params.quizId, course_id: req.params.courseId } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const { title, instructions, time_limit, passing_percentage, max_attempts, randomize, show_explanations, status } = req.body;
    await quiz.update({
      ...(title !== undefined && { title: title.trim() }),
      ...(instructions !== undefined && { instructions: instructions.trim() }),
      ...(time_limit !== undefined && { time_limit: time_limit ? parseInt(time_limit) : null }),
      ...(passing_percentage !== undefined && { passing_percentage: parseFloat(passing_percentage) }),
      ...(max_attempts !== undefined && { max_attempts: parseInt(max_attempts) }),
      ...(randomize !== undefined && { randomize: Boolean(randomize) }),
      ...(show_explanations !== undefined && { show_explanations: Boolean(show_explanations) }),
      ...(status !== undefined && { status }),
    });
    res.json({ quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update quiz' });
  }
};

exports.adminAddQuestion = async (req, res) => {
  try {
    const quiz = await CourseQuiz.findOne({ where: { id: req.params.quizId, course_id: req.params.courseId } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const { type, text, options, correct, marks, explanation } = req.body;
    const VALID_TYPES = ['mcq','true_false','fill_blank','short_answer'];
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid question type' });
    if (!text?.trim()) return res.status(400).json({ message: 'Question text required' });
    const count = await CourseQuizQuestion.count({ where: { quiz_id: quiz.id } });
    const q = await CourseQuizQuestion.create({
      quiz_id: quiz.id, type, text: text.trim(),
      options: Array.isArray(options) ? options : [],
      correct, marks: parseFloat(marks) || 1,
      explanation: explanation?.trim() || '',
      order_index: count,
    });
    // Update total_marks
    const total = await CourseQuizQuestion.sum('marks', { where: { quiz_id: quiz.id } });
    await quiz.update({ total_marks: total || 0 });
    res.status(201).json({ question: q });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add question' });
  }
};

exports.adminDeleteQuestion = async (req, res) => {
  try {
    const q = await CourseQuizQuestion.findOne({ where: { id: req.params.questionId, quiz_id: req.params.quizId } });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    await q.destroy();
    const total = await CourseQuizQuestion.sum('marks', { where: { quiz_id: req.params.quizId } });
    await CourseQuiz.update({ total_marks: total || 0 }, { where: { id: req.params.quizId } });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete question' });
  }
};
