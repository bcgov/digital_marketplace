import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.float("questionsScore").alter();
    table.float("challengeScore").alter();
    table.float("scenarioScore").alter();
    table.float("priceScore").alter();
  });
  logger.info("Completed modifying swuProposals table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.integer("questionsScore").alter();
    table.integer("challengeScore").alter();
    table.integer("scenarioScore").alter();
    table.integer("priceScore").alter();
  });
  logger.info("Completed reverting swuProposals table.");
}
