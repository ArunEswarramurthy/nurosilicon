'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Contest = sequelize.define('Contest', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  start_time:  { type: DataTypes.DATE, allowNull: false },
  end_time:    { type: DataTypes.DATE, allowNull: false },
  status:      { type: DataTypes.ENUM('draft','upcoming','live','ended'), defaultValue: 'draft' },
  is_public:   { type: DataTypes.BOOLEAN, defaultValue: true },
  max_participants: { type: DataTypes.INTEGER, allowNull: true },
  rules:       { type: DataTypes.TEXT, allowNull: true },
  created_by:  { type: DataTypes.UUID, allowNull: false },
  org_id:      { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'contests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['status'] }, { fields: ['start_time'] }, { fields: ['created_by'] }],
});

module.exports = Contest;
