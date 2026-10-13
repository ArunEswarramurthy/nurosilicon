const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TestCase = sequelize.define('TestCase', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  question_id:     { type: DataTypes.UUID, allowNull: false },
  input:           { type: DataTypes.TEXT },
  expected_output: { type: DataTypes.TEXT },
  is_hidden:       { type: DataTypes.BOOLEAN, defaultValue: false },
  weight:          { type: DataTypes.FLOAT, defaultValue: 1 },
}, {
  tableName: 'test_cases',
  timestamps: false,
  indexes: [{ fields: ['question_id'] }],
});

module.exports = TestCase;
