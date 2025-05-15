import {
  RawTWUEvaluationPanelMember,
  readOneTWUOpportunity
} from "back-end/lib/db/opportunity/team-with-us";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";
import { Connection, Transaction, tryDb } from "back-end/lib/db";
import {
  AuthenticatedSession,
  SessionRecord
} from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { TWUEvaluationPanelMember } from "shared/lib/resources/opportunity/team-with-us";
import {
  CreateRequestBody,
  TWUResourceQuestionResponseEvaluation,
  TWUResourceQuestionResponseEvaluationStatus,
  UpdateEditRequestBody
} from "shared/lib/resources/evaluations/team-with-us/resource-questions";

export interface CreateTWUResourceQuestionResponseEvaluationParams
  extends CreateRequestBody {
  evaluationPanelMember: Id;
  proposal: Id;
}

interface UpdateTWUResourceQuestionResponseEvaluationParams
  extends UpdateEditRequestBody {
  proposal: Id;
  evaluationPanelMember: Id;
}

export interface TWUResourceQuestionResponseEvaluationStatusRecord {
  proposal: Id;
  evaluationPanelMember: Id;
  createdAt: Date;
  createdBy: Id;
  status: TWUResourceQuestionResponseEvaluationStatus;
  note: string;
}

export interface RawTWUResourceQuestionResponseEvaluation
  extends Omit<
    TWUResourceQuestionResponseEvaluation,
    "proposal" | "evaluationPanelMember" | "scores"
  > {
  proposal: Id;
  evaluationPanelMember: Id;
  questionOrder: number;
  score: number;
  notes: string;
}

export const TWU_CHAIR_EVALUATION_TABLE_NAME =
  "twuResourceQuestionResponseChairEvaluations";
export const TWU_EVALUATOR_EVALUATION_TABLE_NAME =
  "twuResourceQuestionResponseEvaluatorEvaluations";
export const TWU_CHAIR_EVALUATION_STATUS_TABLE_NAME =
  "twuResourceQuestionResponseChairEvaluationStatuses";
export const TWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME =
  "twuResourceQuestionResponseEvaluatorEvaluationStatuses";

function rawResourceQuestionResponseEvaluationsToResourceQuestionResponseEvaluation(
  raw: RawTWUResourceQuestionResponseEvaluation[]
): TWUResourceQuestionResponseEvaluation {
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

function makeIsTWUOpportunityEvaluationPanelMember(
  typeFn: (epm: TWUEvaluationPanelMember) => boolean
) {
  return async (
    connection: Connection,
    session: SessionRecord,
    opportunityId: Id
  ) => {
    try {
      const opportunity = getValidValue(
        await readOneTWUOpportunity(connection, opportunityId, session),
        null
      );
      return !!opportunity?.evaluationPanel?.find(
        (epm) => epm.user.id === session.user.id && typeFn(epm)
      );
    } catch (exception) {
      return false;
    }
  };
}

export const isTWUOpportunityEvaluationPanelEvaluator =
  makeIsTWUOpportunityEvaluationPanelMember((epm) => epm.evaluator);

export const isTWUOpportunityEvaluationPanelChair =
  makeIsTWUOpportunityEvaluationPanelMember((epm) => epm.chair);

export const readManyTWUResourceQuestionResponseEvaluationsForConsensus = tryDb<
  [AuthenticatedSession, Id],
  TWUResourceQuestionResponseEvaluation[]
>(async (connection, session, id) => {
  const results = await generateTWUResourceQuestionResponseEvaluationQuery(
    connection
  ).where({
    "evaluations.proposal": id
  });

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  const groupedResults = results.reduce<
    Record<string, RawTWUResourceQuestionResponseEvaluation[]>
  >((acc, rawEvaluation) => {
    acc[rawEvaluation.evaluationPanelMember] ??= [];
    acc[rawEvaluation.evaluationPanelMember].push(rawEvaluation);
    return acc;
  }, {});

  return valid(
    Object.values(groupedResults).map((result) =>
      rawResourceQuestionResponseEvaluationsToResourceQuestionResponseEvaluation(
        result
      )
    )
  );
});

export const readManyTWUResourceQuestionResponseEvaluations = tryDb<
  [AuthenticatedSession, Id, boolean?],
  TWUResourceQuestionResponseEvaluation[]
>(async (connection, session, id, consensus = false) => {
  const results = await generateTWUResourceQuestionResponseEvaluationQuery(
    connection,
    consensus
  )
    .join("twuProposals", "twuProposals.id", "=", "evaluations.proposal")
    .where({
      // There are many evaluations, but only one consensus
      ...(consensus
        ? {}
        : { "evaluations.evaluationPanelMember": session.user.id }),
      "twuProposals.opportunity": id
    });

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  const groupedResults = results.reduce<
    Record<string, RawTWUResourceQuestionResponseEvaluation[]>
  >((acc, rawEvaluation) => {
    acc[rawEvaluation.proposal] ??= [];
    acc[rawEvaluation.proposal].push(rawEvaluation);
    return acc;
  }, {});

  return valid(
    Object.values(groupedResults).map((result) =>
      rawResourceQuestionResponseEvaluationsToResourceQuestionResponseEvaluation(
        result
      )
    )
  );
});

export const readOneTWUResourceQuestionResponseEvaluation = tryDb<
  [Id, Id, AuthenticatedSession, boolean?],
  TWUResourceQuestionResponseEvaluation | null
>(
  async (
    connection,
    proposalId,
    evaluationPanelMemberId,
    session,
    consensus = false
  ) => {
    const result = await generateTWUResourceQuestionResponseEvaluationQuery(
      connection,
      consensus
    ).where({
      "evaluations.evaluationPanelMember": evaluationPanelMemberId,
      "evaluations.proposal": proposalId
    });

    return valid(
      result.length
        ? rawResourceQuestionResponseEvaluationsToResourceQuestionResponseEvaluation(
            result
          )
        : null
    );
  }
);

export const createTWUResourceQuestionResponseEvaluation = tryDb<
  [
    CreateTWUResourceQuestionResponseEvaluationParams,
    AuthenticatedSession,
    boolean?
  ],
  TWUResourceQuestionResponseEvaluation
>(async (connection, evaluation, session, consensus = false) => {
  const now = new Date();
  const [proposalId, evaluationPanelMemberId] = await connection.transaction(
    async (trx) => {
      const { status, scores, ...restOfEvaluation } = evaluation;

      for (const score of scores) {
        // Create root record for evaluation
        const [evaluationRootRecord] =
          await connection<RawTWUResourceQuestionResponseEvaluation>(
            consensus
              ? TWU_CHAIR_EVALUATION_TABLE_NAME
              : TWU_EVALUATOR_EVALUATION_TABLE_NAME
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
        await connection<TWUResourceQuestionResponseEvaluationStatusRecord>(
          consensus
            ? TWU_CHAIR_EVALUATION_STATUS_TABLE_NAME
            : TWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME
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

  const dbResult = await readOneTWUResourceQuestionResponseEvaluation(
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

export const updateTWUResourceQuestionResponseEvaluation = tryDb<
  [
    UpdateTWUResourceQuestionResponseEvaluationParams,
    AuthenticatedSession,
    boolean?
  ],
  TWUResourceQuestionResponseEvaluation
>(async (connection, evaluation, session, consensus = false) => {
  const now = new Date();
  const { proposal, evaluationPanelMember, scores } = evaluation;
  return valid(
    await connection.transaction(async (trx) => {
      // Update timestamp
      for (const { order: questionOrder, score, notes } of scores) {
        const [result] =
          await connection<RawTWUResourceQuestionResponseEvaluation>(
            consensus
              ? TWU_CHAIR_EVALUATION_TABLE_NAME
              : TWU_EVALUATOR_EVALUATION_TABLE_NAME
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

      const dbResult = await readOneTWUResourceQuestionResponseEvaluation(
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
export async function allTWUResourceQuestionResponseEvaluatorEvaluationsSubmitted(
  connection: Connection,
  trx: Transaction,
  opportunityId: string,
  proposals: Id[]
) {
  const [
    [{ count: submittedEvaluatorEvaluationsCount }],
    [{ count: evaluatorsCount }],
    [{ count: questionsCount }]
  ] = await Promise.all([
    generateTWUResourceQuestionResponseEvaluationQuery(connection)
      .transacting(trx)
      .clearSelect()
      .where({
        "statuses.status": TWUResourceQuestionResponseEvaluationStatus.Submitted
      })
      .whereIn("evaluations.proposal", proposals)
      .count("*"),
    // Evaluators for the most recent version
    connection<RawTWUEvaluationPanelMember>(
      "twuEvaluationPanelMembers as members"
    )
      .transacting(trx)
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
    connection<RawTWUEvaluationPanelMember>("TWUResourceQuestions as questions")
      .transacting(trx)
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
    Number(submittedEvaluatorEvaluationsCount) ===
    Number(evaluatorsCount) * proposals.length * Number(questionsCount)
  );
}

function generateTWUResourceQuestionResponseEvaluationQuery(
  connection: Connection,
  consensus = false
) {
  const evaluationTableName = consensus
    ? TWU_CHAIR_EVALUATION_TABLE_NAME
    : TWU_EVALUATOR_EVALUATION_TABLE_NAME;
  const evaluationStatusTableName = consensus
    ? TWU_CHAIR_EVALUATION_STATUS_TABLE_NAME
    : TWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME;
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
    .join("twuProposals as proposals", "evaluations.proposal", "proposals.id")
    .join(
      "twuEvaluationPanelMembers as members",
      "evaluations.evaluationPanelMember",
      "members.user"
    )
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
    .select<RawTWUResourceQuestionResponseEvaluation[]>(
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
