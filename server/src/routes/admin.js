const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const users = require('../controllers/adminUsersController');
const stats = require('../controllers/adminStatsController');

const superGuard = [authenticate, authorize(['super_admin'])];

// Stats
router.get('/stats', ...superGuard, stats.stats);

// Users
router.get('/users',                         ...superGuard, users.list);
router.post('/users',                        ...superGuard, users.create);
router.put('/users/:id',                     ...superGuard, users.update);
router.patch('/users/:id/permissions',       ...superGuard, users.setUserPermissions);
router.delete('/users/:id',                  ...superGuard, users.remove);
router.post('/users/:id/reset-password',     ...superGuard, users.resetPassword);
router.post('/users/:id/force-logout',       ...superGuard, users.forceLogout);
router.post('/users/:id/suspend',            ...superGuard, users.suspend);
router.post('/users/:id/unflag',             ...superGuard, users.unflagUser);
router.post('/users/bulk-import',            ...superGuard, users.bulkImport);

module.exports = router;
