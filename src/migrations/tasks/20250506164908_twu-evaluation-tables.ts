import { generateUuid } from "back-end/lib";
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
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum PreviousTWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestions = "EVAL_QUESTIONS",
  EvaluationChallenge = "EVAL_C",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

enum TWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReviewResourceQuestions = "UNDER_REVIEW_QUESTIONS",
  DeprecatedEvaluatedResourceQuestions = "DEPRECATED_EVALUATED_QUESTIONS",
  UnderReviewChallenge = "UNDER_REVIEW_CHALLENGE",
  EvaluatedChallenge = "EVALUATED_CHALLENGE",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

enum PreviousTWUProposalStatus {
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

enum TWUResourceQuestionResponseEvaluationStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
      ALTER TABLE "twuProposalStatuses" \
      DROP CONSTRAINT "twuProposalStatuses_status_check" \
    '
  );

  // Unused status; deprecate
  await connection("twuProposalStatuses")
    .update({ status: TWUProposalStatus.DeprecatedEvaluatedResourceQuestions })
    .where({ status: PreviousTWUProposalStatus.EvaluatedResourceQuestions });

  await connection.schema.raw(` \
    ALTER TABLE "twuProposalStatuses" \
    ADD CONSTRAINT "twuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(TWUProposalStatus).join("','")}')) \
  `);
  logger.info("Modified constraint on twuProposalStatuses");

  await connection.schema.raw(
    ' \
      ALTER TABLE "twuOpportunityStatuses" \
      DROP CONSTRAINT "twuOpportunityStatuses_status_check" \
    '
  );

  await connection("twuOpportunityStatuses")
    .update({
      status: TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
    })
    .where({
      status: PreviousTWUOpportunityStatus.EvaluationResourceQuestions
    });

  // Would've done this with an INSERT SELECT but had trouble generating a UUID without
  // creating the uuid-ossp extension.
  const challengeStatuses = await connection(
    "twuOpportunityStatuses as statuses"
  ).where({
    "statuses.status": TWUOpportunityStatus.EvaluationChallenge
  });

  if (challengeStatuses.length) {
    await connection("twuOpportunityStatuses").insert(
      challengeStatuses.map((status) => {
        const createdAt = new Date(status.createdAt);
        // Seems unlikely to conflict with existing records.
        createdAt.setMilliseconds(createdAt.getMilliseconds() - 1);
        return {
          id: generateUuid(),
          createdAt,
          createdBy: status.createdBy,
          opportunity: status.opportunity,
          status: TWUOpportunityStatus.EvaluationResourceQuestionsConsensus,
          event: null,
          note: null
        };
      })
    );
  }

  await connection.schema.raw(` \
    ALTER TABLE "twuOpportunityStatuses" \
    ADD CONSTRAINT "twuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(TWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Modified constraint on twuOpportunityStatuses");

  function evaluationsColumnsSchema(table: Knex.TableBuilder) {
    table
      .uuid("proposal")
      .references("id")
      .inTable("twuProposals")
      .notNullable()
      .onDelete("CASCADE");
    table.integer("questionOrder").notNullable();
    table
      .uuid("evaluationPanelMember")
      .references("id")
      .inTable("users")
      .notNullable()
      .onDelete("CASCADE");
    table.timestamp("createdAt").notNullable();
    table.timestamp("updatedAt").notNullable();
    table.float("score").notNullable();
    table.text("notes").notNullable();
    table.primary(["proposal", "evaluationPanelMember", "questionOrder"]);
  }

  await connection.schema.createTable(
    "twuResourceQuestionResponseEvaluatorEvaluations",
    evaluationsColumnsSchema
  );
  logger.info("Created twuResourceQuestionResponseEvaluatorEvaluations table.");

  await connection.schema.createTable(
    "twuResourceQuestionResponseChairEvaluations",
    evaluationsColumnsSchema
  );
  logger.info("Created twuResourceQuestionResponseChairEvaluations table.");

  const now = new Date();
  const migrationNotes = "MIGRATION_NOTES";
  const twuResourceQuestionResponsesWithEvaluationPanelMembersQuery =
    connection("twuResourceQuestionResponses as responses")
      .join("twuProposals as proposals", function () {
        this.on("responses.proposal", "=", "proposals.id");
      })
      .join(
        connection.raw(
          "(??) as versions",
          connection("twuOpportunityVersions")
            .select("opportunity", "id")
            .rowNumber("rn", function () {
              this.orderBy("createdAt", "desc").partitionBy("opportunity");
            })
        ),
        function () {
          this.on("proposals.opportunity", "=", "versions.opportunity");
        }
      )
      .join("twuEvaluationPanelMembers as members", function () {
        this.on("versions.id", "=", "members.opportunityVersion");
      })
      .whereNot("proposals.anonymousProponentName", "")
      .andWhere({
        "versions.rn": 1
      })
      .select(
        "proposals.id as proposal",
        "responses.order as questionOrder",
        "members.user as evaluationPanelMember",
        connection.raw("? as createdAt", [now]),
        connection.raw("? as updatedAt", [now]),
        connection.raw("COALESCE(responses.score, 0) as score"),
        connection.raw("? as notes", [migrationNotes])
      );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??, ??, ??)", [
        "twuResourceQuestionResponseEvaluatorEvaluations",
        "proposal",
        "questionOrder",
        "evaluationPanelMember",
        "createdAt",
        "updatedAt",
        "score",
        "notes"
      ])
    )
    .insert(twuResourceQuestionResponsesWithEvaluationPanelMembersQuery);
  logger.info(
    "Ported TWU resource question responses to evaluator resource question response" +
      "evaluations."
  );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??, ??, ??)", [
        "twuResourceQuestionResponseChairEvaluations",
        "proposal",
        "questionOrder",
        "evaluationPanelMember",
        "createdAt",
        "updatedAt",
        "score",
        "notes"
      ])
    )
    .insert(
      twuResourceQuestionResponsesWithEvaluationPanelMembersQuery.andWhere({
        "members.chair": true
      })
    );
  logger.info(
    "Ported TWU resource question responses to chair resource question response " +
      "evaluations."
  );

  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.dropColumn("score");
    }
  );
  logger.info("Completed modifying twuResourceQuestionResponses table");

  function evaluationStatusesColumns(table: Knex.TableBuilder) {
    table
      .uuid("proposal")
      .references("id")
      .inTable("twuProposals")
      .notNullable()
      .onDelete("CASCADE");
    table
      .uuid("evaluationPanelMember")
      .references("id")
      .inTable("users")
      .notNullable()
      .onDelete("CASCADE");
    table
      .enu("status", Object.values(TWUResourceQuestionResponseEvaluationStatus))
      .notNullable();
    table.string("note");
    table.timestamp("createdAt").notNullable();
    table.primary(["proposal", "evaluationPanelMember", "createdAt", "status"]);
  }

  await connection.schema.createTable(
    "twuResourceQuestionResponseEvaluatorEvaluationStatuses",
    evaluationStatusesColumns
  );
  logger.info(
    "Created twuResourceQuestionResponseEvaluatorEvaluationStatuses table."
  );

  await connection.schema.createTable(
    "twuResourceQuestionResponseChairEvaluationStatuses",
    evaluationStatusesColumns
  );
  logger.info(
    "Created twuResourceQuestionResponseChairEvaluationStatuses table."
  );

  const twuResourceQuestionResponseEvaluationsWithStatusesQuery = (
    tableName: string
  ) =>
    connection(`${tableName} as evaluations`)
      .distinctOn([
        "evaluations.proposal",
        "evaluations.evaluationPanelMember",
        "statuses.status"
      ])
      .crossJoin(
        connection.raw("(SELECT ? as status", [
          TWUResourceQuestionResponseEvaluationStatus.Draft
        ])
      )
      .unionAll(
        connection.raw("SELECT ?) as statuses", [
          TWUResourceQuestionResponseEvaluationStatus.Submitted
        ])
      )
      .select([
        "evaluations.proposal as proposal",
        "evaluations.evaluationPanelMember as evaluationPanelMember",
        "statuses.status as status",
        connection.raw("NULL as note"),
        "evaluations.createdAt as createdAt"
      ]);

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "twuResourceQuestionResponseEvaluatorEvaluationStatuses",
        "proposal",
        "evaluationPanelMember",
        "status",
        "note",
        "createdAt"
      ])
    )
    .insert(
      twuResourceQuestionResponseEvaluationsWithStatusesQuery(
        "twuResourceQuestionResponseEvaluatorEvaluations"
      )
    );
  logger.info(
    "Added draft and submitted statuses to evaluator evaluation statuses."
  );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "twuResourceQuestionResponseChairEvaluationStatuses",
        "proposal",
        "evaluationPanelMember",
        "status",
        "note",
        "createdAt"
      ])
    )
    .insert(
      twuResourceQuestionResponseEvaluationsWithStatusesQuery(
        "twuResourceQuestionResponseChairEvaluations"
      )
    );
  logger.info(
    "Added draft and submitted statuses to chair evaluation statuses."
  );
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
      ALTER TABLE "twuProposalStatuses" \
      DROP CONSTRAINT "twuProposalStatuses_status_check" \
    '
  );

  await connection("twuProposalStatuses")
    .where({ status: TWUProposalStatus.DeprecatedEvaluatedResourceQuestions })
    .update({ status: PreviousTWUProposalStatus.EvaluatedResourceQuestions });

  await connection.schema.raw(` \
    ALTER TABLE "twuProposalStatuses" \
    ADD CONSTRAINT "twuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousTWUProposalStatus).join(
      "','"
    )}')) \
  `);
  logger.info("Reverted constraint on twuProposalStatuses");

  await connection.schema.raw(
    ' \
      ALTER TABLE "twuOpportunityStatuses" \
      DROP CONSTRAINT "twuOpportunityStatuses_status_check" \
    '
  );

  await connection("twuOpportunityStatuses")
    .where({
      status: TWUOpportunityStatus.EvaluationResourceQuestionsConsensus
    })
    .delete();

  await connection("twuOpportunityStatuses")
    .where({
      status: TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
    })
    .update({
      status: PreviousTWUOpportunityStatus.EvaluationResourceQuestions
    });

  await connection.schema.raw(` \
    ALTER TABLE "twuOpportunityStatuses" \
    ADD CONSTRAINT "twuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousTWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info("Reverted constraint on twuOpportunityStatuses");

  await connection.schema.dropTable(
    "twuResourceQuestionResponseEvaluatorEvaluationStatuses"
  );
  logger.info(
    "Dropped table twuResourceQuestionResponseEvaluatorEvaluationStatuses"
  );

  await connection.schema.dropTable(
    "twuResourceQuestionResponseChairEvaluationStatuses"
  );
  logger.info(
    "Dropped table twuResourceQuestionResponseChairEvaluationStatuses"
  );

  await connection.schema.dropTable(
    "twuResourceQuestionResponseEvaluatorEvaluations"
  );
  logger.info("Dropped table twuResourceQuestionResponseEvaluatorEvaluations");

  await connection.schema.alterTable(
    "twuResourceQuestionResponses",
    (table) => {
      table.float("score");
    }
  );
  logger.info("Completed reverting twuResourceQuestionResponses table.");

  await connection("twuResourceQuestionResponses")
    .update({
      score: connection.raw(
        '"twuResourceQuestionResponseChairEvaluations".score'
      )
    })
    .updateFrom("twuResourceQuestionResponseChairEvaluations")
    .whereRaw(
      '"twuResourceQuestionResponses".proposal = "twuResourceQuestionResponseChairEvaluations".proposal'
    )
    .andWhereRaw(
      '"twuResourceQuestionResponses".order = "twuResourceQuestionResponseChairEvaluations"."questionOrder"'
    );
  logger.info(
    "Ported chair resource question response evaluations back to TWU resource question" +
      "responses."
  );

  await connection.schema.dropTable(
    "twuResourceQuestionResponseChairEvaluations"
  );
  logger.info("Dropped table twuResourceQuestionResponseChairEvaluations");
}
