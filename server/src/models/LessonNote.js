const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LessonNote = sequelize.define('LessonNote', {
  id:        { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:   { type: DataTypes.CHAR(36), allowNull: false },
  lesson_id: { type: DataTypes.CHAR(36), allowNull: false },
  content:   { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'ns_learn_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = LessonNote;
