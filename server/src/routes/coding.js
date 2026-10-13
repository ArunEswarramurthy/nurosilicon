'use strict';

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const coding = require('../controllers/codingController');

const guard = [authenticate, authorize(['student', 'super_admin'])];

router.get('/languages',                              ...guard, coding.languages);
router.get('/question/:questionId',                   ...guard, coding.getQuestion);
router.get('/question/:questionId/submissions',       ...guard, coding.mySubmissions);
router.post('/run',                                   ...guard, coding.run);
router.post('/submit',                                ...guard, coding.submit);
router.post('/run-hdl',                               ...guard, coding.runHDL);
router.post('/submit-hdl',                            ...guard, coding.submitHDL);
router.get('/submission/:id',                         ...guard, coding.getSubmission);

module.exports = router;
