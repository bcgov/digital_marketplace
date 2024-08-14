import {
  readOneSWUEvaluationPanelMember,
  readOneSWUOpportunity
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue, valid } from "shared/lib/validation";
import { Connection, readOneSWUProposal, tryDb } from "back-end/lib/db";
import { Session, SessionRecord } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { SWUEvaluationPanelMember } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/question-evaluation/sprint-with-us";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function RawTeamQuestionResponseEvaluationToTeamQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  raw: RawSWUTeamQuestionResponseEvaluation
): Promise<SWUTeamQuestionResponseEvaluation> {
  const {
    id,
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
    await readOneSWUEvaluationPanelMember(connection, evaluationPanelMemberId),
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
  )
    .where({ teamQuestionResponseEvaluation: teamQuestionResponseEvaluationId })
    .select("*");

  if (!results) {
    throw new Error(
      "unable to read proposal team question response evaluations"
    );
  }

  return valid(results);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            statuses2.teamQuestionResponseEvaluation = evaluations.id and statuses2.status is not null)'
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
