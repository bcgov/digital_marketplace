import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/question-evaluation/sprint-with-us";
import { compareNumbers } from "shared/lib";
import { Id } from "shared/lib/types";

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

// Raw Conversion

interface RawSWUTeamQuestionResponseEvaluation
  extends Omit<
    Resource.SWUTeamQuestionResponseEvaluation,
    "createdAt" | "updatedAt"
  > {
  createdAt: string;
  updatedAt: string;
}

function rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation(
  raw: RawSWUTeamQuestionResponseEvaluation
): Resource.SWUTeamQuestionResponseEvaluation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    scores: raw.scores.sort((a, b) => compareNumbers(a.order, b.order))
  };
}
