import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table.integer("minimumScore").nullable();
  });
  logger.info("Modified swuTeamQuestions");

  await connection.schema.alterTable("twuResourceQuestions", (table) => {
    table.integer("minimumScore").nullable();
  });
  logger.info("Modified twuResourceQuestions");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table.dropColumn("minimumScore");
  });
  logger.info("Reverted swuTeamQuestions table.");

  await connection.schema.alterTable("twuResourceQuestions", (table) => {
    table.dropColumn("minimumScore");
  });
  logger.info("Reverted twuResourceQuestions table.");
}
