require('dotenv').config();
const { Sequelize } = require('sequelize');
const { isPlaceholderValue } = require('./envValidation');

const dbPassword = process.env.DB_PASS || process.env.DB_PASSWORD;

const validateRequiredEnv = () => {
  if (!process.env.DB_NAME || !process.env.DB_USER || !dbPassword) {
    console.error('FATAL: Missing required DB environment variables (DB_NAME, DB_USER, DB_PASS/DB_PASSWORD)');
    process.exit(1);
  }

  if (isPlaceholderValue(dbPassword) || isPlaceholderValue(process.env.DB_NAME) || isPlaceholderValue(process.env.DB_USER)) {
    console.error('FATAL: Database credentials in environment are still placeholder/default values. Replace them before starting the service.');
    process.exit(1);
  }

  if (
    ['production', 'staging'].includes(process.env.NODE_ENV) &&
    process.env.DB_USER.trim().toLowerCase() === 'root'
  ) {
    console.error('FATAL: DB_USER must be a dedicated least-privilege database account in deployment environments.');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || isPlaceholderValue(process.env.JWT_SECRET)) {
    console.error('FATAL: JWT_SECRET must be set, at least 32 characters long, and not a placeholder value.');
    process.exit(1);
  }
};

validateRequiredEnv();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  dbPassword,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 10000,
    },
  }
);

module.exports = sequelize;
module.exports.validateRequiredEnv = validateRequiredEnv;
