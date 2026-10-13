'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(64), allowNull: false },
      ip_address: { type: Sequelize.STRING(45) },
      user_agent: { type: Sequelize.TEXT },
      device_fingerprint: { type: Sequelize.STRING },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('sessions', ['user_id']);
    await queryInterface.addIndex('sessions', ['token_hash']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('sessions');
  },
};
