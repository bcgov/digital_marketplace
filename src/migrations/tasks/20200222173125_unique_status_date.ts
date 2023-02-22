import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.unique(["opportunity", "createdAt", "status"]);
  });
  logger.info("Added unique constraint to cwuOpportunityStatuses table.");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.unique(["proposal", "createdAt", "status"]);
  });
  logger.info("Added unique constraint to cwuOpportunityProposals table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.dropUnique(["opportunity", "createdAt", "status"]);
  });
  logger.info("Removed unique constraint on cwuOpportunityStatuses table.");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.dropUnique(["proposal", "createdAt", "status"]);
  });
  logger.info("Removed unique constraint on cwuProposalStatuses table.");
}
