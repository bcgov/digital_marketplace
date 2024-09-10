import {
  readOneSWUEvaluationPanelMemberById,
  readOneSWUOpportunity
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";
import {
  Connection,
  Transaction,
  readOneSWUProposalSlim,
  tryDb
} from "back-end/lib/db";
import {
  AuthenticatedSession,
  Session,
  SessionRecord
} from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { SWUEvaluationPanelMember } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateRequestBody,
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationScores,
  SWUTeamQuestionResponseEvaluationSlim,
  SWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationType,
  UpdateEditRequestBody
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { generateUuid } from "back-end/lib";
import { SWUProposalStatus } from "shared/lib/resources/proposal/sprint-with-us";

export interface CreateSWUTeamQuestionResponseEvaluationParams
  extends CreateRequestBody {
  evaluationPanelMember: Id;
}

interface UpdateSWUTeamQuestionResponseEvaluationParams
  extends UpdateEditRequestBody {
  id: Id;
}

interface SWUTeamQuestionResponseEvaluationStatusRecord {
  id: Id;
  teamQuestionResponseEvaluation: Id;
  createdAt: Date;
  createdBy: Id;
  status: SWUTeamQuestionResponseEvaluationStatus;
  note: string;
}

interface RawSWUTeamQuestionResponseEvaluation
  extends Omit<
    SWUTeamQuestionResponseEvaluation,
    "proposal" | "evaluationPanelMember" | "scores"
  > {
  id: Id;
  proposal: Id;
  evaluationPanelMember: Id;
  scores: RawSWUTeamQuestionResponseEvaluationScores[];
}

export type RawSWUTeamQuestionResponseEvaluationScores =
  SWUTeamQuestionResponseEvaluation["scores"][number] & {
    teamQuestionResponseEvaluation: Id;
  };

async function rawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  raw: RawSWUTeamQuestionResponseEvaluation
): Promise<SWUTeamQuestionResponseEvaluation> {
  const {
    proposal: proposalId,
    evaluationPanelMember: evaluationPanelMemberId,
    ...restOfRaw
  } = raw;

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
    await readOneSWUEvaluationPanelMemberById(
      connection,
      evaluationPanelMemberId
    ),
    undefined
  );
  if (!evaluationPanelMember) {
    throw new Error("unable to process team question response evaluation");
  }

  return {
    ...restOfRaw,
    scores: raw.scores.map(
      ({ teamQuestionResponseEvaluation, ...scores }) => scores
    ),
    proposal,
    evaluationPanelMember
  };
}

async function rawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluationSlim(
  connection: Connection,
  session: Session,
  raw: RawSWUTeamQuestionResponseEvaluation
): Promise<SWUTeamQuestionResponseEvaluationSlim> {
  const {
    proposal: proposalId,
    evaluationPanelMember,
    scores,
    ...restOfRaw
  } = raw;

  const proposal =
    session &&
    getValidValue(
      await readOneSWUProposalSlim(connection, proposalId, session),
      null
    );
  if (!proposal) {
    throw new Error("unable to process team question response evaluation");
  }

  return {
    ...restOfRaw,
    proposal,
    scores: scores.map(
      ({ notes, teamQuestionResponseEvaluation, ...score }) => score
    )
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

export const readManySWUTeamQuestionResponseEvaluations = tryDb<
  [AuthenticatedSession, Id, SWUProposalStatus],
  SWUTeamQuestionResponseEvaluationSlim[]
>(async (connection, session, id, proposalStatus) => {
  const query = generateSWUTeamQuestionResponseEvaluationQuery(
    connection
  ).where({ proposal: id });

  // If proposal is still in individual evaluation, scope results to
  // the evaluations they have authored
  if (proposalStatus === SWUProposalStatus.TeamQuestionsPanelIndividual) {
    query
      .join(
        "evaluationPanelMembers epm",
        "epm.id",
        "=",
        "evaluations.evaluationPanelMember"
      )
      .andWhere({ "epm.user": session.user.id });
  }

  const results = await Promise.all(
    (
      await query
    ).map(async (result: RawSWUTeamQuestionResponseEvaluation) => {
      result.scores =
        getValidValue(
          await readManyTeamQuestionResponseEvaluationScores(
            connection,
            result.id
          ),
          []
        ) ?? [];
      return result;
    })
  );

  if (!results) {
    throw new Error("unable to read evaluations");
  }

  return valid(
    await Promise.all(
      results.map(
        async (result) =>
          await rawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluationSlim(
            connection,
            session,
            result
          )
      )
    )
  );
});

export const readOwnSWUTeamQuestionResponseEvaluations = tryDb<
  [AuthenticatedSession],
  SWUTeamQuestionResponseEvaluationSlim[]
>(async (connection, session) => {
  const evaluations = await generateSWUTeamQuestionResponseEvaluationQuery(
    connection
  )
    .join(
      "evaluationPanelMembers epm",
      "epm.id",
      "=",
      "evaluations.evaluationPanelMember"
    )
    .andWhere({ "epm.user": session.user.id });

  return valid(
    await Promise.all(
      evaluations.map(
        async (result) =>
          await rawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluationSlim(
            connection,
            session,
            result
          )
      )
    )
  );
});

export const readOneSWUTeamQuestionResponseEvaluationByProposalAndEvaluationPanelMember =
  tryDb<[Id, Id, SWUTeamQuestionResponseEvaluationType, Session], Id | null>(
    async (connection, proposalId, evaluationPanelMemberId, type, session) => {
      if (!session) {
        return valid(null);
      }
      const result = (
        await connection<RawSWUTeamQuestionResponseEvaluation>(
          "swuTeamQuestionResponseEvaluations"
        )
          .where({
            proposal: proposalId,
            evaluationPanelMember: evaluationPanelMemberId,
            type
          })
          .select("id")
          .first()
      )?.id;

      return valid(result ? result : null);
    }
  );

export const readManyTeamQuestionResponseEvaluationScores = tryDb<
  [Id],
  RawSWUTeamQuestionResponseEvaluationScores[]
>(async (connection, teamQuestionResponseEvaluationId) => {
  const results = await connection<RawSWUTeamQuestionResponseEvaluationScores>(
    "swuTeamQuestionResponseEvaluationScores"
  ).where({ teamQuestionResponseEvaluation: teamQuestionResponseEvaluationId });

  if (!results) {
    throw new Error(
      "unable to read proposal team question response evaluations"
    );
  }

  return valid(results);
});

export const readOneSWUTeamQuestionResponseEvaluation = tryDb<
  [Id, AuthenticatedSession],
  SWUTeamQuestionResponseEvaluation | null
>(async (connection, id, session) => {
  const result = await generateSWUTeamQuestionResponseEvaluationQuery(
    connection
  )
    .where({ "evaluations.id": id })
    .first<RawSWUTeamQuestionResponseEvaluation>();

  if (result) {
    result.scores =
      getValidValue(
        await readManyTeamQuestionResponseEvaluationScores(
          connection,
          result.id
        ),
        []
      ) ?? [];
  }

  return valid(
    result
      ? await rawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluation(
          connection,
          session,
          result
        )
      : null
  );
});

export const createSWUTeamQuestionResponseEvaluation = tryDb<
  [CreateSWUTeamQuestionResponseEvaluationParams, AuthenticatedSession],
  SWUTeamQuestionResponseEvaluation
>(async (connection, evaluation, session) => {
  const now = new Date();
  const evaluationId = await connection.transaction(async (trx) => {
    const { status, scores, ...restOfEvaluation } = evaluation;

    // Create root record for evaluation
    const [evaluationRootRecord] =
      await connection<RawSWUTeamQuestionResponseEvaluation>(
        "swuTeamQuestionResponseEvaluations"
      )
        .transacting(trx)
        .insert(
          {
            ...restOfEvaluation,
            id: generateUuid(),
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
        "swuTeamQuestionResponseEvaluationStatuses"
      )
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            teamQuestionResponseEvaluation: evaluationRootRecord.id,
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

    // Create evaluation scores
    for (const score of scores) {
      await connection<
        SWUTeamQuestionResponseEvaluationScores & {
          teamQuestionResponseEvaluation: Id;
        }
      >("swuTeamQuestionResponseEvaluationScores")
        .transacting(trx)
        .insert({
          ...score,
          teamQuestionResponseEvaluation: evaluationRootRecord.id
        });
    }

    return evaluationRootRecord.id;
  });

  const dbResult = await readOneSWUTeamQuestionResponseEvaluation(
    connection,
    evaluationId,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create team question evaluation");
  }
  return valid(dbResult.value);
});

export const updateSWUTeamQuestionResponseEvaluation = tryDb<
  [UpdateSWUTeamQuestionResponseEvaluationParams, AuthenticatedSession],
  SWUTeamQuestionResponseEvaluation
>(async (connection, proposal, session) => {
  const now = new Date();
  const { id, scores } = proposal;
  return valid(
    await connection.transaction(async (trx) => {
      // Update timestamp
      const [result] = await connection<RawSWUTeamQuestionResponseEvaluation>(
        "swuTeamQuestionResponseEvaluations"
      )
        .transacting(trx)
        .where({ id })
        .update(
          {
            updatedAt: now
          },
          "*"
        );

      if (!result) {
        throw new Error("unable to update team question evaluation");
      }
      // Update scores
      await updateSWUTeamQuestionResponseEvaluationScores(
        trx,
        result.id,
        scores
      );

      const dbResult = await readOneSWUTeamQuestionResponseEvaluation(
        trx,
        result.id,
        session
      );
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update team question evaluation");
      }
      return dbResult.value;
    })
  );
});

async function updateSWUTeamQuestionResponseEvaluationScores(
  connection: Transaction,
  evaluationId: Id,
  scores: CreateSWUTeamQuestionResponseEvaluationScoreBody[]
): Promise<void> {
  // Remove existing and recreate
  await connection("swuTeamQuestionResponseEvaluationScores")
    .where({ teamQuestionResponseEvaluation: evaluationId })
    .delete();

  for (const score of scores) {
    await connection<
      SWUTeamQuestionResponseEvaluationScores & {
        teamQuestionResponseEvaluation: Id;
      }
    >("swuTeamQuestionResponseEvaluationScores").insert({
      ...score,
      teamQuestionResponseEvaluation: evaluationId
    });
  }
}

export const updateSWUTeamQuestionResponseEvaluationStatus = tryDb<
  [Id, SWUTeamQuestionResponseEvaluationStatus, string, AuthenticatedSession],
  SWUTeamQuestionResponseEvaluation
>(async (connection, evaluationId, status, note, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      const [statusRecord] =
        await connection<SWUTeamQuestionResponseEvaluationStatusRecord>(
          "swuTeamQuestionResponseEvaluationStatuses"
        )
          .transacting(trx)
          .insert(
            {
              id: generateUuid(),
              teamQuestionResponseEvaluation: evaluationId,
              createdAt: now,
              createdBy: session.user.id,
              status,
              note
            },
            "*"
          );

      // Update proposal root record
      await connection<RawSWUTeamQuestionResponseEvaluation>(
        "swuTeamQuestionResponseEvaluations"
      )
        .transacting(trx)
        .where({ id: evaluationId })
        .update(
          {
            updatedAt: now
          },
          "*"
        );

      if (!statusRecord) {
        throw new Error("unable to update team question evaluation");
      }

      const dbResult = await readOneSWUTeamQuestionResponseEvaluation(
        trx,
        statusRecord.teamQuestionResponseEvaluation,
        session
      );
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update team question evaluation");
      }

      return dbResult.value;
    })
  );
});

function generateSWUTeamQuestionResponseEvaluationQuery(
  connection: Connection
) {
  const query = connection("swuTeamQuestionResponseEvaluations as evaluations")
    .join("swuTeamQuestionResponseEvaluationStatuses as statuses", function () {
      this.on("evaluations.id", "=", "statuses.teamQuestionResponseEvaluation")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "swuTeamQuestionResponseEvaluationStatuses" as statuses2 where \
            statuses2."teamQuestionResponseEvaluation" = evaluations.id and statuses2.status is not null)'
          )
        );
    })
    .select<RawSWUTeamQuestionResponseEvaluation[]>(
      "evaluations.id",
      "evaluations.proposal",
      "evaluations.evaluationPanelMember",
      "evaluations.type",
      connection.raw(
        '(CASE WHEN evaluations."updatedAt" > statuses."createdAt" THEN evaluations."updatedAt" ELSE statuses."createdAt" END) AS "updatedAt" '
      ),
      "statuses.status",
      "statuses.createdAt"
    );

  return query;
}
