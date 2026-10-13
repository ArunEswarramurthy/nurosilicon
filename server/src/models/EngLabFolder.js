const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EngLabFolder = sequelize.define('EngLabFolder', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  org_id:      { type: DataTypes.UUID, allowNull: true },
  created_by:  { type: DataTypes.UUID, allowNull: false },
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color:       { type: DataTypes.STRING, defaultValue: '#6366f1' },
  icon:        { type: DataTypes.STRING, defaultValue: '📁' },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_archived: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'eng_lab_folders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = EngLabFolder;
