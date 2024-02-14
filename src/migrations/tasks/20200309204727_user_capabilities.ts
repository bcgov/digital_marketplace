import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.specificType("capabilities", "TEXT[]").defaultTo("{}").notNullable();
  });

  logger.info("Modified users table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "users" \
    DROP CONSTRAINT "users_capabilities_check" \
  '
  );

  await connection.schema.alterTable("users", (table) => {
    table.dropColumn("capabilities");
  });
  logger.info("Reverted users table.");
}
