const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabProblem = sequelize.define('LabProblem', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  question_no: { type: DataTypes.INTEGER, allowNull: true },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  language: {
    type: DataTypes.ENUM('verilog','vhdl','systemverilog','c','cpp','python','java','embedded_c','sql'),
    allowNull: false,
  },
  category:    { type: DataTypes.STRING, defaultValue: 'general' },
  difficulty:  { type: DataTypes.ENUM('easy','medium','hard'), defaultValue: 'easy' },
  level:       { type: DataTypes.INTEGER, defaultValue: 1 },
  marks:       { type: DataTypes.FLOAT, defaultValue: 10 },
  reward_points: { type: DataTypes.INTEGER, defaultValue: 10 },
  medal_image_url: { type: DataTypes.STRING, allowNull: true },
  time_limit_s:{ type: DataTypes.INTEGER, defaultValue: 10 },
  starter_code:{ type: DataTypes.TEXT },
  solution_code:{ type: DataTypes.TEXT },
  // HDL only
  testbench:   { type: DataTypes.TEXT },
  visible_test_cases: { type: DataTypes.JSON, defaultValue: [] },
  // Programming only
  test_cases:         { type: DataTypes.JSON, defaultValue: [] },
  hidden_test_cases:  { type: DataTypes.JSON, defaultValue: [] },
  // Languages student can choose from (empty = only the primary language)
  allowed_languages:  { type: DataTypes.JSON, defaultValue: [] },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.UUID, allowNull: false },
  org_id:      { type: DataTypes.UUID, allowNull: true },
  group_id:    { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'lab_problems',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['language'] },
    { fields: ['difficulty'] },
    { fields: ['level'] },
    { fields: ['created_by'] },
    { fields: ['org_id'] },
    { fields: ['group_id'] },
  ],
});

module.exports = LabProblem;
