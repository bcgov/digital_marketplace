import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum CWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  Evaluation = "EVALUATION",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum PreviousCWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  Evaluation = "EVALUATION",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "cwuOpportunityStatuses" \
    DROP CONSTRAINT "cwuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "cwuOpportunityStatuses" \
    ADD CONSTRAINT "cwuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(CWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Added PROCESSING status to CWUOpportunityStatuses constraint.");
}

export async function down(connection: Knex): Promise<void> {
  // First update any rows with PROCESSING status back to EVALUATION
  await connection("cwuOpportunityStatuses")
    .where({ status: "PROCESSING" })
    .update({ status: "EVALUATION" });

  await connection.schema.raw(
    ' \
    ALTER TABLE "cwuOpportunityStatuses" \
    DROP CONSTRAINT "cwuOpportunityStatuses_status_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "cwuOpportunityStatuses" \
    ADD CONSTRAINT "cwuOpportunityStatuses_status_check" \
    CHECK ("status" IN ('${Object.values(PreviousCWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info(
    "Removed PROCESSING status from CWUOpportunityStatuses constraint."
  );
}
