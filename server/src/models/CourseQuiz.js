const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseQuiz = sequelize.define('CourseQuiz', {
  id:                 { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  course_id:          { type: DataTypes.CHAR(36), allowNull: false },
  lesson_id:          { type: DataTypes.CHAR(36) },
  module_id:          { type: DataTypes.CHAR(36) },
  title:              { type: DataTypes.STRING(300), allowNull: false },
  instructions:       { type: DataTypes.TEXT },
  time_limit:         { type: DataTypes.INTEGER },
  passing_percentage: { type: DataTypes.FLOAT, defaultValue: 60 },
  total_marks:        { type: DataTypes.FLOAT, defaultValue: 0 },
  max_attempts:       { type: DataTypes.INTEGER, defaultValue: 3 },
  randomize:          { type: DataTypes.BOOLEAN, defaultValue: false },
  show_explanations:  { type: DataTypes.BOOLEAN, defaultValue: true },
  status:             { type: DataTypes.ENUM('draft','published'), defaultValue: 'draft' },
}, {
  tableName: 'ns_learn_quizzes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseQuiz;
