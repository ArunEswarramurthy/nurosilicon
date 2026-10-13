const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuestionBank = sequelize.define('QuestionBank', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  org_id:      { type: DataTypes.UUID, allowNull: true },
  created_by:  { type: DataTypes.UUID, allowNull: false },
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category:    { type: DataTypes.STRING },
  subject:     { type: DataTypes.STRING },
  bank_type:   { type: DataTypes.STRING, defaultValue: 'mixed' },
  bank_types:  { type: DataTypes.JSON, defaultValue: [] },
  type:        { type: DataTypes.STRING, allowNull: true },
  difficulty_mix: { type: DataTypes.JSON, defaultValue: { easy: 0, medium: 0, hard: 0 } },
  total_marks:    { type: DataTypes.FLOAT, defaultValue: 0 },
  tags:        { type: DataTypes.JSON, defaultValue: [] },
  status:      { type: DataTypes.ENUM('draft', 'published', 'archived'), defaultValue: 'draft' },
  is_archived:           { type: DataTypes.BOOLEAN, defaultValue: false },
  folder_id:             { type: DataTypes.UUID, allowNull: true },
  is_global:             { type: DataTypes.BOOLEAN, defaultValue: false },
  // 'none' | 'pending' | 'approved' | 'rejected'
  global_request_status: { type: DataTypes.ENUM('none','pending','approved','rejected'), defaultValue: 'none' },
  global_request_note:   { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'question_banks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['org_id'] }, { fields: ['created_by'] }],
});

module.exports = QuestionBank;
