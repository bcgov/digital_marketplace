import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/question-evaluation/sprint-with-us";
import { Id } from "shared/lib/types";
import { rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation } from "front-end/lib/http/api/question-evaluation/sprint-with-us";

const NAMESPACE = (proposalId: Id) =>
  `proposal/sprint-with-us/${proposalId}/team-questions/evaluations`;

export function create<Msg>(
  proposalId: Id
): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUTeamQuestionResponseEvaluation,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE(proposalId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}

export function readOne<Msg>(
  proposalId: Id
): crud.ReadOneAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadOneAction(
    NAMESPACE(proposalId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}

export function update<Msg>(
  proposalId: Id
): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUTeamQuestionResponseEvaluation,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(
    NAMESPACE(proposalId),
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}
