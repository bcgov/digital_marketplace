import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.unique(["type", "email"]);
  });
  logger.info("Added unique constraint on users table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.dropUnique(["type", "email"]);
  });
  logger.info("Removed unique constraint on users table.");
}
