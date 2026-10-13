const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Language = sequelize.define('Language', {
  id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:              { type: DataTypes.STRING(50), allowNull: false, unique: true },
  // Judge0 language id (used when SANDBOX_MODE=judge0)
  judge_language_id: { type: DataTypes.INTEGER, allowNull: true },
  // Monaco editor language identifier
  monaco_id:         { type: DataTypes.STRING(30), allowNull: false },
  // File extension for temp file creation
  file_extension:    { type: DataTypes.STRING(10), allowNull: false },
  // Commands use {{file}} placeholder replaced at runtime
  compile_cmd:       { type: DataTypes.STRING(255), allowNull: true },
  run_cmd:           { type: DataTypes.STRING(255), allowNull: false },
  time_limit_ms:     { type: DataTypes.INTEGER, defaultValue: 5000 },
  memory_limit_mb:   { type: DataTypes.INTEGER, defaultValue: 128 },
  is_active:         { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'languages',
  timestamps: false,
});

module.exports = Language;
