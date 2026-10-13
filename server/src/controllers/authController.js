const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { User, Session, Organization } = require('../models');
const { normalizeDeviceFingerprint } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const { getConfiguredJwtLifetime } = require('../utils/jwtLifetime');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const BCRYPT_ROUNDS = 12;

// Password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const signToken = (user) => {
  const { expiresIn } = getConfiguredJwtLifetime();
  return jwt.sign(
    { id: user.id, role: user.role, org_id: user.org_id },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' }
  );
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const expiresAt = () => {
  const { seconds } = getConfiguredJwtLifetime();
  return new Date(Date.now() + seconds * 1000);
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validate email format to prevent enumeration via malformed input
    if (typeof email !== 'string' || email.length > 254) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim(), status: 'active' } });
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ALLOWED_LOGIN_ROLES = ['super_admin', 'student'];
    if (!ALLOWED_LOGIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied for this role.' });
    }

    const deviceFingerprint = normalizeDeviceFingerprint(req.headers['x-device-fingerprint']);

    // Block unverified accounts
    if (user.role === 'student' && !user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        unverified: true,
        email: user.email,
      });
    }

    // Block flagged students
    if (user.is_flagged) {
      return res.status(403).json({
        message: 'Your account has been flagged due to exam malpractice. Please contact your college administrator to resolve this.',
        flagged: true,
        flag_reason: user.flag_reason || null,
      });
    }

    // Block login if the user's org is deactivated or subscription expired
    if (user.org_id) {
      const org = await Organization.findByPk(user.org_id, { attributes: ['is_active', 'subscription_end'] });
      if (org && !org.is_active) {
        return res.status(403).json({ message: 'Your organization has been deactivated. Please contact support.' });
      }
      if (org && org.subscription_end && new Date() > new Date(org.subscription_end)) {
        return res.status(403).json({ message: 'Your organization subscription has expired. Please contact support.' });
      }
    }

    // Invalidate all existing active sessions (single-session enforcement)
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });

    const token = signToken(user);

    // Create new session
    await Session.create({
      user_id: user.id,
      token_hash: hashToken(token),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      device_fingerprint: deviceFingerprint,
      is_active: true,
      expires_at: expiresAt(),
    });

    // Update last login
    const isFirstLogin = !user.last_login_at;
    await user.update({ last_login_at: new Date() });

    // Send welcome email on very first login (fire-and-forget)
    if (isFirstLogin) {
      const { sendWelcomeEmail } = require('../utils/mailer');
      sendWelcomeEmail(user.email, user.name).catch(() => {});
    }

    // Audit
    req.user = { id: user.id, role: user.role, org_id: user.org_id };
    await audit(req, 'LOGIN', 'auth', user.id, { email: user.email });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, can_use_lab: user.can_use_lab === true },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await Session.update(
      { is_active: false },
      { where: { id: req.user.sessionId, user_id: req.user.id, is_active: true } }
    );
    await audit(req, 'LOGOUT', 'auth', req.user.id, {});
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'org_id', 'department', 'photo_url', 'status', 'can_create_courses', 'can_use_lab'],
      include: [{ model: Organization, as: 'organization', attributes: ['can_request_global', 'can_use_assessments', 'can_use_lms'], required: false }],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userData = user.toJSON();
    userData.can_request_global  = !!userData.organization?.can_request_global;
    delete userData.organization;
    res.json({ user: userData });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/register  (admin-only, provisions users)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, org_id, department, batch, section, student_id, employee_id, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    if (typeof email !== 'string' || email.length > 254) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(422).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    // Only super_admin can register users
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can register users.' });
    }
    const requestedRole = 'student';

    // Non-super_admin can only create users within their own org
    const targetOrgId = req.user.role === 'super_admin' ? (org_id || null) : req.user.org_id;

    // Require and normalize student_id / employee_id
    const isStudent = requestedRole === 'student';
    const rawId = isStudent ? student_id : employee_id;
    if (!rawId || !rawId.trim()) {
      return res.status(400).json({ message: isStudent ? 'student_id is required' : 'employee_id is required' });
    }
    const normalizedId = rawId.trim().toLowerCase();
    const idField = isStudent ? 'student_id' : 'employee_id';
    const idConflict = await User.findOne({ where: { [idField]: normalizedId } });
    if (idConflict) {
      return res.status(409).json({ message: `${isStudent ? 'Student' : 'Employee'} ID already in use` });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name, email: email.toLowerCase().trim(), password_hash: hash,
      role: requestedRole,
      org_id: targetOrgId,
      department, batch, section, phone,
      student_id: isStudent ? normalizedId : null,
      employee_id: !isStudent ? normalizedId : null,
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, can_use_lab: user.can_use_lab === true },
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      const field = err.fields?.student_id ? 'Student ID' : err.fields?.employee_id ? 'Employee ID' : 'Email';
      return res.status(409).json({ message: `${field} already exists` });
    }
    console.error('register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/student-register  (public — students self-register)
exports.studentRegister = async (req, res) => {
  try {
    const { name, email, phone, password, confirm_password, student_id } = req.body;

    if (!name || !email || !phone || !password || !confirm_password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(422).json({
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
      });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const deviceFingerprint = normalizeDeviceFingerprint(req.headers['x-device-fingerprint']);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hash,
      phone: phone.trim(),
      role: 'student',
      status: 'active',
      is_verified: false,
      student_id: student_id ? student_id.trim().toLowerCase() : null,
      org_id: null,
      can_use_lab: true,
    });

    // Generate verification OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.update({ verify_token: otpHash, verify_expires: expires });

    // Send verification email (fire-and-forget)
    const { sendVerificationOtp } = require('../utils/mailer');
    sendVerificationOtp(user.email, otp, user.name).catch(() => {});

    res.status(201).json({
      pending_verification: true,
      email: user.email,
      message: 'Account created. Please check your email for the verification OTP.',
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email or Student ID already in use' });
    }
    console.error('studentRegister error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/google
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      // Auto-register as student via Google — mark as verified (Google already verified the email)
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS),
        role: 'student',
        photo_url: picture,
        status: 'active',
        is_verified: true,
        can_use_lab: true,
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active. Contact support.' });
    }

    if (user.is_flagged) {
      return res.status(403).json({
        message: 'Your account has been flagged due to exam malpractice. Please contact your college administrator to resolve this.',
        flagged: true,
        flag_reason: user.flag_reason || null,
      });
    }

    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });

    const token = signToken(user);
    const deviceFingerprint = normalizeDeviceFingerprint(req.headers['x-device-fingerprint']);
    await Session.create({
      user_id: user.id,
      token_hash: hashToken(token),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      device_fingerprint: deviceFingerprint,
      is_active: true,
      expires_at: expiresAt(),
    });

    await user.update({ last_login_at: new Date() });

    req.user = { id: user.id, role: user.role, org_id: user.org_id };
    await audit(req, 'LOGIN_GOOGLE', 'auth', user.id, { email: user.email });

    let googleOrgFlags = {};
    if (user.org_id) {
      const org = await Organization.findByPk(user.org_id, { attributes: ['can_use_assessments', 'can_use_lms'] });
      if (org) { googleOrgFlags = { can_use_assessments: !!org.can_use_assessments, can_use_lms: !!org.can_use_lms }; }
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, can_use_lab: user.can_use_lab === true },
    });
  } catch (err) {
    console.error('google login error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim(), status: 'active' } });

    // Always return success — never reveal whether email exists
    if (!user) {
      return res.json({ message: 'If that email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({ password_reset_token: otpHash, password_reset_expires: expires });

    const { sendPasswordResetOtp } = require('../utils/mailer');
    await sendPasswordResetOtp(user.email, otp, user.name);

    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/verify-reset-otp
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (
      !user ||
      !user.password_reset_token ||
      crypto.createHash('sha256').update(String(otp).trim()).digest('hex') !== user.password_reset_token ||
      !user.password_reset_expires ||
      new Date() > new Date(user.password_reset_expires)
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified', valid: true });
  } catch (err) {
    console.error('verifyResetOtp error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/reset-password
exports.resetPasswordViaOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (
      !user ||
      !user.password_reset_token ||
      crypto.createHash('sha256').update(String(otp).trim()).digest('hex') !== user.password_reset_token ||
      !user.password_reset_expires ||
      new Date() > new Date(user.password_reset_expires)
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(422).json({
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
      });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await user.update({
      password_hash: hash,
      password_reset_token: null,
      password_reset_expires: null,
    });

    // Invalidate all active sessions
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });

    await audit({ user: { id: user.id, role: user.role, org_id: user.org_id }, ip: req.ip, headers: req.headers },
      'PASSWORD_RESET_VIA_OTP', 'auth', user.id, { email: user.email });

    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    console.error('resetPasswordViaOtp error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (
      !user ||
      !user.verify_token ||
      crypto.createHash('sha256').update(String(otp).trim()).digest('hex') !== user.verify_token ||
      !user.verify_expires ||
      new Date() > new Date(user.verify_expires)
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await user.update({ is_verified: true, verify_token: null, verify_expires: null });

    // Auto-login after verification
    await Session.update({ is_active: false }, { where: { user_id: user.id, is_active: true } });
    const token = signToken(user);
    const deviceFingerprint = normalizeDeviceFingerprint(req.headers['x-device-fingerprint']);
    await Session.create({
      user_id: user.id,
      token_hash: hashToken(token),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      device_fingerprint: deviceFingerprint,
      is_active: true,
      expires_at: expiresAt(),
    });
    await user.update({ last_login_at: new Date() });

    // Send welcome email (fire-and-forget)
    const { sendWelcomeEmail } = require('../utils/mailer');
    sendWelcomeEmail(user.email, user.name).catch(() => {});

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, can_use_lab: user.can_use_lab === true },
    });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.is_verified) {
      return res.json({ message: 'If that account exists and is unverified, a new OTP has been sent.' });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.update({ verify_token: otpHash, verify_expires: expires });

    const { sendVerificationOtp } = require('../utils/mailer');
    sendVerificationOtp(user.email, otp, user.name).catch(() => {});

    res.json({ message: 'If that account exists and is unverified, a new OTP has been sent.' });
  } catch (err) {
    console.error('resendVerification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
