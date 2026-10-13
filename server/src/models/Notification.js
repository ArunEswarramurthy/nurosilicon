'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'exam_assigned', 'exam_starting_soon', 'result_published',
      'assignment_graded', 'course_update', 'notice_posted',
      'batch_access_request', 'batch_access_response', 'batch_assigned',
      'review_request', 'review_decision',
      'slot_assigned', 'slot_cancelled',
      'general'
    ),
    allowNull: false,
    defaultValue: 'general',
  },
  title:      { type: DataTypes.STRING, allowNull: false },
  body:       { type: DataTypes.TEXT, allowNull: true },
  link:       { type: DataTypes.STRING, allowNull: true },
  is_read:    { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'notifications',
  timestamps: false,
  indexes: [{ fields: ['user_id'] }, { fields: ['is_read'] }],
});

module.exports = Notification;
