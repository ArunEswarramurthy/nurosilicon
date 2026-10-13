'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DailyChallengeSubmission = sequelize.define('DailyChallengeSubmission', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  challenge_id: { type: DataTypes.UUID, allowNull: false },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  problem_id:   { type: DataTypes.UUID, allowNull: false },
  status:       { type: DataTypes.ENUM('solved', 'attempted'), defaultValue: 'attempted' },
  solved_at:    { type: DataTypes.DATE, allowNull: true },
  is_past:      { type: DataTypes.BOOLEAN, defaultValue: false }, // true = solved after the day passed
}, {
  tableName: 'daily_challenge_submissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['challenge_id', 'user_id'], unique: true },
    { fields: ['user_id'] },
  ],
});

module.exports = DailyChallengeSubmission;
