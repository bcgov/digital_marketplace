import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  /**
   * create a new column called "order" in the "twuResources" table.
   * this column will be used to sort the resources in the UI.
   */
  await connection.schema.alterTable("twuResources", function (table) {
    table.integer("order").notNullable().defaultTo(0);
  });
  logger.info("Added order column to table twuResources");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuResources", function (table) {
    table.dropColumn("order");
  });
  logger.info("Dropped order column from table twuResources");
}
