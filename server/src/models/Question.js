const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Question = sequelize.define('Question', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  org_id:           { type: DataTypes.UUID, allowNull: true },
  created_by:       { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'mcq_single','mcq_multi','true_false','fill_blank',
      'coding','frontend','backend','sql',
      'numerical','circuit_analysis','waveform_analysis',
      'code_output','code_debugging','rtl_coding','design_challenge'
    ),
    allowNull: false,
  },
  title:            { type: DataTypes.STRING, allowNull: false },
  body:             { type: DataTypes.TEXT },
  difficulty:       { type: DataTypes.ENUM('easy','medium','hard'), defaultValue: 'medium' },
  topic:            { type: DataTypes.STRING },
  subtopic:         { type: DataTypes.STRING },
  marks:            { type: DataTypes.FLOAT, defaultValue: 1 },
  negative_marks:   { type: DataTypes.FLOAT, defaultValue: 0 },
  tags:             { type: DataTypes.JSON, defaultValue: [] },
  explanation:         { type: DataTypes.TEXT },
  code_snippet:        { type: DataTypes.TEXT },
  constraints:         { type: DataTypes.TEXT },
  input_format:        { type: DataTypes.TEXT },
  output_format:       { type: DataTypes.TEXT },
  sample_input:        { type: DataTypes.TEXT },
  sample_output:       { type: DataTypes.TEXT },
  testbench:           { type: DataTypes.TEXT, allowNull: true },
  time_limit:          { type: DataTypes.FLOAT, defaultValue: 2.0 },
  memory_limit:        { type: DataTypes.INTEGER, defaultValue: 256 },
  supported_languages: { type: DataTypes.JSON, defaultValue: ['cpp', 'java', 'python', 'c', 'javascript'] },
  approval_status:  { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'approved' },
  version:          { type: DataTypes.INTEGER, defaultValue: 1 },
  bank_id:          { type: DataTypes.UUID, allowNull: true },
  branch_id:        { type: DataTypes.UUID, allowNull: true },
  subject_id:       { type: DataTypes.UUID, allowNull: true },
  eng_topic_id:     { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['org_id'] }, { fields: ['created_by'] }, { fields: ['type'] }, { fields: ['topic'] }],
});

module.exports = Question;
