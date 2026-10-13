const { User } = require('../models');

// GET /api/admin/stats
exports.stats = async (req, res) => {
  try {
    const student = { role: 'student' };
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      labEnabledUsers,
      flaggedUsers,
    ] = await Promise.all([
      User.count({ where: { role: 'student' } }),
      User.count({ where: { ...student, status: 'active' } }),
      User.count({ where: { ...student, status: 'inactive' } }),
      User.count({ where: { ...student, status: 'suspended' } }),
      User.count({ where: { ...student, can_use_lab: true } }),
      User.count({ where: { ...student, is_flagged: true } }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      labEnabledUsers,
      flaggedUsers,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
