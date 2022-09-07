import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.text("anonymousProponentName").defaultTo("").notNullable();
  });
  logger.info("Completed modifying swuProposals table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.dropColumn("anonymousProponentName");
  });
  logger.info("Completed reverting swuProposals table.");
}
