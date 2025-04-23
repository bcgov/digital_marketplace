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
 * @param filterByUser - If false, requests all evaluations (requires admin privileges)
 */
export function readMany<Msg>(
  opportunityId: Id,
  filterByUser?: boolean
): crud.ReadManyAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  const query = filterByUser === false ? "filterByUser=false" : undefined;
  return crud.makeReadManyAction(
    NAMESPACE(opportunityId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation,
    query
  );
}
