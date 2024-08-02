import {
  parseSWUTeamQuestionResponseEvaluationType,
  SWUTeamQuestionResponseEvaluationType
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { invalid, valid, Validation } from "shared/lib/validation";

function makeValidateSWUTeamQuestionResponseEvaluationEnum<T>(
  parse: (raw: string) => T | null,
  parseErrorMsg: (raw: string) => string,
  notOneOfErrorMsg: (raw: string, isOneOf: T[]) => string
): (raw: string, isOneOf: T[]) => Validation<T> {
  return (raw, isOneOf) => {
    const parsed = parse(raw);
    if (!parsed) {
      return invalid([parseErrorMsg(raw)]);
    }

    if (!isOneOf.includes(parsed)) {
      return invalid([notOneOfErrorMsg(raw, isOneOf)]);
    }

    return valid(parsed);
  };
}

export const validateSWUTeamQuestionResponseEvaluationType =
  makeValidateSWUTeamQuestionResponseEvaluationEnum<SWUTeamQuestionResponseEvaluationType>(
    parseSWUTeamQuestionResponseEvaluationType,
    (raw) =>
      `"${raw}" is not a valid SprintWithUs team question response evaluation type.`,
    (raw, isOneOf) => `"${raw}" is not one of: ${isOneOf.join(", ")}`
  );
