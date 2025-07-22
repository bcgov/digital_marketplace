import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum TWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationResourceQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationChallenge = "EVAL_C",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum PreviousTWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationResourceQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationChallenge = "EVAL_C",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "twuOpportunityStatuses" \
    DROP CONSTRAINT "twuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "twuOpportunityStatuses" \
    ADD CONSTRAINT "twuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(TWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Added PROCESSING status to TWUOpportunityStatuses constraint.");
}

export async function down(connection: Knex): Promise<void> {
  // First update any rows with PROCESSING status back to EVALUATION_CHALLENGE
  await connection("twuOpportunityStatuses")
    .where({ status: "PROCESSING" })
    .update({ status: "EVAL_C" });

  await connection.schema.raw(
    ' \
    ALTER TABLE "twuOpportunityStatuses" \
    DROP CONSTRAINT "twuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "twuOpportunityStatuses" \
    ADD CONSTRAINT "twuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(PreviousTWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info(
    "Removed PROCESSING status from TWUOpportunityStatuses constraint."
  );
}
