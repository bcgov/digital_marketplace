import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  // Add indexes for opportunity statuses tables
  await connection.schema.alterTable("swuOpportunityStatuses", (table) => {
    table.index(["opportunity", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to swuOpportunityStatuses table");

  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.index(["opportunity", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to cwuOpportunityStatuses table");

  await connection.schema.alterTable("twuOpportunityStatuses", (table) => {
    table.index(["opportunity", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to twuOpportunityStatuses table");

  // Add indexes for opportunity versions tables
  await connection.schema.alterTable("swuOpportunityVersions", (table) => {
    table.index(["opportunity", "createdAt"]);
  });
  logger.info("Added indexes to swuOpportunityVersions table");

  await connection.schema.alterTable("cwuOpportunityVersions", (table) => {
    table.index(["opportunity", "createdAt"]);
  });
  logger.info("Added indexes to cwuOpportunityVersions table");

  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.index(["opportunity", "createdAt"]);
  });
  logger.info("Added indexes to twuOpportunityVersions table");

  // Add indexes for proposal statuses tables
  await connection.schema.alterTable("swuProposalStatuses", (table) => {
    table.index(["proposal", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to swuProposalStatuses table");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.index(["proposal", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to cwuProposalStatuses table");

  await connection.schema.alterTable("twuProposalStatuses", (table) => {
    table.index(["proposal", "createdAt"]);
    table.index(["status"]);
  });
  logger.info("Added indexes to twuProposalStatuses table");

  // Add indexes for affiliations
  await connection.schema.alterTable("affiliations", (table) => {
    table.index(["user", "organization"]);
    table.index(["membershipStatus"]);
  });
  logger.info("Added indexes to affiliations table");

  // Add indexes for organization service areas
  await connection.schema.alterTable("twuOrganizationServiceAreas", (table) => {
    table.index(["organization", "serviceArea"]);
  });
  logger.info("Added indexes to twuOrganizationServiceAreas table");

  // Add indexes for opportunity attachments
  await connection.schema.alterTable("swuOpportunityAttachments", (table) => {
    table.index(["opportunityVersion"]);
  });
  logger.info("Added indexes to swuOpportunityAttachments table");

  await connection.schema.alterTable("cwuOpportunityAttachments", (table) => {
    table.index(["opportunityVersion"]);
  });
  logger.info("Added indexes to cwuOpportunityAttachments table");

  await connection.schema.alterTable("twuOpportunityAttachments", (table) => {
    table.index(["opportunityVersion"]);
  });
  logger.info("Added indexes to twuOpportunityAttachments table");

  // Add indexes for opportunity addenda
  await connection.schema.alterTable("swuOpportunityAddenda", (table) => {
    table.index(["opportunity"]);
  });
  logger.info("Added indexes to swuOpportunityAddenda table");

  await connection.schema.alterTable("cwuOpportunityAddenda", (table) => {
    table.index(["opportunity"]);
  });
  logger.info("Added indexes to cwuOpportunityAddenda table");

  await connection.schema.alterTable("twuOpportunityAddenda", (table) => {
    table.index(["opportunity"]);
  });
  logger.info("Added indexes to twuOpportunityAddenda table");
}

export async function down(connection: Knex): Promise<void> {
  // Remove indexes from opportunity statuses tables
  await connection.schema.alterTable("swuOpportunityStatuses", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
    table.dropIndex(["status"]);
  });
  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
    table.dropIndex(["status"]);
  });
  await connection.schema.alterTable("twuOpportunityStatuses", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
    table.dropIndex(["status"]);
  });

  // Remove indexes from opportunity versions tables
  await connection.schema.alterTable("swuOpportunityVersions", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
  });
  await connection.schema.alterTable("cwuOpportunityVersions", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
  });
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.dropIndex(["opportunity", "createdAt"]);
  });

  // Remove indexes from proposal statuses tables
  await connection.schema.alterTable("swuProposalStatuses", (table) => {
    table.dropIndex(["proposal", "createdAt"]);
    table.dropIndex(["status"]);
  });
  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.dropIndex(["proposal", "createdAt"]);
    table.dropIndex(["status"]);
  });
  await connection.schema.alterTable("twuProposalStatuses", (table) => {
    table.dropIndex(["proposal", "createdAt"]);
    table.dropIndex(["status"]);
  });

  // Remove indexes from affiliations
  await connection.schema.alterTable("affiliations", (table) => {
    table.dropIndex(["user", "organization"]);
    table.dropIndex(["membershipStatus"]);
  });

  // Remove indexes from organization service areas
  await connection.schema.alterTable("twuOrganizationServiceAreas", (table) => {
    table.dropIndex(["organization", "serviceArea"]);
  });

  // Remove indexes from opportunity attachments
  await connection.schema.alterTable("swuOpportunityAttachments", (table) => {
    table.dropIndex(["opportunityVersion"]);
  });
  await connection.schema.alterTable("cwuOpportunityAttachments", (table) => {
    table.dropIndex(["opportunityVersion"]);
  });
  await connection.schema.alterTable("twuOpportunityAttachments", (table) => {
    table.dropIndex(["opportunityVersion"]);
  });

  // Remove indexes from opportunity addenda
  await connection.schema.alterTable("swuOpportunityAddenda", (table) => {
    table.dropIndex(["opportunity"]);
  });
  await connection.schema.alterTable("cwuOpportunityAddenda", (table) => {
    table.dropIndex(["opportunity"]);
  });
  await connection.schema.alterTable("twuOpportunityAddenda", (table) => {
    table.dropIndex(["opportunity"]);
  });
}
