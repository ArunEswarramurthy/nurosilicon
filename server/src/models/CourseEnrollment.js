const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseEnrollment = sequelize.define('CourseEnrollment', {
  id:               { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:          { type: DataTypes.CHAR(36), allowNull: false },
  course_id:        { type: DataTypes.CHAR(36), allowNull: false },
  progress:         { type: DataTypes.FLOAT, defaultValue: 0 },
  last_lesson_id:   { type: DataTypes.CHAR(36) },
  last_accessed_at: { type: DataTypes.DATE },
  completed_at:     { type: DataTypes.DATE },
}, {
  tableName: 'ns_learn_enrollments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseEnrollment;
