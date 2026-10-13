const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const metrics = { requests: 0, errors: 0, queueBacklog: 0 };
const internalGuard = [authenticate, authorize(['super_admin'])];

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/health/detailed', ...internalGuard, async (req, res) => {
  const health = { status: 'healthy', checks: {}, uptime: process.uptime() };
  try {
    const db = require('../models');
    await db.sequelize.authenticate();
    health.checks.database = 'healthy';
  } catch (e) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

router.get('/ready', async (req, res) => {
  try {
    const db = require('../models');
    await db.sequelize.authenticate();
    res.json({ ready: true });
  } catch (e) {
    res.status(503).json({ ready: false });
  }
});

router.get('/live', (req, res) => res.json({ alive: true }));

router.get('/metrics', ...internalGuard, (req, res) => {
  res.json({ ...metrics, uptime: process.uptime(), memory: process.memoryUsage() });
});

router.get('/alerts', ...internalGuard, (req, res) => {
  const alerts = [];
  if (metrics.queueBacklog > 100) alerts.push({ severity: 'warning', message: 'Queue backlog high' });
  res.json({ hasAlerts: alerts.length > 0, alerts });
});

module.exports = { router, metrics };
