import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum SWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationTeamQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationTeamQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationTeamQuestionsReview = "EVAL_QUESTIONS_REVIEW",
  EvaluationTeamQuestionsChairSubmission = "EVAL_QUESTIONS_CHAIR_SUBMISSION",
  EvaluationTeamQuestionsAdminReview = "EVAL_QUESTIONS_ADMIN_REVIEW",
  EvaluationTeamQuestions = "EVAL_QUESTIONS", // TODO: Remove
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
  EvaluationTeamQuestionsIndividual = "EVALUATION_QUESTIONS_INDIVIDUAL",
  EvaluationTeamQuestionsConsensus = "EVALUATION_QUESTIONS_CONSENSUS",
  UnderReviewTeamQuestions = "UNDER_REVIEW_QUESTIONS", // TODO: Remove
  EvaluatedTeamQuestions = "EVALUATED_QUESTIONS", // TODO: Remove
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
    .where({ status: "EVALUATION_QUESTIONS_INDIVIDUAL" })
    .orWhere({ status: "EVALUATION_QUESTIONS_CONSENSUS" })
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
    .where({ status: "EVAL_QUESTIONS_INDIVIDUAL" })
    .orWhere({ status: "EVAL_QUESTIONS_CONSENSUS" })
    .orWhere({ status: "EVAL_QUESTIONS_REVIEW" })
    .orWhere({ status: "EVAL_QUESTIONS_CHAIR_SUBMISSION" })
    .orWhere({ status: "EVAL_QUESTIONS_ADMIN_REVIEW" })
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
