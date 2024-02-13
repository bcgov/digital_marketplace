import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export enum AffiliationEvent {
  AdminStatusGranted = "ADMIN_STATUS_GRANTED",
  AdminStatusRevoked = "ADMIN_STATUS_REVOKED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable("affiliationEvents", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("affiliation")
      .references("id")
      .inTable("affiliations")
      .notNullable()
      .onDelete("CASCADE");
    table.enu("event", Object.values(AffiliationEvent)).notNullable();
  });

  logger.info("Created affiliationEvents table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("affiliationEvents");
  logger.info("Completed dropping affiliationEvents table.");
}
