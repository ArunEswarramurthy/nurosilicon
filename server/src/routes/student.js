'use strict';
const router  = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const student = require('../controllers/studentController');

const guard = [authenticate, authorize(['student'])];

// Dashboard
router.get('/dashboard', ...guard, student.dashboard);
router.get('/activity',  ...guard, student.getActivity);

// Profile
router.get('/profile',                ...guard, student.getProfile);
router.put('/profile',                ...guard, student.updateProfile);
router.post('/profile/photo',         ...guard, student.uploadMiddleware, student.uploadPhoto);
router.post('/profile/generate-slug', ...guard, student.generateSlug);

// Notifications
router.get('/notifications',       ...guard, student.getNotifications);
router.put('/notifications/read',  ...guard, student.markNotificationsRead);

module.exports = router;
