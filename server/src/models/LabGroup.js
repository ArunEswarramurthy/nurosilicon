const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabGroup = sequelize.define('LabGroup', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  slug:        { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING, allowNull: true },
  icon:        { type: DataTypes.STRING, defaultValue: '📚' },
  color:       { type: DataTypes.STRING, defaultValue: '#6366f1' },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'lab_groups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = LabGroup;
