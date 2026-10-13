const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Session, Organization, User } = require('../models');

const normalizeDeviceFingerprint = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256) return null;
  return trimmed;
};

const sessionDeviceMatches = (session, req) => {
  if (!session?.device_fingerprint) return true;
  const provided = normalizeDeviceFingerprint(req?.headers?.['x-device-fingerprint']);
  return Boolean(provided && provided === session.device_fingerprint);
};

const isUserSessionEligible = (user) =>
  Boolean(user && user.status === 'active' && !user.is_flagged);

const hasLabAccess = (user) =>
  Boolean(user && (user.role === 'super_admin' || user.role === 'student'));

const requireLabAccess = (req, res, next) => {
  if (!req.user?.can_use_lab && req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Lab access not enabled for your account.' });
  }
  next();
};

/**
 * Verifies JWT, checks session is active, and checks org is not deactivated.
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await Session.findOne({
      where: { token_hash: tokenHash, user_id: payload.id, is_active: true },
    });

    if (!session) {
      return res.status(401).json({ message: 'Session expired or revoked' });
    }

    if (new Date() > new Date(session.expires_at)) {
      await session.update({ is_active: false });
      return res.status(401).json({ message: 'Session expired or revoked' });
    }

    if (!sessionDeviceMatches(session, req)) {
      await session.update({ is_active: false });
      return res.status(401).json({ message: 'Session device mismatch' });
    }

    const user = await User.findByPk(payload.id, {
      attributes: ['id', 'role', 'org_id', 'status', 'is_flagged', 'can_use_lab'],
    });
    if (!isUserSessionEligible(user)) {
      await session.update({ is_active: false });
      return res.status(401).json({ message: 'Account is inactive or unavailable' });
    }

    // Block access if the user's current org has been deactivated or expired.
    if (user.org_id) {
      const org = await Organization.findByPk(user.org_id, { attributes: ['is_active', 'subscription_end'] });
      if (org && !org.is_active) {
        await session.update({ is_active: false });
        return res.status(403).json({ message: 'Your organization has been deactivated. Please contact support.' });
      }
      if (org && org.subscription_end && new Date() > new Date(org.subscription_end)) {
        await session.update({ is_active: false });
        return res.status(403).json({ message: 'Your organization subscription has expired. Please contact support.' });
      }
    }

    req.user = {
      ...payload,
      id: user.id,
      role: user.role,
      org_id: user.org_id,
      can_use_lab: user.can_use_lab === true,
      sessionId: session.id,
    };
    next();
  } catch (err) {
    console.error('authenticate DB error:', err.message);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Restricts access to the given roles.
 * authorize(['super_admin', 'student'])
 */
const authorize = (roles = []) => (req, res, next) => {
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

/**
 * Scopes a Sequelize where clause to the user's org_id.
 * super_admin bypasses org scoping.
 * Usage: const where = orgScope(req, { status: 'active' });
 */
const orgScope = (req, extra = {}) => {
  if (req.user.role === 'super_admin') return extra;
  return { ...extra, org_id: req.user.org_id };
};

module.exports = {
  authenticate,
  authorize,
  orgScope,
  normalizeDeviceFingerprint,
  sessionDeviceMatches,
  isUserSessionEligible,
  hasLabAccess,
  requireLabAccess,
};
