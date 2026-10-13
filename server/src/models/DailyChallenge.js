'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DailyChallenge = sequelize.define('DailyChallenge', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  problem_id:   { type: DataTypes.UUID, allowNull: false },
  type:         { type: DataTypes.ENUM('systemverilog', 'programming'), allowNull: false },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
  title:        { type: DataTypes.STRING, allowNull: false },
  created_by:   { type: DataTypes.UUID, allowNull: false },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'daily_challenges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['scheduled_date'] }, { fields: ['problem_id'] }],
});

module.exports = DailyChallenge;
