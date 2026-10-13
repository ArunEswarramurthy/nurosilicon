'use strict';

const { User, Notification, Organization } = require('../models');
const { Op } = require('sequelize');
const { notify } = require('../utils/notificationService');
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const ALL_EDITABLE_FIELDS = [
  'name', 'phone', 'photo_url', 'bio', 'headline',
  'github_url', 'linkedin_url', 'portfolio_url', 'resume_url', 'skills',
  'leetcode_url', 'hackerrank_url', 'codechef_url', 'codeforces_url', 'geeksforgeeks_url',
  'is_profile_public', 'profile_slug',
];

const DEFAULT_LOCKED = ['student_id', 'department', 'batch', 'section', 'email'];

// ── Multer — profile photo ────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/profile-photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const extension = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    }[file.mimetype];
    cb(null, `${req.user.id}-${crypto.randomUUID()}${extension}`);
  },
});
const fileFilter = (req, file, cb) => cb(null, ['image/jpeg','image/png','image/gif','image/webp'].includes(file.mimetype));

exports.uploadMiddleware = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('photo');

// ── GET /api/student/dashboard ────────────────────────────────────────────────
exports.dashboard = async (req, res) => {
  try {
    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ unread_notifications: unreadCount });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── GET /api/student/activity ─────────────────────────────────────────────────
exports.getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const since  = new Date();
    since.setDate(since.getDate() - 364);
    since.setHours(0, 0, 0, 0);

    const { sequelize } = require('../models');
    const { QueryTypes } = require('sequelize');

    const submissions = await sequelize.query(
      `SELECT DATE(submitted_at) as day, COUNT(*) as cnt FROM submissions WHERE user_id = :uid AND submitted_at >= :since GROUP BY DATE(submitted_at)`,
      { replacements: { uid: userId, since }, type: QueryTypes.SELECT }
    );

    const map = {};
    submissions.forEach(({ day, cnt }) => {
      const key = typeof day === 'string' ? day : new Date(day).toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + parseInt(cnt, 10);
    });

    res.json({ activity: map });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── GET /api/student/profile ──────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id','name','email','role','org_id','student_id','employee_id',
        'department','batch','section','phone','photo_url','bio','headline',
        'github_url','linkedin_url','portfolio_url','resume_url','skills',
        'leetcode_url','hackerrank_url','codechef_url','codeforces_url','geeksforgeeks_url',
        'profile_slug','is_profile_public','status','last_login_at','created_at'],
      include: [{ model: Organization, as: 'organization', attributes: ['locked_profile_fields','name'] }],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const lockedFields = user.organization?.locked_profile_fields ?? DEFAULT_LOCKED;
    res.json({ profile: user, locked_fields: lockedFields });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── PUT /api/student/profile ──────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Organization, as: 'organization', attributes: ['locked_profile_fields'] }],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const lockedFields = user.organization?.locked_profile_fields ?? DEFAULT_LOCKED;
    const editableFields = ALL_EDITABLE_FIELDS.filter((f) => !lockedFields.includes(f));
    const updates = {};
    for (const field of editableFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await user.update(updates);
    res.json({ profile: { id: user.id, name: user.name, email: user.email, ...updates } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── POST /api/student/profile/photo ──────────────────────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.photo_url?.includes('/uploads/profile-photos/')) {
      const oldPath = path.join(__dirname, '../../uploads/profile-photos', path.basename(user.photo_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;
    await user.update({ photo_url: photoUrl });
    res.json({ photo_url: photoUrl });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── POST /api/student/profile/generate-slug ───────────────────────────────────
exports.generateSlug = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    let base = user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = base, counter = 1;
    while (await User.findOne({ where: { profile_slug: slug, id: { [Op.ne]: user.id } } })) {
      slug = `${base}-${counter++}`;
    }
    await user.update({ profile_slug: slug });
    res.json({ slug });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── GET /api/student/notifications ───────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json({ notifications, unread_count: notifications.filter((n) => !n.is_read).length });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── PUT /api/student/notifications/read ──────────────────────────────────────
exports.markNotificationsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    const where = { user_id: req.user.id, is_read: false };
    if (ids?.length) where.id = { [Op.in]: ids };
    await Notification.update({ is_read: true }, { where });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};
