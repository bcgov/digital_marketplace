import {
  RawSWUEvaluationPanelMember,
  readOneSWUOpportunity
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";
import { Connection, Transaction, tryDb } from "back-end/lib/db";
import {
  AuthenticatedSession,
  SessionRecord
} from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { SWUEvaluationPanelMember } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateRequestBody,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus,
  UpdateEditRequestBody
} from "shared/lib/resources/evaluations/sprint-with-us/team-questions";

export interface CreateSWUTeamQuestionResponseEvaluationParams
  extends CreateRequestBody {
  evaluationPanelMember: Id;
  proposal: Id;
}

interface UpdateSWUTeamQuestionResponseEvaluationParams
  extends UpdateEditRequestBody {
  proposal: Id;
  evaluationPanelMember: Id;
}

export interface SWUTeamQuestionResponseEvaluationStatusRecord {
  proposal: Id;
  evaluationPanelMember: Id;
  createdAt: Date;
  createdBy: Id;
  status: SWUTeamQuestionResponseEvaluationStatus;
  note: string;
}

export interface RawSWUTeamQuestionResponseEvaluation
  extends Omit<
    SWUTeamQuestionResponseEvaluation,
    "proposal" | "evaluationPanelMember" | "scores"
  > {
  proposal: Id;
  evaluationPanelMember: Id;
  questionOrder: number;
  score: number;
  notes: string;
}

export const SWU_CHAIR_EVALUATION_TABLE_NAME =
  "swuTeamQuestionResponseChairEvaluations";
export const SWU_EVALUATOR_EVALUATION_TABLE_NAME =
  "swuTeamQuestionResponseEvaluatorEvaluations";
export const SWU_CHAIR_EVALUATION_STATUS_TABLE_NAME =
  "swuTeamQuestionResponseChairEvaluationStatuses";
export const SWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME =
  "swuTeamQuestionResponseEvaluatorEvaluationStatuses";

function rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
  raw: RawSWUTeamQuestionResponseEvaluation[]
): SWUTeamQuestionResponseEvaluation {
  if (!raw.length) {
    throw new Error("unable to process team question response evaluation");
  }

  const { questionOrder, score, notes, ...restOfRaw } = raw[0];

  return {
    ...restOfRaw,
    scores: raw.map(({ questionOrder, score, notes }) => ({
      order: questionOrder,
      score,
      notes
    }))
  };
}

function makeIsSWUOpportunityEvaluationPanelMember(
  typeFn: (epm: SWUEvaluationPanelMember) => boolean
) {
  return async (
    connection: Connection,
    session: SessionRecord,
    opportunityId: Id
  ) => {
    try {
      const opportunity = getValidValue(
        await readOneSWUOpportunity(connection, opportunityId, session),
        null
      );
      return !!opportunity?.evaluationPanel?.find(
        (epm) => epm.user.id === session.user.id && typeFn(epm)
      );
    } catch {
      return false;
    }
  };
}

export const isSWUOpportunityEvaluationPanelEvaluator =
  makeIsSWUOpportunityEvaluationPanelMember((epm) => epm.evaluator);

export const isSWUOpportunityEvaluationPanelChair =
  makeIsSWUOpportunityEvaluationPanelMember((epm) => epm.chair);

export const readManySWUTeamQuestionResponseEvaluationsForConsensus = tryDb<
  [AuthenticatedSession, Id],
  SWUTeamQuestionResponseEvaluation[]
>(async (connection, session, id) => {
  const results = await generateSWUTeamQuestionResponseEvaluationQuery(
    connection
  ).where({
    "evaluations.proposal": id
  });

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  const groupedResults = results.reduce<
    Record<string, RawSWUTeamQuestionResponseEvaluation[]>
  >((acc, rawEvaluation) => {
    acc[rawEvaluation.evaluationPanelMember] ??= [];
    acc[rawEvaluation.evaluationPanelMember].push(rawEvaluation);
    return acc;
  }, {});

  return valid(
    Object.values(groupedResults).map((result) =>
      rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(result)
    )
  );
});

export const readManySWUTeamQuestionResponseEvaluations = tryDb<
  [AuthenticatedSession, Id, boolean?, boolean?],
  SWUTeamQuestionResponseEvaluation[]
>(async (connection, session, id, consensus = false, filterByUser = true) => {
  // When filterByUser is false, we are looking for all evaluations for the opportunity (admin only)
  // (scores and notes for each panel member for each proposal for the opportunity)
  // Used for generating the complete competition view for reporting purposes
  let query = generateSWUTeamQuestionResponseEvaluationQuery(
    connection,
    consensus
  ).join("swuProposals", "swuProposals.id", "=", "evaluations.proposal");

  const whereClause: Record<string, any> = {
    "swuProposals.opportunity": id
  };

  if (filterByUser && !consensus) {
    // There are many evaluations, but only one consensus
    whereClause["evaluations.evaluationPanelMember"] = session.user.id;
  }

  query = query.where(whereClause);

  const results = await query;

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  // Group results differently based on filterByUser flag
  const groupedResults = results.reduce<
    Record<string, RawSWUTeamQuestionResponseEvaluation[]>
  >((acc, rawEvaluation) => {
    // Use proposalId as key if filtering by user
    // Use composite key (proposalId-evaluationPanelMemberId) if not filtering by user
    const key = filterByUser
      ? rawEvaluation.proposal
      : `${rawEvaluation.proposal}-${rawEvaluation.evaluationPanelMember}`;
    acc[key] ??= [];
    acc[key].push(rawEvaluation);
    return acc;
  }, {});

  return valid(
    Object.values(groupedResults).map((result) =>
      rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(result)
    )
  );
});

export const readOneSWUTeamQuestionResponseEvaluation = tryDb<
  [Id, Id, AuthenticatedSession, boolean?],
  SWUTeamQuestionResponseEvaluation | null
>(
  async (
    connection,
    proposalId,
    evaluationPanelMemberId,
    session,
    consensus = false
  ) => {
    const result = await generateSWUTeamQuestionResponseEvaluationQuery(
      connection,
      consensus
    ).where({
      "evaluations.evaluationPanelMember": evaluationPanelMemberId,
      "evaluations.proposal": proposalId
    });

    return valid(
      result.length
        ? rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
            result
          )
        : null
    );
  }
);

export const createSWUTeamQuestionResponseEvaluation = tryDb<
  [
    CreateSWUTeamQuestionResponseEvaluationParams,
    AuthenticatedSession,
    boolean?
  ],
  SWUTeamQuestionResponseEvaluation
>(async (connection, evaluation, session, consensus = false) => {
  const now = new Date();
  const [proposalId, evaluationPanelMemberId] = await connection.transaction(
    async (trx) => {
      const { status, scores, ...restOfEvaluation } = evaluation;

      for (const score of scores) {
        // Create root record for evaluation
        const [evaluationRootRecord] =
          await connection<RawSWUTeamQuestionResponseEvaluation>(
            consensus
              ? SWU_CHAIR_EVALUATION_TABLE_NAME
              : SWU_EVALUATOR_EVALUATION_TABLE_NAME
          )
            .transacting(trx)
            .insert(
              {
                ...restOfEvaluation,
                questionOrder: score.order,
                score: score.score,
                notes: score.notes,
                createdAt: now,
                updatedAt: now
              },
              "*"
            );

        if (!evaluationRootRecord) {
          throw new Error("unable to create team question evaluation");
        }
      }

      // Create a evaluation status record
      const [evaluationStatusRecord] =
        await connection<SWUTeamQuestionResponseEvaluationStatusRecord>(
          consensus
            ? SWU_CHAIR_EVALUATION_STATUS_TABLE_NAME
            : SWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME
        )
          .transacting(trx)
          .insert(
            {
              evaluationPanelMember: restOfEvaluation.evaluationPanelMember,
              proposal: restOfEvaluation.proposal,
              status,
              createdAt: now,
              note: ""
            },
            "*"
          );

      if (!evaluationStatusRecord) {
        throw new Error("unable to create team question evaluation status");
      }

      return [
        restOfEvaluation.proposal,
        restOfEvaluation.evaluationPanelMember
      ];
    }
  );

  const dbResult = await readOneSWUTeamQuestionResponseEvaluation(
    connection,
    proposalId,
    evaluationPanelMemberId,
    session,
    consensus
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create team question evaluation");
  }
  return valid(dbResult.value);
});

export const updateSWUTeamQuestionResponseEvaluation = tryDb<
  [
    UpdateSWUTeamQuestionResponseEvaluationParams,
    AuthenticatedSession,
    boolean?
  ],
  SWUTeamQuestionResponseEvaluation
>(async (connection, evaluation, session, consensus = false) => {
  const now = new Date();
  const { proposal, evaluationPanelMember, scores } = evaluation;
  return valid(
    await connection.transaction(async (trx) => {
      // Update timestamp
      for (const { order: questionOrder, score, notes } of scores) {
        const [result] = await connection<RawSWUTeamQuestionResponseEvaluation>(
          consensus
            ? SWU_CHAIR_EVALUATION_TABLE_NAME
            : SWU_EVALUATOR_EVALUATION_TABLE_NAME
        )
          .transacting(trx)
          .where({ proposal, evaluationPanelMember, questionOrder })
          .update(
            {
              score,
              notes,
              updatedAt: now
            },
            "*"
          );

        if (!result) {
          throw new Error("unable to update team question evaluation");
        }
      }

      const dbResult = await readOneSWUTeamQuestionResponseEvaluation(
        trx,
        proposal,
        evaluationPanelMember,
        session,
        consensus
      );
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update team question evaluation");
      }
      return dbResult.value;
    })
  );
});

/**
 * All evaluations have been submitted when every evaluator has evaluated every
 * question for every proponent
 */
export async function allSWUTeamQuestionResponseEvaluatorEvaluationsSubmitted(
  connection: Connection,
  trx: Transaction,
  opportunityId: string,
  proposals: Id[]
) {
  const [
    submittedEvaluatorEvaluations,
    [{ count: evaluatorsCount }],
    [{ count: questionsCount }]
  ] = await Promise.all([
    connection
      .with(
        "submittedEvaluations",
        generateSWUTeamQuestionResponseEvaluationQuery(connection)
          .where({
            "statuses.status": SWUTeamQuestionResponseEvaluationStatus.Submitted
          })
          .whereIn("evaluations.proposal", proposals)
      )
      .from("submittedEvaluations")
      .transacting(trx)
      .forUpdate(),
    // Evaluators for the most recent version
    connection<RawSWUEvaluationPanelMember>(
      "swuEvaluationPanelMembers as members"
    )
      .transacting(trx)
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
          this.on("members.opportunityVersion", "=", "versions.id");
        }
      )
      .where({
        evaluator: true,
        "versions.opportunity": opportunityId,
        "versions.rn": 1
      })
      .count("*"),
    // Questions for the most recent version
    connection<RawSWUEvaluationPanelMember>("swuTeamQuestions as questions")
      .transacting(trx)
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
          this.on("questions.opportunityVersion", "=", "versions.id");
        }
      )
      .where({
        "versions.opportunity": opportunityId,
        "versions.rn": 1
      })
      .count("*")
  ]);
  return (
    Number(submittedEvaluatorEvaluations.length) ===
    Number(evaluatorsCount) * proposals.length * Number(questionsCount)
  );
}

function generateSWUTeamQuestionResponseEvaluationQuery(
  connection: Connection,
  consensus = false
) {
  const evaluationTableName = consensus
    ? SWU_CHAIR_EVALUATION_TABLE_NAME
    : SWU_EVALUATOR_EVALUATION_TABLE_NAME;
  const evaluationStatusTableName = consensus
    ? SWU_CHAIR_EVALUATION_STATUS_TABLE_NAME
    : SWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME;
  const query = connection(`${evaluationTableName} as evaluations`)
    .join(
      connection.raw(
        "(??) as statuses",
        connection(`${evaluationStatusTableName}`)
          .select("evaluationPanelMember", "proposal", "status", "createdAt")
          .rowNumber("rn", function () {
            this.orderBy("createdAt", "desc").partitionBy([
              "evaluationPanelMember",
              "proposal"
            ]);
          })
      ),
      function () {
        this.on(
          "evaluations.evaluationPanelMember",
          "=",
          "statuses.evaluationPanelMember"
        )
          .andOn("evaluations.proposal", "=", "statuses.proposal")
          .andOn("statuses.rn", "=", connection.raw(1));
      }
    )
    .join("swuProposals as proposals", "evaluations.proposal", "proposals.id")
    .join(
      "swuEvaluationPanelMembers as members",
      "evaluations.evaluationPanelMember",
      "members.user"
    )
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
    .select<RawSWUTeamQuestionResponseEvaluation[]>(
      "evaluations.proposal",
      "evaluations.evaluationPanelMember",
      connection.raw(
        '(CASE WHEN evaluations."updatedAt" > statuses."createdAt" THEN evaluations."updatedAt" ELSE statuses."createdAt" END) AS "updatedAt" '
      ),
      "evaluations.questionOrder",
      "evaluations.score",
      "evaluations.notes",
      "statuses.status",
      "statuses.createdAt"
    )
    .where({
      "members.opportunityVersion": connection.raw("versions.id"),
      "versions.rn": 1
    });

  return query;
}
