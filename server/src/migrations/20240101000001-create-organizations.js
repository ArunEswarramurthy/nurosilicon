'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      id:                    { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name:                  { type: Sequelize.STRING, allowNull: false },
      subdomain:             { type: Sequelize.STRING, allowNull: false, unique: true },
      logo_url:              { type: Sequelize.STRING },
      primary_contact:       { type: Sequelize.STRING },
      primary_contact_email: { type: Sequelize.STRING },
      primary_contact_phone: { type: Sequelize.STRING(20) },
      is_active:             { type: Sequelize.BOOLEAN, defaultValue: true },
      locked_profile_fields: { type: Sequelize.JSON, defaultValue: ['student_id', 'department', 'batch', 'section', 'email'] },
      can_create_courses:    { type: Sequelize.BOOLEAN, defaultValue: false },
      can_use_lab:           { type: Sequelize.BOOLEAN, defaultValue: false },
      can_request_global:    { type: Sequelize.BOOLEAN, defaultValue: false },
      can_use_assessments:   { type: Sequelize.BOOLEAN, defaultValue: false },
      can_use_lms:           { type: Sequelize.BOOLEAN, defaultValue: false },
      subscription_end:      { type: Sequelize.DATE, allowNull: true, defaultValue: null },
      created_at:            { type: Sequelize.DATE, allowNull: false },
      updated_at:            { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('organizations');
  },
};
