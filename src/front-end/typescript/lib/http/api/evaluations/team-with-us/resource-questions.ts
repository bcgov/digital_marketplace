import * as Resource from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { compareNumbers } from "shared/lib";

// Raw Conversion

interface RawTWUResourceQuestionResponseEvaluation
  extends Omit<
    Resource.TWUResourceQuestionResponseEvaluation,
    "createdAt" | "updatedAt"
  > {
  createdAt: string;
  updatedAt: string;
}

export function rawTWUResourceQuestionResponseEvaluationToTWUResourceQuestionResponseEvaluation(
  raw: RawTWUResourceQuestionResponseEvaluation
): Resource.TWUResourceQuestionResponseEvaluation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    scores: raw.scores.sort((a, b) => compareNumbers(a.order, b.order))
  };
}
