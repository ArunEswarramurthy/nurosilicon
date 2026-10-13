const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LessonProgress = sequelize.define('LessonProgress', {
  id:            { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  enrollment_id: { type: DataTypes.CHAR(36), allowNull: false },
  lesson_id:     { type: DataTypes.CHAR(36), allowNull: false },
  user_id:       { type: DataTypes.CHAR(36), allowNull: false },
  completed:     { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at:  { type: DataTypes.DATE },
}, {
  tableName: 'ns_learn_lesson_progress',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = LessonProgress;
