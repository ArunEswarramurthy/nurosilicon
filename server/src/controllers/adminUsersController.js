const bcrypt = require('bcryptjs');
const { User, Session } = require('../models');
const { audit } = require('../utils/audit');
const { Op } = require('sequelize');

const BCRYPT_ROUNDS = 12;
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const USER_STATUSES = new Set(['active', 'inactive', 'suspended']);
const USER_LIST_QUERY_KEYS = new Set(['search', 'status', 'page', 'limit']);
const USER_CREATE_FIELDS = new Set(['name', 'email', 'password', 'student_id', 'department', 'batch', 'section', 'phone']);
const USER_OPTIONAL_STRING_FIELDS = ['department', 'batch', 'section', 'phone'];

const findStudent = (id) => User.findOne({ where: { id, role: 'student' } });
const isRequestBody = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const invalidOptionalStringField = (body) => USER_OPTIONAL_STRING_FIELDS.find((field) => (
  body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string'
));

// GET /api/admin/users
exports.list = async (req, res) => {
  try {
    const unknownQueryKeys = Object.keys(req.query).filter((key) => !USER_LIST_QUERY_KEYS.has(key));
    if (unknownQueryKeys.length) return res.status(400).json({ message: `Unsupported query parameter: ${unknownQueryKeys[0]}` });

    const { search, status } = req.query;
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(page) || page < 1) return res.status(400).json({ message: 'page must be a positive integer' });
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ message: 'limit must be an integer between 1 and 100' });
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      return res.status(400).json({ message: 'search must be at most 100 characters' });
    }
    if (status !== undefined && status !== '' && !USER_STATUSES.has(status)) {
      return res.status(400).json({ message: 'status must be active, inactive, or suspended' });
    }

    const where = { role: 'student' };
    if (search?.trim()) where[Op.or] = [{ name: { [Op.like]: `%${search.trim()}%` } }, { email: { [Op.like]: `%${search.trim()}%` } }];
    if (status) where.status = status;

    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'role', 'student_id', 'department', 'batch', 'section', 'phone', 'status', 'is_flagged', 'can_use_lab', 'created_at'],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ users: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users
exports.create = async (req, res) => {
  try {
    if (!isRequestBody(req.body)) return res.status(400).json({ message: 'A user object is required' });
    const unsupportedField = Object.keys(req.body).find((field) => !USER_CREATE_FIELDS.has(field));
    if (unsupportedField) return res.status(400).json({ message: `Unsupported user field: ${unsupportedField}` });
    const { name, email, password: rawPassword, student_id, department, batch, section, phone } = req.body;
    const invalidField = invalidOptionalStringField(req.body);
    if (invalidField) return res.status(400).json({ message: `${invalidField} must be a string or null` });
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof rawPassword !== 'string') {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'Invalid email' });
    if (!PWD_RE.test(rawPassword)) return res.status(422).json({ message: 'Password must be at least 8 chars with uppercase, lowercase, number and special character' });
    if (typeof student_id !== 'string' || !student_id.trim()) return res.status(400).json({ message: 'student_id is required' });

    const normalizedId = student_id.trim().toLowerCase();
    const existing = await User.findOne({ where: { student_id: normalizedId } });
    if (existing) return res.status(409).json({ message: 'Student ID already in use' });

    const hash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password_hash: hash,
      role: 'student', student_id: normalizedId,
      department, batch, section, phone, can_use_lab: true,
    });
    await audit(req, 'USER_CREATED', 'users', user.id, { name, email: user.email });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Email or Student ID already exists' });
    console.error(err); res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/users/:id
exports.update = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!isRequestBody(req.body)) return res.status(400).json({ message: 'A user object is required' });

    const fields = ['name', 'email', 'department', 'batch', 'section', 'phone', 'status'];
    const allowedFields = new Set([...fields, 'student_id']);
    const unsupportedField = Object.keys(req.body).find((field) => !allowedFields.has(field));
    if (unsupportedField) return res.status(400).json({ message: `Unsupported user field: ${unsupportedField}` });
    if (req.body.status !== undefined && !USER_STATUSES.has(req.body.status)) {
      return res.status(400).json({ message: 'status must be active, inactive, or suspended' });
    }
    if (req.body.email !== undefined && (typeof req.body.email !== 'string' || req.body.email.length > 254)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim())) {
      return res.status(400).json({ message: 'name must be a non-empty string' });
    }
    const invalidField = invalidOptionalStringField(req.body);
    if (invalidField) return res.status(400).json({ message: `${invalidField} must be a string or null` });
    if (req.body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim())) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    fields.forEach((f) => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    if (req.body.name !== undefined) user.name = req.body.name.trim();
    if (req.body.email !== undefined) user.email = req.body.email.trim().toLowerCase();

    if (req.body.student_id !== undefined) {
      if (req.body.student_id !== null && typeof req.body.student_id !== 'string') {
        return res.status(400).json({ message: 'student_id must be a string or null' });
      }
      const val = req.body.student_id?.trim().toLowerCase() || null;
      if (val) {
        const conflict = await User.findOne({ where: { student_id: val, id: { [Op.ne]: user.id } } });
        if (conflict) return res.status(409).json({ message: 'Student ID already in use' });
      }
      user.student_id = val;
    }

    await user.save();
    await audit(req, 'USER_UPDATED', 'users', user.id, req.body);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/admin/users/:id
exports.remove = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await audit(req, 'USER_DELETED', 'users', user.id, { email: user.email });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users/:id/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!isRequestBody(req.body)) return res.status(400).json({ message: 'A password object is required' });
    const fields = Object.keys(req.body);
    if (fields.length !== 1 || fields[0] !== 'password') {
      return res.status(400).json({ message: 'Only the password field is accepted' });
    }
    const { password: rawPassword } = req.body;
    if (typeof rawPassword !== 'string' || !rawPassword) return res.status(400).json({ message: 'password required' });
    if (!PWD_RE.test(rawPassword)) return res.status(422).json({ message: 'Password too weak' });
    user.password_hash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
    await user.save();
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });
    await audit(req, 'PASSWORD_RESET', 'users', user.id, { email: user.email });
    res.json({ message: 'Password reset' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users/:id/force-logout
exports.forceLogout = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });
    await audit(req, 'FORCE_LOGOUT', 'users', user.id, {});
    res.json({ message: 'User sessions revoked' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users/:id/suspend
exports.suspend = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.update({ status: 'suspended' });
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });
    await audit(req, 'USER_SUSPENDED', 'users', user.id, { email: user.email });
    res.json({ message: 'User suspended' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users/:id/unflag
exports.unflagUser = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.is_flagged) return res.status(400).json({ message: 'User is not flagged' });
    await user.update({ is_flagged: false, flag_reason: null });
    await audit(req, 'USER_UNFLAGGED', 'users', user.id, { email: user.email });
    res.json({ message: 'User unflagged' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// PATCH /api/admin/users/:id/permissions
exports.setUserPermissions = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!isRequestBody(req.body)) return res.status(400).json({ message: 'A permission object is required' });
    const fields = Object.keys(req.body);
    if (fields.length !== 1 || fields[0] !== 'can_use_lab' || typeof req.body.can_use_lab !== 'boolean') {
      return res.status(400).json({ message: 'can_use_lab must be provided as a boolean' });
    }
    const { can_use_lab } = req.body;
    user.can_use_lab = can_use_lab;
    await user.save();
    await audit(req, 'USER_PERMISSIONS_UPDATED', 'users', user.id, { can_use_lab: user.can_use_lab });
    res.json({ user: { id: user.id, can_use_lab: user.can_use_lab } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users/bulk-import
exports.bulkImport = async (req, res) => {
  try {
    if (!isRequestBody(req.body)) return res.status(400).json({ message: 'An import object is required' });
    const bodyFields = Object.keys(req.body);
    if (bodyFields.length !== 1 || bodyFields[0] !== 'rows') {
      return res.status(400).json({ message: 'Only the rows field is accepted' });
    }
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'rows array required' });
    if (rows.length > 500) return res.status(400).json({ message: 'Cannot import more than 500 users at once' });

    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!isRequestBody(r)) throw new Error('Each import row must be an object');
        const unsupportedField = Object.keys(r).find((field) => !USER_CREATE_FIELDS.has(field));
        if (unsupportedField) throw new Error(`Unsupported user field: ${unsupportedField}`);
        const invalidField = invalidOptionalStringField(r);
        if (invalidField) throw new Error(`${invalidField} must be a string or null`);
        if (!r || typeof r.name !== 'string' || !r.name.trim() || typeof r.email !== 'string' || !r.email.trim() || typeof r.password !== 'string') {
          throw new Error('name, email, and password are required');
        }
        if (r.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) throw new Error('Invalid email');
        const rowPassword = r.password;
        if (!PWD_RE.test(rowPassword)) throw new Error('Password too weak');
        if (typeof r.student_id !== 'string' || !r.student_id.trim()) throw new Error('student_id is required');
        const normalizedId = r.student_id.trim().toLowerCase();
        const conflict = await User.findOne({ where: { student_id: normalizedId } });
        if (conflict) throw new Error(`Student ID "${normalizedId}" already in use`);
        const hash = await bcrypt.hash(rowPassword, BCRYPT_ROUNDS);
        const user = await User.create({
          name: r.name.trim(), email: r.email.toLowerCase().trim(), password_hash: hash,
          role: 'student', student_id: normalizedId,
          department: r.department, batch: r.batch, section: r.section, phone: r.phone, can_use_lab: true,
        });
        results.push({ row: i + 1, status: 'ok', email: user.email });
      } catch (e) {
        results.push({ row: i + 1, status: 'error', email: r.email, error: e.name === 'SequelizeUniqueConstraintError' ? 'Email already exists' : e.message });
      }
    }
    const created = results.filter((r) => r.status === 'ok').length;
    await audit(req, 'BULK_IMPORT', 'users', null, { total: rows.length, created });
    res.json({ results, created, failed: rows.length - created });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};
