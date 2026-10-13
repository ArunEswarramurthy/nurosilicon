const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabProblemGroup = sequelize.define('LabProblemGroup', {
  problem_id: { type: DataTypes.UUID, primaryKey: true },
  group_id:   { type: DataTypes.UUID, primaryKey: true },
}, {
  tableName: 'lab_problem_groups',
  timestamps: false,
});

module.exports = LabProblemGroup;
