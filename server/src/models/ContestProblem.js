'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContestProblem = sequelize.define('ContestProblem', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  contest_id:  { type: DataTypes.UUID, allowNull: false },
  // For coding problems (lab)
  problem_id:  { type: DataTypes.UUID, allowNull: true },
  // For objective (MCQ) questions
  question_id: { type: DataTypes.UUID, allowNull: true },
  // Source type
  problem_source: {
    type: DataTypes.ENUM('lab', 'objective'),
    defaultValue: 'lab',
  },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  marks:       { type: DataTypes.FLOAT, defaultValue: 100 },
  problem_type: {
    type: DataTypes.ENUM('programming', 'database', 'hardware', 'embedded', 'objective'),
    defaultValue: 'programming',
  },
}, {
  tableName: 'contest_problems',
  timestamps: false,
  indexes: [
    { fields: ['contest_id'] },
    { fields: ['contest_id', 'problem_id'] },
    { fields: ['contest_id', 'question_id'] },
  ],
});

module.exports = ContestProblem;
