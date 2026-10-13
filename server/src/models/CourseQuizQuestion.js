const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseQuizQuestion = sequelize.define('CourseQuizQuestion', {
  id:          { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quiz_id:     { type: DataTypes.CHAR(36), allowNull: false },
  type:        { type: DataTypes.ENUM('mcq','true_false','fill_blank','short_answer'), allowNull: false },
  text:        { type: DataTypes.TEXT, allowNull: false },
  options:     { type: DataTypes.JSON, defaultValue: [] },
  correct:     { type: DataTypes.JSON },
  marks:       { type: DataTypes.FLOAT, defaultValue: 1 },
  explanation: { type: DataTypes.TEXT },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'ns_learn_quiz_questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseQuizQuestion;
