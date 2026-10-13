'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id:       { type: Sequelize.UUID, references: { model: 'organizations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      role:         { type: Sequelize.ENUM('super_admin', 'student'), allowNull: false, defaultValue: 'student' },
      name:         { type: Sequelize.STRING, allowNull: false },
      email:        { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash:{ type: Sequelize.STRING, allowNull: false },
      student_id:   { type: Sequelize.STRING, unique: true },
      employee_id:  { type: Sequelize.STRING, unique: true },
      department:   { type: Sequelize.STRING },
      batch:        { type: Sequelize.STRING },
      section:      { type: Sequelize.STRING },
      phone:        { type: Sequelize.STRING(20) },
      photo_url:    { type: Sequelize.STRING },
      github_url:       { type: Sequelize.STRING },
      linkedin_url:     { type: Sequelize.STRING },
      portfolio_url:    { type: Sequelize.STRING },
      resume_url:       { type: Sequelize.STRING },
      leetcode_url:     { type: Sequelize.STRING },
      hackerrank_url:   { type: Sequelize.STRING },
      codechef_url:     { type: Sequelize.STRING },
      codeforces_url:   { type: Sequelize.STRING },
      geeksforgeeks_url:{ type: Sequelize.STRING },
      profile_slug:     { type: Sequelize.STRING, unique: true },
      is_profile_public:{ type: Sequelize.BOOLEAN, defaultValue: false },
      headline:         { type: Sequelize.STRING },
      skills:           { type: Sequelize.JSON, defaultValue: [] },
      bio:              { type: Sequelize.TEXT },
      can_use_lab:      { type: Sequelize.BOOLEAN, defaultValue: true },
      can_create_courses:{ type: Sequelize.BOOLEAN, defaultValue: false },
      is_flagged:       { type: Sequelize.BOOLEAN, defaultValue: false },
      flag_reason:      { type: Sequelize.TEXT },
      status:           { type: Sequelize.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' },
      last_login_at:    { type: Sequelize.DATE },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('users', ['org_id']);
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['student_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
