import dotenv from 'dotenv';

// Working directory changed to src/migrations so ensure env is loaded from correct path.
dotenv.config({
  debug: true,
  path: '../../.env'
});

module.exports = {
  client: 'pg',
  connection: process.env.POSTGRES_URL,
  migrations: {
    tableName: 'migrations',
    directory: './tasks'
  }
};
