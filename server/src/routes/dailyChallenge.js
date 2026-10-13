'use strict';
const router = require('express').Router();
const { authenticate, authorize, requireLabAccess } = require('../middleware/auth');
const c = require('../controllers/dailyChallengeController');

const labAccess = [authenticate, requireLabAccess];
const superOnly = [authenticate, authorize(['super_admin'])];

// Admin
router.get('/admin',     superOnly, c.adminList);
router.post('/admin',    superOnly, c.adminCreate);
router.delete('/admin/:id', superOnly, c.adminDelete);

// Student
router.get('/today',     labAccess, c.getToday);
router.get('/past',      labAccess, c.getPast);
router.post('/:id/mark-solved', labAccess, c.markSolved);

module.exports = router;
