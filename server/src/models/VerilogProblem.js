const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VerilogProblem = sequelize.define('VerilogProblem', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:        { type: DataTypes.STRING, allowNull: false },
  description:  { type: DataTypes.TEXT, allowNull: false },
  starter_code: { type: DataTypes.TEXT, allowNull: false },
  testbench:    { type: DataTypes.TEXT, allowNull: false },   // hidden from student
  visible_test_cases: { type: DataTypes.JSON, defaultValue: [] }, // [{inputs, expected}]
  difficulty:   { type: DataTypes.ENUM('easy','medium','hard'), defaultValue: 'easy' },
  level:        { type: DataTypes.INTEGER, defaultValue: 1 },  // 1-5
  category:     { type: DataTypes.STRING, defaultValue: 'combinational' },
  marks:        { type: DataTypes.FLOAT, defaultValue: 10 },
  time_limit_s: { type: DataTypes.INTEGER, defaultValue: 10 },
  lang_type:    { type: DataTypes.ENUM('rtl_coding','waveform_analysis'), defaultValue: 'rtl_coding' },
  schematic_data: { type: DataTypes.JSON, defaultValue: null }, // { version, type, nodes, connections, labels }
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:   { type: DataTypes.UUID, allowNull: false },
  subject_id:   { type: DataTypes.UUID, allowNull: true },
  topic_id:     { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'verilog_problems',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['difficulty'] }, { fields: ['level'] }, { fields: ['created_by'] }],
});

module.exports = VerilogProblem;
