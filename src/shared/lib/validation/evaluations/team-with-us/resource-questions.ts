import { isArray } from "lodash";
import { getNumber, getString } from "shared/lib";
import { TWUResourceQuestion } from "shared/lib/resources/opportunity/team-with-us";
import {
  CreateTWUResourceQuestionResponseEvaluationScoreBody,
  CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors,
  parseTWUResourceQuestionResponseEvaluationStatus,
  TWUResourceQuestionResponseEvaluationStatus
} from "shared/lib/resources/evaluations/team-with-us/resource-questions";
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

function makeValidateTWUResourceQuestionResponseEvaluationEnum<T>(
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

export const validateTWUResourceQuestionResponseEvaluationStatus =
  makeValidateTWUResourceQuestionResponseEvaluationEnum<TWUResourceQuestionResponseEvaluationStatus>(
    parseTWUResourceQuestionResponseEvaluationStatus,
    (raw) =>
      `"${raw}" is not a valid TeamWithUs resource question response evaluation status.`,
    (raw, isOneOf) => `"${raw}" is not one of: ${isOneOf.join(", ")}`
  );

export function validateTWUResourceQuestionResponseEvaluationScoreOrder(
  raw: number,
  opportunityTeamQuestions: TWUResourceQuestion[]
): Validation<number> {
  return validateNumber(raw, 0, opportunityTeamQuestions.length, "Order");
}

export function validateTWUResourceQuestionResponseEvaluationScoreScore(
  raw: number,
  maxScore: number
): Validation<number> {
  return validateNumberWithPrecision(raw, 0, maxScore, 2, "Score");
}

export function validateTWUResourceQuestionResponseEvaluationScoreNotes(
  raw: string
): Validation<string> {
  return validateGenericStringWords(raw, "Notes", 1);
}

export function validateTWUResourceQuestionResponseEvaluationScore(
  raw: any,
  opportunityTeamQuestions: TWUResourceQuestion[]
): Validation<
  CreateTWUResourceQuestionResponseEvaluationScoreBody,
  CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors
> {
  const validatedOrder =
    validateTWUResourceQuestionResponseEvaluationScoreOrder(
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
      order: ["No matching proposal resource question response."]
    });
  }
  const validatedScore =
    validateTWUResourceQuestionResponseEvaluationScoreScore(
      getNumber(raw, "score"),
      maxScore
    );
  if (isInvalid(validatedScore)) {
    return invalid({
      score: getInvalidValue(validatedScore, undefined)
    });
  }
  const validatedNotes =
    validateTWUResourceQuestionResponseEvaluationScoreNotes(
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
    } as CreateTWUResourceQuestionResponseEvaluationScoreBody);
  }
}

export function validateTWUResourceQuestionResponseEvaluationScores(
  raw: any,
  opportunityTeamQuestions: TWUResourceQuestion[]
): ArrayValidation<
  CreateTWUResourceQuestionResponseEvaluationScoreBody,
  CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors
> {
  if (!isArray(raw)) {
    return invalid([
      {
        parseFailure: [
          "Please provide an array of resource question response evaluation scores."
        ]
      }
    ]);
  }
  if (raw.length !== opportunityTeamQuestions.length) {
    return invalid([
      {
        parseFailure: [
          "Please provide a number of resource question response evaluation scores that matches the number of resource questions"
        ]
      }
    ]);
  }
  return validateArrayCustom(
    raw,
    (v) =>
      validateTWUResourceQuestionResponseEvaluationScore(
        v,
        opportunityTeamQuestions
      ),
    {}
  );
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Note", 0, 5000);
}
