import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.float("score");
    }
  );
  logger.info("Completed modifying twuResourceQuestionResponses table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.dropColumn("score");
    }
  );
  logger.info("Completed reverting twuResourceQuestionResponses table.");
}
