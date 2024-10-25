import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/question-evaluation/sprint-with-us";
import { compareNumbers } from "shared/lib";
import { Id } from "shared/lib/types";

const NAMESPACE = "question-evaluations/sprint-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUTeamQuestionResponseEvaluation,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE,
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}

/**
 * Parses URL parameters prior to creating a read request for many SWU proposals
 *
 * @param opportunityId
 * @param consensus
 */
export function readMany<Msg>({
  opportunityId,
  proposalId,
  consensus
}: {
  opportunityId?: Id;
  proposalId?: Id;
  consensus?: boolean;
} = {}): crud.ReadManyAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  const params = new URLSearchParams({
    opportunity:
      opportunityId !== undefined
        ? window.encodeURIComponent(opportunityId)
        : "",
    proposal:
      proposalId !== undefined ? window.encodeURIComponent(proposalId) : ""
  });
  if (consensus) {
    params.append("consensus", "true");
  }
  return crud.makeReadManyAction(
    NAMESPACE,
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation,
    params.toString()
  );
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.SWUTeamQuestionResponseEvaluation,
  string[],
  Msg
> {
  return crud.makeReadOneAction(
    NAMESPACE,
    rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation
  );
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUTeamQuestionResponseEvaluation,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(
    NAMESPACE,
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
