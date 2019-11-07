import { DB_MIGRATIONS_TABLE_NAME, POSTGRES_URL } from 'back-end/config';

module.exports = {
  client: 'pg',
  connection: POSTGRES_URL,
  migrations: {
    tableName: DB_MIGRATIONS_TABLE_NAME,
    directory: './tasks'
  }
};
