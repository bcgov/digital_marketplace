import { generateUuid } from "back-end/lib";
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
  UnderReviewTeamQuestions = "UNDER_REVIEW_QUESTIONS",
  DeprecatedEvaluatedTeamQuestions = "DEPRECATED_EVALUATED_QUESTIONS",
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

  // Unused status; deprecate
  await connection("swuProposalStatuses")
    .update({ status: SWUProposalStatus.DeprecatedEvaluatedTeamQuestions })
    .where({ status: PreviousSWUProposalStatus.EvaluatedTeamQuestions });

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

  await connection("swuOpportunityStatuses")
    .update({ status: SWUOpportunityStatus.EvaluationTeamQuestionsIndividual })
    .where({ status: PreviousSWUOpportunityStatus.EvaluationTeamQuestions });

  // Would've done this with an INSERT SELECT but had trouble generating a UUID without
  // creating the uuid-ossp extension.
  const codeChallengeStatuses = await connection(
    "swuOpportunityStatuses as statuses"
  ).where({
    "statuses.status": SWUOpportunityStatus.EvaluationCodeChallenge
  });

  if (codeChallengeStatuses.length) {
    await connection("swuOpportunityStatuses").insert(
      codeChallengeStatuses.map((status) => {
        const createdAt = new Date(status.createdAt);
        // Seems unlikely to conflict with existing records.
        createdAt.setMilliseconds(createdAt.getMilliseconds() - 1);
        return {
          id: generateUuid(),
          createdAt,
          createdBy: status.createdBy,
          opportunity: status.opportunity,
          status: SWUOpportunityStatus.EvaluationTeamQuestionsConsensus,
          event: null,
          note: null
        };
      })
    );
  }

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(SWUOpportunityStatus).join("','")}')) \
  `);
  logger.info("Modified constraint on swuOpportunityStatuses");

  function evaluationsColumnsSchema(table: Knex.TableBuilder) {
    table
      .uuid("proposal")
      .references("id")
      .inTable("swuProposals")
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
    "swuTeamQuestionResponseEvaluatorEvaluations",
    evaluationsColumnsSchema
  );
  logger.info("Created swuTeamQuestionResponseEvaluatorEvaluations table.");

  await connection.schema.createTable(
    "swuTeamQuestionResponseChairEvaluations",
    evaluationsColumnsSchema
  );
  logger.info("Created swuTeamQuestionResponseChairEvaluations table.");

  const now = new Date();
  const migrationNotes = "MIGRATION_NOTES";
  const swuTeamQuestionResponsesWithEvaluationPanelMembersQuery = connection(
    "swuTeamQuestionResponses as responses"
  )
    .join("swuProposals as proposals", function () {
      this.on("responses.proposal", "=", "proposals.id");
    })
    .join(
      connection.raw(
        "(??) as versions",
        connection("swuOpportunityVersions")
          .select("opportunity", "id")
          .rowNumber("rn", function () {
            this.orderBy("createdAt", "desc").partitionBy("opportunity");
          })
      ),
      function () {
        this.on("proposals.opportunity", "=", "versions.opportunity");
      }
    )
    .join("swuEvaluationPanelMembers as members", function () {
      this.on("versions.id", "=", "members.opportunityVersion");
    })
    .whereNotNull("responses.score")
    .andWhere({
      "versions.rn": 1
    })
    .select(
      "proposals.id as proposal",
      "responses.order as questionOrder",
      "members.user as evaluationPanelMember",
      connection.raw("? as createdAt", [now]),
      connection.raw(" ? as updatedAt", [now]),
      "responses.score as score",
      connection.raw("? as notes", [migrationNotes])
    );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??, ??, ??)", [
        "swuTeamQuestionResponseEvaluatorEvaluations",
        "proposal",
        "questionOrder",
        "evaluationPanelMember",
        "createdAt",
        "updatedAt",
        "score",
        "notes"
      ])
    )
    .insert(swuTeamQuestionResponsesWithEvaluationPanelMembersQuery);
  logger.info(
    "Ported SWU team question responses to evaluator team question response" +
      "evaluations."
  );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??, ??, ??)", [
        "swuTeamQuestionResponseChairEvaluations",
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
      swuTeamQuestionResponsesWithEvaluationPanelMembersQuery.andWhere({
        "members.chair": true
      })
    );
  logger.info(
    "Ported SWU team question responses to chair team question response " +
      "evaluations."
  );

  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.dropColumn("score");
  });
  logger.info("Completed modifying swuTeamQuestionResponses table");

  function evaluationStatusesColumns(table: Knex.TableBuilder) {
    table
      .uuid("proposal")
      .references("id")
      .inTable("swuProposals")
      .notNullable()
      .onDelete("CASCADE");
    table
      .uuid("evaluationPanelMember")
      .references("id")
      .inTable("users")
      .notNullable()
      .onDelete("CASCADE");
    table
      .enu("status", Object.values(SWUTeamQuestionResponseEvaluationStatus))
      .notNullable();
    table.string("note");
    table.timestamp("createdAt").notNullable();
    table.primary(["proposal", "evaluationPanelMember", "createdAt", "status"]);
  }

  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluatorEvaluationStatuses",
    evaluationStatusesColumns
  );
  logger.info(
    "Created swuTeamQuestionResponseEvaluatorEvaluationStatuses table."
  );

  await connection.schema.createTable(
    "swuTeamQuestionResponseChairEvaluationStatuses",
    evaluationStatusesColumns
  );
  logger.info("Created swuTeamQuestionResponseChairEvaluationStatuses table.");

  const swuTeamQuestionResponsesEvaluationsWithStatusesQuery = (
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
          SWUTeamQuestionResponseEvaluationStatus.Draft
        ])
      )
      .unionAll(
        connection.raw("SELECT ?) as statuses", [
          SWUTeamQuestionResponseEvaluationStatus.Submitted
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
        "swuTeamQuestionResponseEvaluatorEvaluationStatuses",
        "proposal",
        "evaluationPanelMember",
        "status",
        "note",
        "createdAt"
      ])
    )
    .insert(
      swuTeamQuestionResponsesEvaluationsWithStatusesQuery(
        "swuTeamQuestionResponseEvaluatorEvaluations"
      )
    );
  logger.info(
    "Added draft and submitted statuses to evaluator evaluation statuses."
  );

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "swuTeamQuestionResponseChairEvaluationStatuses",
        "proposal",
        "evaluationPanelMember",
        "status",
        "note",
        "createdAt"
      ])
    )
    .insert(
      swuTeamQuestionResponsesEvaluationsWithStatusesQuery(
        "swuTeamQuestionResponseChairEvaluations"
      )
    );
  logger.info(
    "Added draft and submitted statuses to chair evaluation statuses."
  );
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
      ALTER TABLE "swuProposalStatuses" \
      DROP CONSTRAINT "swuProposalStatuses_status_check" \
    '
  );

  await connection("swuProposalStatuses")
    .where({ status: SWUProposalStatus.DeprecatedEvaluatedTeamQuestions })
    .update({ status: PreviousSWUProposalStatus.EvaluatedTeamQuestions });

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
    .where({ status: SWUOpportunityStatus.EvaluationTeamQuestionsConsensus })
    .delete();

  await connection("swuOpportunityStatuses")
    .where({
      status: SWUOpportunityStatus.EvaluationTeamQuestionsIndividual
    })
    .update({ status: PreviousSWUOpportunityStatus.EvaluationTeamQuestions });

  await connection.schema.raw(` \
    ALTER TABLE "swuOpportunityStatuses" \
    ADD CONSTRAINT "swuOpportunityStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousSWUOpportunityStatus).join(
      "','"
    )}')) \
  `);
  logger.info("Reverted constraint on swuOpportunityStatuses");

  await connection.schema.dropTable(
    "swuTeamQuestionResponseEvaluatorEvaluationStatuses"
  );
  logger.info(
    "Dropped table swuTeamQuestionResponseEvaluatorEvaluationStatuses"
  );

  await connection.schema.dropTable(
    "swuTeamQuestionResponseChairEvaluationStatuses"
  );
  logger.info("Dropped table swuTeamQuestionResponseChairEvaluationStatuses");

  await connection.schema.dropTable(
    "swuTeamQuestionResponseEvaluatorEvaluations"
  );
  logger.info("Dropped table swuTeamQuestionResponseEvaluatorEvaluations");

  await connection.schema.alterTable("swuTeamQuestionResponses", (table) => {
    table.float("score");
  });
  logger.info("Completed reverting swuTeamQuestionResponses table.");

  await connection("swuTeamQuestionResponses")
    .update({
      score: connection.raw('"swuTeamQuestionResponseChairEvaluations".score')
    })
    .updateFrom("swuTeamQuestionResponseChairEvaluations")
    .whereRaw(
      '"swuTeamQuestionResponses".proposal = "swuTeamQuestionResponseChairEvaluations".proposal'
    )
    .andWhereRaw(
      '"swuTeamQuestionResponses".order = "swuTeamQuestionResponseChairEvaluations"."questionOrder"'
    );
  logger.info(
    "Ported chair team question response evaluations back to SWU team question" +
      "responses."
  );

  await connection.schema.dropTable("swuTeamQuestionResponseChairEvaluations");
  logger.info("Dropped table swuTeamQuestionResponseChairEvaluations");
}
