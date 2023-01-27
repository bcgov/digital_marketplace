import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

// eslint-disable-next-line no-empty
export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.timestamp("startDate").notNullable();
    table.timestamp("completionDate").notNullable();
  });
  logger.info(
    "Altered twuOpportunityVersions table by adding startDate and completionDate columns."
  );
}

// eslint-disable-next-line no-empty
export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.dropColumn("startDate");
    table.dropColumn("completionDate");
  });
  logger.info(
    "Completed reverting twuOpportunityVersions table by dropping startDate and completionDate columns."
  );
}
