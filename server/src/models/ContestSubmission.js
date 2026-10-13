'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContestSubmission = sequelize.define('ContestSubmission', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  contest_id:   { type: DataTypes.UUID, allowNull: false },
  problem_id:   { type: DataTypes.UUID, allowNull: true },   // LabProblem id (coding)
  question_id:  { type: DataTypes.UUID, allowNull: true },   // Question id (objective)
  user_id:      { type: DataTypes.UUID, allowNull: false },
  problem_source: { type: DataTypes.ENUM('lab','objective'), defaultValue: 'lab' },
  lab_submission_id:  { type: DataTypes.UUID, allowNull: true },
  selected_option_id: { type: DataTypes.UUID, allowNull: true }, // for MCQ
  is_correct:   { type: DataTypes.BOOLEAN, allowNull: true },    // for MCQ
  language:     { type: DataTypes.STRING, allowNull: true },
  status:       { type: DataTypes.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
  score:        { type: DataTypes.FLOAT, defaultValue: 0 },
  passed_cases: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_cases:  { type: DataTypes.INTEGER, defaultValue: 0 },
  attempt_count:{ type: DataTypes.INTEGER, defaultValue: 1 },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'contest_submissions',
  timestamps: false,
  indexes: [
    { fields: ['contest_id', 'user_id'] },
    { fields: ['contest_id', 'problem_id', 'user_id'] },
    { fields: ['contest_id', 'question_id', 'user_id'] },
    { fields: ['user_id'] },
  ],
});

module.exports = ContestSubmission;
