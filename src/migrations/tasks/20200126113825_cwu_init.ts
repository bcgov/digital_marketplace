import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

enum CWUOpportunityStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
  Evaluation = "EVALUATION",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum CWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  Review = "REVIEW",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  // Create CWUOpportunity table
  await connection.schema.createTable("cwuOpportunities", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
  });
  logger.info("Created cwuOpportunities table.");

  // Create CWUOpportunityVersion table
  await connection.schema.createTable("cwuOpportunityVersions", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("opportunity")
      .references("id")
      .inTable("cwuOpportunities")
      .notNullable();
    table.string("title").notNullable();
    table.string("teaser").notNullable();
    table.boolean("remoteOk").defaultTo(false).notNullable();
    table.string("remoteDesc").notNullable();
    table.string("location").notNullable();
    table.integer("reward").notNullable();
    table.specificType("skills", "text ARRAY").notNullable();
    table.string("description").notNullable();
    table.timestamp("proposalDeadline").notNullable();
    table.timestamp("assignmentDate").notNullable();
    table.timestamp("startDate").notNullable();
    table.timestamp("completionDate");
    table.string("submissionInfo").notNullable();
    table.string("acceptanceCriteria").notNullable();
    table.string("evaluationCriteria").notNullable();
  });
  logger.info("Created cwuOpportunityVersions table.");

  // Create CWUOpportunityStatus table
  await connection.schema.createTable("cwuOpportunityStatuses", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("opportunity")
      .references("id")
      .inTable("cwuOpportunities")
      .notNullable();
    table.enu("status", Object.values(CWUOpportunityStatus)).notNullable();
    table.string("note");
  });
  logger.info("Created cwuOpportunityStatuses table.");

  // Create CWUOpportunityAttachment table
  await connection.schema.createTable("cwuOpportunityAttachments", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("cwuOpportunityVersions")
      .notNullable();
    table.uuid("file").references("id").inTable("files").notNullable();
  });
  logger.info("Created cwuOpportunityAttachments table.");

  // Create CWUOpportunityAddendum table
  await connection.schema.createTable("cwuOpportunityAddenda", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("opportunity")
      .references("id")
      .inTable("cwuOpportunities")
      .notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.string("description").notNullable();
  });
  logger.info("Created cwuOpportunityAddenda table.");

  // Create CWUProponent table
  await connection.schema.createTable("cwuProponents", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.timestamp("updatedAt").notNullable();
    table.uuid("updatedBy").references("id").inTable("users").notNullable();
    table.string("legalName").notNullable();
    table.string("email").notNullable();
    table.string("phone");
    table.string("streetAddress1").notNullable();
    table.string("streetAddress2");
    table.string("city").notNullable();
    table.string("region").notNullable();
    table.string("mailCode").notNullable();
    table.string("country").notNullable();
  });
  logger.info("Created cwuProponents table.");

  // Create CWUProposal table
  await connection.schema.createTable("cwuProposals", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.timestamp("updatedAt").notNullable();
    table.uuid("updatedBy").references("id").inTable("users").notNullable();
    table.string("proposalText").notNullable();
    table.string("additionalComments").notNullable();
    table.uuid("proponentIndividual").references("id").inTable("cwuProponents");
    table.uuid("proponentOrg").references("id").inTable("organizations");
    table.float("score");
  });
  logger.info("Created cwuProposals table.");

  // Add constraint to CWUProposal table (proponent is either individual or org - not both)
  await connection.schema.raw(`
  ALTER TABLE "cwuProposals"
  ADD CONSTRAINT "eitherProponentOrOrg" check(
    ("proponentIndividual" IS NOT NULL AND "proponentOrg" IS NULL)
    OR
    ("proponentIndividual" IS NULL AND "proponentOrg" IS NOT NULL)
  )
  `);
  logger.info("Added constraint 'eitherProponentOrOrg' to cwuProposals table.");

  // Create CWUProposalAttachment table
  await connection.schema.createTable("cwuProposalAttachments", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("proposal")
      .references("id")
      .inTable("cwuProposals")
      .notNullable();
    table.uuid("file").references("id").inTable("files").notNullable();
  });
  logger.info("Created cwuProposalAttachments table.");

  // Create CWUProposalStatus table
  await connection.schema.createTable("cwuProposalStatuses", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("proposal")
      .references("id")
      .inTable("cwuProposals")
      .notNullable();
    table.enu("status", Object.values(CWUProposalStatus)).notNullable();
  });
  logger.info("Created cwuProposalStatuses table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("cwuProposalStatuses");
  await connection.schema.dropTable("cwuProposalAttachments");
  await connection.schema.dropTable("cwuProposals");
  await connection.schema.dropTable("cwuProponents");
  await connection.schema.dropTable("cwuOpportunityAddenda");
  await connection.schema.dropTable("cwuOpportunityAttachments");
  await connection.schema.dropTable("cwuOpportunityStatuses");
  await connection.schema.dropTable("cwuOpportunityVersions");
  await connection.schema.dropTable("cwuOpportunities");
}
