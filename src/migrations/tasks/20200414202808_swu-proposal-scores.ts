import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.float("score");
  });
  logger.info("Completed modifying swuTeamQuestionResponses table.");

  await connection.schema.alterTable("swuProposals", (table) => {
    table.dropColumn("questionsScore");
  });
  logger.info("Completed modifying swuProposals table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.dropColumn("score");
  });
  logger.info("Completed reverting swuTeamQuestionResponses table.");

  await connection.schema.alterTable("swuProposals", (table) => {
    table.float("questionsScore");
  });
  logger.info("Completed reverting swuProposals table.");
}
