import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");
const now = new Date().toDateString();

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.timestamp("startDate").defaultTo(now).notNullable();
    table.timestamp("completionDate").defaultTo(now).notNullable();
  });
  logger.info(
    "Altered twuOpportunityVersions table by adding startDate and completionDate columns."
  );
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.dropColumn("startDate");
    table.dropColumn("completionDate");
  });
  logger.info(
    "Completed reverting twuOpportunityVersions table by dropping startDate and completionDate columns."
  );
}
