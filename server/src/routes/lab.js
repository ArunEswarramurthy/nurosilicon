'use strict';

const router = require('express').Router();
const { authenticate, authorize, requireLabAccess } = require('../middleware/auth');
const c = require('../controllers/labController');
const groups = require('../controllers/labGroupController');

const labAccess = [authenticate, requireLabAccess];
const guard     = [authenticate, authorize(['super_admin'])];
const superOnly = [authenticate, authorize(['super_admin'])];

router.get('/problems',                  labAccess, c.listProblems);
router.get('/groups',                    labAccess, groups.list);
router.get('/groups/:id',                labAccess, groups.get);
router.post('/groups',                   superOnly, groups.create);
router.put('/groups/:id',                superOnly, groups.update);
router.delete('/groups/:id',             superOnly, groups.remove);
router.post('/groups/:id/assign',        superOnly, groups.assignProblems);
router.get('/problems/:id',              labAccess, c.getProblem);
router.get('/problems/:id/full',         guard,     c.getProblemFull);
router.post('/problems',                 superOnly, c.createProblem);
router.put('/problems/:id',              superOnly, c.updateProblem);
router.delete('/problems/:id',           superOnly, c.deleteProblem);
router.post('/problems/:id/run',         labAccess, c.run);
router.post('/problems/:id/submit',      labAccess, c.submit);
router.post('/run-free',                 labAccess, c.runFree);
router.get('/submissions/:id',           labAccess, c.getSubmission);
router.get('/problems/:id/my-submissions', labAccess, c.mySubmissions);
router.get('/health',                    labAccess, c.health);
router.post('/seed',                     superOnly, c.seedProblems);

module.exports = router;
