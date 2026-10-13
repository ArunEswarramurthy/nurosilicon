const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseTemplateVersion = sequelize.define('CourseTemplateVersion', {
  id:           { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  template_id:  { type: DataTypes.CHAR(36), allowNull: false },
  version:      { type: DataTypes.INTEGER, allowNull: false },
  config:       { type: DataTypes.JSON, allowNull: false },
  published_by: { type: DataTypes.CHAR(36) },
  published_at: { type: DataTypes.DATE },
}, {
  tableName: 'ns_learn_template_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseTemplateVersion;
