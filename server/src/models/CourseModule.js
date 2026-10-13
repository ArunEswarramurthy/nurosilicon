const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseModule = sequelize.define('CourseModule', {
  id:          { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  course_id:   { type: DataTypes.CHAR(36), allowNull: false },
  title:       { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:      { type: DataTypes.ENUM('draft','published'), defaultValue: 'draft' },
}, {
  tableName: 'ns_learn_modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseModule;
