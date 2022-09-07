import { DB_MIGRATIONS_TABLE_NAME, PG_CONFIG } from "back-end/config";

module.exports = {
  client: "pg",
  connection: PG_CONFIG,
  migrations: {
    tableName: DB_MIGRATIONS_TABLE_NAME,
    directory: "./tasks"
  }
};
