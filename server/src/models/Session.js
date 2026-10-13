const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Session = sequelize.define('Session', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  token_hash: { type: DataTypes.STRING(64), allowNull: false },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.TEXT },
  device_fingerprint: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sessions',
  timestamps: false,
  indexes: [{ fields: ['user_id'] }, { fields: ['token_hash'] }],
});

module.exports = Session;
