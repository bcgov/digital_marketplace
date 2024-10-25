import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum SWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationTeamQuestionsPanel = "EVAL_QUESTIONS_PANEL",
  EvaluationTeamQuestions = "EVAL_QUESTIONS",
  EvaluationCodeChallenge = "EVAL_CC",
  EvaluationTeamScenario = "EVAL_SCENARIO",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum PreviousSWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationTeamQuestions = "EVAL_QUESTIONS",
  EvaluationCodeChallenge = "EVAL_CC",
  EvaluationTeamScenario = "EVAL_SCENARIO",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum SWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  TeamQuestionsPanelIndividual = "QUESTIONS_PANEL_INDIVIDUAL",
  TeamQuestionsPanelConsensus = "QUESTIONS_PANEL_CONESENSUS",
  UnderReviewTeamQuestions = "UNDER_REVIEW_QUESTIONS",
  EvaluatedTeamQuestions = "EVALUATED_QUESTIONS",
  UnderReviewCodeChallenge = "UNDER_REVIEW_CODE_CHALLENGE",
  EvaluatedCodeChallenge = "EVALUATED_CODE_CHALLENGE",
  UnderReviewTeamScenario = "UNDER_REVIEW_TEAM_SCENARIO",
  EvaluatedTeamScenario = "EVALUATED_TEAM_SCENARIO",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

enum PreviousSWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReviewTeamQuestions = "UNDER_REVIEW_QUESTIONS",
  EvaluatedTeamQuestions = "EVALUATED_QUESTIONS",
  UnderReviewCodeChallenge = "UNDER_REVIEW_CODE_CHALLENGE",
  EvaluatedCodeChallenge = "EVALUATED_CODE_CHALLENGE",
  UnderReviewTeamScenario = "UNDER_REVIEW_TEAM_SCENARIO",
  EvaluatedTeamScenario = "EVALUATED_TEAM_SCENARIO",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

enum SWUTeamQuestionResponseEvaluationType {
  Consensus = "CONSENSUS",
  Individual = "INDIVIDUAL"
}

export enum SWUTeamQuestionResponseEvaluationStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
      ALTER TABLE "swuProposalStatuses" \
      DROP CONSTRAINT "swuProposalStatuses_status_check" \
    '
  );

  await connection.schema.raw(` \
    ALTER TABLE "swuProposalStatuses" \
    ADD CONSTRAINT "swuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(SWUProposalStatus).join("','")}')) \
  `);
  logger.info("Modified constraint on swuProposalStatuses");

  await connection.schema.raw(
    ' \
      ALTER TABLE "swuOpportunityStatuses" \
      DROP CONSTRAINT "swuOpportunityStatuses_status_check" \
    '
  );

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(SWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Modified constraint on swuOpportunityStatuses");

  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluations",
    (table) => {
      table
        .uuid("proposal")
        .references("id")
        .inTable("swuProposals")
        .notNullable()
        .onDelete("CASCADE");
      table
        .uuid("evaluationPanelMember")
        .references("id")
        .inTable("swuEvaluationPanelMembers")
        .notNullable()
        .onDelete("CASCADE");
      table.uuid("id").primary().unique().notNullable();
      table
        .enu("type", Object.values(SWUTeamQuestionResponseEvaluationType))
        .notNullable();
      table.timestamp("createdAt").notNullable();
      table.timestamp("updatedAt").notNullable();
    }
  );
  logger.info("Created swuTeamQuestionResponseEvaluations table.");

  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluationScores",
    (table) => {
      table
        .uuid("teamQuestionResponseEvaluation")
        .references("id")
        .inTable("swuTeamQuestionResponseEvaluations")
        .notNullable()
        .onDelete("CASCADE");
      table.integer("order").notNullable();
      table.float("score").notNullable();
      table.text("notes").notNullable();
    }
  );
  logger.info("Created swuTeamQuestionResponseEvaluationScores table.");

  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluationStatuses",
    (table) => {
      table.uuid("id").primary().unique().notNullable();
      table.timestamp("createdAt").notNullable();
      table.uuid("createdBy").references("id").inTable("users");
      table
        .uuid("teamQuestionResponseEvaluation")
        .references("id")
        .inTable("swuTeamQuestionResponseEvaluations")
        .notNullable()
        .onDelete("CASCADE");
      table
        .enu("status", Object.values(SWUTeamQuestionResponseEvaluationStatus))
        .notNullable();
      table.string("note");
    }
  );
  logger.info("Created swuTeamQuestionResponseEvaluationStatuses table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
      ALTER TABLE "swuProposalStatuses" \
      DROP CONSTRAINT "swuProposalStatuses_status_check" \
    '
  );

  await connection("swuProposalStatuses")
    .where({ status: "QUESTIONS_PANEL_INDIVIDUAL" })
    .where({ status: "QUESTIONS_PANEL_CONSENSUS" })
    .del();

  await connection.schema.raw(` \
    ALTER TABLE "swuProposalStatuses" \
    ADD CONSTRAINT "swuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousSWUProposalStatus).join(
      "','"
    )}')) \
  `);
  logger.info("Reverted constraint on swuProposalStatuses");

  await connection.schema.raw(
    ' \
      ALTER TABLE "swuOpportunityStatuses" \
      DROP CONSTRAINT "swuOpportunityStatuses_status_check" \
    '
  );

  await connection("swuOpportunityStatuses")
    .where({ status: "EVAL_QUESTIONS_PANEL" })
    .del();

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousSWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info("Reverted constraint on swuOpportunityStatuses");

  await connection.schema.dropTable(
    "swuTeamQuestionResponseEvaluationStatuses"
  );
  logger.info("Dropped table swuTeamQuestionResponseEvaluationStatuses");

  await connection.schema.dropTable("swuTeamQuestionResponseEvaluationScores");
  logger.info("Dropped table swuTeamQuestionResponseEvaluationScores");

  await connection.schema.dropTable("swuTeamQuestionResponseEvaluations");
  logger.info("Dropped table swuTeamQuestionResponseEvaluations");
}
