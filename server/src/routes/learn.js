'use strict';
const router  = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const student = require('../controllers/learnStudentController');
const quiz    = require('../controllers/learnQuizController');
const notes   = require('../controllers/learnNotesController');
const tmpl    = require('../controllers/learnTemplateController');

const guard = [authenticate, authorize(['student'])];

// ── Catalogue (public-ish — auth optional for enrollment status) ──────────────
router.get('/courses', authenticate, student.catalogue);
router.get('/courses/:slug', authenticate, student.getCourse);

// ── Enrollment ────────────────────────────────────────────────────────────────
router.post('/courses/:slug/enroll', ...guard, student.enroll);

// ── Lesson viewer ─────────────────────────────────────────────────────────────
router.get('/courses/:slug/lesson/:lessonId',          ...guard, student.getLesson);
router.post('/courses/:slug/lesson/:lessonId/complete', ...guard, student.completeLesson);

// ── My Learning ───────────────────────────────────────────────────────────────
router.get('/my-learning', ...guard, student.myLearning);

// ── Quiz ──────────────────────────────────────────────────────────────────────
router.get('/quiz/:quizId',         ...guard, quiz.getQuiz);
router.post('/quiz/:quizId/start',  ...guard, quiz.startAttempt);
router.post('/quiz/:quizId/submit', ...guard, quiz.submitAttempt);
router.get('/quiz/:quizId/history', ...guard, quiz.history);

// ── Notes ─────────────────────────────────────────────────────────────────────
router.get('/lessons/:lessonId/notes',       ...guard, notes.getNotes);
router.post('/lessons/:lessonId/notes',      ...guard, notes.saveNote);
router.put('/notes/:noteId',                 ...guard, notes.updateNote);
router.delete('/notes/:noteId',              ...guard, notes.deleteNote);

// ── Bookmarks ─────────────────────────────────────────────────────────────────
router.get('/bookmarks',                          ...guard, notes.getBookmarks);
router.post('/lessons/:lessonId/bookmark',        ...guard, notes.toggleBookmark);

// ── Certificates ──────────────────────────────────────────────────────────────
router.get('/certificates',                       ...guard, notes.getCertificates);
router.post('/courses/:courseId/certificate',     ...guard, notes.issueCertificate);
router.get('/certificates/verify/:certId',        authenticate, notes.verifyCertificate);

// ── Template config (student-facing) ─────────────────────────────────────────
router.get('/templates/:id/effective', authenticate, tmpl.getEffective);

module.exports = router;
