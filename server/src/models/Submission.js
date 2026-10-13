const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Submission = sequelize.define('Submission', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  question_id:        { type: DataTypes.UUID, allowNull: false },
  user_id:            { type: DataTypes.UUID, allowNull: false },
  attempt_id:         { type: DataTypes.UUID, allowNull: true },
  language_id:        { type: DataTypes.INTEGER, allowNull: true },
  source_code:        { type: DataTypes.TEXT('long'), allowNull: false },
  // 'run' = dry-run against sample cases only; 'submit' = all cases
  mode:               { type: DataTypes.ENUM('run', 'submit'), defaultValue: 'submit' },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'passed', 'failed', 'error', 'timeout'),
    defaultValue: 'pending',
  },
  score:              { type: DataTypes.FLOAT, defaultValue: 0 },
  test_cases_passed:  { type: DataTypes.INTEGER, defaultValue: 0 },
  test_cases_total:   { type: DataTypes.INTEGER, defaultValue: 0 },
  runtime_ms:         { type: DataTypes.INTEGER, allowNull: true },
  memory_kb:          { type: DataTypes.INTEGER, allowNull: true },
  // Similarity flag set by plagiarism checker
  similarity_flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
  similarity_score:   { type: DataTypes.FLOAT, allowNull: true },
  waveform_vcd:       { type: DataTypes.TEXT('long'), allowNull: true },
  compile_error:      { type: DataTypes.TEXT, allowNull: true },
  hdl_results:        { type: DataTypes.TEXT('long'), allowNull: true },
  submitted_at:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'submissions',
  timestamps: false,
  indexes: [
    { fields: ['question_id'] },
    { fields: ['user_id'] },
    { fields: ['attempt_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Submission;
