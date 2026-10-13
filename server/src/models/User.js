const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  org_id: { type: DataTypes.UUID, allowNull: true },
  role: {
    type: DataTypes.ENUM('super_admin', 'student'),
    allowNull: false,
    defaultValue: 'student',
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  student_id: { type: DataTypes.STRING, unique: true, allowNull: true },
  employee_id: { type: DataTypes.STRING, unique: true, allowNull: true },
  department: { type: DataTypes.STRING },
  batch: { type: DataTypes.STRING },
  section: { type: DataTypes.STRING },

  phone: { type: DataTypes.STRING(20) },
  photo_url: { type: DataTypes.STRING },
  github_url:    { type: DataTypes.STRING, allowNull: true },
  linkedin_url:  { type: DataTypes.STRING, allowNull: true },
  portfolio_url: { type: DataTypes.STRING, allowNull: true },
  resume_url:    { type: DataTypes.STRING, allowNull: true },
  leetcode_url:     { type: DataTypes.STRING, allowNull: true },
  hackerrank_url:   { type: DataTypes.STRING, allowNull: true },
  codechef_url:     { type: DataTypes.STRING, allowNull: true },
  codeforces_url:   { type: DataTypes.STRING, allowNull: true },
  geeksforgeeks_url:{ type: DataTypes.STRING, allowNull: true },
  profile_slug:  { type: DataTypes.STRING, unique: true, allowNull: true },
  is_profile_public: { type: DataTypes.BOOLEAN, defaultValue: false },
  headline:      { type: DataTypes.STRING, allowNull: true },
  skills:        { type: DataTypes.JSON, defaultValue: [] },
  bio:           { type: DataTypes.TEXT, allowNull: true },
  can_use_lab: { type: DataTypes.BOOLEAN, defaultValue: true },
  can_create_courses: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_flagged:  { type: DataTypes.BOOLEAN, defaultValue: false },
  flag_reason: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  last_login_at: { type: DataTypes.DATE },
  is_verified:    { type: DataTypes.BOOLEAN, defaultValue: false },
  verify_token:   { type: DataTypes.STRING(64), allowNull: true },
  verify_expires: { type: DataTypes.DATE, allowNull: true },
  password_reset_token:   { type: DataTypes.STRING(64), allowNull: true },
  password_reset_expires: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['org_id'] }, { fields: ['email'] }, { fields: ['student_id'] }],
});

module.exports = User;
