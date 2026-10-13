const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SubmissionResult = sequelize.define('SubmissionResult', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submission_id: { type: DataTypes.UUID, allowNull: false },
  test_case_id:  { type: DataTypes.UUID, allowNull: false },
  passed:        { type: DataTypes.BOOLEAN, defaultValue: false },
  actual_output: { type: DataTypes.TEXT, allowNull: true },
  runtime_ms:    { type: DataTypes.INTEGER, allowNull: true },
  memory_kb:     { type: DataTypes.INTEGER, allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'submission_results',
  timestamps: false,
  indexes: [{ fields: ['submission_id'] }],
});

module.exports = SubmissionResult;
