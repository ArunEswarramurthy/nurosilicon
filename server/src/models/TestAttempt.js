const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TestAttempt = sequelize.define('TestAttempt', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  question_id:  { type: DataTypes.UUID, allowNull: false },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'completed', 'cancelled'),
    defaultValue: 'in_progress',
  },
  score:        { type: DataTypes.FLOAT, defaultValue: 0 },
  started_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  submitted_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  metadata:     { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'test_attempts',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['question_id'] },
    { fields: ['status'] },
  ],
});

module.exports = TestAttempt;
