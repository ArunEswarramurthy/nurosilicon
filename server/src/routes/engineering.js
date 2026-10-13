const router = require('express').Router();
const { authenticate, authorize, requireLabAccess } = require('../middleware/auth');
const ctrl = require('../controllers/engineeringController');

const guard      = [authenticate, authorize(['super_admin'])];
const anyAuth    = [authenticate];
const labAccess  = [authenticate, requireLabAccess];
const studentLabAccess = [authenticate, authorize(['student']), requireLabAccess];

// ── Public tree (all logged-in users) ────────────────────────────────────────
router.get('/tree', ...anyAuth, ctrl.getTree);

// ── Branches ──────────────────────────────────────────────────────────────────
router.get('/branches',        ...anyAuth,    ctrl.listBranches);
router.post('/branches',       ...guard, ctrl.createBranch);
router.put('/branches/:id',    ...guard, ctrl.updateBranch);
router.delete('/branches/:id', ...guard, ctrl.deleteBranch);

// ── Subjects ──────────────────────────────────────────────────────────────────
router.get('/subjects',        ...anyAuth,  ctrl.listSubjects);
router.post('/subjects',       ...guard,    ctrl.createSubject);
router.put('/subjects/:id',    ...guard,    ctrl.updateSubject);
router.delete('/subjects/:id', ...guard,    ctrl.deleteSubject);

// ── Topics ────────────────────────────────────────────────────────────────────
router.get('/topics',        ...anyAuth, ctrl.listTopics);
router.post('/topics',       ...guard,   ctrl.createTopic);
router.put('/topics/:id',    ...guard,   ctrl.updateTopic);
router.delete('/topics/:id', ...guard,   ctrl.deleteTopic);

// ── Seed default ECE/CSE/EEE data (super_admin only) ─────────────────────────
router.post('/seed', ...guard, ctrl.seedDefaults);

// ── Engineering Lab Objective Banks ──────────────────────────────────────────
const labBankCtrl   = require('../controllers/engLabBankController');
const folderCtrl    = require('../controllers/engLabFolderController');

// Folders
router.get('/lab-folders',                        ...labAccess, folderCtrl.listFolders);
router.post('/lab-folders',                       ...guard,    folderCtrl.createFolder);
router.get('/lab-folders/:id',                    ...labAccess, folderCtrl.getFolder);
router.put('/lab-folders/:id',                    ...guard,    folderCtrl.updateFolder);
router.delete('/lab-folders/:id',                 ...guard,    folderCtrl.deleteFolder);
router.post('/lab-folders/:id/assign',            ...guard,    folderCtrl.assignBank);
router.delete('/lab-folders/:id/banks/:bankId',   ...guard,    folderCtrl.removeBank);

router.get('/lab-banks',                       ...labAccess, labBankCtrl.listBanks);
router.post('/lab-banks',                      ...guard,    labBankCtrl.createBank);
router.post('/lab-banks/seed',                 ...guard,    labBankCtrl.seedDemoData);
router.get('/lab-banks/:id',                   ...labAccess, labBankCtrl.getBank);
router.put('/lab-banks/:id',                   ...guard,    labBankCtrl.updateBank);
router.delete('/lab-banks/:id',                ...guard,    labBankCtrl.deleteBank);
router.post('/lab-banks/:id/submit',           ...studentLabAccess, labBankCtrl.submitAttempt);
router.get('/lab-banks/:id/questions',         ...labAccess, labBankCtrl.listQuestions);
router.post('/lab-banks/:id/questions',        ...guard,    labBankCtrl.addQuestion);
router.put('/lab-banks/:id/questions/:qId',    ...guard,    labBankCtrl.updateQuestion);
router.delete('/lab-banks/:id/questions/:qId', ...guard,    labBankCtrl.deleteQuestion);

module.exports = router;
