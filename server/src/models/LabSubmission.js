const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabSubmission = sequelize.define('LabSubmission', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  problem_id:   { type: DataTypes.UUID, allowNull: false },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  language:     { type: DataTypes.STRING, allowNull: false },
  source_code:  { type: DataTypes.TEXT, allowNull: false },
  mode:         { type: DataTypes.ENUM('run','submit'), defaultValue: 'run' },
  status: {
    type: DataTypes.ENUM('pending','running','passed','failed','error','timeout'),
    defaultValue: 'pending',
  },
  score:        { type: DataTypes.FLOAT, defaultValue: 0 },
  passed_cases: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_cases:  { type: DataTypes.INTEGER, defaultValue: 0 },
  compile_error:{ type: DataTypes.TEXT, allowNull: true },
  results:      { type: DataTypes.JSON, defaultValue: [] },
  waveform_vcd: { type: DataTypes.TEXT, allowNull: true },
  stdout:       { type: DataTypes.TEXT, allowNull: true },
  runtime_ms:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'lab_submissions',
  timestamps: true,
  createdAt: 'submitted_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['problem_id'] },
    { fields: ['user_id'] },
    { fields: ['mode'] },
    { fields: ['status'] },
  ],
});

module.exports = LabSubmission;
