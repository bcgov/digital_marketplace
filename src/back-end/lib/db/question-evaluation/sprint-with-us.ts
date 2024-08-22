import {
  readOneSWUEvaluationPanelMemberById,
  readOneSWUOpportunity
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";
import { Connection, readOneSWUProposal, tryDb } from "back-end/lib/db";
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
  SWUTeamQuestionResponseEvaluationScores,
  SWUTeamQuestionResponseEvaluationStatus
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { generateUuid } from "back-end/lib";

export interface CreateSWUTeamQuestionResponseEvaluationParams
  extends CreateRequestBody {
  evaluationPanelMember: Id;
}

interface SWUTeamQuestionResponseEvaluationStatusRecord {
  id: Id;
  opportunity: Id;
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

async function RawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluation(
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
      await readOneSWUProposal(connection, proposalId, session),
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
      ? await RawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluation(
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
    const [evaluationStatusRecord] = await connection<
      SWUTeamQuestionResponseEvaluationStatusRecord & {
        teamQuestionResponseEvaluation: Id;
      }
    >("swuTeamQuestionResponseEvaluationStatuses")
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
    throw new Error("unable to create proposal");
  }
  return valid(dbResult.value);
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
