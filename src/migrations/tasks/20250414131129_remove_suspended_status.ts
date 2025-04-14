import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";
import { generateUuid } from "back-end/lib";

const logger = makeDomainLogger(consoleAdapter, "migrations");

// Define all opportunity status enums
enum SWUOpportunityStatus {
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

enum CWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  Evaluation = "EVALUATION",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum TWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestions = "EVAL_QUESTIONS",
  EvaluationChallenge = "EVAL_C",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export async function up(connection: Knex): Promise<void> {
  // First, find all opportunities with Suspended status and update them to Canceled
  logger.info(
    "Finding suspended CWU opportunities and converting them to canceled"
  );
  const suspendedCWUOpportunities = await connection("cwuOpportunityStatuses")
    .select("opportunity", "createdBy")
    .whereIn("opportunity", function () {
      this.select("opportunity")
        .from("cwuOpportunityStatuses")
        .whereRaw(`"status" = 'SUSPENDED'`)
        .groupBy("opportunity");
    })
    .andWhereRaw(
      `"createdAt" = (SELECT MAX("createdAt") FROM "cwuOpportunityStatuses" WHERE "opportunity" = "cwuOpportunityStatuses"."opportunity")`
    );

  logger.info(
    `Found ${suspendedCWUOpportunities.length} suspended CWU opportunities`
  );

  // Update each suspended CWU opportunity to Canceled
  const now = new Date();
  for (const opportunity of suspendedCWUOpportunities) {
    await connection("cwuOpportunityStatuses").insert({
      id: generateUuid(),
      opportunity: opportunity.opportunity,
      createdAt: now,
      createdBy: opportunity.createdBy,
      status: CWUOpportunityStatus.Canceled,
      note: "Opportunity canceled due to removal of 'Suspended' status option from the system. According to policy/legal rules, opportunities that cannot proceed should be properly cancelled rather than suspended."
    });
    logger.info(
      `Updated CWU opportunity ${opportunity.opportunity} from Suspended to Canceled`
    );
  }

  logger.info(
    "Finding suspended SWU opportunities and converting them to canceled"
  );
  const suspendedSWUOpportunities = await connection("swuOpportunityStatuses")
    .select("opportunity", "createdBy")
    .whereIn("opportunity", function () {
      this.select("opportunity")
        .from("swuOpportunityStatuses")
        .whereRaw(`"status" = 'SUSPENDED'`)
        .groupBy("opportunity");
    })
    .andWhereRaw(
      `"createdAt" = (SELECT MAX("createdAt") FROM "swuOpportunityStatuses" WHERE "opportunity" = "swuOpportunityStatuses"."opportunity")`
    );

  logger.info(
    `Found ${suspendedSWUOpportunities.length} suspended SWU opportunities`
  );

  // Update each suspended SWU opportunity to Canceled
  for (const opportunity of suspendedSWUOpportunities) {
    await connection("swuOpportunityStatuses").insert({
      id: generateUuid(),
      opportunity: opportunity.opportunity,
      createdAt: now,
      createdBy: opportunity.createdBy,
      status: SWUOpportunityStatus.Canceled,
      note: "Opportunity canceled due to removal of 'Suspended' status option from the system. According to policy/legal rules, opportunities that cannot proceed should be properly cancelled rather than suspended."
    });
    logger.info(
      `Updated SWU opportunity ${opportunity.opportunity} from Suspended to Canceled`
    );
  }

  logger.info(
    "Finding suspended TWU opportunities and converting them to canceled"
  );
  const suspendedTWUOpportunities = await connection("twuOpportunityStatuses")
    .select("opportunity", "createdBy")
    .whereIn("opportunity", function () {
      this.select("opportunity")
        .from("twuOpportunityStatuses")
        .whereRaw(`"status" = 'SUSPENDED'`)
        .groupBy("opportunity");
    })
    .andWhereRaw(
      `"createdAt" = (SELECT MAX("createdAt") FROM "twuOpportunityStatuses" WHERE "opportunity" = "twuOpportunityStatuses"."opportunity")`
    );

  logger.info(
    `Found ${suspendedTWUOpportunities.length} suspended TWU opportunities`
  );

  // Update each suspended TWU opportunity to Canceled
  for (const opportunity of suspendedTWUOpportunities) {
    await connection("twuOpportunityStatuses").insert({
      id: generateUuid(),
      opportunity: opportunity.opportunity,
      createdAt: now,
      createdBy: opportunity.createdBy,
      status: TWUOpportunityStatus.Canceled,
      note: "Opportunity canceled due to removal of 'Suspended' status option from the system. According to policy/legal rules, opportunities that cannot proceed should be properly cancelled rather than suspended."
    });
    logger.info(
      `Updated TWU opportunity ${opportunity.opportunity} from Suspended to Canceled`
    );
  }

  logger.info("All suspended opportunities have been converted to canceled");
}

export async function down(_connection: Knex): Promise<void> {
  logger.info("No rollback functionality provided for this migration");
}
