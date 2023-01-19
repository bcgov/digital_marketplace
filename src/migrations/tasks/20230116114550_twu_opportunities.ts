import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export enum TWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestions = "EVAL_QUESTIONS",
  EvaluationChallenge = "EVAL_C",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export enum TWUOpportunityEvent {
  Edited = "EDITED",
  AddendumAdded = "ADDENDUM_ADDED",
}

enum TWUServiceArea {
  Developer = "DEVELOPER",
  DataSpecialist = "DATA_SPECIALIST",
  ScrumMaster = "SCRUM_MASTER",
  DevopsSpecialist = "DEVOPS_SPECIALIST"
}

// eslint-disable-next-line no-empty
export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable("twuOpportunities", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
  });
  logger.info("Created twuOpportunities table.");

  await connection.schema.createTable("twuOpportunityVersions", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("opportunity")
      .references("id")
      .inTable("twuOpportunities")
      .notNullable()
      .onDelete("CASCADE");
    table.text("title").notNullable();
    table.text("teaser").notNullable();
    table.boolean("remoteOk").defaultTo(false).notNullable();
    table.text("remoteDesc").notNullable();
    table.text("location").notNullable();
    table.integer("maxBudget").notNullable();
    table.specificType("mandatorySkills", "text ARRAY").notNullable();
    table.specificType("optionalSkills", "text ARRAY").notNullable();
    table.text("description").notNullable();
    table.timestamp("proposalDeadline").notNullable();
    table.timestamp("assignmentDate").notNullable();
    table.integer("questionsWeight").notNullable();
    table.integer("challengeWeight").notNullable();
    table.integer("priceWeight").notNullable();
    table.enu("serviceArea", Object.values(TWUServiceArea)).notNullable();
    table.integer("targetAllocation").notNullable();
  });
  logger.info("Created twuOpportunityVersions table.");

  await connection.schema.createTable("twuOpportunityStatuses", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users");
    table
      .uuid("opportunity")
      .references("id")
      .inTable("twuOpportunities")
      .notNullable()
      .onDelete("CASCADE");
    table.enu("status", Object.values(TWUOpportunityStatus)).nullable();
    table.enu("event", Object.values(TWUOpportunityEvent)).nullable();
  });

  await connection.schema.raw(`
    ALTER TABLE "twuOpportunityStatuses"
    ADD CONSTRAINT "eitherEventOrStatus" check(
      ("event" IS NOT NULL AND "status" IS NULL)
      OR
      ("event" IS NULL AND "status" IS NOT NULL)
    )
  `);

  logger.info("Created twuOpportunityStatuses table.");

  await connection.schema.createTable("twuOpportunityAttachments", (table) => {
    table.primary(
      ["opportunityVersion", "file"],
      "twuOpportunityAttachments_pkey"
    );
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("twuOpportunityVersions")
      .notNullable()
      .onDelete("CASCADE");
    table.uuid("file").references("id").inTable("files").notNullable();
  });

  logger.info("Created twuOpportunityAttachments table.");

  await connection.schema.createTable("twuOpportunityAddenda", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("opportunity")
      .references("id")
      .inTable("twuOpportunities")
      .notNullable()
      .onDelete("CASCADE");
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.text("description").notNullable();
  });
  logger.info("Created twuOpportunityAddenda table.");

  await connection.schema.createTable("twuResourceQuestions", (table) => {
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("twuOpportunityVersions")
      .notNullable()
      .onDelete("CASCADE");
    table.text("question").notNullable();
    table.text("guideline").notNullable();
    table.integer("score").notNullable();
    table.integer("wordLimit").notNullable();
    table.integer("order").notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.primary(["order", "opportunityVersion"]);
  });
  logger.info("Created twuResourceQuestions table.");
}

// eslint-disable-next-line no-empty
export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("twuResourceQuestions");
  logger.info("Dropped table twuResourceQuestions");
  await connection.schema.dropTable("twuOpportunityAddenda");
  logger.info("Dropped table twuOpportunityAddenda");
  await connection.schema.dropTable("twuOpportunityAttachments");
  logger.info("Dropped table twuOpportunityAttachments");
  await connection.schema.dropTable("twuOpportunityStatuses");
  logger.info("Dropped table twuOpportunityStatuses");
  await connection.schema.dropTable("twuOpportunityVersions");
  logger.info("Dropped table twuOpportunityVersions");
  await connection.schema.dropTable("twuOpportunities");
  logger.info("Dropped table twuOpportunities");
}
