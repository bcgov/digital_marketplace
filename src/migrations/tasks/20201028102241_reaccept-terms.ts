import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  // Alter users table
  await connection.schema.alterTable("users", (table) => {
    table.renameColumn("acceptedTerms", "acceptedTermsAt");
    table.timestamp("lastAcceptedTermsAt").nullable();
  });
  // Update new lastAcceptedTermsAt column with existing values from acceptedTermsAt
  await connection("users").update(
    "lastAcceptedTermsAt",
    connection.ref("acceptedTermsAt")
  );

  logger.info("Completed modifying users table.");
}

export async function down(connection: Knex): Promise<void> {
  // Revert users table
  await connection.schema.alterTable("users", (table) => {
    table.renameColumn("acceptedTermsAt", "acceptedTerms");
    table.dropColumn("lastAcceptedTermsAt");
  });

  logger.info("Completed reverting users table.");
}
