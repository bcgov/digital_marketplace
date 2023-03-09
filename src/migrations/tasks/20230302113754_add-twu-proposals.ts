import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum TWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReviewResourceQuestions = "UNDER_REVIEW_QUESTIONS",
  EvaluatedResourceQuestions = "EVALUATED_QUESTIONS",
  UnderReviewChallenge = "UNDER_REVIEW_CHALLENGE",
  EvaluatedChallenge = "EVALUATED_CHALLENGE",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

export enum TWUProposalEvent {
  QuestionsScoreEntered = "QUESTIONS_SCORE_ENTERED",
  ChallengeScoreEntered = "CHALLENGE_SCORE_ENTERED",
  PriceScoreEntered = "PRICE_SCORE_ENTERED"
}

export async function up(connection: Knex): Promise<void> {
  // Create TWUProposal table
  await connection.schema.createTable("twuProposals", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.timestamp("updatedAt").notNullable();
    table.uuid("updatedBy").references("id").inTable("users").notNullable();
    table.float("challengeScore");
    table.float("priceScore");
    table.uuid("opportunity").references("id").inTable("twuOpportunities");
    table.uuid("organization").references("id").inTable("organizations");
    table.text("anonymousProponentName").defaultTo("").notNullable();
    table.integer("hourlyRate").notNullable();
  });
  logger.info("Created twuProposals table.");

  // Create TWUProposalAttachment table
  await connection.schema.createTable("twuProposalAttachments", (table) => {
    table
      .uuid("proposal")
      .references("id")
      .inTable("twuProposals")
      .notNullable()
      .onDelete("CASCADE");
    table.uuid("file").references("id").inTable("files").notNullable();
    table.primary(["proposal", "file"]);
  });
  logger.info("Created twuProposalAttachments table.");

  // Create TWUProposalStatus table
  await connection.schema.createTable("twuProposalStatuses", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users");
    table
      .uuid("proposal")
      .references("id")
      .inTable("twuProposals")
      .notNullable()
      .onDelete("CASCADE");
    table.enu("status", Object.values(TWUProposalStatus)).notNullable();
    table.enu("event", Object.values(TWUProposalEvent));
    table.text("note");
  });
  await connection.schema.raw(`
      ALTER TABLE "twuProposalStatuses"
          ADD CONSTRAINT "eitherEventOrStatus" check (
                  ("event" IS NOT NULL AND "status" IS NULL)
                  OR
                  ("event" IS NULL AND "status" IS NOT NULL)
              )
  `);

  logger.info("Created twuProposalStatuses table.");

  await connection.schema.createTable("twuProposalMember", (table) => {
    table.uuid("member").references("id").inTable("users").notNullable();
    table
      .uuid("proposal")
      .references("id")
      .inTable("twuProposals")
      .notNullable();
    table.primary(["member", "proposal"]);
  });

  logger.info("Created twuProposalMember table.");

  await connection.schema.createTable(
    "twuResourceQuestionResponses",
    (table) => {
      table
        .uuid("proposal")
        .references("id")
        .inTable("twuProposals")
        .notNullable()
        .onDelete("CASCADE");
      table.integer("order").notNullable();
      table.string("response", 5000);
    }
  );
  logger.info("Created twuResourceQuestionResponses table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("twuProposalStatuses");
  await connection.schema.dropTable("twuProposalAttachments");
  await connection.schema.dropTable("twuProposals");
  await connection.schema.dropTable("twuProposalMember");
  await connection.schema.dropTable("twuProposalResourceQuestionResponses");
}
