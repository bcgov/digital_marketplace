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
  EvaluationCodeChallenge = "EVAL_CC",
  EvaluationTeamScenario = "EVAL_SCENARIO",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum PreviousSWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationTeamQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationTeamQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationCodeChallenge = "EVAL_CC",
  EvaluationTeamScenario = "EVAL_SCENARIO",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "swuOpportunityStatuses" \
    DROP CONSTRAINT "swuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(SWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Added PROCESSING status to SWUOpportunityStatuses constraint.");
}

export async function down(connection: Knex): Promise<void> {
  // First update any rows with PROCESSING status back to EVALUATION_TEAM_SCENARIO
  await connection("swuOpportunityStatuses")
    .where({ status: "PROCESSING" })
    .update({ status: "EVAL_SCENARIO" });

  await connection.schema.raw(
    ' \
    ALTER TABLE "swuOpportunityStatuses" \
    DROP CONSTRAINT "swuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(PreviousSWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info(
    "Removed PROCESSING status from SWUOpportunityStatuses constraint."
  );
}
