'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContestRegistration = sequelize.define('ContestRegistration', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  contest_id:   { type: DataTypes.UUID, allowNull: false },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  registered_at:{ type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'contest_registrations',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['contest_id', 'user_id'] },
    { fields: ['contest_id'] },
    { fields: ['user_id'] },
  ],
});

module.exports = ContestRegistration;
