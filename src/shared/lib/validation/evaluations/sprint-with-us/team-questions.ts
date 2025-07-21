import { isArray } from "lodash";
import { getNumber, getString } from "shared/lib";
import { SWUTeamQuestion } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors,
  parseSWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationStatus
} from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import {
  ArrayValidation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid,
  validateArrayCustom,
  validateGenericString,
  validateGenericStringWords,
  validateNumber,
  validateNumberWithPrecision,
  Validation
} from "shared/lib/validation";

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

export const validateSWUTeamQuestionResponseEvaluationStatus =
  makeValidateSWUTeamQuestionResponseEvaluationEnum<SWUTeamQuestionResponseEvaluationStatus>(
    parseSWUTeamQuestionResponseEvaluationStatus,
    (raw) =>
      `"${raw}" is not a valid SprintWithUs team question response evaluation status.`,
    (raw, isOneOf) => `"${raw}" is not one of: ${isOneOf.join(", ")}`
  );

export function validateSWUTeamQuestionResponseEvaluationScoreOrder(
  raw: number,
  opportunityTeamQuestions: SWUTeamQuestion[]
): Validation<number> {
  return validateNumber(raw, 0, opportunityTeamQuestions.length, "Order");
}

export function validateSWUTeamQuestionResponseEvaluationScoreScore(
  raw: number,
  maxScore: number
): Validation<number> {
  return validateNumberWithPrecision(raw, 0, maxScore, 2, "Score");
}

export function validateSWUTeamQuestionResponseEvaluationScoreNotes(
  raw: string
): Validation<string> {
  return validateGenericStringWords(raw, "Notes", 1);
}

export function validateSWUTeamQuestionResponseEvaluationScore(
  raw: any,
  opportunityTeamQuestions: SWUTeamQuestion[]
): Validation<
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors
> {
  const validatedOrder = validateSWUTeamQuestionResponseEvaluationScoreOrder(
    getNumber(raw, "order"),
    opportunityTeamQuestions
  );
  if (isInvalid(validatedOrder)) {
    return invalid({
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
  const maxScore =
    opportunityTeamQuestions.find((q) => q.order === validatedOrder.value)
      ?.score || null;
  if (!maxScore) {
    return invalid({
      order: ["No matching proposal team question response."]
    });
  }
  const validatedScore = validateSWUTeamQuestionResponseEvaluationScoreScore(
    getNumber(raw, "score"),
    maxScore
  );
  if (isInvalid(validatedScore)) {
    return invalid({
      score: getInvalidValue(validatedScore, undefined)
    });
  }
  const validatedNotes = validateSWUTeamQuestionResponseEvaluationScoreNotes(
    getString(raw, "notes")
  );
  if (isInvalid(validatedNotes)) {
    return invalid({
      notes: getInvalidValue(validatedNotes, undefined)
    });
  } else {
    return valid({
      notes: validatedNotes.value,
      order: validatedOrder.value,
      score: validatedScore.value
    } as CreateSWUTeamQuestionResponseEvaluationScoreBody);
  }
}

export function validateSWUTeamQuestionResponseEvaluationScores(
  raw: any,
  opportunityTeamQuestions: SWUTeamQuestion[]
): ArrayValidation<
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors
> {
  if (!isArray(raw)) {
    return invalid([
      {
        parseFailure: [
          "Please provide an array of team question response evaluation scores."
        ]
      }
    ]);
  }
  if (raw.length !== opportunityTeamQuestions.length) {
    return invalid([
      {
        parseFailure: [
          "Please provide a number of team question response evaluation scores that matches the number of team questions"
        ]
      }
    ]);
  }
  return validateArrayCustom(
    raw,
    (v) =>
      validateSWUTeamQuestionResponseEvaluationScore(
        v,
        opportunityTeamQuestions
      ),
    {}
  );
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Note", 0, 5000);
}
