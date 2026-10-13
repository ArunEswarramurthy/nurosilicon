const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuestionOption = sequelize.define('QuestionOption', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  question_id:  { type: DataTypes.UUID, allowNull: false },
  option_text:  { type: DataTypes.TEXT, allowNull: false },
  is_correct:   { type: DataTypes.BOOLEAN, defaultValue: false },
  order_index:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'question_options',
  timestamps: false,
  indexes: [{ fields: ['question_id'] }],
});

module.exports = QuestionOption;
