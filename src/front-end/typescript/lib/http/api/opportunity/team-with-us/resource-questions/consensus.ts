import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { Id } from "shared/lib/types";
import { rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation } from "front-end/lib/http/api/evaluations/team-with-us/resource-questions";

const NAMESPACE = (opportunityId: Id) =>
  `opportunity/team-with-us/${opportunityId}/resource-questions/consensus`;

/**
 * Parses URL parameters prior to creating a read request for many TWU proposals
 *
 * @param opportunityId
 * @param consensus
 */
export function readMany<Msg>(
  opportunityId: Id
): crud.ReadManyAction<
  Resource.TWUResourceQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE(opportunityId),
    rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation
  );
}
