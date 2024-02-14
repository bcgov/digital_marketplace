import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("organizations", (table) => {
    table.timestamp("acceptedTWUTerms").nullable();
  });
  logger.info("Modified organizations table.");

  await connection.schema.alterTable("serviceAreas", (table) => {
    table.unique(["serviceArea"]);
  });
  logger.info("Modified serviceAreas table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("organizations", (table) => {
    table.dropColumn("acceptedTWUTerms");
  });
  logger.info("Reverted organizations table.");

  await connection.schema.alterTable("serviceAreas", (table) => {
    table.dropUnique(["serviceArea"]);
  });
  logger.info("Modified serviceAreas table.");
}
