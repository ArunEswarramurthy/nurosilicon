require('dotenv').config();
const { isPlaceholderValue } = require('./envValidation');

const buildDatabaseConfig = (env) => {
  const password = env.DB_PASS || env.DB_PASSWORD;
  if (!env.DB_NAME || !env.DB_USER || !password) {
    throw new Error('Migration database config requires DB_NAME, DB_USER, and DB_PASS/DB_PASSWORD.');
  }
  if ([env.DB_NAME, env.DB_USER, password].some(isPlaceholderValue)) {
    throw new Error('Migration database config contains placeholder/default values; refusing to connect.');
  }
  if (['production', 'staging'].includes(env.NODE_ENV) && env.DB_USER.trim().toLowerCase() === 'root') {
    throw new Error('Deployment migrations must use a dedicated least-privilege database account.');
  }

  const port = Number(env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }

  return {
    username: env.DB_USER,
    password,
    database: env.DB_NAME,
    host: env.DB_HOST || '127.0.0.1',
    port,
    dialect: 'mysql',
    migrationStorageTableName: 'sequelize_meta',
    logging: false,
  };
};

const databaseConfig = buildDatabaseConfig(process.env);

module.exports = {
  development: databaseConfig,
  test: databaseConfig,
  production: databaseConfig,
  buildDatabaseConfig,
};
