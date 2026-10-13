const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VerilogSubmission = sequelize.define('VerilogSubmission', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  problem_id:   { type: DataTypes.UUID, allowNull: false },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  source_code:  { type: DataTypes.TEXT, allowNull: false },
  mode:         { type: DataTypes.ENUM('run','submit'), defaultValue: 'run' },
  status:       { type: DataTypes.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
  score:        { type: DataTypes.FLOAT, defaultValue: 0 },
  passed_cases: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_cases:  { type: DataTypes.INTEGER, defaultValue: 0 },
  compile_error:{ type: DataTypes.TEXT, allowNull: true },
  results:      { type: DataTypes.JSON, defaultValue: [] },  // per-testcase results
  waveform_vcd: { type: DataTypes.TEXT, allowNull: true },   // VCD waveform data
  runtime_ms:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'verilog_submissions',
  timestamps: true,
  createdAt: 'submitted_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['problem_id'] }, { fields: ['user_id'] }, { fields: ['status'] }],
});

module.exports = VerilogSubmission;
