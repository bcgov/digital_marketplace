import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuOpportunityAddenda", (table) => {
    table.text("description").notNullable().alter();
  });
  logger.info("Modified cwuOpportunityAddenda table.");

  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.text("note").alter();
  });
  logger.info("Modified cwuOpportunityStatuses table.");

  await connection.schema.alterTable("cwuOpportunityVersions", (table) => {
    table.text("title").notNullable().alter();
    table.text("teaser").notNullable().alter();
    table.text("remoteDesc").notNullable().alter();
    table.text("description").notNullable().alter();
    table.text("submissionInfo").notNullable().alter();
    table.text("acceptanceCriteria").notNullable().alter();
    table.text("evaluationCriteria").notNullable().alter();
  });
  logger.info("Modified cwuOpportunityVersions table.");

  await connection.schema.alterTable("cwuProponents", (table) => {
    table.text("legalName").notNullable().alter();
    table.text("email").notNullable().alter();
    table.text("phone").notNullable().alter();
    table.text("street1").notNullable().alter();
    table.text("street2").notNullable().alter();
    table.text("city").notNullable().alter();
    table.text("region").notNullable().alter();
    table.text("mailCode").notNullable().alter();
    table.text("country").notNullable().alter();
  });
  logger.info("Modified cwuProponents table.");

  await connection.schema.alterTable("cwuProposals", (table) => {
    table.text("proposalText").notNullable().alter();
    table.text("additionalComments").notNullable().alter();
  });
  logger.info("Modified cwuProposals table.");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.text("note").alter();
  });
  logger.info("Modified cwuProposalStatuses table.");

  // Need to use raw here due to Knex limitations on modifying primary keys
  await connection.schema.raw(`
    ALTER TABLE "fileBlobs" ALTER COLUMN hash TYPE TEXT;
  `);
  logger.info("Modified fileBlobs table.");

  await connection.schema.alterTable("files", (table) => {
    table.text("name").notNullable().alter();
    table.text("fileBlob").notNullable().alter();
  });
  logger.info("Modified files table.");

  await connection.schema.alterTable("organizations", (table) => {
    table.text("legalName").notNullable().alter();
    table.text("websiteUrl").alter();
    table.text("streetAddress1").notNullable().alter();
    table.text("streetAddress2").alter();
    table.text("city").notNullable().alter();
    table.text("region").notNullable().alter();
    table.text("mailCode").notNullable().alter();
    table.text("country").notNullable().alter();
    table.text("contactName").notNullable().alter();
    table.text("contactTitle").alter();
    table.text("contactEmail").notNullable().alter();
    table.text("contactPhone").alter();
  });
  logger.info("Modified organizations table.");

  await connection.schema.alterTable("sessions", (table) => {
    table.text("accessToken").alter();
  });
  logger.info("Modified sessions table.");

  await connection.schema.alterTable("swuOpportunityAddenda", (table) => {
    table.text("description").notNullable().alter();
  });
  logger.info("Modified swuOpportunityAddenda table.");

  await connection.schema.alterTable("swuOpportunityStatuses", (table) => {
    table.text("note").alter();
  });
  logger.info("Modified swuOpportunityStatuses table.");

  await connection.schema.alterTable("swuOpportunityVersions", (table) => {
    table.text("title").notNullable().alter();
    table.text("teaser").notNullable().alter();
    table.text("remoteDesc").notNullable().alter();
    table.text("location").notNullable().alter();
    table.text("description").notNullable().alter();
  });
  logger.info("Modified swuOpportunityVersions table.");

  await connection.schema.alterTable("swuProposalReferences", (table) => {
    table.text("name").notNullable().alter();
    table.text("company").notNullable().alter();
    table.text("phone").notNullable().alter();
    table.text("email").notNullable().alter();
  });
  logger.info("Modified swuProposalReferences table.");

  await connection.schema.alterTable("swuProposalStatuses", (table) => {
    table.text("note").alter();
  });
  logger.info("Modified swuProposalStatuses table.");

  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.text("response").notNullable().alter();
  });
  logger.info("Modified swuTeamQuestionResponses");

  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table.text("question").notNullable().alter();
    table.text("guideline").notNullable().alter();
  });
  logger.info("Modified swuTeamQuestions");

  await connection.schema.alterTable("users", (table) => {
    table.text("name").notNullable().alter();
    table.text("email").alter();
    table.text("jobTitle").alter();
    table.text("idpUsername").notNullable().alter();
    table.text("name").notNullable().alter();
  });
  logger.info("Modified users table.");

  // Need to use raw here due to Knex limitations on modifying primary keys
  await connection.schema.raw(`
    ALTER TABLE "viewCounters" ALTER COLUMN name TYPE TEXT;
  `);
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuOpportunityAddenda", (table) => {
    table.string("description").notNullable().alter();
  });
  logger.info("Reverted cwuOpportunityAddenda table.");

  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.string("note").alter();
  });
  logger.info("Reverted cwuOpportunityStatuses table.");

  await connection.schema.alterTable("cwuOpportunityVersions", (table) => {
    table.string("title").notNullable().alter();
    table.string("teaser").notNullable().alter();
    table.string("remoteDesc").notNullable().alter();
    table.string("description").notNullable().alter();
    table.string("submissionInfo").notNullable().alter();
    table.string("acceptanceCriteria").notNullable().alter();
    table.string("evaluationCriteria").notNullable().alter();
  });
  logger.info("Reverted cwuOpportunityVersions table.");

  await connection.schema.alterTable("cwuProposals", (table) => {
    table.string("proposalText").notNullable().alter();
    table.string("additionalComments").notNullable().alter();
  });
  logger.info("Reverted cwuProposals table.");

  await connection.schema.alterTable("swuOpportunityAddenda", (table) => {
    table.string("description").notNullable().alter();
  });
  logger.info("Reverted swuOpportunityAddenda table.");

  await connection.schema.alterTable("swuOpportunityStatuses", (table) => {
    table.string("note").notNullable().alter();
  });
  logger.info("Reverted swuOpportunityStatuses table.");

  await connection.schema.alterTable("swuOpportunityVersions", (table) => {
    table.string("title").notNullable().alter();
    table.string("teaser").notNullable().alter();
    table.string("remoteDesc").notNullable().alter();
    table.string("location").notNullable().alter();
    table.string("description").notNullable().alter();
  });
  logger.info("Reverted swuOpportunityVersions table.");

  await connection.schema.alterTable("cwuProponents", (table) => {
    table.string("legalName").notNullable().alter();
    table.string("email").notNullable().alter();
    table.string("phone").notNullable().alter();
    table.string("street1").notNullable().alter();
    table.string("street2").notNullable().alter();
    table.string("city").notNullable().alter();
    table.string("region").notNullable().alter();
    table.string("mailCode").notNullable().alter();
    table.string("country").notNullable().alter();
  });
  logger.info("Reverted cwuProponents table.");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.string("note").alter();
  });
  logger.info("Reverted cwuProposalStatuses table.");

  // Need to use raw here due to Knex limitations on modifying primary keys
  await connection.schema.raw(`
    ALTER TABLE "fileBlobs" ALTER COLUMN hash TYPE VARCHAR(255);
  `);
  logger.info("Reverted fileBlobs table.");

  await connection.schema.alterTable("files", (table) => {
    table.string("name").notNullable().alter();
    table.string("fileBlob").notNullable().alter();
  });
  logger.info("Reverted files table.");

  await connection.schema.alterTable("organizations", (table) => {
    table.string("legalName").notNullable().alter();
    table.string("websiteUrl").alter();
    table.string("streetAddress1").notNullable().alter();
    table.string("streetAddress2").alter();
    table.string("city").notNullable().alter();
    table.string("region").notNullable().alter();
    table.string("mailCode").notNullable().alter();
    table.string("country").notNullable().alter();
    table.string("contactName").notNullable().alter();
    table.string("contactTitle").alter();
    table.string("contactEmail").notNullable().alter();
    table.string("contactPhone").alter();
  });
  logger.info("Reverted organizations table.");

  await connection.schema.alterTable("sessions", (table) => {
    table.string("accessToken").alter();
  });
  logger.info("Reverted sessions table.");

  await connection.schema.alterTable("swuProposalReferences", (table) => {
    table.string("name").notNullable().alter();
    table.string("company").notNullable().alter();
    table.string("phone").notNullable().alter();
    table.string("email").notNullable().alter();
  });
  logger.info("Reverted swuProposalReferences table.");

  await connection.schema.alterTable("swuProposalStatuses", (table) => {
    table.string("note").alter();
  });
  logger.info("Reverted swuProposalStatuses table.");

  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.string("response").notNullable().alter();
  });
  logger.info("Reverted swuTeamQuestionResponses");

  await connection.schema.alterTable("swuTeamQuestions", (table) => {
    table.string("question").notNullable().alter();
    table.string("guideline").notNullable().alter();
  });
  logger.info("Reverted swuTeamQuestions");

  await connection.schema.alterTable("users", (table) => {
    table.string("name").notNullable().alter();
    table.string("email").alter();
    table.string("jobTitle").alter();
    table.string("idpUsername").notNullable().alter();
    table.string("name").notNullable().alter();
  });
  logger.info("Reverted users table.");

  // Need to use raw here due to Knex limitations on modifying primary keys
  await connection.schema.raw(`
    ALTER TABLE "viewCounters" ALTER COLUMN name TYPE VARCHAR(255);
  `);
  logger.info("Reverted viewCounters table.");
}
