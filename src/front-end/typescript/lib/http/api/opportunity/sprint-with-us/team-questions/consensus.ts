import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/question-evaluation/sprint-with-us";
import { Id } from "shared/lib/types";
import { rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation } from "front-end/lib/http/api/question-evaluation/sprint-with-us";

const NAMESPACE = (opportunityId: Id) =>
  `opportunity/sprint-with-us/${opportunityId}/team-questions/consensus`;

/**
 * Parses URL parameters prior to creating a read request for many SWU proposals
 *
 * @param opportunityId
 * @param consensus
 */
export function readMany<Msg>(
  opportunityId: Id
): crud.ReadManyAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE(opportunityId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}
