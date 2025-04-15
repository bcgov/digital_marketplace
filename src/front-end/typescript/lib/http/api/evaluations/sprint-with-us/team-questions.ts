import * as Resource from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { compareNumbers } from "shared/lib";

// Raw Conversion

interface RawSWUTeamQuestionResponseEvaluation
  extends Omit<
    Resource.SWUTeamQuestionResponseEvaluation,
    "createdAt" | "updatedAt"
  > {
  createdAt: string;
  updatedAt: string;
}

export function rawSWUTeamQuestionResponseEvaluationToSWUTeamQuestionResponseEvaluation(
  raw: RawSWUTeamQuestionResponseEvaluation
): Resource.SWUTeamQuestionResponseEvaluation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    scores: raw.scores.sort((a, b) => compareNumbers(a.order, b.order))
  };
}
