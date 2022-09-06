import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuOpportunityPhases", (table) => {
    table.dropColumn("updatedBy");
    table.dropColumn("updatedAt");
    table.timestamp("completionDate").nullable().alter();
  });
  logger.info("Modified swuOpportunityPhases table.");

  await connection.schema.alterTable("swuPhaseCapabilities", (table) => {
    table.dropColumn("updatedBy");
    table.dropColumn("updatedAt");
  });
  logger.info("Modified swuPhaseCapabilities table.");

  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table.dropColumn("updatedBy");
    table.dropColumn("updatedAt");
  });
  logger.info("Modified swuTeamQuestions table.");

  await connection.schema.alterTable("swuOpportunityAttachments", (table) => {
    table.dropColumn("id");
    table.primary(
      ["opportunityVersion", "file"],
      "swuOpportunityAttachments_pkey"
    );
  });
  logger.info("Modified swuOpportunityAttachments table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuOpportunityPhases", (table) => {
    table
      .timestamp("updatedAt")
      .defaultTo(new Date().toDateString())
      .notNullable();
    table.uuid("updatedBy").references("id").inTable("users");
    table.timestamp("completionDate").notNullable().alter();
  });
  logger.info("Reverted swuOpportunityPhases table.");

  await connection.schema.alterTable("swuPhaseCapabilities", (table) => {
    table
      .timestamp("updatedAt")
      .defaultTo(new Date().toDateString())
      .notNullable();
    table.uuid("updatedBy").references("id").inTable("users");
  });
  logger.info("Reverted swuPhaseCapabilities table.");

  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table
      .timestamp("updatedAt")
      .defaultTo(new Date().toDateString())
      .notNullable();
    table.uuid("updatedBy").references("id").inTable("users");
  });
  logger.info("Reverted swuTeamQuestions table.");

  await connection.schema.alterTable("swuOpportunityAttachments", (table) => {
    table.dropPrimary("swuOpportunityAttachments_pkey");
    table.uuid("id");
  });
  const records = await connection("swuOpportunityAttachments").select("*");
  for (const record of records) {
    await connection("swuOpportunityAttachments")
      .where({
        opportunityVersion: record.opportunityVersion,
        file: record.file
      })
      .update({ id: generateUuid() });
  }
  await connection.schema.alterTable("swuOpportunityAttachments", (table) => {
    table.uuid("id").primary().unique().notNullable().alter();
  });
  logger.info("Reverted table swuOpportunityAttachments.");
}
