import { readOneSWUOpportunity } from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue } from "shared/lib/validation";
import { Connection } from "back-end/lib/db";
import { SessionRecord } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { SWUEvaluationPanelMember } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/question-evaluation/sprint-with-us";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RawSWUTeamQuestionResponseEvaluation
  extends Omit<
    SWUTeamQuestionResponseEvaluation,
    "proposal" | "evaluationPanelMember"
  > {
  id: Id;
  proposal: Id;
  evaluationPanelMember: Id;
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
