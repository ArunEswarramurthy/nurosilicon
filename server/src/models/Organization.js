const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Organization = sequelize.define('Organization', {
  id:                    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:                  { type: DataTypes.STRING, allowNull: false },
  subdomain:             { type: DataTypes.STRING, allowNull: false, unique: true },
  logo_url:              { type: DataTypes.STRING },
  primary_contact:       { type: DataTypes.STRING },
  primary_contact_email: { type: DataTypes.STRING },
  primary_contact_phone: { type: DataTypes.STRING(20) },
  is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
  locked_profile_fields: { type: DataTypes.JSON, defaultValue: ['student_id', 'department', 'batch', 'section', 'email'] },
  can_create_courses:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_use_lab:           { type: DataTypes.BOOLEAN, defaultValue: false },
  can_request_global:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_use_assessments:   { type: DataTypes.BOOLEAN, defaultValue: false },
  can_use_lms:           { type: DataTypes.BOOLEAN, defaultValue: false },
  subscription_end:      { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, {
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Organization;
