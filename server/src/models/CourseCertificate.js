const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseCertificate = sequelize.define('CourseCertificate', {
  id:             { type: DataTypes.CHAR(36), defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:        { type: DataTypes.CHAR(36), allowNull: false },
  course_id:      { type: DataTypes.CHAR(36), allowNull: false },
  certificate_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  issued_at:      { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'ns_learn_certificates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CourseCertificate;
