import {
  parseSWUTeamQuestionResponseEvaluationType,
  SWUTeamQuestionResponseEvaluationType
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { invalid, valid, Validation } from "shared/lib/validation";

export function validateSWUTeamQuestionResponseEvaluationType(
  raw: string,
  isOneOf: SWUTeamQuestionResponseEvaluationType[]
): Validation<SWUTeamQuestionResponseEvaluationType> {
  const parsed = parseSWUTeamQuestionResponseEvaluationType(raw);
  if (!parsed) {
    return invalid([
      `"${raw}" is not a valid SprintWithUs team question response evaluation type.`
    ]);
  }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(", ")}`]);
  }
  return valid(parsed);
}
