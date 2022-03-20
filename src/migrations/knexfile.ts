import { DB_MIGRATIONS_TABLE_NAME, getPGConfig } from 'back-end/config';

module.exports = {
  client: 'pg',
  connection: getPGConfig(),
  migrations: {
    tableName: DB_MIGRATIONS_TABLE_NAME,
    directory: './tasks'
  }
};
