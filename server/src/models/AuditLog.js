const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  module: { type: DataTypes.STRING, allowNull: false },
  target_id: { type: DataTypes.STRING, allowNull: true },
  ip_address: { type: DataTypes.STRING(45) },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = AuditLog;
