const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseLesson = sequelize.define('CourseLesson', {
  id:                 { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  topic_id:           { type: DataTypes.CHAR(36), allowNull: false },
  module_id:          { type: DataTypes.CHAR(36), allowNull: false },
  course_id:          { type: DataTypes.CHAR(36), allowNull: false },
  title:              { type: DataTypes.STRING(300), allowNull: false },
  content_blocks:     { type: DataTypes.JSON, defaultValue: [] },
  order_index:        { type: DataTypes.INTEGER, defaultValue: 0 },
  estimated_duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:             { type: DataTypes.ENUM('draft','published'), defaultValue: 'draft' },
  is_free_preview:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'ns_learn_lessons',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseLesson;
