import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  // Create the new idpId column.
  await connection.schema.alterTable("users", (table) => {
    table.text("idpId");
  });

  // Update the new column with values from the idpUsername column
  await connection("users").update("idpId", connection.ref("idpUsername"));

  // Set the idpId column as not nullable and unique on idpId and account.
  await connection.schema.alterTable("users", (table) => {
    table.text("idpId").notNullable().alter();
    table.unique(["idpId", "type"]);
  });
  logger.info("Completed modifying users table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.dropColumn("idpId");
  });
  logger.info("Completed reverting users table.");
}
