import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuProposals", (table) => {
    table.unique(["opportunity", "createdBy"]);
  });
  logger.info("Added constraint to cwuProposals table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuProposals", (table) => {
    table.dropUnique(["opportunity", "createdBy"]);
  });
  logger.info("Removed constraint on cwuProposals table.");
}
