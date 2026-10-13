const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseQuizAttempt = sequelize.define('CourseQuizAttempt', {
  id:           { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quiz_id:      { type: DataTypes.CHAR(36), allowNull: false },
  user_id:      { type: DataTypes.CHAR(36), allowNull: false },
  attempt_no:   { type: DataTypes.INTEGER, allowNull: false },
  answers:      { type: DataTypes.JSON, defaultValue: {} },
  score:        { type: DataTypes.FLOAT },
  passed:       { type: DataTypes.BOOLEAN },
  started_at:   { type: DataTypes.DATE },
  submitted_at: { type: DataTypes.DATE },
}, {
  tableName: 'ns_learn_quiz_attempts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseQuizAttempt;
