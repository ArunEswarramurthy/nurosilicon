'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/contestController');

const anyAuth   = [authenticate];
const superOnly = [authenticate, authorize(['super_admin'])];

// Admin
router.get('/admin',                  superOnly, c.adminList);
router.post('/admin',                 superOnly, c.adminCreate);
router.get('/admin/:id',              superOnly, c.adminGet);
router.put('/admin/:id',              superOnly, c.adminUpdate);
router.delete('/admin/:id',           superOnly, c.adminDelete);
router.post('/admin/:id/problems',    superOnly, c.addProblem);
router.post('/admin/:id/objectives',  superOnly, c.addObjectiveQuestion);
router.get('/admin/:id/question-banks', superOnly, c.listQuestionBanks);
router.delete('/admin/:id/problems/:cpId', superOnly, c.removeProblem);

// Student
router.get('/',           anyAuth, c.studentList);
router.get('/:id',        anyAuth, c.studentGet);
router.post('/:id/register',         anyAuth, c.register);
router.post('/:id/run',              anyAuth, c.run);
router.post('/:id/submit',           anyAuth, c.submit);
router.post('/:id/submit-objective', anyAuth, c.submitObjective);
router.get('/:id/leaderboard',       anyAuth, c.leaderboard);

module.exports = router;
