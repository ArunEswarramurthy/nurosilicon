'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const tmpl   = require('../controllers/learnTemplateController');
const course  = require('../controllers/learnCourseController');
const curr    = require('../controllers/learnCurriculumController');
const quiz    = require('../controllers/learnQuizController');

const guard = [authenticate, authorize(['super_admin'])];

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', ...guard, course.dashboardStats);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',                    ...guard, tmpl.list);
router.post('/templates',                   ...guard, tmpl.create);
router.get('/templates/:id',                ...guard, tmpl.get);
router.put('/templates/:id',                ...guard, tmpl.update);
router.post('/templates/:id/publish',       ...guard, tmpl.publish);
router.post('/templates/:id/duplicate',     ...guard, tmpl.duplicate);
router.post('/templates/:id/rollback/:versionId', ...guard, tmpl.rollback);
router.delete('/templates/:id',             ...guard, tmpl.archive);
router.get('/templates/:id/versions',       ...guard, tmpl.versions);

// ── Courses ───────────────────────────────────────────────────────────────────
router.get('/courses',                      ...guard, course.list);
router.post('/courses',                     ...guard, course.uploadMiddleware, course.create);
router.get('/courses/:id',                  ...guard, course.get);
router.put('/courses/:id',                  ...guard, course.uploadMiddleware, course.update);
router.post('/courses/:id/publish',         ...guard, course.publish);
router.post('/courses/:id/unpublish',       ...guard, course.unpublish);
router.post('/courses/:id/archive',         ...guard, course.archive);
router.post('/courses/:id/duplicate',       ...guard, course.duplicate);
router.get('/courses/:id/analytics',        ...guard, course.analytics);

// ── Curriculum ────────────────────────────────────────────────────────────────
router.get('/courses/:courseId/modules',                                    ...guard, curr.listModules);
router.post('/courses/:courseId/modules',                                   ...guard, curr.createModule);
router.put('/courses/:courseId/modules/:moduleId',                          ...guard, curr.updateModule);
router.delete('/courses/:courseId/modules/:moduleId',                       ...guard, curr.deleteModule);

router.post('/courses/:courseId/modules/:moduleId/topics',                  ...guard, curr.createTopic);
router.put('/courses/:courseId/topics/:topicId',                            ...guard, curr.updateTopic);
router.delete('/courses/:courseId/topics/:topicId',                         ...guard, curr.deleteTopic);

router.post('/courses/:courseId/topics/:topicId/lessons',                   ...guard, curr.createLesson);
router.get('/courses/:courseId/lessons/:lessonId',                          ...guard, curr.getLesson);
router.put('/courses/:courseId/lessons/:lessonId',                          ...guard, curr.updateLesson);
router.delete('/courses/:courseId/lessons/:lessonId',                       ...guard, curr.deleteLesson);
router.post('/courses/:courseId/reorder',                                   ...guard, curr.reorder);
router.post('/courses/:courseId/publish-all',                               ...guard, curr.publishAll);
router.post('/upload/lesson-image',                                         ...guard, curr.uploadImageMiddleware, curr.uploadLessonImage);

// ── Quizzes ───────────────────────────────────────────────────────────────────
router.get('/courses/:courseId/quizzes',                                    ...guard, quiz.adminList);
router.post('/courses/:courseId/quizzes',                                   ...guard, quiz.adminCreate);
router.put('/courses/:courseId/quizzes/:quizId',                            ...guard, quiz.adminUpdate);
router.post('/courses/:courseId/quizzes/:quizId/questions',                 ...guard, quiz.adminAddQuestion);
router.delete('/courses/:courseId/quizzes/:quizId/questions/:questionId',   ...guard, quiz.adminDeleteQuestion);

module.exports = router;
