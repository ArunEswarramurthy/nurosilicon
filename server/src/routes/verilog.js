const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/verilogController');

const anyAuth   = [authenticate];
const guard     = [authenticate, authorize(['super_admin'])];
const adminOnly = [authenticate, authorize(['super_admin'])];

// Health
router.get('/health', ctrl.health);

// Problems — read (all logged-in users)
router.get('/problems',                        ...anyAuth, ctrl.listProblems);
router.get('/problems/:id/full',               ...guard,   ctrl.getProblemFull);
router.get('/problems/:id/schematic',          ...anyAuth, ctrl.getSchematic);
router.get('/problems/:id/my-submissions',     ...anyAuth, ctrl.mySubmissions);
router.get('/problems/:id',                    ...anyAuth, ctrl.getProblem);

// Problems — write (super_admin only)
router.post('/problems',         ...guard,     ctrl.createProblem);
router.put('/problems/:id/schematic',  ...adminOnly, ctrl.saveSchematic);
router.put('/problems/:id',      ...guard,     ctrl.updateProblem);
router.delete('/problems/:id',   ...guard,     ctrl.deleteProblem);

// Run & Submit (all logged-in users)
router.post('/problems/:id/run',     ...anyAuth, ctrl.run);
router.post('/problems/:id/submit',  ...anyAuth, ctrl.submit);
router.post('/problems/:id/analyze', ...anyAuth, ctrl.analyze);

// Submissions
router.get('/submissions/:id', ...anyAuth, ctrl.getSubmission);

// Seed default problems (admin only)
router.post('/seed', ...adminOnly, ctrl.seedProblems);

module.exports = router;
