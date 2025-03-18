import {
  readOneSWUEvaluationPanelMember,
  readOneSWUOpportunity
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";
import { Connection, readOneSWUProposalSlim, tryDb } from "back-end/lib/db";
import {
  AuthenticatedSession,
  Session,
  SessionRecord
} from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { SWUEvaluationPanelMember } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateRequestBody,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus,
  UpdateEditRequestBody
} from "shared/lib/resources/question-evaluation/sprint-with-us";

export interface CreateSWUTeamQuestionResponseEvaluationParams
  extends CreateRequestBody {
  evaluationPanelMember: Id;
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

export const CHAIR_EVALUATION_TABLE_NAME =
  "swuTeamQuestionResponseChairEvaluations";
export const EVALUATOR_EVALUATION_TABLE_NAME =
  "swuTeamQuestionResponseEvaluatorEvaluations";
export const CHAIR_EVALUATION_STATUS_TABLE_NAME =
  "swuTeamQuestionResponseChairEvaluationStatuses";
export const EVALUATOR_EVALUATION_STATUS_TABLE_NAME =
  "swuTeamQuestionResponseEvaluatorEvaluationStatuses";

async function rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  raw: RawSWUTeamQuestionResponseEvaluation[]
): Promise<SWUTeamQuestionResponseEvaluation> {
  if (!raw.length) {
    throw new Error("unable to process team question response evaluation");
  }

  const {
    proposal: proposalId,
    evaluationPanelMember: evaluationPanelMemberId,
    questionOrder,
    score,
    notes,
    ...restOfRaw
  } = raw[0];

  const proposal =
    session &&
    getValidValue(
      await readOneSWUProposalSlim(connection, proposalId, session),
      null
    );
  if (!proposal) {
    throw new Error("unable to process team question response evaluation");
  }

  const evaluationPanelMember = getValidValue(
    await readOneSWUEvaluationPanelMember(
      connection,
      evaluationPanelMemberId,
      proposal.opportunity.id
    ),
    undefined
  );
  if (!evaluationPanelMember) {
    throw new Error("unable to process team question response evaluation");
  }

  return {
    ...restOfRaw,
    scores: raw.map(({ questionOrder, score, notes }) => ({
      order: questionOrder,
      score,
      notes
    })),
    proposal,
    evaluationPanelMember
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
    } catch (exception) {
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
    await Promise.all(
      Object.values(groupedResults).map(
        async (result) =>
          await rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
            connection,
            session,
            result
          )
      )
    )
  );
});

export const readManySWUTeamQuestionResponseEvaluations = tryDb<
  [AuthenticatedSession, Id, boolean?],
  SWUTeamQuestionResponseEvaluation[]
>(async (connection, session, id, consensus = false) => {
  const results = await generateSWUTeamQuestionResponseEvaluationQuery(
    connection,
    consensus
  )
    .join("swuProposals", "swuProposals.id", "=", "evaluations.proposal")
    .where({
      "swuEvaluationPanelMembers.user": session.user.id,
      "swuProposals.opportunity": id
    });

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  const groupedResults = results.reduce<
    Record<string, RawSWUTeamQuestionResponseEvaluation[]>
  >((acc, rawEvaluation) => {
    acc[rawEvaluation.proposal] ??= [];
    acc[rawEvaluation.proposal].push(rawEvaluation);
    return acc;
  }, {});

  return valid(
    await Promise.all(
      Object.values(groupedResults).map(
        async (result) =>
          await rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
            connection,
            session,
            result
          )
      )
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
      result
        ? await rawTeamQuestionResponseEvaluationsToTeamQuestionResponseEvaluation(
            connection,
            session,
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

      // Create root record for evaluation
      const [evaluationRootRecord] =
        await connection<RawSWUTeamQuestionResponseEvaluation>(
          consensus
            ? CHAIR_EVALUATION_TABLE_NAME
            : EVALUATOR_EVALUATION_TABLE_NAME
        )
          .transacting(trx)
          .insert(
            {
              ...restOfEvaluation,
              createdAt: now,
              updatedAt: now
            },
            "*"
          );

      if (!evaluationRootRecord) {
        throw new Error("unable to create team question evaluation");
      }

      // Create a evaluation status record
      const [evaluationStatusRecord] =
        await connection<SWUTeamQuestionResponseEvaluationStatusRecord>(
          consensus
            ? CHAIR_EVALUATION_STATUS_TABLE_NAME
            : EVALUATOR_EVALUATION_STATUS_TABLE_NAME
        )
          .transacting(trx)
          .insert(
            {
              evaluationPanelMember: evaluationRootRecord.evaluationPanelMember,
              proposal: evaluationRootRecord.proposal,
              status,
              createdAt: now,
              createdBy: session.user.id,
              note: ""
            },
            "*"
          );

      if (!evaluationStatusRecord) {
        throw new Error("unable to create team question evaluation status");
      }

      return [
        evaluationRootRecord.proposal,
        evaluationRootRecord.evaluationPanelMember
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
            ? CHAIR_EVALUATION_TABLE_NAME
            : EVALUATOR_EVALUATION_TABLE_NAME
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

function generateSWUTeamQuestionResponseEvaluationQuery(
  connection: Connection,
  consensus = false
) {
  const evaluationTableName = consensus
    ? CHAIR_EVALUATION_TABLE_NAME
    : EVALUATOR_EVALUATION_TABLE_NAME;
  const evaluationStatusTableName = consensus
    ? CHAIR_EVALUATION_STATUS_TABLE_NAME
    : EVALUATOR_EVALUATION_STATUS_TABLE_NAME;
  const query = connection(`${evaluationTableName} as evaluations`)
    .join(`${evaluationStatusTableName} as statuses`, function () {
      this.on(
        "evaluations.evaluationPanelMember",
        "=",
        "statuses.evaluationPanelMember"
      )
        .andOn("evaluations.proposal", "=", "statuses.proposal")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            `(select max("createdAt") from "${evaluationStatusTableName}" as statuses2 where \
              statuses2."evaluationPanelMember" = evaluations."evaluationPanelMember" and statuses2."proposal" = evaluations."proposal" \
              and statuses2.status is not null)`
          )
        );
    })
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
    );

  return query;
}
