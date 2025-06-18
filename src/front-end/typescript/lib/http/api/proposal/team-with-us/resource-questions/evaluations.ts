import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { Id } from "shared/lib/types";
import { rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation } from "front-end/lib/http/api/evaluations/team-with-us/resource-questions";

const NAMESPACE = (proposalId: Id) =>
  `proposal/team-with-us/${proposalId}/resource-questions/evaluations`;

export function create<Msg>(
  proposalId: Id
): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUResourceQuestionResponseEvaluation,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE(proposalId),
    rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation
  );
}

export function readMany<Msg>(
  proposalId: Id
): crud.ReadManyAction<
  Resource.TWUResourceQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE(proposalId),
    rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation
  );
}

export function readOne<Msg>(
  proposalId: Id
): crud.ReadOneAction<
  Resource.TWUResourceQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadOneAction(
    NAMESPACE(proposalId),
    rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation
  );
}

export function update<Msg>(
  proposalId: Id
): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.TWUResourceQuestionResponseEvaluation,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(
    NAMESPACE(proposalId),
    rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation
  );
}
