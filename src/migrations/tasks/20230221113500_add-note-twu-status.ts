import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityStatuses", (table) => {
    table.text("note");
  });
  logger.info("Modified twuOpportunityStatuses table by adding 'note' column.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityStatuses", (table) => {
    table.dropColumn("note");
  });
  logger.info(
    "Reverted twuOpportunityStatuses table by dropping 'note' column."
  );
}
