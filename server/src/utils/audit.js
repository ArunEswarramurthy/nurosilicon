const { AuditLog } = require('../models');

/**
 * audit(req, action, module, targetId, metadata)
 * Call this anywhere you have req (has req.user from authenticate middleware).
 */
const audit = async (req, action, module, targetId = null, metadata = {}) => {
  try {
    await AuditLog.create({
      user_id: req.user?.id || null,
      action,
      module,
      target_id: targetId ? String(targetId) : null,
      ip_address: req.ip,
      metadata,
    });
  } catch (e) {
    console.error('audit log error:', e.message);
  }
};

module.exports = { audit };
