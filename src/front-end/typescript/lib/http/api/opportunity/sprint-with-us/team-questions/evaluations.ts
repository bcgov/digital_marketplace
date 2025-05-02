import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { Id } from "shared/lib/types";
import { rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation } from "front-end/lib/http/api/evaluations/sprint-with-us/team-questions";

const NAMESPACE = (opportunityId: Id) =>
  `opportunity/sprint-with-us/${opportunityId}/team-questions/evaluations`;

/**
 * Parses URL parameters prior to creating a read request for many SWU proposals
 *
 * @param opportunityId
 * @param query - Query string to pass to the API
 */
export function readMany<Msg>(
  opportunityId: Id,
  query?: string
): crud.ReadManyAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE(opportunityId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation,
    query
  );
}
