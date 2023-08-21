import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.text("response").notNullable().alter();
    }
  );
  logger.info("Modified twuResourceQuestionResponses");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.string("response").notNullable().alter();
    }
  );
  logger.info("Reverted twuResourceQuestionResponses");
}
