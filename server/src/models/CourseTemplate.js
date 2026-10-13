const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseTemplate = sequelize.define('CourseTemplate', {
  id:          { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  preset:      { type: DataTypes.ENUM('documentation','split_screen','video_course','custom'), defaultValue: 'custom' },
  status:      { type: DataTypes.ENUM('draft','published','archived'), defaultValue: 'draft' },
  is_default:  { type: DataTypes.BOOLEAN, defaultValue: false },
  config:      { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  created_by:  { type: DataTypes.CHAR(36) },
}, {
  tableName: 'ns_learn_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseTemplate;
