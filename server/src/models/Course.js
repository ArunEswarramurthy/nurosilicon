const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
  id:                  { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:               { type: DataTypes.STRING(300), allowNull: false },
  slug:                { type: DataTypes.STRING(300), allowNull: false, unique: true },
  summary:             { type: DataTypes.STRING(500) },
  description:         { type: DataTypes.TEXT },
  category:            { type: DataTypes.STRING(100) },
  difficulty:          { type: DataTypes.ENUM('beginner','intermediate','advanced'), defaultValue: 'beginner' },
  cover_image_url:     { type: DataTypes.STRING(500) },
  learning_objectives: { type: DataTypes.JSON, defaultValue: [] },
  prerequisites:       { type: DataTypes.JSON, defaultValue: [] },
  estimated_duration:  { type: DataTypes.INTEGER, defaultValue: 0 },
  tags:                { type: DataTypes.JSON, defaultValue: [] },
  status:              { type: DataTypes.ENUM('draft','published','archived'), defaultValue: 'draft' },
  is_featured:         { type: DataTypes.BOOLEAN, defaultValue: false },
  template_id:         { type: DataTypes.CHAR(36) },
  template_version:    { type: DataTypes.INTEGER },
  created_by:          { type: DataTypes.CHAR(36) },
  published_at:        { type: DataTypes.DATE },
}, {
  tableName: 'ns_learn_courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Course;
